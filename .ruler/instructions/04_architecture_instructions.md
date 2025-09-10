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
│   └── test/                   # X-Pack functional and API integration tests
├── .buildkite/                 # CI/CD pipeline definitions
├── .devcontainer/              # Development container configuration
├── .es/                        # Cached snapshots of Elasticsearch and serverless cluster state
├── .github/                    # GitHub configuration files and workflows
├── .moon/                      # Moonrepo tasks for monorepo management
├── api_docs/                   # API documentation for Kibana plugins and packages
├── config/                     # Configuration files (kibana.yml, etc.)
├── dev_docs/                   # Development documentation
├── examples/                   # Core platform development examples
├── kbn_pm/                     # CLI tool for Kibana development. Includes bootstrap, clean, etc
├── packages/                   # Shared packages between all Kibana plugins
├── scripts/                    # Build and utility scripts
```

### Configuration Files
- **Main Config:** `config/kibana.yml`
- **TypeScript:** `tsconfig.json`, `tsconfig.base.json`
- **ESLint:** `.eslintrc.js`, `.eslintignore`
- **Package:** `package.json` (main), plus per-package configs

## CI

### Buildkite Pipelines (.buildkite/)
**Pre-Checks Phase**
- Build Kibana Distribution
- Quick checks (reference .buildkite/scripts/steps/checks/quick_checks.txt)
- ESLint (with auto-fix on PRs)
- TypeScript type checking
- OAS Snapshot validation
- OpenAPI Code Generation
- Saved Objects mappings and definition validation

**Testing Phase**
- Jest unit tests
- Jest integration tests
- FTR tests - `api_integration` and `ui` flavors
- Cypress tests for Security solution
- Build Storybooks