# FTR to Scout Migration Plan

| Field | Value |
|-------|-------|
| Source | `src/platform/test/functional/apps/discover/tabs4/_duplication.ts` |
| Target module root | `src/platform/plugins/shared/discover` |
| Generated | 2026-06-04 |
| Deployment targets | stateful (matches current FTR coverage and sibling Scout `core` specs) |
| FTR config chain | `tabs4/config.ts` > `src/platform/test/functional/config.base.js` |

---

## 1. Test inventory

Sorted by estimated complexity (simple to complex).

| # | FTR file (relative) | Type | Description | `it` count | Complexity | Decision | Justification |
|---|---------------------|------|-------------|-----------|------------|----------|---------------|
| 1 | `apps/discover/tabs4/_duplication.ts` | test | Duplicating a Discover tab restores per-tab UI state (sidebar field filter + histogram height) and app/global state (query, filter, breakdown, time range, hit count) | 2 | medium | UI test | Both tests exercise real multi-tab browser interactions (drag-resize, tab menu, state restoration) that cannot be validated below the UI layer |

The migration target is **only** `_duplication.ts`. The sibling `_no_data.ts` (also loaded by `tabs4/index.ts`) is out of scope.

### Proposed file splits (omit if none)

No split needed. The two `it` blocks share the same data view and `beforeEach` navigation but test distinct concerns (per-tab UI state vs app/global state). They map cleanly to two `spaceTest(...)` cases inside one spec file, mirroring the existing [`new_tab.spec.ts`](src/platform/plugins/shared/discover/test/scout/ui/parallel_tests/core/new_tab.spec.ts) structure.

### Tests to drop (omit if empty)

None.

### Tests to defer (omit if empty)

None.

---

## 2. Test type routing

### UI tests

