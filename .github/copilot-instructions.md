# Kibana Development Guide for Coding Agents

## Repository Overview

Kibana is a browser-based analytics and search dashboard for Elasticsearch, consisting of approximately 74,000 TypeScript/JavaScript files spanning 1.7GB. This is a large, complex monorepo with strict build requirements and extensive CI validation.

**Key Technologies:**
- **Runtime:** Node.js (exact version required, check `.nvmrc` and `.node-version`)
- **Package Manager:** Yarn ^1.22.19 (Yarn 2.0+ not supported)
- **Primary Languages:** TypeScript, JavaScript (React for frontend)
- **Architecture:** Microservice plugin architecture with shared core platform

## Branch Management & Version Control

### Active Branches
The repository maintains multiple active branches defined in `versions.json` in the root directory. This file changes frequently and contains:
- Current major/minor versions (e.g., 9.2.0 on main, 9.1.x, 9.0.x)
- Previous major versions (e.g., 8.19.x, 8.18.x, 8.17.x)
- Legacy versions (e.g., 7.17.x)

**CRITICAL:** Always validate that your current branch aligns with your assigned task. Tasks may target specific version branches, not just `main`.

```bash
# Check current branch and available versions
git branch -a
cat versions.json
```

### Backporting Process
Backporting commits from `main` to release branches is handled by the `backport` tool:

```bash
# Backport a commit interactively (recommended)
yarn backport

# Backport specific commits to specific branches
yarn backport --sha <commit-sha> --branch 8.19 --branch 9.1

# Use backport script directly
node scripts/backport
```

The `.backportrc.json` configuration defines:
- Target branch choices (matches `versions.json`)
- Auto-merge settings (enabled with squash method)
- PR description templates with commit tracking

**Backport Workflow:**
1. Merge your changes to `main` first
2. Run `yarn backport` to select commits and target branches
3. Tool automatically creates backport PRs with proper labels
4. Monitor auto-merge process or resolve conflicts manually

## Critical Setup Requirements

### Environment Setup
**ALWAYS** use the exact Node.js version specified in `.nvmrc` or `.node-version`:
```bash
# Install/use the required Node version (check .nvmrc file)
nvm use
# or install if not available: nvm install $(cat .nvmrc)
```

**NEVER** skip the bootstrap process - it's required for any other commands to work:
```bash
yarn kbn bootstrap
```

**Common Bootstrap Issues:**
- If bootstrap fails with integrity errors, run: `yarn cache clean && yarn kbn clean`
- If running as root: add `--allow-root` flag
- Force dependency reinstall with: `yarn kbn bootstrap --force-install`

**Bootstrap Clean Commands:**
```bash
yarn kbn clean              # Clear build artifacts and cached packages/plugins
yarn kbn reset              # Full reset (deletes node_modules and build artifacts)
```

## Build & Development Commands

### Bootstrap (REQUIRED FIRST STEP)
```bash
yarn kbn bootstrap          # Install deps and build packages
yarn kbn bootstrap --quiet  # Suppress verbose output
```

### Development Server
```bash
yarn es snapshot            # Start Elasticsearch (separate terminal)
yarn start                  # Start Kibana dev server (localhost:5601)
yarn start --run-examples   # Include developer examples
```

### Serverless Variants
```bash
yarn serverless             # Generic serverless mode
yarn serverless-es          # Elasticsearch serverless
yarn serverless-oblt        # Observability serverless
yarn serverless-security    # Security serverless
```

### Testing
```bash
yarn test:jest              # Unit tests
yarn test:jest_integration  # Integration tests
yarn test:ftr               # Functional tests (FTR - has api_integration & ui flavors)
yarn test:type_check        # TypeScript type checking
```

**CRITICAL TESTING RULE:** NEVER remove code or tests to make tests pass. Only refactor them or replace them with completely new tests to maintain code coverage. Deleted tests represent lost validation of critical functionality.

### Linting & Code Quality
```bash
yarn lint                   # Run all linters
yarn lint:es                # ESLint only
yarn lint:style             # Stylelint only
node scripts/eslint_all_files --fix  # Auto-fix ESLint issues
```

### Build & Clean
```bash
yarn build                  # Production build
```

## Functional Test Runner (FTR) - Comprehensive Guide

FTR tests are critical for Kibana QA and come in two main flavors: `api_integration` and `ui` tests. They require building plugins, starting servers, and running specific configurations.

### FTR Architecture
```
Build Kibana Plugins → Start Test Server → Run Test Config → Execute Tests
```

