# FTR to Scout Migration Plan

| Field | Value |
|-------|-------|
| Source | `src/platform/test/functional/apps/discover/esql_1`, `esql_2`, `esql_3`, `esql_4` |
| Target module root | `src/platform/plugins/shared/discover` |
| Generated | 2026-07-10 |
| Deployment targets | stateful (classic) for esql_1/3/4; both (deployment-agnostic) for esql_2 |
| FTR config chain | `esql_<n>/config.ts` > `src/platform/test/functional/config.base.js` |

Covers GitHub issues #274706 (esql_1), #274707 (esql_2), #274708 (esql_3), #274709 (esql_4).

---

## 1. Test inventory

Sorted by estimated complexity (simple to complex).

| # | FTR file (relative) | Type | Description | `it` count | Complexity | Decision | Justification |
|---|---------------------|------|-------------|-----------|------------|----------|---------------|
| 1 | `esql_1/_esql_formatting.ts` | test | ES|QL results formatting via `columnsMeta` (numeric, string-array, computed columns) in grid + doc-viewer flyout | 3 | simple | UI test | Real Discover grid/flyout rendering flow |
| 2 | `esql_1/_esql_columns.ts` | test | ES|QL column persistence: initial/custom columns for transformational vs non-transformational commands, reset rules, error recovery, saved-search switching, no-results | 9 | medium | UI test | Real column-selection + save/reload journeys |
| 3 | `esql_4/_esql_controls.ts` | test | ES|QL controls carried from Dashboard into Discover (open-in-discover, unlinked by-value panels, save table back to dashboard) | 5 (1 `.skip`) | complex | UI test | Cross-app + cross-window control state |
| 4 | `esql_3/_index_editor.ts` | test | LOOKUP JOIN lookup-index editor: create by file upload, create manually, edit existing, save-without-close, closed-index warning | 5 | complex | UI test | Real editor flow + creates/deletes ES indices |
| 5 | `esql_2/_esql_view.ts` | test | ES|QL view in Discover: rendering, histogram/brushing, resource browser, syntax errors, ES|QL↔dataview switch modal, inspector (incl. slow queries), query history, sorting (+ dashboard), filter-by-table (Discover + Dashboard), histogram breakdown | 32 | complex | UI test | Broad ES|QL Discover surface; has a serverless copy |
| 6 | `esql_1/index.ts` | index | `describe('discover/esql_1')`, sets window size, loads `logstash_functional` | - | - | split | Data moves to `global.setup.ts`; suites become specs |
| 7 | `esql_2/index.ts` | index | `describe('discover/esql_2')`, sets window size | - | - | split | Window size is Scout default; suite becomes spec(s) |
| 8 | `esql_3/index.ts` | index | `describe('discover/esql_3')`, sets window size | - | - | split | Suite becomes sequential spec |
| 9 | `esql_4/index.ts` | index | `describe('discover/esql_4')`, sets window size | - | - | split | Suite becomes spec(s) |
| 10 | `esql_1/config.ts` … `esql_4/config.ts` | config | Extend functional base; enable ES security; esql_2 adds `--feature_flags.overrides.discover.cascadeLayoutEnabled=false` | - | - | drop/port | Security is Scout default; see §7 for the esql_2 feature flag |

### Proposed file splits

- `esql_1/_esql_columns.ts` → `esql/esql_columns.spec.ts` (keep as one spec — the 9 `it` blocks share a single ES|QL column-persistence theme; each is independent, so they become independent `spaceTest` cases in one file).
- `esql_1/_esql_formatting.ts` → `esql/esql_formatting.spec.ts`.
- `esql_2/_esql_view.ts` → split by the FTR inner `describe` blocks into focused specs (each inner `describe` is an independent flow with its own `beforeEach` navigation):
  - `esql/view/rendering.spec.ts` — "ES|QL in Discover" (render, histogram presence, brushing, empty fields, no-FROM, timeseries) — 10 `it`
  - `esql/view/resource_browser.spec.ts` — resource browser Escape focus — 1 `it`
  - `esql/view/errors.spec.ts` — syntax error callouts — 1 `it`
  - `esql/view/switch_modal.spec.ts` — ES|QL↔dataview switch modal — 4 `it`
  - `esql/view/inspector.spec.ts` — inspector requests + slow queries — 2 `it`
  - `esql/view/query_history.spec.ts` — query history — 4 `it`
  - `esql/view/sorting.spec.ts` — sorting + dashboard panel parity — 2 `it`
  - `esql/view/filter_by_table.spec.ts` — filter-by-table in Discover + Dashboard — 5 `it`
  - `esql/view/histogram_breakdown.spec.ts` — breakdown field selection/persistence — 4 `it`
