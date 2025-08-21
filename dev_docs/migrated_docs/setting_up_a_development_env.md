---
id: kibDevTutorialSetupDevEnv
slug: /kibana-dev-docs/getting-started/setup-dev-env
title: Set up a Development Environment
description: Learn how to setup a development environment for contributing to the Kibana repository
date: 2025-08-21
tags: ['kibana', 'onboarding', 'dev', 'architecture', 'setup', 'devcontainer']
---

Complete guide to setting up a local Kibana development environment for plugin development and core contributions.

## Platform Support

> [!WARNING]
> **Windows Users:** Native Windows development is no longer supported. Use [Windows Subsystem for Linux (WSL)](../tutorials/development_windows.mdx) for the best development experience.

**Supported Platforms:**
- macOS (Intel/Apple Silicon)
- Linux (Ubuntu 18.04+, CentOS 7+, other distributions)
- Windows via WSL2

## Prerequisites

### System Requirements

**Hardware Minimums:**
- 8GB RAM (16GB recommended)
- 10GB free disk space
- 4 CPU cores (8 recommended)

**Software Dependencies:**
- Git 2.20+
- Docker (for dev containers, optional)
- Text editor/IDE (VS Code recommended)

## Quick Start

### 1. Fork and Clone Repository

```bash
# Fork kibana repository on GitHub first
# Then clone your fork
git clone https://github.com/[YOUR_USERNAME]/kibana.git kibana
cd kibana

# Add upstream remote for syncing
git remote add upstream https://github.com/elastic/kibana.git
```

### 2. Install Node.js

**Using Node Version Manager (Recommended):**
```bash
# Install nvm (if not already installed)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Use project's Node.js version
nvm use
# Or explicitly: nvm install $(cat .node-version)
```