### Core FTR Commands
```bash
# Main FTR commands
yarn test:ftr                    # Run functional tests
yarn test:ftr:runner             # Direct test runner
yarn test:ftr:server             # Start FTR server only

# Run specific config (example with actual runnable config)
yarn test:ftr --config x-pack/solutions/observability/plugins/synthetics/e2e/config.ts

# Run specific test file
yarn test:ftr --config path/to/config.ts --grep "test name"
```

### FTR Test Types

FTR tests come in two main flavors, each with hierarchical configuration:

**API Integration Tests:**
- Test REST API endpoints without browser interaction
- Configuration hierarchy: Base configs provide shared settings, runnable configs extend them for specific test suites

**UI Functional Tests:**
- Test user interface interactions with browser automation
- Configuration hierarchy: Base configs provide shared settings, runnable configs extend them for specific test suites

### Writing FTR Tests

**1. Test Configuration Structure:**
```typescript
// config.ts example
import { FtrConfigProviderContext } from '@kbn/test';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const baseConfig = await readConfigFile(require.resolve('../config.base.ts'));
  
  return {
    ...baseConfig.getAll(),
    testFiles: [require.resolve('./my_test_suite')],
    kbnTestServer: {
      ...baseConfig.get('kbnTestServer'),
      serverArgs: [
        ...baseConfig.get('kbnTestServer.serverArgs'),
        '--custom.setting=value',
      ],
    },
  };
}
```

**2. Test Implementation:**
```typescript
// test.ts example
export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common', 'dashboard']);

  describe('My Feature', () => {
    it('should work correctly', async () => {
      await PageObjects.common.navigateToApp('dashboard');
      await testSubjects.click('myButton');
      // assertions...
    });
  });
}
```

### FTR Development Workflow

**1. Build and Start:**
**Critical Build Step:** FTR tests require building Kibana plugins first
```bash
# Build Option A: Build all platform plugins (required for FTR tests)
node scripts/build_kibana_platform_plugins

# Build Option B: Build specific plugins by name, including any dependencies (faster for targeted testing)
node scripts/build_kibana_platform_plugins --focus securitySolution

# Start Option A: Start server and run tests separately
yarn test:ftr:server --config path/to/config.ts
yarn test:ftr:runner --config path/to/config.ts

# Start Option B: Run server and runner together
yarn test:ftr --config path/to/config.ts
```

**2. Debug FTR Tests:**
```bash
# Run with debug output
yarn test:ftr --config path/to/config.ts --debug

# Run specific test pattern
yarn test:ftr --config path/to/config.ts --grep "my test pattern"

# Keep browser open for debugging
yarn test:ftr --config path/to/config.ts --debug --bail
```

### Common FTR Issues
- **Bootstrap Required:** Always run `yarn kbn bootstrap` before FTR tests
- **Server Conflicts:** Ensure no other Kibana instances running on 5601
- **ES Dependencies:** Some tests require specific Elasticsearch setup
- **Browser Dependencies:** UI tests need proper display/browser setup
- **Config Inheritance:** Verify config extends correct base configuration

