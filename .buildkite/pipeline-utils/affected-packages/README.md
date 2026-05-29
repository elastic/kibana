# Affected Package Detection

Generic utilities for detecting which packages have been affected by changes in a PR, allowing filtering of any files (test configs, build targets, etc.) to only those in affected packages and their downstream dependents.

## CLI Usage

### List Affected Packages

```bash
.buildkite/pipeline-utils/affected-packages/list_affected [options]
```

Each setting is resolved as **CLI flag > environment variable > default**.

**Options:**
- `--deep` - Include downstream dependencies
- `--json` - Output as JSON array (default: one package per line)
- `--merge-base <revision>` - Git revision to compare against
- `--strategy <git|moon>` - Strategy to use
- `--ignore <glob>` - Exclude changed files matching glob from detection (repeatable)
- `--ignore-uncategorized` - (git) Exclude `[uncategorized]` from output when changes are only in files outside any module
- `--help, -h` - Show help message

| Setting           | CLI flag                 | Env var                             | Default        |
|-------------------|--------------------------|-------------------------------------|----------------|
| Strategy          | `--strategy`             | `AFFECTED_STRATEGY`                  | `git`          |
| Downstream        | `--deep`                 | `AFFECTED_DOWNSTREAM`                | `false`        |
| Merge base        | `--merge-base`           | `GITHUB_PR_MERGE_BASE`              | `origin/main`  |
| Ignore            | `--ignore`               | `AFFECTED_IGNORE`                    | —              |
| Ignore uncategorized | `--ignore-uncategorized` | `AFFECTED_IGNORE_UNCATEGORIZED_CHANGES` | `false`     |

**Examples:**

```bash
# List directly affected packages
.buildkite/pipeline-utils/affected-packages/list_affected

# Include downstream dependencies
.buildkite/pipeline-utils/affected-packages/list_affected --deep

# JSON output
.buildkite/pipeline-utils/affected-packages/list_affected --deep --json

# Custom merge base
.buildkite/pipeline-utils/affected-packages/list_affected --merge-base HEAD~10

# Ignore documentation and config changes
.buildkite/pipeline-utils/affected-packages/list_affected --ignore '**/*.md' --ignore '**/*.txt'

# Ignore via environment (comma-separated)
AFFECTED_IGNORE='**/*.md,docs/**' .buildkite/pipeline-utils/affected-packages/list_affected

# Exclude [uncategorized] when only non-module files (scripts, root configs, etc.) changed
.buildkite/pipeline-utils/affected-packages/list_affected --ignore-uncategorized

# Use Moon strategy instead
.buildkite/pipeline-utils/affected-packages/list_affected --strategy moon --deep
```

## Programmatic Usage

### Get Affected Packages

```typescript
import { getAffectedPackages } from '../affected-packages';

const affectedPackages = await getAffectedPackages(
  'main',  // merge base
  {
    strategy: 'git',       // default, can also be 'moon'
    includeDownstream: true,
    ignorePatterns: ['**/*.md', 'docs/**'],
    ignoreUncategorizedChanges: false,
  }
);
// Returns: Set<string> of module IDs (e.g. "@kbn/core", "@kbn/my-plugin")
```

### Filter Files by Affected Packages

```typescript
import { getAffectedPackages, filterFilesByPackages } from '../affected-packages';

// Step 1: Get affected packages (handles all edge cases)
const affectedPackages = await getAffectedPackages(
  process.env.GITHUB_PR_MERGE_BASE
);
// Returns: Set<string> | null
// - Set<string>: affected package IDs
// - null: skip filtering (no merge base/critical files changed)

// Step 2: Filter any file list
const filteredFiles = filterFilesByPackages(
  allFiles,  // Can be test configs, build targets, etc.
  affectedPackages
);
```

### Use Cases

- **Test filtering**: Filter test configs to run only affected tests
- **Linting**: Lint only affected packages
- **Type checking**: Type check only affected packages

## Environment Variables

| Variable                           | Values                          | CLI default  | Programmatic default |
|------------------------------------|---------------------------------|--------------|----------------------|
| `AFFECTED_STRATEGY`                | `git`, `moon`                   | `git`        | `git`                |
| `AFFECTED_DOWNSTREAM`              | `true`, `false`                 | `false`      | `true`               |
| `AFFECTED_IGNORE`                  | comma-separated globs           | —            | —                    |
| `AFFECTED_IGNORE_UNCATEGORIZED_CHANGES` | `true`, `false`            | `false`      | `false`              |
| `GITHUB_PR_MERGE_BASE`             | any git ref                     | `origin/main`| —                    |

## How It Works

### Git Strategy (default)
1. Get changed files via `git diff`
2. Remove files matching any `--ignore` / `AFFECTED_IGNORE` glob patterns
3. Discover modules by scanning `kibana.jsonc` files across the repo
4. Map remaining changed files to modules (longest directory prefix match); files outside any module map to `[uncategorized]`
5. If `--ignore-uncategorized` / `AFFECTED_IGNORE_UNCATEGORIZED_CHANGES` is set, remove `[uncategorized]` from the result
6. Optionally traverse downstream dependency graph (from `tsconfig.json` `kbn_references`)

**Performance**: ~500ms (first call, includes module discovery); subsequent calls use cache

### Moon Strategy
1. Query Moon with `--affected [--downstream deep]`
2. Return affected project IDs

**Performance**: ~5-7 seconds

## PR Jest selective testing

On pull request builds, Jest unit and integration test groups are narrowed to configs under affected packages (see `pick_test_group_run_order` in CI stats). Add the GitHub label `ci:prevent-selective-testing` to run the full Jest suite instead. Touching files listed in `CRITICAL_FILES_JEST_*` in `const.ts` also skips filtering for the relevant test type.

## PR FTR solution-selective testing (opt-in)

FTR configs are **not** narrowed by affected packages by default (every PR runs the full enabled manifest set). Two opt-in PR labels change how FTR behaves when a PR's diff is confined to one or more **solutions** (`observability`, `security`, `search`, `workplaceai`, `vectordb`):

- `ci:skip-unaffected-ftr-configs` — drop the FTR configs of solutions the PR does not touch (only the touched solutions + `platform`/`base` manifests run).
- `ci:soft-fail-unaffected-ftr-configs` — keep running the untouched solutions' configs, but make their failures **non-blocking** (reported and annotated, but they don't fail the PR).

If both labels are present, skip wins. The implementation lives in `pick_test_group_run_order/selective_ftr.ts` and uses the affected-packages utilities here:

- A change is attributed to a solution by the module `group` from `kibana.jsonc` (via `getModuleGroup`) or, for files outside any module, by the `x-pack/solutions/<solution>/` path.
- The diff must be **fully** confined to solutions. The full FTR suite still runs (blocking) when any changed file maps to `platform`/shared or to no solution, when a downstream dependent lives in `platform`/an unknown group, or when a file in `CRITICAL_FILES_FTR` (`const.ts`) changes. This is safe because solutions are `visibility: private` and cannot depend on one another.

The non-blocking behaviour is enforced inside `.buildkite/scripts/steps/test/ftr_configs.sh`, which reads the `ftr_soft_fail_configs.json` artifact produced by `pick_test_group_run_order` and swallows (only) those configs' failures.
