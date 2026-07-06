# PR Review: migrate-dv-ftr-to-scout

**Date:** 2026-07-06  
**Branch:** `migrate-dv-ftr-to-scout`  
**Base:** `origin/main` (local working tree; no open GitHub PR)  
**Reviewer:** automated PR review

## Changed files summary

| Area | What changed |
|------|----------------|
| FTR removal | Deleted `x-pack/platform/test/functional/apps/ml/data_visualizer/**` (groups 1–3) and matching `functional_basic` configs |
| Scout addition | New suites under `x-pack/platform/plugins/private/data_visualizer/test/scout/ui/` (parallel) and `test/scout_basic_license/` |
| ML Scout | New `index_data_visualizer_actions_panel_trial.spec.ts` and `test/scout_basic_license/` actions-panel basic-license test |
| Platform | New `basic_license` Scout server config set in `src/platform/packages/shared/kbn-scout/src/servers/configs/config_sets/basic_license/` |
| CI | Removed 6 FTR configs from `.buildkite/ftr-manifests/ftr_platform_stateful_configs.yml`; added `data_visualizer` to `.buildkite/scout_ci_config.yml` |
| Fixtures | Moved `files_to_import` to `x-pack/platform/test/fixtures/ml/files_to_import/`; updated ML permissions FTR paths |
| Docs | Updated `x-pack/platform/plugins/shared/ml/readme.md` with Scout paths |
| **Unrelated regression** | `x-pack/platform/plugins/shared/agent_builder/test/scout_agent_builder/.meta/api/standard.json` emptied |

**Scale:** ~5.8k lines deleted (FTR), ~50+ new Scout files (untracked), 44 tracked file edits.

## Functional areas touched

1. **Data Visualizer UI** — index/file/ES\|QL/data-drift/data-view-management/Discover field-stats coverage migrated to Scout parallel tests
2. **ML actions panel** — trial + basic-license flows moved to ML plugin Scout suites
3. **Basic-license server bootstrap** — new Scout config set mirroring FTR `functional_basic`
4. **CI wiring** — FTR configs disabled, Scout plugin enabled for `data_visualizer`
5. **Shared test fixtures** — import files relocated for permissions tests still on FTR

## Validation notes

| Check | Result |
|-------|--------|
| `node scripts/type_check --project x-pack/platform/plugins/private/data_visualizer/tsconfig.json` | **Pass** |
| `node scripts/type_check --project x-pack/platform/plugins/shared/ml/tsconfig.json` | **Pass** |
| `node scripts/check_changes.ts --include-untracked --ref origin/main` | **Not completed** — comparison against `origin/main` is impractically large on this fork (~32k files diverged); scoped checks not run |
| Scout test execution | **Not run** in this session |
| Manifest / `.meta` integrity | **Issues found** (see Issues 1–2) |

---

## Issue 1/5: Agent Builder Scout manifest accidentally wiped

- `Urgency`: Critical
- `Why it matters`:
  - Unrelated to the data-visualizer migration; will break Scout CI metadata and selective-testing for Agent Builder API tests.
  - The manifest now lists zero tests while the spec files are unchanged — CI may skip or mis-report an entire plugin test suite.
  - High merge risk: easy to miss in a large diff dominated by ML/Data Visualizer files.
- `Evidence`:
  - `x-pack/platform/plugins/shared/agent_builder/test/scout_agent_builder/.meta/api/standard.json` changed from ~2,270 lines (full test registry) to `{ "sha1": "...", "tests": [] }`.
  - No Agent Builder test source files were added/removed in this branch.
- `Proposed fix`:
  1. Revert the Agent Builder `.meta/api/standard.json` change entirely (`git checkout HEAD -- <path>`).
  2. If metadata must be regenerated, run Scout only against Agent Builder specs and commit the resulting manifest — never hand-edit to an empty array.
  3. Add a pre-commit or CI guard that fails when an existing `.meta/*.json` loses all `tests` entries without matching spec deletions.
