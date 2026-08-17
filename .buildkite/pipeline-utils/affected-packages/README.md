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
- `--ignore <glob>` - Exclude changed files matching glob from detection (repeatable; both strategies)
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
    ignorePatterns: ['**/*.md', 'docs/**'],  // applies to both strategies
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
1. Query Moon with `--affected [--downstream deep]`, pinning `MOON_BASE` to the merge base and
   `MOON_HEAD` to `HEAD`
2. When ignore patterns are set, ask Moon for its changed-file list, drop the ignored paths, and
   feed the remainder back on stdin
3. Return affected project IDs

**Performance**: ~5-7 seconds (~10-14s with ignore patterns, which costs a second Moon query)

> **`MOON_HEAD` matters.** Without it Moon diffs the *working tree* — including uncommitted and
> untracked files — instead of the checked-out commit. Any file an earlier CI step regenerates
> then counts as changed, and a single such file pulls in its whole downstream tree.

## PR Jest selective testing

On pull request builds, Jest unit and integration test groups are narrowed to configs under affected packages (see `pick_test_group_run_order` in CI stats). Add the GitHub label `ci:prevent-selective-testing` to run the full Jest suite instead. Touching files listed in `CRITICAL_FILES_JEST_*` in `const.ts` also skips filtering for the relevant test type.

### Always-run integration configs

Some integration suites boot a full Kibana and snapshot a *global registry* (rule-type params, connector types, task types, …) populated at runtime by downstream publishers that sit **upstream** of the suite's own package. `includeDownstream` expansion never reaches them, so a publisher-only change can silently skip the snapshot. Configs listed in `ALWAYS_RUN_JEST_INTEGRATION_CONFIGS` (`const.ts`) are re-added after affected-filtering so they run on every PR regardless of the graph. Keep the list tiny — it is a deliberate escape hatch.

## Scout selective testing: git -> Moon (shadow mode)

`resolve_selective_testing.ts` still uses **git** as the authoritative strategy (written to `.scout/code_changes.json`, no behavior change). In parallel, it runs the **Moon** strategy above for observation only, and writes the result plus a diff of `affectedModules` to `.scout/code_changes.moon_shadow.json` (uploaded as a Buildkite artifact). Mismatches are logged as a warning via `ToolingLog`; a Moon failure is swallowed and logged, never fails the build.

Both strategies are given the same `ignorePatterns` (`GENERATED_TEST_CONFIG_MANIFESTS`), otherwise the diff compares two different question — see below. Note that `changedFiles` is written **unfiltered**: the scope decision in `scout resolve-testing-scope` (critical-files / tests-only checks) still needs the real diff.

### Generated test config manifests

`test_run_builder.sh` runs `scout update-test-config-manifests` immediately before affected-module detection, rewriting `**/test/**/.meta` files in the working tree. Those manifests embed per-test line numbers, environment tags and expected status, so a regenerated one routinely differs from the committed copy. `GENERATED_TEST_CONFIG_MANIFESTS` (`const.ts`) excludes them from detection. This is safe: any real change behind a manifest update also appears as a spec-file change in the same diff.

Once shadow-mode data shows git and Moon agree across real PR traffic, Moon will become authoritative and the git path removed (follow-up change, not yet done).