- `esql_3/_index_editor.ts` → `esql/index_editor.spec.ts` (sequential — see §3).
- `esql_4/_esql_controls.ts` → `esql/esql_controls.spec.ts`.

### Tests to drop

- `esql_4/_esql_controls.ts` → "should update the existing dashboard control instead of creating a duplicate" (currently `it.skip`, flaky duplicate per [#265636](https://github.com/elastic/kibana/issues/265636)). **Do not migrate the skip.** Drop it, leave an in-file comment pointing at #265636, and open a follow-up to re-enable it in Scout once the underlying duplication bug is fixed. Coverage lost: none today (already skipped in FTR).

### Tests to defer

- None outright deferred, but `esql_2/_esql_view.ts` migration is **gated on a feature-flag decision** (see §7 and §11).

---

## 2. Test type routing

### UI tests

All migrated tests are UI tests (each exercises real Discover/Dashboard rendering, editor, or cross-app flows). Proposed spec paths:

| FTR file | Proposed spec path (under `test/scout/ui/`) | Key flows covered |
|----------|---------------------------------------------|-------------------|
| `esql_1/_esql_formatting.ts` | `parallel_tests/esql/esql_formatting.spec.ts` | `columnsMeta` formatting in grid + flyout |
| `esql_1/_esql_columns.ts` | `parallel_tests/esql/esql_columns.spec.ts` | Column persistence/reset across queries + saved searches |
| `esql_4/_esql_controls.ts` | `parallel_tests/esql/esql_controls.spec.ts` | ES|QL controls Dashboard↔Discover |
| `esql_2/_esql_view.ts` (9 specs) | `parallel_tests/esql/view/*.spec.ts` **or** dedicated config (see §7) | Broad ES|QL Discover surface |
| `esql_3/_index_editor.ts` | `tests/esql/index_editor.spec.ts` (sequential) | LOOKUP JOIN lookup-index editor |

### API tests

None. These suites assert DOM/grid/editor state that has no headless-API equivalent.

### Unit tests (RTL/Jest)

None proposed. The `columnsMeta` formatting (esql_1) is arguably component-level, but the FTR test asserts the integrated Discover grid + doc-viewer + ES|QL execution path, which is not reproducible in isolation without heavy mocking. Keep as UI.

---

## 3. Parallelism plan

### Parallel-safe (space-isolated)

| Proposed spec | Why parallel-safe |
|--------------|------------------|
| `esql/esql_columns.spec.ts` | Only space-scoped saved searches + ui settings; shared `logstash_functional` ES data is read-only |
| `esql/esql_formatting.spec.ts` | Space-scoped; reads shared `logstash_functional` + `kibana_sample_data_flights` |
| `esql/esql_controls.spec.ts` | Space-scoped dashboards/saved searches; opens a second browser tab within the same context |
| `esql/view/*.spec.ts` (esql_2) | Space-scoped saved searches/dashboards **iff** the cascade-layout flag question in §7 resolves to "default layout works" |

### Must be sequential

| Proposed spec | Why sequential |
|--------------|---------------|
| `esql/index_editor.spec.ts` (esql_3) | Creates/opens/closes/deletes **real cluster-level ES indices** (`test-lookup-index-*`) via `es.indices.*`; not space-scoped. Concurrent workers would collide on fixed index names. Runs as admin/superuser. Needs a sequential (`tests/`) config. |

### esql_2 special case

`esql_2` sets `discover.cascadeLayoutEnabled=false` as a **server-wide boot feature flag**. The shared Discover parallel config (`parallel.playwright.config.ts`) runs a single Kibana shared by all parallel workers with the flag at its **default (`true`)**. Options (decision required — see §7/§11):
- **(A) Preferred if assertions hold:** migrate into the shared `parallel_tests/esql/view/` pool and **drop the flag** (run against the default cascade layout). Requires verifying that the grid/header/cell assertions still match with cascade layout enabled.
- **(B) Fallback:** give esql_2 its **own** Scout playwright config with a dedicated `global.setup.ts`/`global.teardown.ts` that toggles `feature_flags.overrides.discover.cascadeLayoutEnabled=false` at runtime (`apiServices.core.settings`, Cloud-compatible). Isolates the server-wide flag from the shared Discover pool.

---

## 4. Test data and setup

### Archives inventory

| Archive path | Contents | Used by (files) | Verdict |
|-------------|----------|-----------------|---------|
| `es_archiver/logstash_functional` | `logstash-*` index, ~14k docs | esql_1 (both), esql_2, esql_3, esql_4 | Keep — already `loadIfNeeded` in existing `global.setup.ts` |
| `es_archiver/kibana_sample_data_flights` | flights index | esql_1 formatting, esql_2 | Keep — already loaded in existing `global.setup.ts` |
| `kbn_archiver/discover` | `logstash-*` data view + saved objects | esql_1, esql_2, esql_3 | Keep — loaded per-space via `discoverScoutSpace.setupDiscoverDefaults()` |
| `kbn_archiver/kibana_sample_data_flights_index_pattern` | flights data view | esql_1 formatting, esql_2 | Keep — `FLIGHTS_KBN_ARCHIVE` already in `common/constants.ts`; load per-space |
| `kbn_archiver/dashboard/current/esql_controls` | dashboard with an ES|QL control | esql_4 | Keep — load per-space (esql_4 only) |
| `kbn_archiver/discover/session_with_control` | saved search "ESQL control unlink test" with a control | esql_4 | Keep — load per-space (esql_4 only) |

All ES archives are already loaded once in `parallel_tests/global.setup.ts`. New per-space kbn archives (esql_4's two) should be loaded in the spec's `beforeAll` via `scoutSpace.savedObjects.load(...)`, not the global setup (they are only used by one spec). Do **not** add per-spec ES data to global setup beyond what exists.

### UI settings mutations

| FTR call | Semantics | Scout replacement |
|----------|-----------|-------------------|
| `kibanaServer.uiSettings.replace({ defaultIndex, enableESQL })` | Wipes all, sets new | `scoutSpace.uiSettings.setDefaultIndex(...)` + rely on ES|QL being enabled by default; set `enableESQL` via `scoutSpace.uiSettings.set` only if needed |
| `timePicker.setDefaultAbsoluteRangeViaUiSettings()` | Sets `timepicker:timeDefaults` | `scoutSpace.uiSettings.setDefaultTime(testData.DEFAULT_TIME_RANGE)` (already in `common`) |
| `timePicker.setDefaultAbsoluteRange()` (UI) | Picks range in the date-picker UI | `pageObjects.datePicker.setAbsoluteRange(testData.DEFAULT_TIME_RANGE_DISPLAY)` |

`enableESQL` **NEEDS VERIFICATION**: confirm whether ES|QL needs the `enableESQL` advanced setting in Scout's default config or whether it is on by default; if required, set it per-space in `beforeAll`.

### Shared constants to extract

Reuse the existing `test/scout/ui/fixtures/common/constants.ts` (`DISCOVER_KBN_ARCHIVE`, `FLIGHTS_KBN_ARCHIVE`, `DEFAULT_DATA_VIEW`, `DEFAULT_TIME_RANGE`, `DEFAULT_TIME_RANGE_DISPLAY`). New constants worth adding there or in an `esql` fixtures folder:

| Value | Occurrences | Notes |
|-------|-------------|-------|
| Lookup index names `test-lookup-index-*` | esql_3 only | Keep inline in `index_editor.spec.ts` (single file) |
| `imports/customers.csv` path | esql_3 only | Copy fixture under the spec's fixtures dir; keep inline |
| ES|QL saved-search names (`esql_test`, `testSorting`, …) | within single specs | Keep inline |

### Fresh server required

- None. `esql_3` needs clean **index** state, not a clean server — handled by `beforeEach`/`afterEach` index cleanup ported from FTR `cleanLookupJoinIndexes()`.

---

## 5. Auth and roles

### Role inventory

| Role (FTR) | Privileges (summary) | Used by | Scout target | Notes |
|-----------|---------------------|---------|--------------|-------|
| `kibana_admin` + `test_logstash_reader` | Kibana admin + read on `logstash-*` | esql_1 (both), esql_2, esql_4 | `loginAsPrivilegedUser()` | Needs read of logstash data + save saved searches/dashboards; privileged (editor-equivalent) suffices |
| `kibana_admin` + `test_logstash_reader` + `kibana_sample_read` | + read on flights | esql_1 formatting, esql_2 | `loginAsPrivilegedUser()` | Flights index is available to the built-in privileged user in Scout's default setup — **NEEDS VERIFICATION** |
| `superuser` | Full cluster + Kibana | esql_3 | `loginAsAdmin()` | Index editor creates/deletes ES indices + manages mappings → admin required |

Per the working agreement, **only built-in roles** are used: `loginAsPrivilegedUser` for esql_1/2/4, `loginAsAdmin` for esql_3. No custom roles.

### Over-privileged tests

- `esql_3` genuinely needs admin (creates indices, reads mappings). Not over-privileged.
- esql_1/2/4 use `kibana_admin` in FTR but only need read + saved-object write → downgrade to `loginAsPrivilegedUser`.

### Roles deserving shared helpers

- None new; built-in `browserAuth` helpers cover all cases.

### Special auth patterns

- None (`run_as`/API-key/cert auth not used).

---

## 6. Reusability audit

### FTR services and page objects in use

| FTR name | What it does | Used by | Scout equivalent | Hidden assertions | Recommended scope |
|----------|-------------|---------|------------------|-------------------|-------------------|
| `PageObjects.discover` | Navigate, ES|QL mode, save/load search, breakdown, brush | all | Mostly exists (`DiscoverApp` in `@kbn/scout`) | some (`assertHitCount`, `expectOnDiscover`) | Extend `DiscoverApp`/spec helpers; move assertions to specs |
| `PageObjects.header` | `waitUntilLoadingHasFinished` | all | Replace with content-ready waits (`dataGrid.waitForLoad`, `waitUntilTabIsLoaded`) | yes (global spinner) | Drop pattern |
| `PageObjects.timePicker` | Default absolute range | esql_1/2/4 | `datePicker` PO + `scoutSpace.uiSettings.setDefaultTime` | no | Use existing |
| `PageObjects.unifiedFieldList` | add/remove field, add breakdown, wait sidebar | esql_1/2 | Partial (`UnifiedFieldList`) — missing `clickFieldListItemRemove`, `clickFieldListAddBreakdownField`, `waitUntilSidebarHasLoaded` | no | Add methods to `@kbn/scout` `UnifiedFieldList` or spec helper |
| `PageObjects.unifiedSearch` | switch to dataview mode, list data views | esql_2 | Partial | no | Add spec helper |
| `PageObjects.dashboard` | new/save/load dashboard, view mode, render complete | esql_2/4 | Exists (`DashboardApp`) | some | Use existing |
| `PageObjects.dashboardControls` | options-list control read/select | esql_4 | **Missing** | no | New plugin-local page object (or dashboard fixtures) |
| `PageObjects.indexEditor` | lookup-index editor (columns, cells, rows, upload, verify) | esql_3 | **Missing** | yes (`verifyIndexContent`/`verifyIndexMappings` assert) | New plugin-local page object; keep verification in spec via `esClient` |
| `getService('esql')` | ES|QL editor: history, suggestions, badge hover, control flyout | esql_2/3/4 | **Missing** | some | New spec-level ES|QL helper(s) |
| `getService('dataGrid')` | header fields, cell text, sort, filter-for/out, doc rows | all | Mostly exists (`DataGrid`, `DiscoverApp.getDocHeader`) — missing `getCellElementExcludingControlColumns`, `clickCellFilterFor/OutButtonExcludingControlColumns`, `clickDocSortDesc` | no | Add methods to `@kbn/scout` `DataGrid` |
| `getService('inspector')` | request names/times | esql_2 | **Missing** | no | New spec helper |
| `getService('dashboardAddPanel')` / `dashboardPanelActions` | add saved search, panel actions, unlink | esql_2/4 | Partial | no | Extend dashboard fixtures / spec helper |
| `getService('elasticChart')` | rendering count | esql_2 | **Missing** | no | Use `data-render-complete`/render count via spec helper |
| `getService('filterBar')` | filter count | esql_2 | Exists (`FilterBar`) | no | Use existing |
| `getService('monacoEditor')` | code editor get/set/markers | all | Exists (`KibanaCodeEditorWrapper` via `DiscoverApp.codeEditor`) | no | Use existing; wrap `getModels`/markers in `toPass` |

### EUI / non-test-subj interactions

| Component | Interaction | Files | Notes |
|----------|-------------|-------|-------|
| `EuiDataGrid` header/cell content | `.euiDataGridHeaderCell__content`, `[role="gridcell"]:nth-child(n)` | esql_1/2/3 | Prefer `data-grid-visible-row-index` + `data-gridcell-column-id` (already used by Scout `DataGrid`); avoid `nth-child` (lint: `no-nth-methods`) |
| `EuiComboBox` (column type) | type + select | esql_3 | Use Scout combobox helpers |
| Monaco hover popup | `.monaco-hover .hover-row` | esql_2/3 | Brittle; no `data-test-subj`. Flag for source `data-test-subj` or keep a scoped Monaco-hover helper wrapped in `toPass` |
| ES|QL source badge | `.esqlSourcesBadge`, `.esqlDataSourceBrowser` | esql_2 | Missing `data-test-subj` on badge (`.esqlSourcesBadge`) — needs source addition or scoped helper |

### Brittle locator strategies (source `data-test-subj` candidates)

| File | Locator | Target |
|------|---------|--------|
| `esql_2/_esql_view.ts` | `find.byCssSelector('.esqlSourcesBadge')` | ES|QL sources badge |
| `esql_2/_esql_view.ts` | `[data-test-subj="discover-esql-to-dataview-modal"] .euiModal__closeIcon` | Modal close button (has no dedicated subj) |
| `esql_2/_esql_view.ts` | `'[role="gridcell"]:nth-child(4)'`, `filterForButton` in dashboard panel | Use grid column-id locators |
| `esql_2/_esql_view.ts` | `esql.getEsqlBadgeHoverText` via `.monaco-hover` | Monaco hover rows |
| `esql_3/_index_editor.ts` | `esql.selectEsqlBadgeHoverOption('lookupIndexBadge', …)` via `.monaco-hover` | Lookup-index badge hover menu |

### Page objects with hidden assertions to restructure

- `getService('esql')`: `expectEsqlStatement`, `isQueryPresentInTable` (assert) → return values, assert in spec.
- `indexEditor.verifyIndexContent` / `verifyIndexMappings` (assert against ES) → in Scout, read via `esClient` in the spec and assert there.
- `discover.assertHitCount` → replace with `expect(pageObjects.discover.hitCountLocator()).toHaveText('14,004', { timeout: 30_000 })` per migration conventions (add `hitCountLocator()` to `DiscoverApp` if missing).

---

## 7. Server configuration

### FTR server args (full chain)

| Arg | Source | Category | Action |
|-----|--------|----------|--------|
| `esTestCluster.serverArgs: ['xpack.security.enabled=true']` | all `config.ts` | already in Scout default | none |
| `--feature_flags.overrides.discover.cascadeLayoutEnabled=false` | `esql_2/config.ts` | **boot feature flag** (default `true`; read at `build_services.ts` via `core.featureFlags.getBooleanValue`) | **DECISION REQUIRED** |
| base functional `kbnTestServer.serverArgs` | `config.base.js` | Scout default equivalents | none |

### esql_2 `cascadeLayoutEnabled=false` — decision required

`discover.cascadeLayoutEnabled` defaults to `true`. The FTR suite forces it **off** to assert the classic (non-cascade) grid layout. The migrated assertions (`getHeaderFields`, `getCellElementExcludingControlColumns`, header/cell text) may differ under the default cascade layout.

- **Recommended:** first **verify** whether the ported assertions pass against Scout's default (cascade `true`). This flag is a **runtime-settable feature-flag override** (`apiServices.core.settings({ 'feature_flags.overrides': { 'discover.cascadeLayoutEnabled': false } })`), Cloud-compatible — no custom server config set needed.
- If the assertions require the flag off: because overrides are **server-wide**, do **not** set it in the shared Discover `global.setup.ts` (it would leak into every other Discover parallel spec that expects the default). Instead give esql_2 its **own** playwright config + `global.setup.ts`/`global.teardown.ts` that set and revert the override.

No custom server **config set** (`kbn-scout/.../config_sets`) is required either way.

### Custom server config needed?

- No. Everything maps to Scout defaults + a runtime feature-flag override for esql_2.

---

## 8. Deployment targets

| Proposed spec(s) | Where it should run | Tag | Reasoning |
|------------------|--------------------|-----|-----------|
| `esql_columns`, `esql_formatting` (esql_1) | stateful classic | `@local-stateful-classic` | No serverless FTR copy exists |
| `esql_controls` (esql_4) | stateful classic | `@local-stateful-classic` | No serverless FTR copy; dashboard-controls flow |
| `index_editor` (esql_3) | stateful classic | `@local-stateful-classic` | No serverless copy; admin/index-mutation flow |
| `view/*` (esql_2) | both | `tags.deploymentAgnostic` | Has serverless copy (`x-pack/platform/test/serverless/functional/test_suites/discover/esql/_esql_view.ts`); condense stateful + serverless into one deployment-agnostic Scout suite and delete the serverless FTR copy |

### Coverage gaps

- The serverless FTR copy of `_esql_view` has 19 `it` vs 32 stateful. Migrating the stateful set as `deploymentAgnostic` **expands** serverless coverage; verify each ported case is serverless-safe (e.g. inspector slow-query test, dashboard flows). Flag any case that must stay stateful-only with `tags.stateful.*` and a comment.

### Cloud portability issues

| File | Issue | Handling |
|------|-------|----------|
| `esql_2` inspector slow-query test | uses `window.ELASTIC_ESQL_DELAY_SECONDS` via `browser.execute` | Portable (client-side global); reproduce with `page.evaluate`/`addInitScript` |
| `esql_3` file upload | local `imports/customers.csv` path via `__dirname` | Copy fixture into the spec's fixtures dir; use Playwright `setInputFiles` |
| `esql_4` "open in Discover" | opens a **second browser tab** (`browser.getAllWindowHandles`/`switchToWindow`) | Use Playwright `context.waitForEvent('page')` to capture the new tab |

---

## 9. FTR test smells

| Smell | File | Description |
|-------|------|-------------|
| Global loading wait | esql_1/2/3 | Pervasive `header.waitUntilLoadingHasFinished()` — replace with content-ready waits |
| Retry wrappers around assertions | esql_2 (`sorting`, `filter_by_table`, `inspector`), esql_3 (`tryForTime`) | `retry.try/waitFor` masking timing — replace with `expect.poll`/`toPass` |
| Sequential journey as separate `it` | esql_2 `histogram breakdown` (choose → filter → save → reload across 4 `it` sharing state), esql_1 `columns` (save in one test, load in another) | Shared browser + saved-object state across `it`. In Scout each `test` is isolated — either combine into one journey test or re-establish state (load the saved search) in each test |
| Shared mutable state | esql_1 columns saved-search names created early, loaded later | Recreate/seed saved searches per test or keep as a single ordered journey |
| Brittle CSS / Monaco hover | esql_2/3 | `.esqlSourcesBadge`, `.monaco-hover`, `nth-child` gridcells — see §6 |
| Conditional assertion | esql_2 errors test (`if (message.includes('line')) …`) | Preserve but make deterministic per query |
| UI-based setup | esql_2/4 create dashboards via UI in-test | Acceptable (the flow under test); do not convert to API where the UI creation is the assertion |
| Cross-window | esql_4 | `getAllWindowHandles` + `switchToWindow` → Playwright new-page event |
| Hardcoded timeouts | esql_3 (`tryForTime(6000/10000/20000)`) | Replace with `expect(...).toPass({ timeout })` |
| Over-broad role | esql_1/2/4 use `kibana_admin` | Downgrade to `loginAsPrivilegedUser` |
| Missing teardown | esql_1 formatting loads flights ES data with `esArchiver.load` (no unload) | Global setup uses `loadIfNeeded`; no per-spec ES teardown needed |

---

## 10. Migration batches

### Batch 1 — Quick wins (esql_1)

| # | Proposed spec | From | Complexity | Notes |
|---|--------------|------|------------|-------|
| 1 | `parallel_tests/esql/esql_formatting.spec.ts` | `esql_1/_esql_formatting.ts` | simple | Uses existing `DiscoverApp` + `DataGrid` + `docViewer`; add `getCellExcludingControlColumns` helper |
| 2 | `parallel_tests/esql/esql_columns.spec.ts` | `esql_1/_esql_columns.ts` | medium | Needs `unifiedFieldList.clickFieldListItemRemove`; saved-search journey handling |

- **Human involvement:** `autopilot`
- **Dependencies:** small `DataGrid`/`UnifiedFieldList`/`DiscoverApp` method additions
- **Blockers:** none

### Batch 2 — esql_4 controls

| # | Proposed spec | From | Complexity | Notes |
|---|--------------|------|------------|-------|
| 3 | `parallel_tests/esql/esql_controls.spec.ts` | `esql_4/_esql_controls.ts` | complex | New dashboard-controls (options-list) helper; new-tab handling; per-space archives; drop skipped test |

- **Human involvement:** `guided` (new controls helper, new-tab flow)
- **Dependencies:** dashboard-controls helper
- **Blockers:** none

### Batch 3 — esql_3 index editor (sequential)

| # | Proposed spec | From | Complexity | Notes |
|---|--------------|------|------------|-------|
| 4 | `tests/esql/index_editor.spec.ts` (+ sequential playwright config) | `esql_3/_index_editor.ts` | complex | New `IndexEditor` page object; ES|QL suggestion + badge-hover helper; `esClient` verification; index cleanup; file upload; new sequential config `playwright.config.ts` |

- **Human involvement:** `hands-on` (new sequential config, new page object, Monaco suggestion/badge helpers)
- **Dependencies:** ES|QL editor suggestion helper (shared with esql_2)
- **Blockers:** confirm a sequential (`tests/`) Scout config is acceptable alongside the existing parallel one

### Batch 4 — esql_2 view (largest)

| # | Proposed spec | From | Complexity | Notes |
|---|--------------|------|------------|-------|
| 5–13 | `parallel_tests/esql/view/*.spec.ts` (9 specs) **or** dedicated config | `esql_2/_esql_view.ts` | complex | ES|QL history/suggestion helpers, inspector helper, chart render-count helper, filter-by-table grid helpers, sorting helpers; delete serverless FTR copy; resolve cascade-layout flag (§7) |

- **Human involvement:** `hands-on`
- **Dependencies:** all helpers from Batches 1–3 + inspector/chart helpers; §7 decision
- **Blockers:** `cascadeLayoutEnabled` decision (§7); serverless parity review (§8)

---

## 11. Effort summary

| Metric | Value |
|--------|-------|
| Total FTR test files analyzed | 5 test files (+ 4 index, 4 config) |
| > UI tests | 5 (→ ~14 Scout spec files after splitting) |
| > API tests | 0 |
| > Unit tests (RTL/Jest) | 0 |
| > Dropped | 1 `it` (esql_4 skipped duplicate) |
| > Deferred | 0 (esql_2 gated on flag decision) |
| New page objects | 2 plugin-local (`IndexEditor`, dashboard-controls helper) + method additions to `@kbn/scout` `DataGrid`/`UnifiedFieldList`/`DiscoverApp` |
| New spec helpers | ES|QL editor (history/suggestions/badge hover), inspector, chart render-count, filter-by-table |
| New API services | 0 (use `esClient` directly) |
| `data-test-subj` additions to source | ≥2 candidates (`.esqlSourcesBadge`; modal close icon) — verify/add or use scoped helpers |
| Custom server config sets | 0 |
| New Scout playwright configs | 1 sequential (esql_3); possibly 1 for esql_2 (flag isolation) |
| Migration batches | 4 |

### Risks and open questions

1. **NEEDS VERIFICATION — esql_2 `cascadeLayoutEnabled`:** do the ported grid/header/cell assertions pass against Scout's default cascade layout? If not, esql_2 needs its own config + runtime flag override (§7). This is the single biggest decision.
2. **NEEDS VERIFICATION — `enableESQL` / flights read access** under Scout's default privileged user and default UI settings (§4/§5).
3. **NEEDS VERIFICATION — serverless parity for esql_2:** confirm the inspector slow-query and dashboard flows are serverless-safe before tagging `deploymentAgnostic`; otherwise split off stateful-only cases (§8).
4. **Sequential config for esql_3:** first sequential (`tests/`) Scout config in this plugin (only a parallel one exists today) — confirm acceptable.
5. **Monaco hover / ES|QL badge helpers** rely on `.monaco-hover` (no `data-test-subj`) — brittle; wrap in `toPass` and consider source `data-test-subj` additions.
6. **Cross-window (esql_4)** and **file upload (esql_3)** need Playwright-native patterns (new-page event, `setInputFiles`).
7. **Serverless FTR copy deletion:** `x-pack/platform/test/serverless/functional/test_suites/discover/esql/_esql_view.ts` must be removed as part of the esql_2 migration commit.
