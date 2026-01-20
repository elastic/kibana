# Kibana Development Guide for Coding Agents

> **Mission-Critical Software:** This codebase serves millions of users. Quality and correctness are paramount. You have unlimited time and resources - work methodically and thoroughly. **NEVER rush, skip verification, or compromise on quality. NEVER guess - if uncertain, investigate further to increase confidence.**

## Repository Overview

Kibana is a browser-based analytics and search dashboard for Elasticsearch, consisting of approximately 74,000 TypeScript/JavaScript files. This is a large, complex monorepo with strict build requirements and extensive CI validation.

**Key Technologies:**

- **Runtime:** Node.js (exact version required, check `.nvmrc` and `.node-version`)
- **Package Manager:** Yarn 1.22.22
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

- ✅ ALWAYS work carefully and thoroughly - NO time constraints or token limits or iteration limits exist
- ✅ ALWAYS read files completely (regardless of file size) - understand context and architecture before changing
- ✅ ALWAYS investigate further when uncertain - NEVER guess or assume
- ⛔ NEVER say "Given time constraints", "Due to token usage", "Let me work faster", "Due to limited iterations" or alike and don't act as if it's true - these do NOT apply
- ⛔ NEVER rush or panic when encountering complex code - take time to understand it

**Definition of "Complete":**

⚠️ **Complete = ALL THREE verification steps pass with ZERO errors:**

1. **Linting:** 0 errors
2. **Type checking:** 0 errors
3. **Testing:** 0 failures

**There is no partial completion, no "mostly done", no "primary vs remaining migration" distinction.**

**⛔ NEVER rationalize incomplete work by saying:**

- "The main/bulk of work is done" (while leaving ANY work unfinished)
- "Linting/types/tests mostly pass, just a few need fixes" (fix ALL of them NOW)
- "I'll fix the remaining issues later" (fix ALL of them NOW)
- "I'll convert any or unknown types later" (convert ALL of them NOW)
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
   # Lint changed files
   node scripts/eslint --fix $(git diff --name-only)
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

### When Submitting PR

Your PR description should summarize all the verification you already did for each commit. Since you verified each commit, the PR should be clean.

If you cannot run a command due to environment limitations, explicitly state this and request manual verification before committing.

---

## Branch Management & Version Control

### Active Branch Validation

**IMPORTANT:** Validate current branch matches your assigned task when starting work AND before committing (see MANDATORY VERIFICATION section).

The repository maintains multiple branches defined and categorized in `versions.json` by `branchType`:

- `branchType: "development"` → Branches like `main` (for new features and breaking changes)
- `branchType: "release"` → Maintained release branches (for backporting fixes/docs/tests/security and dependency updates)
- `branchType: "legacy"` → Unmaintained branches (for historical reference, no commits allowed)

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

If you need to backport manually due to failed backports:

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
- **Documentation changes** can be backported to relevant branches
- **Breaking changes** can ONLY go to `main`

## Environment Setup - CRITICAL REQUIREMENTS

### Node.js Version - MANDATORY REQUIREMENT

⚠️ **REQUIRED:** Use the EXACT Node.js version specified in `.nvmrc`

**This is not optional. Wrong Node version WILL cause build failures.**

```bash
# Check and use required version
cat .nvmrc
nvm use
# or install: nvm install $(cat .nvmrc)
```

**Common error:** "The engine 'node' is incompatible with this module"
**Solution:** Run `nvm use` to switch to the correct Node version

### Package Manager - MANDATORY REQUIREMENT

⚠️ **REQUIRED:** Yarn 1.22.22

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
yarn kbn reset
yarn kbn bootstrap --force-install
```

## Development Commands

### Build Commands

```bash
# Build ALL platform plugins (needed for Cypress/E2E tests, NOT needed for FTR)
node scripts/build_kibana_platform_plugins

