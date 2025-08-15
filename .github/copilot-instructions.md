# Kibana Development Guide for Coding Agents

## Repository Overview

Kibana is a browser-based analytics dashboard for Elasticsearch (~74k TypeScript/JavaScript files, 1.7GB monorepo).

**Key Technologies:** Node.js (check `.nvmrc`/`.node-version`), Yarn ^1.22.19, TypeScript/React, microservice plugin architecture

## Branch Management & Version Control

**CRITICAL:** Always validate your branch aligns with your task. Check active branches in `versions.json` (current: 9.2.0/main, 9.1.x, 8.19.x, etc.).

```bash
git branch -a && cat versions.json  # Check branches and versions
```

**Backporting:** Use `yarn backport` to backport commits from `main` to release branches. Configuration in `.backportrc.json` defines target branches and auto-merge settings.

## Critical Setup Requirements

**Environment Setup:**
```bash
nvm use                      # Use exact Node version from .nvmrc
yarn kbn bootstrap          # REQUIRED first step - installs deps and builds packages
```

**Bootstrap Clean Commands:**
```bash
yarn kbn clean              # Clear build artifacts and cached packages/plugins
yarn kbn reset              # Full reset (deletes node_modules and build artifacts)
```

**Common Issues:** If bootstrap fails with integrity errors: `yarn cache clean && yarn kbn clean`, then retry.

## Build & Development Commands

```bash
# Development
yarn es snapshot             # Start Elasticsearch
yarn start                   # Start Kibana dev server (localhost:5601)
yarn serverless             # Serverless variants: serverless-es, serverless-oblt, serverless-security

# Testing - CRITICAL: NEVER remove code/tests to make tests pass. Only refactor or replace.
yarn test:jest              # Unit tests
yarn test:jest_integration  # Integration tests
yarn test:ftr               # Functional tests (api_integration & ui flavors)
yarn test:type_check        # TypeScript type checking

# Linting & Build
yarn lint                   # Run all linters
node scripts/eslint_all_files --fix  # Auto-fix ESLint
yarn build                  # Production build
```

## Development Container Setup

**Process:** Ubuntu 22.04 container with Node.js, Yarn, Docker-in-Docker, FIPS support.

```bash
cp .devcontainer/.env.template .devcontainer/.env  # Set FIPS=0/1
# VS Code: Command Palette → "Dev Containers: Reopen in Container"
# Auto-runs: NODE_OPTIONS='' yarn kbn bootstrap && Xvfb setup
# Inside container: yarn es snapshot (terminal 1), yarn start (terminal 2)
```

## Functional Test Runner (FTR)

**Architecture:** Build Plugins (`node scripts/build_kibana_platform_plugins`) → Start Test Server → Run Config → Execute Tests

```bash
# Build plugins first (required)
node scripts/build_kibana_platform_plugins
# Or specific: node scripts/build_kibana_platform_plugins --scan-dir x-pack/solutions/observability

# Run FTR tests
yarn test:ftr --config x-pack/solutions/observability/plugins/synthetics/e2e/config.ts
yarn test:ftr:server         # Start server only
yarn test:ftr:runner         # Direct test runner
```

**Test Types:** API Integration (REST endpoints) and UI Functional (interface interactions). Configs hierarchical - base configs provide shared settings, runnable configs extend for specific suites.

## Project Architecture

```
src/                         # Core platform (core/, dev/, platform/, cli_*)
x-pack/                      # Commercial features
├── solutions/               # Security, Observability, Search, Chat
├── platform/               # X-Pack platform plugins
├── test/                    # X-Pack tests
├── test_serverless/         # Serverless tests
└── examples/               # X-Pack examples
examples/                    # Core examples
packages/                    # Shared packages
config/                      # Configuration (kibana.yml)
scripts/                     # Build and utility scripts
```

## CI/CD & Validation

**Buildkite Checks:** Bootstrap, ESLint (auto-fix on PRs), Stylelint, TypeScript, Jest (parallel), FTR tests (api_integration/ui), file casing, license headers, bundle size limits.

**Quick Validation:**
```bash
yarn kbn bootstrap && node scripts/quick_checks && node scripts/eslint_all_files --no-cache
```

## Code Review Guidelines

**Architecture Focus:** Plugin placement (src/platform/, x-pack/platform/, x-pack/solutions/), API consistency, performance/bundle size, accessibility (ARIA, keyboard nav).

**Kibana Patterns:** Service injection, RxJS observables, plugin lifecycle (setup/start/stop), Elasticsearch client usage.

**Common Issues:** Missing tests, hardcoded strings (use i18n), direct DOM manipulation (use React), missing telemetry, bundle size increases without lazy loading.

**Review Tools:**
```bash
yarn test:jest --config path/to/jest.config.js  # Run unit tests for specific project
yarn test:type_check --project path/to/tsconfig.json  # Check types for specific project
node scripts/eslint.js [options] [<file>...]  # Lint specific files
```

## Development Best Practices

**File Organization:** Follow casing conventions (`src/dev/precommit_hook/casing_check_config.js`), place plugins appropriately, use TypeScript for new code.

**Testing:** Co-locate unit tests (`*.test.ts`), integration tests in `integration_tests/`, functional tests in `test/` directories.

**Quality:** ESLint auto-fix on PRs, TypeScript strict mode, use existing shared packages, maintain backward compatibility.

## Trust These Instructions

These instructions are based on comprehensive repository analysis and current CI pipeline configuration. Only search for additional information if these instructions are incomplete or found to be incorrect for your specific use case. The build system is complex but well-documented - following this guide will save significant exploration time.