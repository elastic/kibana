# Kibana Development Guide for Coding Agents

> **Mission-Critical Software:** This codebase serves millions of users. Quality and correctness are paramount. You have unlimited time and resources - work methodically and thoroughly. **NEVER rush, skip verification, or compromise on quality.**

## Repository Overview

Kibana is a browser-based analytics and search dashboard for Elasticsearch, consisting of approximately 74,000 TypeScript/JavaScript files. This is a large, complex monorepo with strict build requirements and extensive CI validation.

**Key Technologies:**

- **Runtime:** Node.js 22.17.1 (exact version in `.nvmrc`)
- **Package Manager:** Yarn ^1.22.19 (Yarn 2.0+ not supported)
- **Primary Languages:** TypeScript, JavaScript (React for frontend)
- **Architecture:** Plugin-based with shared core platform

**📚 Quick Navigation:**

- 🚨 **Pre-commit verification** → [MANDATORY VERIFICATION](#mandatory-verification-before-each-commit) (start here!)
- 🏗️ **Architecture & code structure** → [Project Structure](#project-structure-overview)
- 🧪 **Testing** → [Testing Requirements](#testing-requirements)
- 🛠️ **Development commands** → [Development Commands](#development-commands)
- 📖 **Deep dives on concepts** → `dev_docs/` directory

---

## MANDATORY VERIFICATION BEFORE EACH COMMIT

⚠️ **CRITICAL - YOUR WORKFLOW MUST BE: CHANGE → VERIFY → COMMIT → REPEAT** ⚠️

**Each batch of changes is a COMMIT. Each commit requires verification. DO NOT commit broken code.**

### Core Principles: Time, Completeness, and Verification

**This is complex, mission-critical software serving millions. Taking hours to get it right is EXPECTED and ENCOURAGED.**

**Working Approach:**

- ✅ Work carefully and thoroughly - NO time constraints or token limits or iteration limits exist
- ✅ Read large files completely - understand context and architecture before changing
- ⛔ NEVER say "Given time constraints", "Due to token usage", "Let me work faster", "Due to limited iterations" or alike and don't act as if it's true - these do NOT apply
- ⛔ NEVER rush or panic when encountering complex code - take time to understand it

**Definition of "Complete":**

⚠️ **Complete = ALL THREE verification steps pass with ZERO errors/failures:**

1. **Linting:** 0 errors
2. **Type checking:** 0 errors
3. **Testing:** 0 failures

**There is no partial completion, no "mostly done", no "core vs non-core" distinction.**

**⛔ NEVER rationalize incomplete work by saying:**

- "The core/main/bulk of work is done" (while leaving ANY work unfinished)
- "Linting/types/tests mostly pass, just a few need fixes" (fix ALL of them NOW)
- "General migration is done, minor adjustments needed" (those adjustments ARE the work)
- "All files migrated except some may need adjustments" (then they're NOT migrated)

**✅ Work is ONLY complete when:**

- Linting: 0 errors (ZERO, not "mostly clean")
- Type checking: 0 errors (ZERO, not "mostly correct")
- Testing: 0 failures (ZERO, not "most tests pass")
- ALL affected files work correctly
- NO manual adjustments needed by anyone else

**If ANY lint/type/test error exists, or ANY work remains - it is NOT complete.**

**Remember: Correctness > Speed. Completeness > Partial. 100% > "Mostly".**

### The Required Workflow

```
1. Make changes to files
2. Run verification checks (below) on changed files
3. ALL checks MUST pass with 0 errors
4. Commit the changes
5. Move to next batch of changes
```

**✅ REQUIRED VERIFICATION FOR EACH COMMIT:**

Verify **only the files you changed in this commit**:

1. **Branch validation:** Verify you're on the correct branch (`git branch --show-current`)
2. **Bootstrap check:** Run `yarn kbn bootstrap` if any dependencies changed
3. **Linting (scoped):** Run ESLint only on changed files - MUST pass with 0 errors

   ```bash
   # Lint specific files or directories you just changed
   node scripts/eslint --fix path/to/changed/file.ts path/to/changed/dir/

   # Or use git to get staged/changed files
   node scripts/eslint --fix $(git diff --name-only --diff-filter=ACMR "*.ts" "*.tsx" "*.js")
   ```

4. **Type checking (scoped):** Check types only for affected project(s) - MUST pass with 0 errors

   ```bash
   # Pass closest tsconfig.json file to your changed tests/helpers
   node scripts/type_check --project path/to/closest/tsconfig.json
   ```

5. **Unit tests (scoped):** Run tests only for affected code - MUST pass with 0 failures

   ```bash
   # Run tests for specific files/directories you changed
   yarn test:jest path/to/changed/file.test.ts
   yarn test:jest x-pack/platform/plugins/your_plugin

   # Run tests matching a pattern
   yarn test:jest --testPathPattern=your_plugin
   ```

6. **Integration/FTR tests (if applicable):** If modified code has FTR tests, run the specific test suite

   ```bash
   # Run specific FTR config
   yarn test:ftr --config path/to/your/test/config.ts
   ```

   (Note: FTR auto-builds plugins; manual build only for Cypress tests)

**CRITICAL RULES:**

- ⛔ **DO NOT** commit if ANY of the three verification steps fail - fix ALL issues first
- ⛔ **DO NOT** remove tests or disable lint/type rules to make verification pass - fix the underlying issues
- ⛔ **DO NOT** accumulate multiple unverified changes before committing
- ⛔ **DO NOT** say "I'll fix it later" or use phrases like "mostly passes", "core work done", "minor adjustments needed"
- ✅ **MUST** run ALL THREE verification steps for every commit
- ✅ **MUST** stop and fix if ANY verification step fails - do not continue to next task
- ✅ **MUST** achieve 0 lint errors + 0 type errors + 0 test failures before committing
- ✅ **MUST** include verification command outputs in commit messages

### When Submitting PR

Your PR description should summarize all the verification you already did for each commit. Since you verified each commit, the PR should be clean.

If you cannot run a command due to environment limitations, explicitly state this and request manual verification before committing.

---

## Branch Management & Version Control

### Active Branch Validation

**IMPORTANT:** Validate current branch matches your assigned task when starting work AND before committing (see MANDATORY VERIFICATION section).

The repository maintains multiple branches defined and categorized in `versions.json` by `branchType`:

- Active Development: `main` (for all changes including new features and breaking changes. No commits allowed directly, use PRs)
- Current and maintained release branches (for backporting fixes/docs/tests/security and dependency updates)
- Legacy unmaintained branches (for historical reference, no commits allowed)

```bash
# Check current branch
git branch --show-current
cat versions.json  # See all active branches and their versions
```

### Backporting Process

**PRIMARY METHOD - Automated via GitHub Labels (Recommended):**

1. MUST merge to `main` first
2. Add labels to your PR **before merging**:
   - `backport:version` + version labels (e.g., `v9.2.0`, `v9.1.0`, `v8.19.0`)
   - OR `backport:all-open` to automatically backport to all generally available versions
3. After merge, CI automatically creates backport PRs with proper labels
4. Review and merge the auto-created backport PRs (resolve conflicts if needed)
5. Use `backport:skip` label if PR does not require backporting

**ALTERNATIVE METHOD - Manual Backport Tool:**

If you need to backport manually after merge (e.g., missed labels):

```bash
# Interactive backport (select commits and branches)
node scripts/backport
# or: yarn backport (uses the backport package)

# Backport specific commit to specific branches
node scripts/backport --sha <commit-sha> --branch 9.2 --branch 9.1
```

**Important Notes:**

- **Features** should NOT be backported to release branches
- **Bug fixes** can be backported if safe and appropriate
- **Documentation changes** can be backported to any branch
- **Breaking changes** can ONLY go to `main`

## Environment Setup - CRITICAL REQUIREMENTS

### Node.js Version - MANDATORY REQUIREMENT

⚠️ **REQUIRED:** Use the EXACT Node.js version specified in `.nvmrc` (currently 22.17.1).

**This is not optional. Wrong Node version WILL cause build failures.**

```bash
# Check and use required version
cat .nvmrc
nvm use
# or install: nvm install $(cat .nvmrc)
```

**Common error:** "The engine 'node' is incompatible with this module"  
**Solution:** Run `nvm use` to switch to the correct Node version (22.17.1).

### Package Manager - MANDATORY REQUIREMENT

⚠️ **REQUIRED:** Yarn ^1.22.19 (Yarn 2.0+ is NOT supported)

**Using wrong Yarn version WILL break bootstrap.**

**Version check:**

```bash
yarn --version  # Should show 1.22.x
```

### Bootstrap - REQUIRED FIRST STEP

⚠️ **CRITICAL:** NEVER skip bootstrap - all other commands depend on it.

**You MUST run this first. Every. Single. Time. After dependency changes.**

See MANDATORY VERIFICATION section for when to re-run.

```bash
yarn kbn bootstrap          # REQUIRED - Install deps and build packages
yarn kbn bootstrap --quiet  # REQUIRED - Suppress verbose output
```

**Bootstrap troubleshooting:**

```bash
# If bootstrap fails with integrity errors
yarn cache clean && yarn kbn clean
yarn kbn bootstrap --force-install

# If running as root
yarn kbn bootstrap --allow-root

# Full repository reset (last resort)
git clean -fdx
yarn cache clean
yarn kbn clean
yarn kbn bootstrap --force-install
```

## Development Commands

### Build Commands

```bash
# Build ALL platform plugins (needed for Cypress/E2E tests, NOT needed for FTR)
node scripts/build_kibana_platform_plugins

# Build specific plugins by name + dependencies (faster for targeted testing)
node scripts/build_kibana_platform_plugins --focus securitySolution

# Production build
yarn build
```

**When to build plugins manually:**

- **Cypress/E2E tests:** ⚠️ REQUIRED - Always build before running
- **FTR tests:** NOT required (Kibana auto-builds via optimizer when started)
- **Development:** NOT required - `yarn start` automatically builds plugins via the optimizer

**DO NOT waste time building plugins for FTR tests - it's automatic.**

### Development Servers

```bash
# Start Elasticsearch (in separate terminal)
yarn es snapshot
# With trial license for commercial features
yarn es snapshot --license trial

# Start Kibana dev server (localhost:5601)
yarn start
yarn start --run-examples   # Include developer examples
yarn start --no-base-path   # Disable basePath

# Serverless variants
yarn serverless             # Generic serverless mode
yarn serverless-es          # Elasticsearch serverless
yarn serverless-oblt        # Observability serverless
yarn serverless-security    # Security serverless
yarn serverless-workplace-ai # Workplace AI serverless
```

### Testing Commands

```bash
# Unit tests (REQUIRED before each commit - see MANDATORY VERIFICATION section)
yarn test:jest
yarn test:jest --watch  # Watch mode for development

# Integration tests
yarn test:jest_integration

# Functional tests - requires bootstrap (plugins auto-build in dev mode)
# OPTION 1: Full cycle (all-in-one)
yarn test:ftr               # Starts servers, runs tests, tears down (from source OR built distribution)

# OPTION 2: Development workflow (RECOMMENDED for fast iteration)
yarn test:ftr:server        # Starts servers, keeps them running, auto-restarts Kibana on changes
yarn test:ftr:runner        # Runs tests against running servers (repeat as needed)

# Type checking (REQUIRED before each commit - see MANDATORY VERIFICATION section)
yarn test:type_check

# Run specific FTR config (example paths - works with ANY config)
yarn test:ftr --config x-pack/platform/test/api_integration/config.ts  # Stateful
yarn test:ftr --config x-pack/platform/test/serverless/functional/configs/observability/config.group1.ts  # Serverless

# Run specific test pattern (use runner for speed)
yarn test:ftr:runner --config path/to/config.ts --grep "test name"

# Debug FTR with browser open and stop on first failure
yarn test:ftr --config path/to/config.ts --debug --bail

# Advanced: Run with serverless ES or built distribution
yarn test:ftr --config path/to/config.ts --esFrom serverless
yarn test:ftr --config path/to/config.ts --kibana-install-dir /path/to/build
```

### Linting & Code Quality - REQUIRED BEFORE EACH COMMIT

```bash
# Run all linters (REQUIRED before each commit - see MANDATORY VERIFICATION section)
yarn lint
# This runs: yarn lint:es && yarn lint:style

# ESLint with auto-fix (REQUIRED before each commit - see MANDATORY VERIFICATION section)
node scripts/eslint_all_files --fix

# ESLint via yarn script
yarn lint:es

# ESLint specific files
node scripts/eslint [options] [<file>...]

# ESLint with type information (advanced)
node scripts/eslint_with_types
node scripts/eslint_with_types --fix

# Style linting only
yarn lint:style

# Type checking (see MANDATORY VERIFICATION section)
node scripts/type_check
yarn test:type_check  # Alternative via yarn

# Clear TypeScript cache if needed
node scripts/type_check --clean-cache
```

### Clean Commands

```bash
yarn kbn clean              # Deletes output directories and resets internal caches
yarn kbn reset              # Full reset (deletes node_modules, output directories, and all caches)
```

## Testing Requirements

### General Rules - CRITICAL

⚠️ **ABSOLUTE RULE:** NEVER remove code or tests to make verification pass.

**This is the #1 mistake agents make. DO NOT do it.**

- ✅ **DO:** Refactor tests to match new behavior
- ✅ **DO:** Replace tests with equivalent/better tests
- ✅ **DO:** Fix the code to satisfy type checking and linting
- ⛔ **DO NOT:** Delete failing tests
- ⛔ **DO NOT:** Comment out failing tests
- ⛔ **DO NOT:** Skip failing tests with `.skip()`
- ⛔ **DO NOT:** Use `@ts-ignore` or `@ts-expect-error` to hide type errors
- ⛔ **DO NOT:** Disable lint rules to hide lint errors

Deleted tests, ignored types, and disabled linters represent lost validation of critical functionality. Fix the underlying issues.

### Test Types & Locations

**Core test types:**

- **Unit tests:** Co-located with source (`*.test.ts`) - Run: `yarn test:jest`
- **Integration tests:** `**/integration_tests/**/*.test.{js,mjs,ts,tsx}` - Run: `yarn test:jest_integration`
- **FTR tests:** `x-pack/platform/test/` and solution-specific `test/` directories
- **Cypress tests:** Require `node scripts/build_kibana_platform_plugins` before running

See `dev_docs/` for complete test directory structure details.

### FTR (Functional Test Runner) Quick Reference

**CRITICAL RULES - READ BEFORE TOUCHING FTR:**

- ⚠️ **REQUIRED:** Run `yarn kbn bootstrap` first - FTR will fail without it
- ⚠️ **DO NOT** manually build plugins for FTR - it auto-builds (only Cypress needs manual builds)
- ⚠️ **DO NOT** modify base configs - create new runnable configs that extend them
- ⚠️ **DO NOT** skip FTR tests if you modified code with FTR coverage

See `dev_docs/` for comprehensive FTR guides and troubleshooting.

## Project Structure Overview

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
├── .es/                        # Cached ES/serverless snapshots
├── .github/                    # GitHub configuration & workflows
├── .moon/                      # Moonrepo tasks for monorepo management
├── api_docs/                   # API documentation for plugins and packages
├── config/                     # Configuration files (kibana.yml, etc.)
├── dev_docs/                   # Development documentation
├── examples/                   # Core platform development examples
├── kbn_pm/                     # CLI tool (bootstrap, clean, etc.)
├── packages/                   # Shared packages (all plugins)
└── scripts/                    # Build and utility scripts
```

**Key configuration files:**

- `config/kibana.yml` - Main Kibana configuration
- `config/serverless.*.yml` - Serverless project configs
- `tsconfig.json`, `tsconfig.base.json` - TypeScript configs
- `.eslintrc.js` + `.prettierrc` - Code quality
- `kibana.jsonc` per plugin/package - Plugin manifests
- `versions.json` - Active branch versions

For complete structure details, see `dev_docs/key_concepts/` directory.

## CI/CD Validation

### Buildkite Pipeline Phases

The CI runs these checks on every PR. **If you followed MANDATORY VERIFICATION for each commit, CI should pass.**

⚠️ **DO NOT** rely on CI to catch errors. Verify locally before each commit.

**Pre-Checks Phase:**

- Quick checks: `yarn quick-checks`
- ESLint: `yarn lint:es`
- TypeScript: `yarn test:type_check`
- OAS Snapshot validation
- OpenAPI Code Generation
- Saved Objects validation

**Testing Phase:**

- Jest unit tests
- Jest integration tests
- FTR tests (api_integration and ui)
- Cypress tests (Security solution)

### Local Validation

⚠️ **CRITICAL:** For each commit, use the **MANDATORY VERIFICATION** section which scopes checks to affected files only.

**DO NOT run full repository checks unless absolutely necessary** - they take hours. The commands below run full repository checks (only useful for large refactors or reproducing CI exactly).

```bash
# Full repository validation (SLOW - only if needed)
yarn kbn bootstrap
yarn quick-checks         # Quick pre-commit checks
yarn lint:es             # Lint all files (slow)
yarn test:type_check     # Check all types (slow)
yarn test:jest           # Run all tests (very slow)
```

**For typical changes:** See **MANDATORY VERIFICATION** section for scoped commands.

## Development Best Practices

### Working with Large Files & Complex Changes

This is a large codebase (~74,000 files). You will regularly encounter large files (1000+ lines) and complex architectural patterns. **This is normal and expected.**

**When working with large or complex code:**

1. **READ COMPLETELY:** Read entire files to understand context, patterns, and architecture
2. **ANALYZE PATTERNS:** Identify existing conventions, naming patterns, and code organization
3. **UNDERSTAND DEPENDENCIES:** Trace imports, exports, and relationships before changing
4. **PLAN THOROUGHLY:** Think through implications across the codebase, consider edge cases
5. **MAKE PRECISE EDITS:** Preserve existing patterns and style, avoid unnecessary changes
6. **VERIFY COMPREHENSIVELY:** Test all affected code paths, not just the changed lines

**Decision Framework:**

- **Understanding > Assumptions:** Take time to understand rather than guessing
- **Completeness > Partial:** Finish tasks fully rather than leaving them partially done
- **100% > "Mostly":** All verification passing > "mostly clean" or "core verification passing"
- **All Three Steps > Any Two:** Must pass linting AND type checking AND testing - no shortcuts
- **Zero Errors > "Minor Adjustments":** 0 lint + 0 type + 0 test errors > leaving ANY work for others
- **Verification > Hoping:** Run all three checks rather than assuming they pass
- **Quality > Quantity:** One properly completed task beats multiple rushed incomplete ones

### Critical Rules - NON-NEGOTIABLE

- ⚠️ **REQUIRED:** Use TypeScript for all new code (no JavaScript for new files)
- ⚠️ **REQUIRED:** Follow casing conventions - mostly snake_case (exceptions in `src/dev/precommit_hook/casing_check_config.js`)
- ⚠️ **REQUIRED:** Run ESLint auto-fix before committing (see MANDATORY VERIFICATION section)
- ⚠️ **REQUIRED:** Unit tests for all new code (see MANDATORY VERIFICATION section)
- ⛔ **DO NOT** reduce test coverage - maintain or improve it
- ⛔ **DO NOT** create new packages without checking for existing ones first

See `dev_docs/` for detailed guidance on:

- Plugin vs package decision tree (`dev_docs/key_concepts/kibana_platform_plugin_intro.mdx`)
- File organization and placement rules
- Code review guidelines
- Performance optimization patterns (`dev_docs/key_concepts/performance/`)
- Security and accessibility requirements

## Common Issues & Solutions

### Bootstrap Failures

```bash
# Integrity errors
yarn cache clean && yarn kbn clean
yarn kbn bootstrap --force-install

# Root user
yarn kbn bootstrap --allow-root

# Full reset (last resort)
git clean -fdx
yarn cache clean
yarn kbn clean
yarn kbn bootstrap --force-install
```

### TypeScript Issues

```bash
# Clear TS cache
node scripts/type_check.js --clean-cache

# Check specific project only
yarn test:type_check --project path/to/tsconfig.json
```

### Node Version Mismatch

```bash
# Error: "The engine 'node' is incompatible with this module"
nvm use  # Use version from .nvmrc
```

### FTR Test Failures

See `dev_docs/` for FTR troubleshooting guides.

## Additional Resources

### Development Documentation

The `dev_docs/` directory contains comprehensive guides:

- **Getting Started:** Environment setup, troubleshooting
- **Contributing:** Best practices, API design standards
- **Key Concepts:** Plugin architecture, saved objects, data views, performance, security
- **Tutorials:** Testing strategies, debugging, plugin development

**Critical concepts to understand:**

- **Saved Objects:** Primary data persistence mechanism
- **Plugin vs Package:** See `dev_docs/key_concepts/kibana_platform_plugin_intro.mdx`
- **Performance:** Bundle size, lazy loading, scalability (`dev_docs/key_concepts/performance/`)
- **Accessibility:** Follow EUI accessibility standards
- **Security:** Privilege models and input validation

## Final Checklist Before Submitting PR

⚠️ **ALL ITEMS REQUIRED - DO NOT SKIP** ⚠️

If you followed the MANDATORY VERIFICATION workflow (verify each commit), these should all be true:

- [ ] **REQUIRED:** Every commit was verified before committing (linting, type-check, tests)
- [ ] **REQUIRED:** All commits are on the correct branch (`git branch --show-current`)
- [ ] **REQUIRED:** Bootstrap was run when dependencies changed (`yarn kbn bootstrap`)
- [ ] **REQUIRED:** No tests were removed or disabled without replacement
- [ ] **REQUIRED:** PR description includes summary of verification done for each commit
- [ ] **REQUIRED:** Telemetry added for new features
- [ ] **REQUIRED:** Documentation updated if needed
- [ ] **REQUIRED:** Each commit message includes verification command outputs

**CRITICAL:** If you skipped verification for any commit, DO NOT submit the PR. Go back and verify each commit.

**The unit of work is a commit, not a PR.** Each commit must be verified individually. Your PR is just a collection of verified commits.

### Before Declaring ANY Work Complete

⚠️ **Review the "Core Principles" section above. Work is complete ONLY when:**

- [ ] Linting: 0 errors (every file you touched)
- [ ] Type checking: 0 errors (every type is correct)
- [ ] Testing: 0 failures (every test passes)
- [ ] No remaining work (no "minor fixes", "adjustments", or work left for others)

**If ANY of these shows errors/failures, or if ANY work remains - continue working. Do not rationalize partial completion.**

**Complete = 0 lint + 0 type + 0 test errors. Anything else = incomplete.**

---

## Trust These Instructions

These instructions are based on comprehensive repository analysis and current CI pipeline configuration. Everything you need for typical development work is here. Refer to `dev_docs/` for deep dives on architecture, plugin development, and advanced testing patterns.

**Remember:** You have unlimited time and resources. Work methodically, verify comprehensively (all 3 steps for every change), and never declare work complete until verification shows 0 errors. Mission-critical software demands nothing less.