- `How to verify`:
  - Confirm `standard.json` again lists Agent Builder API tests.
  - Run `node scripts/scout.js run-tests` (or the Agent Builder Scout config) and ensure manifest updater repopulates entries.

---

## Issue 2/5: Scout `.meta` manifests stale or missing for new suites

- `Urgency`: High
- `Why it matters`:
  - Scout CI relies on `.meta/{ui,api}/*.json` for test discovery, selective runs, and manifest SHA tracking.
  - Missing or empty manifests can cause new tests to be invisible to CI scheduling or fail manifest validation on merge.
- `Evidence`:
  - `x-pack/platform/plugins/shared/agent_builder/test/scout_agent_builder/.meta/api/standard.json` — `tests: []` (see Issue 1).
  - `x-pack/platform/plugins/shared/ml/test/scout/.meta/ui/standard.json` — no entries for `index_data_visualizer_actions_panel_trial.spec.ts` (only `feature_controls.spec.ts` listed).
  - `x-pack/platform/plugins/shared/ml/test/scout_basic_license/` — **no** `.meta/ui/standard.json` at all (sibling `data_visualizer` basic-license suite has one).
  - `x-pack/platform/plugins/private/data_visualizer/test/scout/.meta/ui/parallel.json` — `"sha1": ""` (unset) despite populated `tests` array.
- `Proposed fix`:
  1. Run Scout tests locally for each new/changed config so the Playwright manifest reporter regenerates `.meta` files:
     - `data_visualizer/test/scout/ui/parallel.playwright.config.ts`
     - `data_visualizer/test/scout_basic_license/ui/playwright.config.ts`
     - `ml/test/scout/ui/playwright.config.ts`
     - `ml/test/scout_basic_license/ui/playwright.config.ts`
  2. Commit updated manifests with non-empty `sha1` and complete `tests` arrays.
  3. Revert any unrelated manifest edits (Agent Builder).
- `How to verify`:
  - Each new spec file appears in the corresponding `.meta` JSON.
  - CI Scout manifest check / selective-testing resolver lists the new configs.

---

## Issue 3/5: Data drift “index selection page” entry path not migrated

- `Urgency`: High
- `Why it matters`:
  - FTR exercised navigation starting from the ML app root through index selection into data drift, including chart-debug setup.
  - Scout’s `data_drift_saved_search.spec.ts` only enters via the data-drift page + saved-search picker — a different user journey that may miss regressions in the index-selection flow.
- `Evidence`:
  - Deleted FTR: `group2/data_drift.ts` — `describe('with ft_farequote_filter_and_kuery from index selection page')` with separate “loads the ml page” (incl. `elasticChart.setNewChartUiDebugFlag`) and “loads the source data in data drift” steps.
  - New Scout: `parallel_tests/data_drift_saved_search.spec.ts` — single test starting at `navigateToDataDrift()` → `selectSourceForDataDrift(savedSearch)`.
  - No Scout spec references “index selection page” or chart debug flag setup.
- `Proposed fix`:
  1. Add a parallel Scout spec (or extend existing) that mirrors the FTR index-selection entry: `navigateToMl()` → data drift via index selection UI.
  2. Port `elasticChart.setNewChartUiDebugFlag(true)` setup if still required for chart-click assertions in `assertDataDriftPageContent`.
  3. Run `scout-best-practices-reviewer` against removed FTR `data_drift.ts` to confirm parity.
- `How to verify`:
  - New spec passes locally with `--project local`.
  - Parity checklist: same saved search, doc counts, chart-click → run-analysis flow as FTR.

---

## Issue 4/5: Auth realism weakened — `loginAsAdmin` replaces `loginAsMlPowerUser`

- `Urgency`: Medium
- `Why it matters`:
  - FTR data-visualizer and actions-panel suites authenticated as `mlPowerUser`, exercising realistic ML role privileges.
  - Scout migrations predominantly use `browserAuth.loginAsAdmin()`, which can mask privilege-gating bugs visible only to ML users.
