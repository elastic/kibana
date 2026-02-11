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

Introduce **Scout Burn-in** logic within the existing Scout Test Run Builder that:

1. Detects files changed in the PR using `git diff` against the target branch.
2. Maps changed files to Scout test modules based on directory ownership.
3. Filters changed files using inclusive source file patterns (`.ts`, `.tsx`, `.js`, `.jsx`, `.scss`, `.css`, etc.).
4. Uses Moon's dependency graph (`dependsOn` from `moon.yml`) to detect transitive impacts.
5. Runs the affected modules' Scout configs with Playwright's `--repeat-each` flag for stability validation.
6. Reports results as soft-fail annotations in Buildkite and a PR comment summary.

The feature is always enabled on PR builds. If no Scout modules are affected by the PR changes, no burn-in steps are generated.

---

## Who Is Affected and How

- **All Kibana developers**: The burn-in logic runs within the existing Scout Test Run Builder. If the PR changes affect a plugin/package with Scout tests, additional burn-in test steps will be generated. These are soft-fail and do not block the PR.
- **Scout test authors**: Tests in affected modules will run with `--repeat-each=2`, meaning each test case executes twice. Intermittent failures will be surfaced as warnings.
- **CI infrastructure**: No additional builder agents are required. The burn-in detection runs within the existing `build_scout_tests` step. Full burn-in test steps only run when affected modules are detected.

---

## Detailed Design

### Architecture Overview

```
PR Pipeline
├── build (existing)
├── scout_test_run_builder (existing)
│   ├── Discovers configs → scout_playwright_configs.json artifact
│   ├── Produces regular Scout test execution steps
│   └── Produces burn-in steps for affected modules (NEW)
└── Dynamic Steps
    ├── Scout Configs (existing, regular test execution)
    └── Scout Burn-in (NEW, dynamic steps)
        ├── Module A burn-in (soft_fail, --repeat-each=2)
        ├── Module B burn-in (soft_fail, --repeat-each=2)
        └── Scout Burn-in Summary
```

### Component Details

#### 1. Change Detection (`get_scout_burn_in_configs.ts`)

Uses `git diff` to compare the PR branch against the target branch. Returns a list of changed file paths.

**Inclusive source file patterns** — only files matching these patterns trigger burn-in:
- Source code: `*.ts`, `*.tsx`, `*.js`, `*.jsx`
- Styles: `*.scss`, `*.css`, `*.less`
- Config: `*.json` (runtime config files)
- Templates: `*.html`, `*.pug`, `*.ejs`

**Always-excluded paths** — even if they match source patterns:
- CI/infrastructure: `.buildkite/`, `.github/`
- Documentation: `dev_docs/`, `docs/`, `api_docs/`, `legacy_rfcs/`
- Test infrastructure: `jest.config.*`, `__mocks__/`, `__fixtures__/`
- Test files: `*.test.ts`, `*.mock.ts`, `*.stories.ts`
- Type declarations: `*.d.ts`

This inclusive approach is more robust than an exclusion list — new non-source file types won't accidentally trigger burn-in.

#### 2. Module Mapping

Each Scout config lives at a path like:
```
{module-base-path}/test/scout/{ui|api}/playwright.config.ts
```

Changed files are matched against module base paths using simple prefix matching:

```
Changed file: x-pack/solutions/security/plugins/security_solution/public/alerts/table.tsx
Module path:  x-pack/solutions/security/plugins/security_solution/
→ Match! This module's configs will be burn-in tested.
```

#### 3. Dependency Graph via Moon (`get_scout_burn_in_configs.ts`)

Uses Moon's `dependsOn` from auto-generated `moon.yml` files to detect transitive impacts. Moon's dependency graph is derived from `tsconfig.json` `kbn_references` and provides a comprehensive view of all package/plugin dependencies — more complete than `kibana.jsonc` alone.

When a changed module has a Moon project ID, all Scout test modules whose `moon.yml` `dependsOn` includes that project ID are also marked as affected.

#### 4. Burn-in Step Generation (`pick_scout_burn_in_run_order.ts`)