**Manual Installation:**
Check `.node-version` file for the exact version and install from [nodejs.org](https://nodejs.org/).

### 3. Install Yarn Package Manager

```bash
# Install yarn globally
npm install -g yarn

# Verify minimum version (1.22.19+)
yarn --version

# Upgrade if needed (avoid 2.x versions)
yarn set version 1.22.19
```

### 4. Bootstrap Dependencies

```bash
# Install all dependencies and link packages
yarn kbn bootstrap
```

**What this does:**
- Installs npm dependencies
- Links internal packages
- Builds TypeScript definitions
- Sets up development tools

> [!NOTE]
> **Build Tools:** Follow [node-gyp installation guide](https://github.com/nodejs/node-gyp#installation) if you encounter native module compilation errors.

## Running the Development Environment

### Start Elasticsearch

**Terminal 1 - Basic Elasticsearch:**
```bash
# Start with open source license
yarn es snapshot

# Start with trial license (includes all features)
yarn es snapshot --license trial
```

**Advanced Elasticsearch Options:**
```bash
# Preserve data between restarts
yarn es snapshot --dataArchive

# Run specific version
yarn es snapshot --version 8.15.0

# Connect to remote Elasticsearch
export ELASTICSEARCH_HOSTS=https://your-es-cluster.com:9200
```

### Start Kibana Development Server

**Terminal 2 - Basic Kibana:**
```bash
# Start Kibana development server
yarn start

# Include example plugins
yarn start --run-examples

# Access at http://localhost:5601
# Login: elastic / changeme
```

**Development Server Features:**
- **Hot Reloading:** Automatic server restarts on code changes
- **Live Reload:** Browser refresh on frontend changes
- **Source Maps:** Full debugging support
- **Development Mode:** Unoptimized bundles for faster builds

### Verify Setup

```bash
# Check Kibana is running
curl http://localhost:5601/api/status

# View logs for debugging
tail -f logs/kibana.log
```

## Development Workflow

### Code Changes and Hot Reloading

**Server-side Changes:**
- Plugin server code: Automatic restart
- Core server code: Automatic restart
- Configuration: Manual restart required

**Client-side Changes:**
- React components: Live reload
- CSS/SCSS: Instant update
- TypeScript: Recompilation + reload

### Git Pre-commit Hooks (Recommended)

```bash
# Install pre-commit hook
node scripts/register_git_hook

# Runs automatically on commit:
# - ESLint checks
# - File case validation
# - TypeScript compilation
# - Basic formatting
```

**Manual Quality Checks:**
```bash
# Run linting
yarn lint

# Run type checking
yarn type-check

# Run tests
yarn test:jest
yarn test:ftr
```

## Development Container (Alternative Setup)

### VS Code Dev Container Setup

Perfect for consistent environments across teams and machines.

**Prerequisites:**
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
- [VS Code](https://code.visualstudio.com/) with Dev Containers extension

### Configuration

1. **Create environment file:**
   ```bash
   cp .devcontainer/.env.template .devcontainer/.env
   # Edit .env with your preferences
   ```

2. **Choose mounting strategy:**

   **Option A: Local Filesystem (Recommended)**
   - Clone repo locally
   - Open in VS Code
   - Select "Reopen in Container" when prompted
   - Git credentials automatically mounted

   **Option B: Docker Volume**
   - Use Command Palette (`F1`)
   - Run "Dev Containers: Clone Repository in Named Container Volume"
   - Enter: `https://github.com/elastic/kibana.git`
   - Configure git credentials manually

   **Option C: Pull Request Testing**
   - Use Command Palette (`F1`)
   - Run "Dev Containers: Clone GitHub Pull Request in Named Container Volume"
   - Test PRs in isolation

### Container Features

**Automatic Setup:**
- Ubuntu 22.04 base image
- Correct Node.js and Yarn versions
- All development dependencies
- Runs `yarn kbn bootstrap` on startup

**Specialized Support:**
- **FIPS Mode:** Set `FIPS=1` in `.env` for compliance testing
- **Extensions:** Pre-configured VS Code extensions for Kibana development
- **Environment Isolation:** No impact on host system

### Container Development

```bash
# Inside container terminal
yarn es snapshot          # Start Elasticsearch
yarn start --run-examples # Start Kibana with examples

# All normal development commands work
yarn test:jest
yarn lint
```

**Troubleshooting Containers:**
- Container build fails: Retry build (VS Code reconnection issue)
- Slow performance: Allocate more Docker resources
- Port conflicts: Check `.env` configuration

## Advanced Development Setup

### Multiple Kibana Instances

```bash
# Run on different ports
yarn start --port 5602 --elasticsearch.hosts http://localhost:9201

# Run different branches simultaneously
git worktree add ../kibana-feature feature-branch
cd ../kibana-feature
yarn kbn bootstrap
yarn start --port 5603
```

### Custom Configuration

**Create `config/kibana.dev.yml`:**
```yaml
# Custom development configuration
server.port: 5601
elasticsearch.hosts: ["http://localhost:9200"]

# Enable development features
logging.loggers:
  - name: plugins.myPlugin
    level: debug

# Custom plugin paths
path.plugins: ["../my-external-plugins"]

# HTTPS development
server.ssl.enabled: true
server.ssl.certificate: config/server.crt
server.ssl.key: config/server.key
```

### Performance Optimization

**Fast Development Mode:**
```bash
# Skip optimization for faster builds
yarn start --dev --no-optimizer

# Watch mode for specific packages only
yarn kbn watch --include @kbn/ui-shared-deps-npm

# Increase Node.js memory
export NODE_OPTIONS="--max-old-space-size=8192"
yarn start
```

**IDE Configuration:**
```json
// VS Code settings.json
{
  "typescript.preferences.includePackageJsonAutoImports": "off",
  "typescript.suggest.autoImports": false,
  "search.exclude": {
    "**/node_modules": true,
    "**/target": true,
    "**/.yarn": true
  }
}
```

## Common Issues and Solutions

### Build Failures

**Clear All Caches:**
```bash
yarn kbn clean
rm -rf node_modules
yarn kbn bootstrap
```

**TypeScript Issues:**
```bash
# Clear TypeScript cache
node scripts/type_check.js --clean-cache

# Rebuild type definitions
yarn kbn bootstrap --force
```

### Port Conflicts

```bash
# Check what's using port 5601
lsof -i :5601

# Kill process
kill -9 <PID>

# Or use different port
yarn start --port 5602
```

### Memory Issues

```bash
# Increase Node.js heap size
export NODE_OPTIONS="--max-old-space-size=8192"

# Monitor memory usage
yarn start --verbose
```

### Network Issues

**Corporate Proxy:**
```bash
# Configure yarn for proxy
yarn config set https-proxy http://proxy.company.com:8080
yarn config set http-proxy http://proxy.company.com:8080

# Set npm proxy
npm config set https-proxy http://proxy.company.com:8080
npm config set http-proxy http://proxy.company.com:8080
```

**SSL Certificate Problems:**
```bash
# Development only - disable SSL verification
export NODE_TLS_REJECT_UNAUTHORIZED=0
```

## Next Steps

**Ready to Develop:**
1. [Create your first plugin](hello_world_plugin.md)
2. [Learn about plugin architecture](anatomy_of_a_plugin.md)
3. [Understand development best practices](best_practices.md)

**Testing Your Setup:**
1. Navigate to http://localhost:5601
2. Login with `elastic` / `changeme`
3. Try creating a simple visualization
4. Make a small code change and verify hot reload

**Getting Help:**
- [Troubleshooting guide](troubleshooting.md)
- [Kibana Discussions](https://github.com/elastic/kibana/discussions)
- [Development Documentation](https://www.elastic.co/guide/en/kibana/current/development.html)