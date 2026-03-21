# Kibana

## Environment Requirements
- Node.js version: 22.22.0 (check `.node-version` or `package.json` engines field)
- Yarn version: ^1.22.19
- Required tools: `git`, `yarn`
- Memory: 8GB+ RAM recommended
- Disk space: ~10GB for dependencies + build artifacts

## Setup
- Run `yarn kbn bootstrap` for initial setup, after switching branches, or when encountering dependency errors

## Quick Start
```bash
# Start Kibana development server (stateful)
yarn start

# Start with serverless mode
yarn serverless              # Generic serverless
yarn serverless-es           # Elasticsearch serverless
yarn serverless-oblt         # Observability serverless
yarn serverless-security     # Security serverless

# View at http://localhost:5601
# Default credentials: elastic/changeme
```

## Git Worktrees (Performance Optimized)
When creating worktrees for isolated development, use sparse-checkout for faster setup:

```bash
# 1. Create worktree (this will be slow - 30-60s for full 104k+ file checkout)
git worktree add /Users/patrykkopycinski/Projects/kibana.worktrees/<branch-name> -b <branch-name>

# 2. Switch to worktree and enable sparse-checkout
cd /Users/patrykkopycinski/Projects/kibana.worktrees/<branch-name>
git sparse-checkout init --cone

# 3. Set directories to check out (NOTE: directories only, not individual files)
# Root-level files (.gitignore, package.json, etc.) are automatically included
git sparse-checkout set \
  x-pack/platform/packages/shared/<your-package> \
  scripts \
  .github

# 4. Add more directories as needed
git sparse-checkout add x-pack/solutions/<another-package>

# 5. Run bootstrap in the worktree
yarn kbn bootstrap
```

**Why:** While initial worktree creation is slow (full checkout), sparse-checkout dramatically reduces disk usage and makes subsequent operations (git status, switching files) much faster.

**Tradeoff:** Initial creation still slow, but ongoing work is faster. Alternative: Use `--no-checkout` flag and manually configure sparse-checkout before any checkout (advanced).

**When to use:**
- Creating new packages
- Working on isolated features that don't require full codebase
- Want faster git operations after initial setup

**When NOT to use:**
- Need to run full test suite across entire codebase
- Working on changes spanning many packages
- Frequently need to reference code in other areas

## Overview
- Kibana is organized into modules, each defined by a `kibana.jsonc`: core, packages, and plugin packages. Aside from tooling and testing, most code lives in these modules.
- Packages are reusable units with explicit boundaries and a single public entry point (no subpath imports), usually with a focused purpose.
- Plugins are a package type (`type: "plugin"`) that include a plugin class with setup/start/stop lifecycles, utilized by the core platform to enable applications.
- Plugins that depend on other plugins rely on the contracts returned by those lifecycles, so circular dependencies must be avoided.
- Module IDs (typically `@kbn/...`) live in `kibana.jsonc`; `package.json` names are derived where present.
- Plugin IDs are additional camelCase IDs under `plugin.id` in `kibana.jsonc`, used by core platform and other plugins.
- Modules are grouped by domain (platform vs solutions) with visibility rules (`shared` vs `private`) that limit cross-group access.
- Utility scripts live in `scripts/` (e.g., `node scripts/generate.js`).
- If a user correction contradicts this doc or any skills you followed, or missing guidance caused avoidable work, submit DevEx feedback: `echo "..." | scripts/devex_feedback.sh` (include the gap and suggested fix).

### Key Directories
- `src/` - Core Kibana platform
- `x-pack/` - Commercial features and solutions
- `packages/` - Shared packages (platform-agnostic utilities)
- `x-pack/platform/packages/` - Platform-level packages
- `x-pack/solutions/` - Solution-level packages (Security, Observability, Search, etc.)
- `scripts/` - Build and utility scripts
- `test/` - Integration and functional tests
- `config/` - Server configuration

## Design & Planning Methodology

### OpenSpec (Required for Complex Work)

**All design work MUST use OpenSpec methodology** instead of manual spec documents.

OpenSpec provides:
- **Artifact evolution**: Delta specs track changes systematically vs static docs
- **Task breakdown**: Actionable implementation tasks with verification
- **Traceability**: Clear history of design decisions and rationale
- **Validation**: Built-in checks that implementation matches design

#### When to Use OpenSpec (Auto-Required)

The `openspec-advisor` skill automatically detects when OpenSpec is needed:

✅ **Required**:
- Multi-file features (3+ files)
- Architectural decisions or new abstractions
- Cross-package changes
- Features with trade-offs or multiple approaches
- User says "plan", "design", "implement X system"

❌ **Skip** (direct implementation):
- Single file fixes, typos, config tweaks
- 1-2 file changes with obvious approach

#### Quick Start

```bash
# Claude auto-routes - just describe your work:
"Implement feature X"  → openspec-advisor decides automatically

# Or explicitly start:
/openspec-new-change     # Step-by-step artifact creation
/openspec-ff-change      # Fast-forward (create all artifacts)
/openspec-explore        # Exploratory thinking mode
```

