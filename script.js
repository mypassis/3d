// VOID RUNNER - Three.js Space Shooter Game
// Main game module

class VoidRunner {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.player = null;
        this.bullets = [];
        this.enemies = [];
        this.particles = [];
        this.stars = null;
        
        // Game state
        this.gameState = 'start'; // start, playing, paused, gameover
        this.score = 0;
        this.wave = 1;
        this.health = 100;
        this.shield = 100;
        this.kills = 0;
        this.lastShot = 0;
        this.shootDelay = 150;
        this.enemySpawnTimer = 0;
        this.enemySpawnInterval = 2000;
        this.waveTimer = 0;
        this.waveDuration = 30000;
        
        // Input state
        this.keys = {};
        this.mouseX = 0;
        this.mouseY = 0;
        
        // Camera
        this.cameraOffset = new THREE.Vector3(0, 8, 12);
        this.cameraTarget = new THREE.Vector3();
        
        this.init();
    }
    
    init() {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x0a0a1a, 0.015);
        
        // Camera
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        
        // Renderer
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: document.getElementById('game-canvas'),
            antialias: true,
            alpha: false
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        
        // Lighting
        this.setupLighting();
        
        // Environment
        this.createStarfield();
        this.createPlayer();
        
        // Event listeners
        this.setupEventListeners();
        
        // Start game loop
        this.animate();
    }
    
    setupLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x1a1a2e, 0.4);
        this.scene.add(ambientLight);
        
        // Main directional light
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(5, 10, 5);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 50;
        dirLight.shadow.camera.left = -20;
        dirLight.shadow.camera.right = 20;
        dirLight.shadow.camera.top = 20;
        dirLight.shadow.camera.bottom = -20;
        this.scene.add(dirLight);
        
        // Colored point lights for atmosphere
        const purpleLight = new THREE.PointLight(0x9b59b6, 1, 30);
        purpleLight.position.set(-10, 5, -10);
        this.scene.add(purpleLight);
        
        const blueLight = new THREE.PointLight(0x3498db, 1, 30);
        blueLight.position.set(10, 5, -10);
        this.scene.add(blueLight);
    }
    
    createStarfield() {
        const starGeometry = new THREE.BufferGeometry();
        const starCount = 2000;
        const positions = new Float32Array(starCount * 3);
        const colors = new Float32Array(starCount * 3);
        
        for (let i = 0; i < starCount; i++) {
            const i3 = i * 3;
            positions[i3] = (Math.random() - 0.5) * 200;
            positions[i3 + 1] = (Math.random() - 0.5) * 200;
            positions[i3 + 2] = (Math.random() - 0.5) * 200;
            
            // Star colors (white, blue, purple tints)
            const colorChoice = Math.random();
            if (colorChoice < 0.6) {
                colors[i3] = 0.9;
                colors[i3 + 1] = 0.9;
                colors[i3 + 2] = 1.0;
            } else if (colorChoice < 0.8) {
                colors[i3] = 0.6;
                colors[i3 + 1] = 0.7;
                colors[i3 + 2] = 1.0;
            } else {
                colors[i3] = 0.8;
                colors[i3 + 1] = 0.6;
                colors[i3 + 2] = 1.0;
            }
        }
        
        starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        starGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        const starMaterial = new THREE.PointsMaterial({
            size: 0.15,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            sizeAttenuation: true
        });
        
        this.stars = new THREE.Points(starGeometry, starMaterial);
        this.scene.add(this.stars);
    }
    
    createPlayer() {
        const playerGroup = new THREE.Group();
        
        // Ship body
        const bodyGeometry = new THREE.ConeGeometry(0.3, 1.2, 8);
        bodyGeometry.rotateX(Math.PI / 2);
        const bodyMaterial = new THREE.MeshPhongMaterial({
            color: 0x00d4ff,
            emissive: 0x0044aa,
            emissiveIntensity: 0.5,
            shininess: 100,
            specular: 0xffffff
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.castShadow = true;
        playerGroup.add(body);
        
        // Wings
        const wingGeometry = new THREE.BoxGeometry(1.5, 0.05, 0.4);
        const wingMaterial = new THREE.MeshPhongMaterial({
            color: 0x1a1a2e,
            emissive: 0x00d4ff,
            emissiveIntensity: 0.3
        });
        
        const leftWing = new THREE.Mesh(wingGeometry, wingMaterial);
        leftWing.position.set(0, 0, 0.3);
        leftWing.rotation.z = 0.1;
        leftWing.castShadow = true;
        playerGroup.add(leftWing);
        
        const rightWing = new THREE.Mesh(wingGeometry, wingMaterial);
        rightWing.position.set(0, 0, 0.3);
        rightWing.rotation.z = -0.1;
        rightWing.castShadow = true;
        playerGroup.add(rightWing);
        
        // Engine glow
        const engineGeometry = new THREE.SphereGeometry(0.15, 8, 8);
        const engineMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.8
        });
        const engine = new THREE.Mesh(engineGeometry, engineMaterial);
        engine.position.set(0, 0, -0.6);
        playerGroup.add(engine);
        
        // Player light
        const playerLight = new THREE.PointLight(0x00d4ff, 2, 10);
        playerLight.position.set(0, 0, 0);
        playerGroup.add(playerLight);
        
        playerGroup.position.set(0, 0, 0);
        this.scene.add(playerGroup);
        
        this.player = {
            mesh: playerGroup,
            velocity: new THREE.Vector3(),
            speed: 0.15,
            boostSpeed: 0.3,
            rotationSpeed: 0.05
        };
    }
    
    spawnEnemy() {
        const enemyTypes = ['scout', 'fighter', 'heavy'];
        const type = enemyTypes[Math.floor(Math.random() * Math.min(enemyTypes.length, this.wave))];
        
        const enemyGroup = new THREE.Group();
        
        let geometry, material, health, speed, scoreValue;
        
        switch(type) {
            case 'scout':
                geometry = new THREE.TetrahedronGeometry(0.4);
                material = new THREE.MeshPhongMaterial({
                    color: 0xff3366,
                    emissive: 0x990033,
                    emissiveIntensity: 0.5
                });
                health = 1;
                speed = 0.08 + this.wave * 0.01;
                scoreValue = 100;
                break;
            case 'fighter':
                geometry = new THREE.BoxGeometry(0.6, 0.6, 0.8);
                material = new THREE.MeshPhongMaterial({
                    color: 0xff6600,
                    emissive: 0x993300,
                    emissiveIntensity: 0.5
                });
                health = 2;
                speed = 0.06 + this.wave * 0.008;
                scoreValue = 200;
                break;
            case 'heavy':
                geometry = new THREE.OctahedronGeometry(0.7);
                material = new THREE.MeshPhongMaterial({
                    color: 0xff0000,
                    emissive: 0x990000,
                    emissiveIntensity: 0.6
                });
                health = 4;
                speed = 0.04 + this.wave * 0.006;
                scoreValue = 300;
                break;
        }
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        enemyGroup.add(mesh);
        
        // Enemy light
        const enemyLight = new THREE.PointLight(0xff3366, 1, 5);
        enemyLight.position.set(0, 0, 0);
        enemyGroup.add(enemyLight);
        
        // Spawn position (in front of player, random X/Y)
        const spawnDistance = 30;
        const x = (Math.random() - 0.5) * 20;
        const y = (Math.random() - 0.5) * 10;
        
        enemyGroup.position.set(x, y, -spawnDistance);
        this.scene.add(enemyGroup);
        
        this.enemies.push({
            mesh: enemyGroup,
            type: type,
            health: health,
            maxHealth: health,
            speed: speed,
            scoreValue: scoreValue,
            rotationSpeed: new THREE.Vector3(
                (Math.random() - 0.5) * 0.05,
                (Math.random() - 0.5) * 0.05,
                (Math.random() - 0.5) * 0.05
            )
        });
    }
    
    shoot() {
        const now = Date.now();
        if (now - this.lastShot < this.shootDelay) return;
        this.lastShot = now;
        
        const bulletGeometry = new THREE.SphereGeometry(0.08, 8, 8);
        const bulletMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.9
        });
        
        const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
        
        // Position bullet at player's front
        bullet.position.copy(this.player.mesh.position);
        bullet.position.z -= 0.8;
        
        // Bullet light
        const bulletLight = new THREE.PointLight(0x00ffff, 1, 3);
        bullet.add(bulletLight);
        
        this.scene.add(bullet);
        
        this.bullets.push({
            mesh: bullet,
            velocity: new THREE.Vector3(0, 0, -0.5),
            life: 200
        });
    }
    
    createExplosion(position, color = 0xff6600, count = 15) {
        const particleGeometry = new THREE.SphereGeometry(0.05, 4, 4);
        
        for (let i = 0; i < count; i++) {
            const particleMaterial = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 1
            });
            
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            particle.position.copy(position);
            
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.3,
                (Math.random() - 0.5) * 0.3,
                (Math.random() - 0.5) * 0.3
            );
            
            this.scene.add(particle);
            
            this.particles.push({
                mesh: particle,
                velocity: velocity,
                life: 60 + Math.random() * 40,
                maxLife: 60 + Math.random() * 40
            });
        }
    }
    
    checkCollisions() {
        // Bullet vs Enemy collisions
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            let bulletHit = false;
            
            for (let j = this.enemies.length - 1; j >= 0; j--) {
                const enemy = this.enemies[j];
                const distance = bullet.mesh.position.distanceTo(enemy.mesh.position);
                
                if (distance < 1.2) {
                    // Hit!
                    enemy.health--;
                    
                    // Create hit particles
                    this.createExplosion(bullet.mesh.position, 0x00ffff, 5);
                    
                    if (enemy.health <= 0) {
                        // Enemy destroyed
                        this.createExplosion(enemy.mesh.position, 0xff6600, 20);
                        this.scene.remove(enemy.mesh);
                        this.enemies.splice(j, 1);
                        
                        this.score += enemy.scoreValue;
                        this.kills++;
                        
                        // Shield recharge on kill
                        this.shield = Math.min(100, this.shield + 5);
                    }
                    
                    // Remove bullet
                    this.scene.remove(bullet.mesh);
                    this.bullets.splice(i, 1);
                    bulletHit = true;
                    break;
                }
            }
        }
        
        // Enemy vs Player collisions
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            const distance = enemy.mesh.position.distanceTo(this.player.mesh.position);
            
            if (distance < 1.5) {
                // Take damage
                this.health -= 20;
                this.createExplosion(enemy.mesh.position, 0xff0000, 15);
                this.scene.remove(enemy.mesh);
                this.enemies.splice(i, 1);
                
                if (this.health <= 0) {
                    this.gameOver();
                }
            }
        }
    }
    
    updatePlayer(deltaTime) {
        if (!this.player) return;
        
        const moveSpeed = this.keys['ShiftLeft'] && this.shield > 0 ? 
            this.player.boostSpeed : this.player.speed;
        
        // Boost drains shield
        if (this.keys['ShiftLeft'] && this.shield > 0) {
            this.shield = Math.max(0, this.shield - 0.3);
        }
        
        // Movement
        const movement = new THREE.Vector3();
        
        if (this.keys['KeyW'] || this.keys['ArrowUp']) movement.z -= 1;
        if (this.keys['KeyS'] || this.keys['ArrowDown']) movement.z += 1;
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) movement.x -= 1;
        if (this.keys['KeyD'] || this.keys['ArrowRight']) movement.x += 1;
        
        if (movement.length() > 0) {
            movement.normalize().multiplyScalar(moveSpeed);
            this.player.mesh.position.add(movement);
            
            // Rotate ship based on movement
            this.player.mesh.rotation.z = -movement.x * 3;
            this.player.mesh.rotation.x = movement.z * 2;
        } else {
            // Return to neutral rotation
            this.player.mesh.rotation.z *= 0.9;
            this.player.mesh.rotation.x *= 0.9;
        }
        
        // Clamp player position
        this.player.mesh.position.x = Math.max(-10, Math.min(10, this.player.mesh.position.x));
        this.player.mesh.position.y = Math.max(-5, Math.min(5, this.player.mesh.position.y));
        
        // Shooting
        if (this.keys['Space']) {
            this.shoot();
        }
        
        // Update camera to follow player
        this.cameraTarget.copy(this.player.mesh.position);
        this.camera.position.lerp(
            new THREE.Vector3(
                this.cameraTarget.x + this.cameraOffset.x,
                this.cameraTarget.y + this.cameraOffset.y,
                this.cameraTarget.z + this.cameraOffset.z
            ),
            0.1
        );
        this.camera.lookAt(this.cameraTarget);
    }
    
    updateBullets() {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            bullet.mesh.position.add(bullet.velocity);
            bullet.life--;
            
            if (bullet.life <= 0) {
                this.scene.remove(bullet.mesh);
                this.bullets.splice(i, 1);
            }
        }
    }
    
    updateEnemies() {
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            
            // Move towards player
            const direction = new THREE.Vector3();
            direction.subVectors(this.player.mesh.position, enemy.mesh.position).normalize();
            
            // Add some randomness to movement
            direction.x += Math.sin(Date.now() * 0.001 + i) * 0.2;
            direction.y += Math.cos(Date.now() * 0.001 + i) * 0.2;
            direction.normalize();
            
            enemy.mesh.position.add(direction.multiplyScalar(enemy.speed));
            
            // Rotate enemy
            enemy.mesh.rotation.x += enemy.rotationSpeed.x;
            enemy.mesh.rotation.y += enemy.rotationSpeed.y;
            enemy.mesh.rotation.z += enemy.rotationSpeed.z;
            
            // Remove if too far behind
            if (enemy.mesh.position.z > 10) {
                this.scene.remove(enemy.mesh);
                this.enemies.splice(i, 1);
            }
        }
    }
    
    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            particle.mesh.position.add(particle.velocity);
            particle.velocity.multiplyScalar(0.95); // Friction
            particle.life--;
            
            // Fade out
            particle.mesh.material.opacity = particle.life / particle.maxLife;
            
            if (particle.life <= 0) {
                this.scene.remove(particle.mesh);
                this.particles.splice(i, 1);
            }
        }
    }
    
    updateHUD() {
        // Score
        document.getElementById('score-display').textContent = this.score.toLocaleString();
        
        // Wave
        document.getElementById('wave-display').textContent = this.wave;
        
        // Health
        const healthPercent = Math.max(0, this.health);
        document.getElementById('health-fill').style.width = healthPercent + '%';
        document.getElementById('health-text').textContent = `HP ${Math.round(healthPercent)}%`;
        
        // Color health bar based on percentage
        const healthFill = document.getElementById('health-fill');
        if (healthPercent > 60) {
            healthFill.style.background = 'linear-gradient(90deg, #00d4ff, #00ff88)';
        } else if (healthPercent > 30) {
            healthFill.style.background = 'linear-gradient(90deg, #ffaa00, #ff6600)';
        } else {
            healthFill.style.background = 'linear-gradient(90deg, #ff3366, #ff0000)';
        }
        
        // Shield
        document.getElementById('shield-fill').style.width = Math.max(0, this.shield) + '%';
    }
    
    updateWaveSystem() {
        this.waveTimer += 16; // Approximate ms per frame
        
        if (this.waveTimer >= this.waveDuration) {
            this.waveTimer = 0;
            this.wave++;
            
            // Increase difficulty
            this.enemySpawnInterval = Math.max(500, 2000 - this.wave * 150);
            
            // Heal player slightly on wave complete
            this.health = Math.min(100, this.health + 10);
            this.shield = Math.min(100, this.shield + 20);
            
            // Show wave notification
            this.showWaveNotification();
        }
        
        // Spawn enemies
        this.enemySpawnTimer += 16;
        if (this.enemySpawnTimer >= this.enemySpawnInterval) {
            this.enemySpawnTimer = 0;
            this.spawnEnemy();
        }
    }
    
    showWaveNotification() {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-family: 'Inter', sans-serif;
            font-size: 3rem;
            font-weight: 900;
            color: #00d4ff;
            text-shadow: 0 0 20px #00d4ff, 0 0 40px #00d4ff;
            z-index: 100;
            pointer-events: none;
            animation: fadeInOut 2s ease-in-out;
        `;
        notification.textContent = `WAVE ${this.wave}`;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 2000);
    }
    
    gameOver() {
        this.gameState = 'gameover';
        
        // Update final stats
        document.getElementById('final-score').textContent = this.score.toLocaleString();
        document.getElementById('final-wave').textContent = this.wave;
        document.getElementById('final-kills').textContent = this.kills;
        
        // Show game over screen
        document.getElementById('game-over-screen').classList.add('active');
        document.getElementById('hud').style.display = 'none';
        document.getElementById('crosshair').style.display = 'none';
        
        // Create big explosion at player position
        this.createExplosion(this.player.mesh.position, 0xff0000, 50);
        
        // Disable player
        this.player.mesh.visible = false;
    }
    
    resetGame() {
        // Clear bullets
        this.bullets.forEach(bullet => this.scene.remove(bullet.mesh));
        this.bullets = [];
        
        // Clear enemies
        this.enemies.forEach(enemy => this.scene.remove(enemy.mesh));
        this.enemies = [];
        
        // Clear particles
        this.particles.forEach(particle => this.scene.remove(particle.mesh));
        this.particles = [];
        
        // Reset player
        this.player.mesh.position.set(0, 0, 0);
        this.player.mesh.visible = true;
        this.player.mesh.rotation.set(0, 0, 0);
        
        // Reset game state
        this.score = 0;
        this.wave = 1;
        this.health = 100;
        this.shield = 100;
        this.kills = 0;
        this.enemySpawnTimer = 0;
        this.enemySpawnInterval = 2000;
        this.waveTimer = 0;
        
        // Hide screens
        document.querySelectorAll('.overlay').forEach(overlay => {
            overlay.classList.remove('active');
        });
        
        // Show HUD
        document.getElementById('hud').style.display = 'block';
        document.getElementById('crosshair').style.display = 'block';
        
        this.gameState = 'playing';
    }
    
    setupEventListeners() {
        // Keyboard input
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            
            // Prevent scrolling with space
            if (e.code === 'Space') e.preventDefault();
            
            // Pause game with Escape
            if (e.code === 'Escape') {
                if (this.gameState === 'playing') {
                    this.gameState = 'paused';
                    document.getElementById('pause-screen').classList.add('active');
                } else if (this.gameState === 'paused') {
                    this.resumeGame();
                }
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
        
        // Mouse movement for crosshair
        document.addEventListener('mousemove', (e) => {
            this.mouseX = (e.clientX / window.innerWidth) * 2 - 1;
            this.mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
        });
        
        // Start button
        document.getElementById('start-btn').addEventListener('click', () => {
            document.getElementById('start-screen').classList.remove('active');
            document.getElementById('hud').style.display = 'block';
            document.getElementById('crosshair').style.display = 'block';
            this.gameState = 'playing';
        });
        
        // Restart button
        document.getElementById('restart-btn').addEventListener('click', () => {
            this.resetGame();
        });
        
        // Resume button
        document.getElementById('resume-btn').addEventListener('click', () => {
            this.resumeGame();
        });
        
        // Window resize
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
        
        // Add fade in/out animation to styles
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeInOut {
                0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
                20% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
                80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                100% { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
            }
        `;
        document.head.appendChild(style);
    }
    
    resumeGame() {
        this.gameState = 'playing';
        document.getElementById('pause-screen').classList.remove('active');
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        if (this.gameState !== 'playing') {
            // Still render but don't update game logic
            this.renderer.render(this.scene, this.camera);
            
            // Slowly rotate stars
            if (this.stars) {
                this.stars.rotation.y += 0.0001;
            }
            return;
        }
        
        // Update game systems
        this.updatePlayer();
        this.updateBullets();
        this.updateEnemies();
        this.updateParticles();
        this.checkCollisions();
        this.updateWaveSystem();
        this.updateHUD();
        
        // Rotate starfield slowly
        if (this.stars) {
            this.stars.rotation.y += 0.0002;
        }
        
        // Render scene
        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize game when page loads
window.addEventListener('load', () => {
    new VoidRunner();
});