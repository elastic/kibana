# Affected Package Detection for Jest Tests

This module provides two strategies for detecting which packages have been affected by changes in a PR, allowing CI to run Jest tests only for affected packages and their downstream dependents.

## Usage

### Two-Step API

**Step 1: Get affected packages**
```typescript
import { getAffectedPackagesForFiltering } from '../affected-packages';

const affectedPackages = await getAffectedPackagesForFiltering(
  process.env.GITHUB_PR_MERGE_BASE
);
// Returns: Set<string> | null
// - Set<string>: affected package IDs
// - null: skip filtering (disabled/no merge base/critical files)
```

**Step 2: Filter configs**
```typescript
import { filterConfigsByAffectedPackages } from '../affected-packages';

const filteredUnitConfigs = filterConfigsByAffectedPackages(
  jestUnitConfigs,
  affectedPackages
);

const filteredIntegrationConfigs = filterConfigsByAffectedPackages(
  jestIntegrationConfigs,
  affectedPackages
);
```

## Environment Variables

- **`JEST_AFFECTED_STRATEGY`** - Strategy: `'git'` | `'moon'` | `'disabled'` (default: `'git'`)
- **`JEST_AFFECTED_DOWNSTREAM`** - Include downstream: `'true'` | `'false'` (default: `'true'`)
- **`JEST_AFFECTED_LOGGING`** - Detailed logging: `'true'` | `'false'` (default: `'true'`)

## Examples

```bash
# Use git strategy (default)
JEST_AFFECTED_STRATEGY=git

# Use Moon strategy
JEST_AFFECTED_STRATEGY=moon

# Disable filtering
JEST_AFFECTED_STRATEGY=disabled

# Without downstream dependencies
JEST_AFFECTED_DOWNSTREAM=false
```

## How It Works

### Git Strategy
1. Get changed files via `git diff`
2. Map files to packages using `@kbn/repo-packages`
3. Optionally traverse downstream dependency graph

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