# Build specific plugins by name + dependencies (faster for targeted testing)
node scripts/build_kibana_platform_plugins --focus securitySolution
```

**When to build plugins manually:**

- **Cypress/E2E tests:** ⚠️ REQUIRED - Always build before running
- **FTR tests:** NOT required (Kibana auto-builds via optimizer when started)
- **Development:** NOT required - `yarn start` automatically builds plugins via the optimizer

**DO NOT waste time building plugins for FTR tests - it's automatic.**

### Development Servers

**Stateful mode (standard development):**

```bash
# Start Elasticsearch (in separate terminal)
yarn es snapshot
# With trial license for commercial features
yarn es snapshot --license trial

# Start Kibana dev server (localhost:5601)
yarn start
yarn start --run-examples   # Include developer examples
yarn start --no-base-path   # Disable basePath
```

**Serverless mode (requires BOTH ES and Kibana in serverless with matching modes):**

```bash
# 1. FIRST: Start Elasticsearch in serverless mode (separate terminal)
# ES uses --projectType flag
yarn es serverless --projectType=oblt          # Observability
yarn es serverless --projectType=security      # Security
yarn es serverless --projectType=es            # Elasticsearch
yarn es serverless --projectType=workplaceai  # Workplace AI

# 2. THEN: Start Kibana in MATCHING serverless mode
# Kibana uses --serverless flag (NOT --projectType)
# The mode MUST match the ES projectType value
yarn serverless              # Generic (uses config or defaults to 'es')
yarn serverless-oblt         # Matches ES projectType=oblt
yarn serverless-security     # Matches ES projectType=security
yarn serverless-es           # Matches ES projectType=es
yarn serverless-workplace-ai # Matches ES projectType=workplaceai

# Login: elastic_serverless / changeme (or system_indices_superuser / changeme)
# Note: Cannot use basePath in serverless mode
```

### Testing Commands

```bash
# Unit tests (REQUIRED before each commit - see MANDATORY VERIFICATION section)
# Test specific files/directories you changed
yarn test:jest path/to/changed/file.test.ts
yarn test:jest x-pack/platform/plugins/your_plugin
yarn test:jest --watch path/to/your/code  # Watch mode for development

# Integration tests (specific paths)
yarn test:jest_integration path/to/integration_tests/

# Functional tests - requires bootstrap (plugins auto-build in dev mode)
# OPTION 1: Full cycle (all-in-one)
yarn test:ftr --config path/to/specific/config.ts  # Starts servers, runs tests, tears down

# OPTION 2: Development workflow (RECOMMENDED for fast iteration)
yarn test:ftr:server --config path/to/specific/config.ts  # Starts servers, keeps them running
yarn test:ftr:runner --config path/to/specific/config.ts  # Runs tests against running servers

# Type checking (REQUIRED before each commit - see MANDATORY VERIFICATION section)
# Check types for specific project only
node scripts/type_check --project path/to/plugin/tsconfig.json

# Run specific FTR config examples
yarn test:ftr --config x-pack/platform/test/api_integration/config.ts  # Stateful API tests
yarn test:ftr --config x-pack/platform/test/functional/config.base.js  # Stateful functional tests
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
# ESLint specific files/directories you changed (REQUIRED before each commit)
node scripts/eslint --fix path/to/changed/file.ts
node scripts/eslint --fix path/to/changed/directory/
node scripts/eslint --fix x-pack/platform/plugins/your_plugin

# ESLint multiple changed files (using git)
node scripts/eslint --fix $(git diff --name-only)

# ESLint with type information for specific project (advanced)
node scripts/eslint_with_types --project path/to/tsconfig.json
node scripts/eslint_with_types --fix --project path/to/tsconfig.json

# Type checking for specific project (REQUIRED before each commit)
node scripts/type_check --project path/to/plugin/tsconfig.json
node scripts/type_check --project x-pack/platform/plugins/your_plugin/tsconfig.json

