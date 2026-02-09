- Start Date: 2026-02-09
- Champion: Patryk Kopycinski
- Owner team: Platform Testing
- Stakeholders: All Kibana developers who write Scout (Playwright) tests
- Kibana Issue: TBD

# Scout Burn-in Testing for Pull Requests

## Executive Summary

### Problem Statement

When developers change source code in a Kibana plugin or package that has Scout (Playwright) tests, there is no automated mechanism to validate whether those changes destabilize existing tests. The current Scout CI pipeline runs **all** discovered test configurations on every PR, regardless of which files changed. This creates two issues:

1. **No stability validation**: Changed code is not tested with extra iterations to detect flaky or intermittent failures introduced by the change. A test may pass once but fail intermittently under repeat execution.
2. **No targeted execution**: All Scout configs run on every PR even when the change only affects a single plugin, wasting CI resources.

The existing Cypress burn-in (`ci:cypress-burn`) addresses this for Cypress tests by running changed specs with repeated execution. Scout tests lack an equivalent mechanism.

### Goals

1. **Detect destabilized tests early**: Run Scout tests for affected modules with `--repeat-each=N` to surface intermittent failures before merge.
2. **Scope execution to affected modules only**: Use git diff to identify which plugins/packages changed and only burn-in their Scout tests.
3. **Non-blocking**: Burn-in results are soft-fail — they inform the developer but do not block the PR from merging.
4. **PR-only**: Burn-in runs exclusively on the pull request pipeline, not on merge or scheduled builds.

### Proposal

Introduce a **Scout Burn-in** pipeline step that:

1. Detects files changed in the PR using `git diff` against the target branch.
2. Maps changed files to Scout test modules based on directory ownership.
3. Filters out non-code changes (docs, configs, images) via skip patterns.
4. Runs the affected modules' Scout configs with Playwright's `--repeat-each` flag for stability validation.
5. Reports results as soft-fail annotations in Buildkite.

The feature is always enabled on PR builds. If no Scout modules are affected by the PR changes, the burn-in builder step completes immediately without generating any test steps.

---

## Who Is Affected and How

- **All Kibana developers**: The burn-in step appears on every PR build. If the PR changes affect a plugin/package with Scout tests, additional burn-in test steps will be generated. These are soft-fail and do not block the PR.
- **Scout test authors**: Tests in affected modules will run with `--repeat-each=2`, meaning each test case executes twice. Intermittent failures will be surfaced as warnings.
- **CI infrastructure**: A lightweight builder step runs on every PR (~1-2 min). Full burn-in test steps only run when affected modules are detected.

---

## Detailed Design

### Architecture Overview

```
PR Pipeline
├── build (existing)
├── scout_test_run_builder (existing) ── produces scout_playwright_configs.json artifact
├── scout_burn_in_builder (NEW)
│   ├── Downloads scout_playwright_configs.json artifact
│   ├── Runs git diff to detect changed files
│   ├── Maps changed files → affected Scout modules
│   └── Uploads Buildkite steps for affected modules
└── Scout Burn-in (dynamic steps, NEW)
    ├── Module A burn-in (soft_fail, --repeat-each=2)
    ├── Module B burn-in (soft_fail, --repeat-each=2)
    └── ...
```

### Component Details

#### 1. Change Detection (`get_scout_burn_in_configs.ts`)

Uses `git diff` to compare the PR branch against the target branch (`GITHUB_PR_TARGET_BRANCH`). Returns a list of changed file paths.

**Skip patterns** — files matching these patterns never trigger burn-in:
- Documentation: `*.md`, `*.mdx`, `*.asciidoc`, `*.txt`
- Assets: `*.png`, `*.jpg`, `*.gif`, `*.svg`, `*.ico`
- Meta/config files: `package.json`, `tsconfig.json`, `jest.config.*`, `kibana.jsonc`
- CI/CD files: `.buildkite/`, `.github/`
- Documentation directories: `dev_docs/`, `docs/`, `api_docs/`

#### 2. Module Mapping

Each Scout config lives at a path like:
```
{module-base-path}/test/scout/{ui|api}/playwright.config.ts
```

The module base path is extracted by matching `/test/scout` in the config path. Changed files are then matched against module base paths using simple prefix matching:

```
Changed file: x-pack/solutions/security/plugins/security_solution/public/alerts/table.tsx
Module path:  x-pack/solutions/security/plugins/security_solution/
Config path:  x-pack/solutions/security/plugins/security_solution/test/scout/ui/playwright.config.ts
→ Match! This module's configs will be burn-in tested.
```

This directory-based approach is intentionally simple. Cross-module dependency analysis (e.g., via `madge`) is not implemented in v1 due to the size of the monorepo. This can be added in future iterations.

#### 3. Burn-in Step Generation (`pick_scout_burn_in_run_order.ts`)

For each affected module, generates a Buildkite step that:
- Reuses the existing `scout_configs.sh` execution script
- Sets `SCOUT_BURN_IN_REPEAT_EACH=2` environment variable
- Uses `soft_fail: true` so failures don't block the PR
- Disables automatic retries (burn-in failures should be investigated, not retried)
- Groups steps under a "Scout Burn-in" group in the Buildkite UI

