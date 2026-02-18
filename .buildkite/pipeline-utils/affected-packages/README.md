# Affected Package Detection

Generic utilities for detecting which packages have been affected by changes in a PR, allowing filtering of any files (test configs, build targets, etc.) to only those in affected packages and their downstream dependents.

## CLI Usage

### List Affected Packages

```bash
.buildkite/scripts/list-affected-packages [options]
```

**Options:**
- `--deep` - Include downstream dependencies (default: only directly changed packages)
- `--json` - Output as JSON array (default: one package per line)
- `--merge-base <commit>` - Git commit to compare against (default: `GITHUB_PR_MERGE_BASE` env var or `main`)
- `--strategy <git|moon>` - Strategy to use (default: `git`)

**Examples:**

```bash
# List directly affected packages
.buildkite/scripts/list-affected-packages

# Include downstream dependencies
.buildkite/scripts/list-affected-packages --deep

# JSON output
.buildkite/scripts/list-affected-packages --deep --json

# Custom merge base
.buildkite/scripts/list-affected-packages --merge-base HEAD~10

# Use Moon strategy
.buildkite/scripts/list-affected-packages --strategy moon --deep
```

## Programmatic Usage

### Get Affected Packages

```typescript
import { getAffectedPackages } from '../affected-packages';

const affectedPackages = await getAffectedPackages(
  'main',  // merge base
  {
    strategy: 'git',
    includeDownstream: true,
    logging: false
  }
);
// Returns: Set<string> of package IDs
```

### Filter Files by Affected Packages

```typescript
import { getAffectedPackagesForFiltering, filterFilesByAffectedPackages } from '../affected-packages';

// Step 1: Get affected packages (handles all edge cases)
const affectedPackages = await getAffectedPackagesForFiltering(
  process.env.GITHUB_PR_MERGE_BASE
);
// Returns: Set<string> | null
// - Set<string>: affected package IDs
// - null: skip filtering (disabled/no merge base/critical files changed)

// Step 2: Filter any file list
const filteredFiles = filterFilesByAffectedPackages(
  allFiles,  // Can be test configs, build targets, etc.
  affectedPackages
);
```

### Use Cases

- **Test filtering**: Filter Jest/FTR configs to run only affected tests
- **Build optimization**: Build only affected packages
- **Linting**: Lint only affected packages
- **Type checking**: Type check only affected packages

## Environment Variables

### Generic Variables (Recommended)
- **`AFFECTED_STRATEGY`** - Strategy: `'git'` | `'moon'` | `'disabled'` (default: `'git'`)
- **`AFFECTED_DOWNSTREAM`** - Include downstream: `'true'` | `'false'` (default: `'true'`)
- **`AFFECTED_LOGGING`** - Detailed logging: `'true'` | `'false'` (default: `'true'`)

### Legacy Variables (Backwards Compatible)
- `JEST_AFFECTED_STRATEGY` - Falls back to if `AFFECTED_STRATEGY` not set
- `JEST_AFFECTED_DOWNSTREAM` - Falls back to if `AFFECTED_DOWNSTREAM` not set
- `JEST_AFFECTED_LOGGING` - Falls back to if `AFFECTED_LOGGING` not set

## How It Works

### Git Strategy
1. Get changed files via `git diff`
2. Map files to packages using `package.json`
3. Optionally traverse downstream dependency graph (from `moon.yml` and `tsconfig.json`)

**Performance**: ~100-300ms

### Moon Strategy
1. Query Moon with `--affected [--downstream deep]`
2. Filter to packages with `jest-unit-tests` tag
3. Return affected package IDs

**Performance**: ~2-4 seconds

### Critical Path Detection
Returns `null` (skip filtering) if critical files change:
- `.buildkite/`, `scripts/jest.js`
- `package.json`, `yarn.lock`
- `tsconfig.json`, `.moon/workspace.yml`

This ensures that changes to infrastructure or build tooling trigger full test runs.
