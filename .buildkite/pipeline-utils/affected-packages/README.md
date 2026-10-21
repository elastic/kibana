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

## PR and merge-queue Jest selective testing

On pull request builds, Jest unit and integration test groups are narrowed to configs under affected packages (see `pick_test_group_run_order` in CI stats). Add the GitHub label `ci:prevent-selective-testing` to run the full Jest suite instead. Touching files listed in `CRITICAL_FILES_JEST_*` in `const.ts` also skips filtering for the relevant test type.

Merge-queue builds select Jest unit tests affected by changes since the group's pinned base (`BUILDKITE_MERGE_QUEUE_BASE_COMMIT`), not the live target-branch comparison (`MERGE_QUEUE_MERGE_BASE`). If that base is missing or invalid, or CI cannot determine the comparison range, test selection fails.

The pick step lists the changed files once, with git resolving the comparison base and `moon query changed-files --base <base> --head <head>` listing the files (deleted files included), and shares that list between Jest selection, FTR selection and the Scout-only-diff check. The step skips bootstrap, so `pick_test_group_run_order.sh` installs the `@moonrepo/cli` version pinned in `package.json` on PR and merge-queue builds and passes it as `MOON_BIN`; a failed install fails the step. The PR pick step's sparse checkout includes `/.moon/` and `**/moon.yml`.

### Always-run integration configs

Some integration suites boot a full Kibana and snapshot a *global registry* (rule-type params, connector types, task types, …) populated at runtime by downstream publishers that sit **upstream** of the suite's own package. `includeDownstream` expansion never reaches them, so a publisher-only change can silently skip the snapshot. Configs listed in `ALWAYS_RUN_JEST_INTEGRATION_CONFIGS` (`const.ts`) are re-added after affected-filtering so they run on every PR regardless of the graph. Keep the list tiny — it is a deliberate escape hatch.

## PR FTR domain selection

`selective_ftr_domains.ts` (in `pick_test_group_run_order`) narrows FTR on pull request builds to the manifest domains (`ftr_{domain}_{arch}_configs.yml`) a diff can affect. It is controlled by `FTR_DOMAIN_SELECTION` on the PR pick step: `off`, `dry-run` (annotate what would be skipped, run everything), or `enabled`. On-merge and merge-queue builds always keep every domain, and `ci:prevent-selective-testing` turns it off.

- Changed files matching `FTR_IRRELEVANT_PATHS`, and modules in `FTR_EXCLUDED_MODULES`, are ignored.
- Every module in the downstream `kbn_references` closure of the remaining changed modules contributes its kibana.jsonc `group`: a solution group selects that solution's domain; `platform` selects `platform` and every `base` config.
- A manifest entry whose config file belongs to a closure module runs too, whichever manifest lists it.
- When `platform` is selected, platform-owned configs filed in solution manifests also run (for example `x-pack/platform/test/serverless/functional/configs/<solution>/*`). They exercise platform UIs inside each serverless project, and no test suite imports the plugins they cover.
- `FTR_ALWAYS_RUN_CONFIGS` run whenever any domain is selected. They assert runtime registries (task types, privileges, features) or load solution archives by path, so no `kbn_references` edge ties them to the solution plugins they depend on. Keep the list short.
- `base` serverless configs declare `project` (the solution of their `serverlessProject`) and also run when that solution is selected. Serverless projects only load `platform` plus their own group's plugins, so other solutions cannot affect them. An entry without `project` always runs.
- Every domain runs when an `FTR_CRITICAL_PATHS` file, a file outside any module, or a module without a `group` changes, or when detection fails. `LIMIT_SOLUTIONS` takes precedence when set.

### Moon graph (shadow mode)

The git (tsconfig `kbn_references`) graph decides the selection. Alongside it, `createMoonFtrModuleGraph` resolves the same rules with moon's project graph: each changed module's `kibana.jsonc` is piped to `moon query projects --affected --downstream deep`, so moon never diffs on its own. When the two select different configs, the build gets a `selective-testing-ftr-domains-moon-shadow` warning annotation listing them; a failure of this query is logged and has no effect.

### Moon FTR task (shadow mode)

`.buildkite/moon.yml` (project `kibana-buildkite`) has one noop `ftr` task. It depends on `#package:source-upstream` and `#plugin:source-upstream`, which covers every generated project, and takes the `ftrCritical` file group (a copy of `FTR_CRITICAL_PATHS`) as inputs. `resolveFtrDomainsWithMoonTask` runs `moon query tasks --affected --downstream deep --project kibana-buildkite --id ftr` and reads moon's affected reasons for the task (`options.affected.tasks["kibana-buildkite:ftr"]`): changed `files` (critical inputs) run every domain, and each `<project>:source-upstream` in `upstream` (the project or something it imports changed) adds its kibana.jsonc group, with `platform` and ungrouped projects adding `platform` and `base`. Code still drops excluded modules and irrelevant files inside modules, and runs every domain for a relevant file outside any module or a changed module without a group. When its domains differ from the git graph's, the build gets a `selective-testing-ftr-domains-moon-task` warning annotation; failures are logged and have no effect. It compares domains only: configs owned by affected modules, platform configs in solution manifests and always-run configs are not part of this answer.

Both moon shadows run after the pick step uploads its steps, because the task query takes about 15 seconds.

## Scout selective testing: git -> Moon (shadow mode)

`resolve_selective_testing.ts` still uses **git** as the authoritative strategy (written to `.scout/code_changes.json`, no behavior change). In parallel, it runs the **Moon** strategy above for observation only, and writes the result plus a diff of `affectedModules` to `.scout/code_changes.moon_shadow.json` (uploaded as a Buildkite artifact). Mismatches are logged as a warning via `ToolingLog`; a Moon failure is swallowed and logged, never fails the build.

Once shadow-mode data shows git and Moon agree across real PR traffic, Moon will become authoritative and the git path removed (follow-up change, not yet done).