#### 4. Playwright Integration

The `run_tests.ts` file in `@kbn/scout` reads the `SCOUT_BURN_IN_REPEAT_EACH` environment variable and appends `--repeat-each=N` to the Playwright CLI arguments. This ensures each test case in the config runs N times.

#### 5. Pipeline Integration

The burn-in pipeline step (`scout_burn_in.yml`) is added to the PR pipeline unconditionally. It depends on the existing `build_scout_tests` step to ensure the `scout_playwright_configs.json` artifact is available.

### Configuration

| Parameter | Value | Description |
|-----------|-------|-------------|
| `SCOUT_BURN_IN_REPEAT_EACH` | `2` | Number of times each test repeats |
| `soft_fail` | `true` | Burn-in failures don't block the PR |
| `timeout_in_minutes` | `60` | Max time per burn-in step |
| Automatic retry | Disabled | Failures should be investigated |

### Flow Diagram

```
1. PR is opened/updated
2. PR pipeline starts
3. Build step runs (produces Kibana build)
4. Scout Test Run Builder runs (discovers configs, uploads JSON artifact)
5. Scout Burn-in Builder runs:
   a. Downloads scout_playwright_configs.json
   b. Runs: git diff origin/${TARGET_BRANCH}...HEAD
   c. Filters changed files through skip patterns
   d. Maps remaining files to Scout module directories
   e. If affected modules found → uploads burn-in Buildkite steps
   f. If no affected modules → step completes (no burn-in needed)
6. Burn-in steps execute (if any):
   a. Each step runs scout_configs.sh with SCOUT_BURN_IN_REPEAT_EACH=2
   b. Tests run with --repeat-each=2
   c. Results are soft-fail
7. Developer reviews burn-in results in Buildkite UI
```

---

## Risks

1. **False negatives from directory-based matching**: Changes to shared packages (e.g., `@kbn/es-query`) won't trigger burn-in for plugins that depend on them. This is acceptable for v1; dependency-graph-based matching can be added later.
2. **CI cost**: Each burn-in step adds ~30-60 minutes of CI time. This only happens when affected modules have Scout tests. The soft-fail nature means it doesn't delay PR mergeability.
3. **Git history availability**: `git diff` requires the target branch to be available. The builder script fetches it if needed, with graceful fallback to no burn-in if git operations fail.

---

## Alternatives Considered

1. **Full dependency graph analysis (madge)**: The seontechnologies approach uses `madge` to build a complete import graph. This is impractical for Kibana's monorepo size. Directory-based matching provides a good first approximation.
2. **Label-gated burn-in** (`ci:scout-burn-in`): Requiring a manual label reduces automation benefits. Always-on with soft-fail is preferred since the overhead for unaffected PRs is minimal (one lightweight builder step).
3. **Playwright's built-in `--only-changed`**: Triggers all tests when any file changes, with no skip patterns or volume control. Too broad for a monorepo.
4. **Extending existing Scout pipeline**: Adding repeat-each to the regular Scout run would double CI time for all tests. Separate burn-in steps only affect changed modules.

---

## New Files

| File | Purpose |
|------|---------|
| `dev_docs/openspecs/scout_burn_in.md` | This specification |
| `.buildkite/pipeline-utils/scout/get_scout_burn_in_configs.ts` | Change detection and module mapping |
| `.buildkite/pipeline-utils/scout/pick_scout_burn_in_run_order.ts` | Buildkite step generation for burn-in |
| `.buildkite/scripts/steps/test/scout_burn_in_test_run_builder.ts` | TypeScript entry point for builder |
| `.buildkite/scripts/steps/test/scout_burn_in_test_run_builder.sh` | Shell entry point (downloads artifact, runs TS) |
| `.buildkite/pipelines/pull_request/scout_burn_in.yml` | Pipeline definition |

## Modified Files

| File | Change |
|------|--------|
| `.buildkite/pipeline-utils/scout/index.ts` | Export new functions |
| `.buildkite/scripts/pipelines/pull_request/pipeline.ts` | Add burn-in pipeline to PR builds |
| `src/platform/packages/shared/kbn-scout/src/playwright/runner/run_tests.ts` | Read `SCOUT_BURN_IN_REPEAT_EACH` env var |

---

## Implemented Enhancements

1. **Dependency-graph-based matching**: Uses the plugin dependency graph from `kibana.jsonc` (`requiredPlugins`, `optionalPlugins`, `requiredBundles`) to detect Scout test modules affected when their upstream plugin dependencies change.
2. **Configurable repeat count**: Supports `ci:scout-burn-in-repeat-N` PR labels (e.g., `ci:scout-burn-in-repeat-5`) and `SCOUT_BURN_IN_REPEAT_EACH` env var override. Defaults to 2.
4. **PR comment summary**: A summary step runs after all burn-in steps, aggregates pass/fail results from Buildkite metadata, and posts a formatted PR comment via `upsertComment`.

## Future Enhancements

1. **Burn-in test percentage**: Run a configurable percentage of affected tests (similar to `burnInTestPercentage` in seontechnologies).
2. **Historical flakiness integration**: Cross-reference burn-in failures with known flaky tests to reduce noise.