# Style linting specific files
yarn lint:style path/to/changed/styles/

# Clear TypeScript cache if needed
node scripts/type_check --clean-cache

# Full repository linting (SLOW - only use for large refactors)
yarn lint  # Runs: yarn lint:es && yarn lint:style
node scripts/eslint_all_files --fix  # All files
node scripts/type_check  # All projects
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
- ⛔ **DO NOT:** Use `any`, `unknown`, `@ts-ignore` or `@ts-expect-error` to hide type errors
- ⛔ **DO NOT:** Disable lint rules to hide lint errors

Deleted tests, ignored types, and disabled linters represent lost validation of critical functionality. Fix the underlying issues.

### Test Types & Locations

**Core test types:**

- **Unit tests:** Co-located with source (`*.test.ts`) - Run: `yarn test:jest`
- **Integration tests:** `**/integration_tests/**/*.test.{js,mjs,ts,tsx}` - Run: `yarn test:jest_integration`
- **FTR tests:** `x-pack/platform/test/` and solution-specific `test/` directories (functional tests in `functional/` subdirs, API tests in `api_integration/` subdirs)
- **Cypress tests:** Require `node scripts/build_kibana_platform_plugins` before running

See `dev_docs/` for complete test directory structure details.

### FTR (Functional Test Runner) Quick Reference

**CRITICAL RULES - READ BEFORE TOUCHING FTR:**

- ⚠️ **REQUIRED:** Run `yarn kbn bootstrap` first - FTR will fail without it
- ⚠️ **DO NOT** manually build plugins for FTR - it auto-builds (only Cypress needs manual builds)
- ⚠️ **DO NOT** modify or run base configs - create new runnable configs that extend them
- ⚠️ **DO NOT** skip FTR tests if you modified code with FTR coverage

See `dev_docs/` for comprehensive FTR guides and troubleshooting.

## Project Structure Overview

**Key configuration files:**

- `config/kibana.yml` - Main Kibana configuration
- `config/serverless.*.yml` - Serverless project configs
- `tsconfig.json`, `tsconfig.base.json` - TypeScript configs
- `.eslintrc.js` + `.prettierrc` - Code quality
- `kibana.jsonc` per plugin/package - Plugin manifests
- `versions.json` - Active branch versions

For complete structure details, see `dev_docs/key_concepts/` directory.

## Validation

⚠️ **CRITICAL:** For each commit, use the **MANDATORY VERIFICATION** section which scopes checks to affected files only.

**DO NOT run full repository checks unless absolutely necessary** - they take hours. The commands below run full repository checks (only useful for large refactors or reproducing CI exactly).

```bash
# Full repository validation (SLOW - only if needed)
yarn kbn bootstrap
yarn quick-checks         # Quick pre-commit checks
yarn lint:es <path/to/file> # Lint specific file
yarn test:type_check --project path/to/plugin/or/package/tsconfig.json  # Type check specific project
yarn test:jest           # Run all tests (very slow)
```

**For typical changes:** See **MANDATORY VERIFICATION** section for scoped commands.

## Development Best Practices

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
- [ ] **REQUIRED:** PR description created using [this PR template](https://github.com/elastic/kibana/blob/main/.github/PULL_REQUEST_TEMPLATE.md)
- [ ] **REQUIRED:** Telemetry added for new features
- [ ] **REQUIRED:** Documentation updated if needed
- [ ] **REQUIRED:** Each commit message includes verification command outputs

**CRITICAL:** If you skipped verification for any commit, DO NOT submit the PR. Go back and verify each commit.

**The unit of work is a commit, not a PR.** Each commit must be verified individually. Your PR is just a collection of verified commits.

---

## Trust These Instructions

These instructions are based on comprehensive repository analysis and current
CI pipeline configuration. Everything you need for typical development work is
here. Refer to `dev_docs/` for deep dives on architecture, plugin development,
and advanced testing patterns.