| FTR file | Proposed spec path | Key flows covered |
|----------|--------------------|-------------------|
| `tabs4/_duplication.ts` (`it` #1) | `test/scout/ui/parallel_tests/core/tab_duplication.spec.ts` (`spaceTest` #1) | Filter sidebar fields + resize histogram, create/select/duplicate tabs, assert each tab restores its own sidebar field count and histogram height |
| `tabs4/_duplication.ts` (`it` #2) | same spec, `spaceTest` #2 | Set query/filter/breakdown/time range, create/duplicate tabs, assert each tab restores hit count and breakdown label |

### API tests

None — neither test asserts pure data correctness; both depend on browser-only state (drag resize, tab menu, per-tab UI persistence).

### Unit tests (RTL/Jest)

None.

---

## 3. Parallelism plan

### Parallel-safe (can be space-isolated)

| Proposed spec | Why parallel-safe |
|--------------|------------------|
| `tab_duplication.spec.ts` | All mutated state is space-scoped (saved objects + `defaultIndex`/`timepicker:timeDefaults` UI settings set in `beforeAll`) or client-side per-tab state. ES `logstash-*` data is read-only and shared (pre-ingested in `global.setup.ts`). Belongs in the existing `parallel_tests` pool (`workers: 2`). |

### Must be sequential

None.

---

## 4. Test data and setup

### Archives inventory

| Archive path | Contents | Size | Used by (files) | Verdict |
|-------------|----------|------|-----------------|---------|
| `es_archiver/logstash_functional` | `logstash-*` indices, 14,004 docs | ~large | `_duplication.ts` (both tests) | Keep — already loaded once in [`global.setup.ts`](src/platform/plugins/shared/discover/test/scout/ui/parallel_tests/global.setup.ts) via `esArchiver.loadIfNeeded` |
| `kbn_archiver/discover` | `logstash-*` data view + saved objects | ~small | `_duplication.ts` (default index) | Keep — loaded per-space by `setupDiscoverDefaults` (`DISCOVER_KBN_ARCHIVE`) |
| `es_archiver/index_pattern_without_timefield` | data view w/o timefield | - | `_no_data.ts` only | Not needed for this migration |
| `es_archiver/kibana_sample_data_flights` + `kbn_archiver/kibana_sample_data_flights_index_pattern` | flights sample data | - | `_no_data.ts` only | Not needed for this migration |

### UI settings mutations

| FTR call | Semantics | Files |
|----------|-----------|-------|
| `kibanaServer.uiSettings.replace({ defaultIndex: 'logstash-*' })` | Replace-all (FTR `index.ts:38`) | covered in Scout by `scoutSpace.uiSettings.setDefaultIndex(DEFAULT_DATA_VIEW)` (selective, space-scoped) |
| `timePicker.setDefaultAbsoluteRangeViaUiSettings()` | Sets `timepicker:timeDefaults` (FTR `index.ts:39`) | covered in Scout by `scoutSpace.uiSettings.setDefaultTime(DEFAULT_TIME_RANGE)` |

Both are already encapsulated in `setupDiscoverDefaults` / `teardownDiscoverDefaults` ([`fixtures/common/setup.ts`](src/platform/plugins/shared/discover/test/scout/ui/fixtures/common/setup.ts)). Reuse them.

### Shared constants to extract

| Value | Occurrences | Current locations | Action |
|-------|-------------|-------------------|--------|
| `logstash-*` / default time range | reused across core specs | `_duplication.ts` (default index/time) | Already present as `DEFAULT_DATA_VIEW` + `DEFAULT_TIME_RANGE` in [`fixtures/common/constants.ts`](src/platform/plugins/shared/discover/test/scout/ui/fixtures/common/constants.ts). Reuse. |
| `Sep 19, 2015 @ 06:31:44.000` / `Sep 21, 2015 @ 06:31:44.000` | `it` #2 only | `_duplication.ts:100-103` | Inline in the spec (single-use narrowed range). |
| `14,004` (initial hits) / `270` (filtered hits) | `it` #2 | `_duplication.ts:87,90` | Inline as numeric constants (compare via `getHitCountInt` → `14004` / `270`). |
| `48` (initial available fields) / `4` (after `geo` filter) | `it` #1 | `_duplication.ts:33,35` | Inline as numeric constants. |

### Fresh server required (omit if none)

None.

---

## 5. Auth and roles

### Role inventory

| Role name | Source | Privileges (summary) | Used by (files) | Notes |
|-----------|--------|---------------------|-----------------|-------|
| `kibana_admin` + `test_logstash_reader` | FTR `tabs4/index.ts:22` | Kibana admin + read on `logstash-*` | `_duplication.ts` | Over-privileged: the test only reads data and manipulates client-side tab/UI state; it never saves a search or data view. |

### Over-privileged tests

| File | What it actually exercises | Suggested minimum privilege |
|------|---------------------------|----------------------------|
| `_duplication.ts` | Read `logstash-*`, filter sidebar, resize histogram, set query/filter/breakdown/time, create/duplicate/switch tabs (all in-memory) | Scout `browserAuth.loginAsViewer()` — matches [`data_grid_doc_table.spec.ts`](src/platform/plugins/shared/discover/test/scout/ui/parallel_tests/core/data_grid_doc_table.spec.ts). `NEEDS VERIFICATION`: confirm viewer can open the data-view switcher and tab menu; fall back to `loginAsPrivilegedUser()` (as `new_tab.spec.ts` uses) if not. |

### Roles deserving shared helpers (used in ≥3 files)

Covered by Scout's built-in `browserAuth` roles; no custom helper needed.

### Special auth patterns (omit if none)

None.

---

## 6. Reusability audit

### FTR services and page objects in use

| FTR name | What it does | Scout equivalent exists? | Hidden assertions? | Recommended scope |
|----------|-------------|-------------------------|-------------------|-------------------|
| `PageObjects.discover.getHistogramHeight` | Returns histogram panel height | **no** | no | Add to shared `DiscoverApp` |
| `PageObjects.discover.resizeHistogramBy` | Drags the histogram resize handle | **no** | no | Add to shared `DiscoverApp` |
| `PageObjects.discover.getBreakdownFieldValue` | Reads breakdown selector button label | **no** | no | Add to shared `DiscoverApp` |
| `PageObjects.discover.chooseBreakdownField` | Picks a breakdown field | yes (`DiscoverApp.chooseBreakdownField`) | no | Reuse |
| `PageObjects.discover.getHitCount` | Reads hit count text | yes (`DiscoverApp.getHitCountInt`) | no | Reuse (compare ints) |
| `PageObjects.discover.waitUntilTabIsLoaded` | Waits for tab load | yes (`DiscoverApp.waitUntilTabIsLoaded`) | no | Reuse |
| `PageObjects.unifiedFieldList.getSidebarSectionFieldCount('available')` | Count of available fields in sidebar | **no** | no | Add to shared `DiscoverApp` (e.g. `getSidebarAvailableFieldCount()`) |
| `PageObjects.unifiedFieldList.findFieldByName` | Types in sidebar field search | **no** (inlined ad-hoc in `data_grid_doc_table.spec.ts:27`) | no | Add to shared `DiscoverApp` (e.g. `searchFieldInSidebar(name)`) |
| `PageObjects.unifiedTabs.createNewTab` | New tab | yes (`DiscoverApp.createNewTab`) | no | Reuse |
| `PageObjects.unifiedTabs.selectTab(index)` | Switch tab by index | yes (`DiscoverApp.selectTab`) | no | Reuse |
| `PageObjects.unifiedTabs.duplicateTab(index)` | Duplicate a tab **by index** | partial (`DiscoverApp.duplicateActiveTab` duplicates only the active tab) | no | Add `duplicateTab(index)` to shared `DiscoverApp` (FTR duplicates non-active tabs: `duplicateTab(0)`, `duplicateTab(2)`) |
| `getService('queryBar').setQuery` | Set KQL query | yes (`QueryBar.setQuery` + `DiscoverApp.submitQuery`, or `DiscoverApp.writeAndSubmitKqlQuery`) | no | Reuse |
| `getService('filterBar').addFilter` | Add a filter pill | yes (`FilterBar.addFilter`, note `operation` → `operator`) | no | Reuse |
| `getService('timePicker').setAbsoluteRange` | Set absolute time range | yes (`DatePicker.setAbsoluteRange`) | no | Reuse |
| `getService('timePicker').setDefaultAbsoluteRange` | Reset to default range | partial | no | Use `DatePicker.setAbsoluteRange` with the `DEFAULT_TIME_RANGE` values rendered in `MMM D, YYYY @ HH:mm:ss.SSS` format |
| `getService('retry').try` | Retry assertion block | n/a | n/a | Replace with Playwright auto-retry (`expect.poll` for numbers, `expect(...).toBe...` for text) |

### EUI components interacted with directly

| Component | Interaction pattern | Files |
|----------|-------------------|-------|
| Unified histogram resizable panel | Drag resize handle (`unifiedHistogramResizableButton`), measure panel height (`unifiedHistogramResizablePanelFixed`) | `_duplication.ts:43-45,563-571` |
| Unified field list sidebar | Field search input + available-fields count badge | `_duplication.ts:37,27` |
| Unified tabs bar | New / select / duplicate (tab menu) | `_duplication.ts:52,60,67,74` |
| Breakdown selector (`EuiSelectable`) | Open + select, read button label | `_duplication.ts:91,107` |

### Brittle locator strategies

| File | Line | Current locator | Target component | Resolution |
|------|------|----------------|-----------------|------------|
| FTR `unified_field_list.ts` | 98-101 | `find.byCssSelector('[data-test-subj="...-count"]')` | sidebar available count | Use `data-test-subj` `fieldListGroupedAvailableFields-count` directly in Scout — no source change needed |

All required `data-test-subj` attributes already exist in source (`unifiedHistogramResizablePanelFixed`, `unifiedHistogramResizableButton`, `fieldListGroupedAvailableFields-count`, `fieldListFiltersFieldSearch`, `unifiedHistogramBreakdownSelectorButton`, `unifiedTabs_*`). **No source-code `data-test-subj` additions required.**

### Page objects with hidden assertions

None relevant — the new shared methods must **return state** (height, count, label); assertions stay in the spec.

---

## 7. Server configuration

### FTR server args (full chain)

| Arg | Source config | Category | Notes |
|-----|-------------|----------|-------|
| (none extra) | `tabs4/config.ts` adds no `serverArgs` beyond `config.base.js` defaults | already in Scout default | `tabs4/config.ts` spreads base `kbnTestServer.serverArgs` unchanged |

### ES server args

None specific to this suite.

### Custom server config needed? (omit if all args are covered)

Not needed — Scout's **default** test servers config is sufficient. The existing Discover Scout `parallel.playwright.config.ts` (`createPlaywrightConfig`, default servers) already runs the sibling `core` specs.

Note: `global.setup.ts` disables the `discover.isEsqlDefault` feature flag globally; the migrated test runs in classic mode (default), consistent with the FTR test, so this is already handled.

---

## 8. Deployment targets

| Proposed spec | Where it should run | Reasoning |
|--------------|--------------------|-----------| 
| `tab_duplication.spec.ts` | stateful | FTR runs only in `.buildkite/ftr-manifests/ftr_platform_stateful_configs.yml` (`tabs4/config.ts`). Sibling Scout `core` specs (`new_tab.spec.ts`, `data_grid_doc_table.spec.ts`) use `tags.stateful.all`. Use `tags.stateful.all`. |

### Coverage gaps (omit if none)

- `NEEDS VERIFICATION`: Unified tabs is a platform feature that may also exist in serverless. Current Scout tab coverage (`new_tab.spec.ts`) is stateful-only, so this migration matches the existing baseline rather than expanding it. Expanding to `tags.deploymentAgnostic` could be a follow-up if tabs are confirmed enabled across serverless project types.

### Cloud portability issues (omit if none)

None — no hardcoded paths, ports, or single-node assumptions. Uses pre-ingested archive data and space-scoped UI settings.

---

## 9. FTR test smells

| Smell | File | Lines | Description | Context |
|-------|------|-------|------------|---------|
| Retry wrapper | `_duplication.ts` | 38-40, 46-48, 55-58, 62-65, 69-72, 76-79, 85-88, 105-108, 113-116, 120-123, 127-130 | `retry.try(...)` around count/height/hit-count/breakdown assertions | Replace with Playwright auto-retrying assertions: `expect.poll(() => discover.getHistogramHeight()).toBe(...)` and `expect.poll(() => discover.getSidebarAvailableFieldCount()).toBe(...)`; `expect.poll(() => discover.getHitCountInt())` and `expect(await discover.getBreakdownFieldValue())...` |
| Sequential journey in one `it` | `_duplication.ts` | 25-80, 82-131 | Each `it` is a long ordered journey relying on accumulated tab/UI state | Preserve as a single `spaceTest` each; wrap logical phases in `spaceTest.step(...)` for readability (as `new_tab.spec.ts` does) |
| Over-privileged execution | `tabs4/index.ts` | 22 | Runs as `kibana_admin` + `test_logstash_reader` | Downgrade to `loginAsViewer()` (see section 5) |
| Magic numbers | `_duplication.ts` | 33,35,87,90 | `48`, `4`, `'14,004'`, `'270'` hardcoded | Keep as clearly named local constants in the spec |

No try/catch swallowing, hardcoded `setTimeout`/`sleep`, global-loading waits, onboarding dismissals, or conditional assertions found.

---

## 10. Migration batches

### Batch 1: Tab duplication spec + supporting page-object methods

| # | Proposed spec | From FTR file | Complexity | Notes |
|---|--------------|--------------|------------|-------|
| 1 | `core/tab_duplication.spec.ts` | `tabs4/_duplication.ts` | medium | Add 6 methods to shared `DiscoverApp`; reuse existing `setupDiscoverDefaults`/`teardownDiscoverDefaults`, `QueryBar`, `FilterBar`, `DatePicker` |

New shared `DiscoverApp` methods to add (all selectors already exist in source):
- `getSidebarAvailableFieldCount(): Promise<number>` — read `fieldListGroupedAvailableFields-count` text
- `searchFieldInSidebar(name: string)` — fill `fieldListFiltersFieldSearch`
- `getHistogramHeight(): Promise<number>` — bounding-box height of `unifiedHistogramResizablePanelFixed`
- `resizeHistogramBy(distance: number)` — drag `unifiedHistogramResizableButton` by `y = distance` via `page.mouse`
- `getBreakdownFieldValue(): Promise<string>` — innerText of `unifiedHistogramBreakdownSelectorButton`
- `duplicateTab(index: number)` — select tab `index` then duplicate via tab menu (generalizes existing `duplicateActiveTab`)

- **Human involvement**: `autopilot` (mechanical page-object additions + spec port; no source `data-test-subj` changes, no new server config, no new fixtures). Shared-package edits to `DiscoverApp` warrant a quick human glance on review.
- **Dependencies**: none.
- **Blockers**: none. (`NEEDS VERIFICATION` only: viewer-role sufficiency — section 5.)

---

## 11. Effort summary

| Metric | Value |
|--------|-------|
| Total FTR test files analyzed | 1 |
| > UI tests | 1 file (2 `it` → 2 `spaceTest` cases) |
| > API tests | 0 |
| > Unit tests (RTL/Jest) | 0 |
| > Dropped | 0 |
| > Deferred | 0 |
| New page objects needed | 0 new classes; 6 new methods on shared `DiscoverApp` |
| New API services needed | 0 |
| `data-test-subj` additions to source code | 0 |
| Custom server config sets | 0 new / reuse default |
| Migration batches | 1 |

### Risks and open questions

- `NEEDS VERIFICATION`: Can `loginAsViewer()` open the data-view switcher and tab menu? If not, use `loginAsPrivilegedUser()` (as `new_tab.spec.ts`).
- `NEEDS VERIFICATION`: Histogram drag-resize stability in Playwright — FTR uses `browser.dragAndDrop` by a y-offset; the Scout port should drag `unifiedHistogramResizableButton` via `page.mouse.move/down/up` and assert the new height with `expect.poll`. The resize delta (`100`, `50`) is exact-pixel in FTR; confirm the same delta lands deterministically under Scout's viewport (`1920x1080` used by `new_tab.spec.ts`) or assert "increased by ~distance" with a small tolerance.
- Deployment is intentionally kept stateful-only to match the current FTR + sibling Scout baseline (see section 8 coverage gap).