#### OpenSpec Structure

Changes live in `openspec/changes/<name>/`:
```
1-proposal.md    # What and why
2-specs.md       # Requirements and scope
3-design.md      # Architecture and approach
4-tasks.md       # Implementation checklist
```

After merge, archived to `openspec/archive/<name>/`

#### ⚠️ Critical Rules

- **Never write code before artifacts are ready** (proposal → specs → design → tasks)
- **Never commit `openspec/` to main branch** (local artifacts only)
- For worktrees: symlink `openspec/specs/` to main repo, but keep `changes/` independent
- After PR merge: run `/openspec-archive-change` to finalize

#### Legacy Specs

`docs/superpowers/specs/` is **deprecated**. See README there for migration details.

## Testing
Always run `node scripts/check_changes.ts` to validate your changes

### Jest unit
`yarn test:jest [--config=<pathToConfigFile>] [TestPathPattern]`
- Config is auto-discovered from the test file path (walks up to nearest `jest.config.js`). Simplest usage:
  `yarn test:jest src/core/packages/http/server-internal/src/http_server.test.ts`
- Only one `--config` per run. To test multiple packages, run separate commands.

### Jest integration
`yarn test:jest_integration [--config=<pathToConfigFile>] [TestPathPattern]`
- Auto-discovers `jest.integration.config.js` (not `jest.config.js`). Same single-config constraint as above.

### Function Test Runner (FTR)
`yarn test:ftr [--config <file1> [--config <file2> ...]]`
- For new tests, prefer using Scout

### Scout (UI/API with Playwright)
`node scripts/scout run-tests --arch stateful --domain classic --config <scoutConfigPath>` (or `--testFiles <specPath1,specPath2>`)

## Code Style Guidelines
Follow existing patterns in the target area first; below are common defaults.

### Type check
`yarn test:type_check [--project path/to/tsconfig.json]`
- Without `--project` it checks **all** projects (very slow). Always scope to a single project:
  `yarn test:type_check --project src/core/packages/http/server-internal/tsconfig.json`
- Only one `--project` per run. To check multiple packages, run separate commands.

### TypeScript & Types
- Use TypeScript for all new code; avoid `any` and `unknown`.
- Prefer explicit return types for public APIs and exported functions.
- Use `import type` for type-only imports.
- Avoid non-null assertions (`!`) unless locally justified.
- Prefer `readonly` and `as const` for immutable structures.
- Prefer const arrow functions
- Prefer explicit import/exports over "*"
- Prefer destructuring of variables, rather than property access
- Never suppress type errors with `@ts-ignore`, `@ts-expect-error`; fix the root cause.

### Linting
`node scripts/eslint --fix $(git diff --name-only)`
- Never suppress linting errors with `eslint-disable`; fix the root cause.

### Formatting
- Follow existing formatting in the file; do not reformat unrelated code.
- Prefer single quotes in TS/JS unless the file uses double quotes.

### Naming
- `PascalCase` for classes, types, and React components.
- `camelCase` for functions, variables, and object keys.
- New filenames must be `snake_case` (lowercase with underscores) unless an existing convention requires otherwise.
- Use descriptive names; avoid single-letter names outside tight loops.

### Control Flow & Error Handling
- Prefer early returns and positive conditions.
- Handle errors explicitly; return typed errors from APIs when possible.
- Keep async logic linear; avoid nested `try` blocks when possible.

### React / UI Conventions
- Use functional components; type props explicitly.
- Keep hooks at the top level; avoid conditional hooks.
- Avoid inline styles unless consistent with the file’s conventions.
- Use `@elastic/eui` components with Emotion (`@emotion/react`) for styling.

## Validation & Pre-commit Checks
Always validate your changes before committing:

```bash
# 1. Type check (scoped to your package for speed)
yarn test:type_check --project path/to/your/tsconfig.json

# 2. Lint changed files
node scripts/eslint --fix $(git diff --name-only)

# 3. Run affected tests
yarn test:jest path/to/your/package

# 4. Check for circular dependencies (if adding new package)
node scripts/check_circular_deps.js

# 5. Validate all changes together
node scripts/check_changes.ts
```

**Critical:** Never skip validation steps. Failing tests or type errors in CI waste team time. Run checks locally first.

**For new packages specifically:**
- Verify package builds: `node scripts/build_packages.js --package @kbn/your-package`
- Verify no circular deps: `node scripts/check_circular_deps.js`
- Verify CODEOWNERS entry exists
- Run full package test suite before pushing

**Common build commands:**
```bash
# Build specific package
node scripts/build_packages.js --package @kbn/your-package

# Build all packages
yarn build

# Build API docs
yarn build:apidocs
```

## Contribution Hygiene
- Unsure: read more code; if still stuck, ask w/ short options. Never guess.
- Fix root cause (not band-aid).
- Make focused changes; avoid unrelated refactors.
- Update docs and tests when behavior or usage changes.
- Never remove, skip, or comment out tests to make them pass; fix the underlying code.