For each affected module, generates a Buildkite step that:
- Reuses the existing `scout_configs.sh` execution script
- Sets `SCOUT_BURN_IN_REPEAT_EACH=2` environment variable
- Uses `soft_fail: true` so failures don't block the PR
- Disables automatic retries (burn-in failures should be investigated, not retried)
- Groups steps under a "Scout Burn-in" group in the Buildkite UI

A summary step aggregates results and posts a PR comment.

#### 5. Playwright Integration

The `run_tests.ts` file in `@kbn/scout` reads the `SCOUT_BURN_IN_REPEAT_EACH` environment variable and appends `--repeat-each=N` to the Playwright CLI arguments.

#### 6. Pipeline Integration

The burn-in logic runs within the existing `scout_test_run_builder.ts` alongside regular Scout test step generation. No separate pipeline step or agent is required.

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
4. Scout Test Run Builder runs:
   a. Discovers configs → uploads scout_playwright_configs.json artifact
   b. Produces regular Scout test execution steps
   c. Runs git diff to detect changed files
   d. Filters through inclusive source file patterns
   e. Maps to Scout module directories + Moon dependency graph
   f. If affected modules found → uploads burn-in Buildkite steps
   g. If no affected modules → no burn-in needed
5. Burn-in steps execute (if any):
   a. Each step runs scout_configs.sh with SCOUT_BURN_IN_REPEAT_EACH=2
   b. Tests run with --repeat-each=2
   c. Results are soft-fail
6. Summary step posts results to PR comment
7. Developer reviews burn-in results
```

---

## Risks

1. **CI cost**: Each burn-in step adds ~30-60 minutes of CI time. This only happens when affected modules have Scout tests. The soft-fail nature means it doesn't delay PR mergeability.
2. **Git history availability**: `git diff` requires the target branch to be available. The code uses `GITHUB_PR_MERGE_BASE` (pre-computed by Kibana's bootstrap) with graceful fallbacks.
3. **Moon graph completeness**: Moon's `dependsOn` covers `kbn_references` from `tsconfig.json`. Implicit or runtime-only dependencies not declared in `tsconfig.json` won't be detected.

---

## Alternatives Considered

1. **Full dependency graph analysis (madge)**: The seontechnologies approach uses `madge` to build a complete import graph. This is impractical for Kibana's monorepo size. Moon's existing dependency graph provides a good approximation.
2. **Label-gated burn-in** (`ci:scout-burn-in`): Requiring a manual label reduces automation benefits. Always-on with soft-fail is preferred since the overhead for unaffected PRs is minimal.
3. **Playwright's built-in `--only-changed`**: Triggers all tests when any file changes, with no patterns or volume control. Too broad for a monorepo.
4. **Separate burn-in pipeline step**: Adds an extra agent and pipeline complexity. Integrating into the existing `build_scout_tests` step is simpler and avoids agent costs.
5. **Exclusive skip patterns**: Maintaining a blocklist of file extensions to skip is fragile — new file types could accidentally trigger burn-in. Inclusive source file patterns are more robust.

---

## New Files

| File | Purpose |
|------|---------|
| `dev_docs/openspecs/scout_burn_in.md` | This specification |
| `.buildkite/pipeline-utils/scout/get_scout_burn_in_configs.ts` | Change detection, inclusive filtering, and Moon dependency matching |
| `.buildkite/pipeline-utils/scout/pick_scout_burn_in_run_order.ts` | Buildkite step generation for burn-in |
| `.buildkite/scripts/steps/test/scout_burn_in_summary.ts` | Summary step that aggregates results and posts PR comment |
| `.buildkite/scripts/steps/test/scout_burn_in_summary.sh` | Shell entry point for summary step |

## Modified Files

| File | Change |
|------|--------|
| `.buildkite/pipeline-utils/scout/index.ts` | Export new functions |
| `.buildkite/scripts/steps/test/scout_test_run_builder.ts` | Call `pickScoutBurnInRunOrder` alongside regular step generation |
| `src/platform/packages/shared/kbn-scout/src/playwright/runner/run_tests.ts` | Read `SCOUT_BURN_IN_REPEAT_EACH` env var |

---

## Future Enhancements

1. **Burn-in test percentage**: Run a configurable percentage of affected tests (similar to `burnInTestPercentage` in seontechnologies).
2. **Historical flakiness integration**: Cross-reference burn-in failures with known flaky tests to reduce noise.