- `Evidence`:
  - FTR `group2/index_data_visualizer_actions_panel.ts`: `ml.securityUI.loginAsMlPowerUser()`.
  - FTR `group2/data_drift.ts`: same.
  - Scout `ml/test/scout/ui/tests/index_data_visualizer_actions_panel_trial.spec.ts`: `browserAuth.loginAsAdmin()`.
  - Scout `data_visualizer/test/scout/ui/parallel_tests/data_drift_saved_search.spec.ts`: `loginAsAdmin()`.
  - ML Scout fixtures already export `CUSTOM_ROLES` from API fixtures — infrastructure exists for role-based login.
- `Proposed fix`:
  1. Replace `loginAsAdmin()` with the ML power-user role in actions-panel and data-drift specs (use existing Scout custom-role helpers).
  2. Keep `loginAsAdmin()` only where the test explicitly requires superuser (e.g. uiSettings changes not available to ML roles).
  3. Document chosen auth strategy in test `beforeEach` comments when admin is intentional.
- `How to verify`:
  - Tests pass with ML power-user credentials.
  - Temporarily break ML role mapping and confirm tests fail (proves role is enforced).

---

## Issue 5/5: Basic-license Scout suites split across two plugins without docs/CI clarity

- `Urgency`: Medium
- `Why it matters`:
  - Basic-license coverage now spans `data_visualizer/test/scout_basic_license` (Discover field-stats gating) and `ml/test/scout_basic_license` (actions panel).
  - Each config starts its own ES/Kibana stack (`scout_basic_license` → `basic_license` config set), doubling basic-license CI cost.
  - `ml/readme.md` documents trial Scout paths but omits basic-license Scout locations; FTR basic-license data-visualizer table rows were removed without Scout replacements in the README table.
- `Evidence`:
  - Two `scout_basic_license/ui/playwright.config.ts` files (data_visualizer + ml).
  - `readme.md` lines 135–146: Scout section lists trial paths only; basic-license section still points to FTR permissions config only.
  - FTR `functional_basic` data_visualizer group1–3 configs removed from Buildkite manifest.
- `Proposed fix`:
  1. Update `ml/readme.md` basic-license table with Scout paths for both plugins.
  2. Consider consolidating basic-license specs under one plugin (likely `data_visualizer`) if ownership allows — or document why the split is intentional.
  3. Confirm Scout CI schedules both `scout_basic_license` configs when either plugin changes (selective-testing patterns).
- `How to verify`:
  - README paths match actual `playwright.config.ts` locations.
  - CI Scout pipeline lists both basic-license configs after a touch to each plugin’s scout tree.

---

## Top recommended next actions

1. **Immediately revert** the Agent Builder `.meta/api/standard.json` change — it is unrelated and Critical.
2. **Regenerate all Scout manifests** for new/changed configs (data_visualizer parallel, both `scout_basic_license` trees, ML actions-panel trial) and commit non-empty `sha1` values.
3. **Add the missing data-drift index-selection Scout spec** to close the FTR parity gap.
4. **Switch ML-user-facing specs** from `loginAsAdmin` to ML power-user role where FTR used `loginAsMlPowerUser`.
5. **Run Scout suites locally** end-to-end before merge (`node scripts/scout.js run-tests` per config) and capture passing results in the PR test plan.

## Residual risks

- **No Scout execution in review session** — parallel workers (`workers: 2`) and `global.setup.ts` archive loading may hide flakiness or cross-test pollution not caught by typecheck.
- **Branch base divergence** — `origin/main` comparison is unreliable on this fork; rebase onto upstream `elastic/kibana` main before opening PR to get accurate CI signal.
- **Discover field-stats enabled tests remain skipped** — parity with FTR (`describe.skip` + issue #259109), but no improvement in enabled-path coverage.
