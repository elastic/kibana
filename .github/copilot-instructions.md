# Kibana Development Guide for Coding Agents

## Repository Overview

Kibana is a browser-based analytics and search dashboard for Elasticsearch, consisting of approximately 74,000 TypeScript/JavaScript files spanning 1.7GB. This is a large, complex monorepo with strict build requirements and extensive CI validation.

**Key Technologies:**
- **Runtime:** Node.js (exact version required, check `.nvmrc` and `.node-version`)
- **Package Manager:** Yarn ^1.22.19 (Yarn 2.0+ not supported)
- **Primary Languages:** TypeScript, JavaScript (React for frontend)
- **Architecture:** Microservice plugin architecture with shared core platform

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

## Project Architecture

### Directory Structure
```
kibana/
├── src/                    # Core Kibana platform
│   ├── core/              # Core services and APIs
│   ├── platform/          # Platform-level packages/plugins
│   └── cli*/              # Command-line tools
├── x-pack/                # Commercial/licensed features
│   ├── platform/          # X-Pack platform plugins
│   ├── solutions/         # Solution-specific plugins (Security, Observability)
│   ├── test/              # X-Pack functional and API integration tests
│   ├── test_serverless/   # Serverless-specific tests
│   └── examples/          # X-Pack development examples
├── examples/              # Core platform development examples
├── packages/              # Shared packages
├── config/                # Configuration files (kibana.yml, etc.)
├── scripts/               # Build and utility scripts
├── .buildkite/            # CI/CD pipeline definitions
└── dev_docs/              # Development documentation
```

### Plugin Organization
- **Core Platform:** `src/platform/plugins/`
- **X-Pack Platform:** `x-pack/platform/plugins/`
- **Solutions:** `x-pack/solutions/{security,observability,search}/`
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

### GitHub Actions (.github/workflows/)
- Auto-approve backports
- Documentation builds
- Security scanning (CodeQL)
- Dependency health evaluation

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

### Review Focus Areas
**Architecture & Design**
- Plugin placement: Ensure new plugins are in appropriate directories (`src/platform/`, `x-pack/platform/`, `x-pack/solutions/`)
- API design: Check for consistent patterns with existing Kibana APIs
- Performance impact: Review bundle size changes and lazy loading usage
- Accessibility: Verify ARIA labels, keyboard navigation, and screen reader compatibility

**Code Quality Checks**
- TypeScript usage: Prefer TypeScript over JavaScript for new code
- Testing coverage: Unit tests co-located with source, integration tests in dedicated directories
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
# Check bundle size impact
yarn build --analyze

# Run affected tests only
yarn test:jest --testPathPattern=path/to/changed/files

# Check type coverage
yarn test:type_check --project path/to/changed/tsconfig.json

# Lint specific files
node scripts/eslint_all_files path/to/files --fix
```

## Trust These Instructions

These instructions are based on comprehensive repository analysis and current CI pipeline configuration. Only search for additional information if these instructions are incomplete or found to be incorrect for your specific use case. The build system is complex but well-documented - following this guide will save significant exploration time.