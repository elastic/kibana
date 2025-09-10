## Environment Setup
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
- If bootstrap fails with integrity errors, run: `yarn cache clean && yarn kbn reset`
- If running as root: add `--allow-root` flag
- Force dependency reinstall with: `yarn kbn bootstrap --force-install`


## Build & Development Commands

### Bootstrap (REQUIRED FIRST STEP)
```bash
yarn kbn bootstrap          # Install deps and build packages
yarn kbn bootstrap --quiet  # Suppress verbose output
```

### Bootstrap Clean
```bash
yarn kbn clean              # Clear build artifacts and cached packages/plugins
yarn kbn reset              # Full reset (deletes node_modules and build artifacts)
```

### Development Server
```bash
yarn es snapshot            # Start Elasticsearch (separate terminal)
yarn start                  # Start Kibana dev server (localhost:5601)
yarn start --run-examples   # Include developer examples
yarn start --no-base-path   # Disable basePath
```

### Serverless Variants
```bash
yarn serverless-es          # Elasticsearch serverless
yarn serverless-oblt        # Observability serverless
yarn serverless-security    # Security serverless
```

### Testing
```bash
yarn test:jest              # Unit tests
yarn test:jest_integration  # Integration tests
yarn test:jest --config path/to/jest.config.js # Run affected tests only (this applies to jest integration tests as well)
yarn test:ftr               # Functional tests (FTR - has api_integration & ui flavors)
```

### Linting & Code Quality
```bash
yarn lint                   # Run all linters
yarn lint:es                # ESLint only
yarn lint:style             # Stylelint only
node scripts/eslint_all_files --fix  # Auto-fix ESLint issues
node scripts/eslint.js [options] [<file>...] # Lint specific files
yarn test:type_check        # TypeScript type checking
yarn test:type_check --project path/to/changed/tsconfig.json # Check types for specific project only
```

### Build
```bash
yarn build                  # Production build
```

### Quick Validation Workflow
```bash
yarn kbn bootstrap # only needed if bootstrap hasn't been run yet
node scripts/quick_checks
node scripts/eslint.js [options] [<changed_file>...] # Lint changed files
yarn test:type_check --project path/to/changed/tsconfig.json # Check types for changed project only
```

## Common Issues & Solutions

### Bootstrap Failures
```bash
# Full repository reset if needed
git clean -fdx
# Clean state and retry
yarn kbn reset
yarn kbn bootstrap --force-install
```

### TypeScript Issues
```bash
# Clear TS cache
node scripts/type_check.js --clean-cache
```

### Node Version Mismatch
- Error: `The engine "node" is incompatible with this module`
- Solution: Use the exact Node version via `nvm use` (check `.nvmrc` file for version)