```

## Project Architecture

### Directory Structure
```
kibana/
├── src/                        # Core Kibana platform
│   ├── cli/                    # CLI command implementations
│   ├── cli_encryption_keys/    # Encryption key CLI tools
│   ├── cli_health_gateway/     # Health gateway CLI
│   ├── cli_keystore/           # Keystore CLI tools
│   ├── cli_plugin/             # Plugin CLI tools
│   ├── cli_setup/              # Setup CLI tools
│   ├── cli_verification_code/  # Verification code CLI
│   ├── core/                   # Core services and APIs
│   ├── dev/                    # Development tools and utilities
│   ├── platform/               # Platform-level packages/plugins
│   └── setup_node_env/         # Node.js environment setup
├── x-pack/                     # Commercial/licensed features
│   ├── build_chromium/         # Chromium build artifacts
│   ├── dev-tools/              # X-Pack development tools
│   ├── examples/               # X-Pack development examples
│   ├── packages/               # X-Pack specific packages
│   ├── performance/            # Performance testing tools
│   ├── platform/               # X-Pack platform plugins
│   ├── scripts/                # X-Pack specific scripts
│   ├── solutions/              # Solution-specific plugins (Security, Observability, Search, Chat)
│   ├── test/                   # X-Pack functional and API integration tests
│   └── test_serverless/        # Serverless-specific tests
├── dev_docs/                   # Development documentation
├── .buildkite/                 # CI/CD pipeline definitions
├── .devcontainer/              # Development container configuration
├── config/                     # Configuration files (kibana.yml, etc.)
├── examples/                   # Core platform development examples
├── packages/                   # Shared packages
├── scripts/                    # Build and utility scripts
```

### Plugin Organization
- **Core:** `src/core/`
- **Platform:** `src/platform/` and `x-pack/platform/`
- **Solutions:** `x-pack/solutions/{security,observability,search,chat}/`
- **Examples:** `examples/` and `x-pack/examples/`

### Configuration Files
- **Main Config:** `config/kibana.yml`
- **TypeScript:** `tsconfig.json`, `tsconfig.base.json`
- **ESLint:** `.eslintrc.js`, `.eslintignore`
- **Styling:** `.stylelintrc`, `.prettierrc`
- **Package:** `package.json` (main), plus per-package configs

## CI/CD & Validation

### Buildkite Pipelines (.buildkite/)
**Pre-commit Checks:**
- Bootstrap validation
- ESLint (with auto-fix on PRs)
- Stylelint
- TypeScript type checking
- File casing validation
- License header checks
- Bundle size limits

**Testing Phases:**
- Jest unit tests (parallel execution)
- Jest integration tests
- Functional Test Runner (FTR) tests - `api_integration` and `ui` flavors
- Playwright tests for specific features

### Quick Validation Workflow
```bash
# Run the same checks as CI
yarn kbn bootstrap
node scripts/quick_checks
node scripts/eslint_all_files --no-cache
node scripts/stylelint
node scripts/type_check
```

## Common Issues & Solutions

### Bootstrap Failures
```bash
# Clean state and retry
yarn cache clean
yarn kbn clean
yarn kbn bootstrap --force-install
```

### TypeScript Issues
```bash
# Clear TS cache
node scripts/type_check.js --clean-cache
# Full repository reset if needed
git clean -fdx -e /config -e /.vscode
```

### Node Version Mismatch
- Error: `The engine "node" is incompatible with this module`
- Solution: Use the exact Node version via `nvm use` (check `.nvmrc` file for version)

### Dependency Issues
- Check `yarn.lock` for integrity issues
- Run `yarn kbn bootstrap --force-install` for clean reinstall
- Verify Yarn version: `yarn --version` (must be 1.22.x)

## Development Best Practices

### File Organization
- Follow existing casing conventions (mostly lowercase, some exceptions documented in `src/dev/precommit_hook/casing_check_config.js`)
- Place new plugins in appropriate solution/platform directories
- Use TypeScript for new code unless specific JS requirement exists

### Testing Strategy
- Unit tests: Co-locate with source files (`*.test.ts`)
- Integration tests: Use dedicated `integration_tests/` directories
- Functional tests: Configure in appropriate `test/` directories
- Always run tests before submitting changes

### Code Quality
- ESLint auto-fix is enabled on PRs: `node scripts/eslint_all_files --fix`
- Follow TypeScript strict mode conventions
- Use existing shared packages before creating new ones
- Maintain backward compatibility for public APIs

## Code Review Guidelines
These guidelines are in addition to the Development Best Practices section

### Review Focus Areas
**Architecture & Design**
- Plugin placement: Ensure new plugins are in appropriate directories (`src/platform/`, `x-pack/platform/`, `x-pack/solutions/`)
- API design: Check for consistent patterns with existing Kibana APIs
- Performance impact: Review bundle size changes and lazy loading usage
- Accessibility: Verify ARIA labels, keyboard navigation, and screen reader compatibility

**Code Quality Checks**
- Error handling: Proper error boundaries and user-friendly error messages
- Security considerations: Input validation, privilege escalation prevention

**Kibana-Specific Patterns**
- Service injection: Use dependency injection patterns consistently
- Observable patterns: RxJS usage following Kibana conventions
- Elasticsearch integration: Proper client usage and query patterns
- Plugin lifecycle: Correct setup/start/stop implementation

### Common Review Issues
- Missing or inadequate tests (especially for edge cases)
- Hardcoded strings instead of i18n keys
- Direct DOM manipulation instead of React patterns
- Missing telemetry for new features
- Inconsistent naming conventions (check `casing_check_config.js`)
- Bundle size increases without lazy loading consideration

### Review Tools & Commands
```bash
# Run affected tests only
yarn test:jest --config path/to/jest.config.js

# Check type coverage for specific project only
yarn test:type_check --project path/to/changed/tsconfig.json

# Lint specific files
node scripts/eslint.js [options] [<file>...]
```

## Trust These Instructions

These instructions are based on comprehensive repository analysis and current CI pipeline configuration. Only search for additional information if these instructions are incomplete or found to be incorrect for your specific use case. The build system is complex but well-documented - following this guide will save significant exploration time.