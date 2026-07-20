# FTR to Scout Migration Plan

| Field              | Value                                                                                                                                             |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source             | `src/platform/test/functional/apps/discover/group8`                                                                                               |
| Target module root | `src/platform/plugins/shared/discover`                                                                                                            |
| Generated          | `2026-07-20`                                                                                                                                      |
| Deployment targets | `stateful`                                                                                                                                        |
| FTR config chain   | `src/platform/test/functional/apps/discover/group8/config.ts` > `src/platform/test/functional/config.base.js` > shared platform functional config |

---

## 1. Test inventory

Sorted by estimated complexity (simple to complex).

| #   | FTR file (relative)                                                   | Type   | Description                                                                                                                          | `it` count                                     | Complexity | Decision           | Justification                                                                                                                                                                   |
| --- | --------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------- | ---------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `src/platform/test/functional/apps/discover/group8/index.ts`          | index  | Loads the group8 suites after resizing the browser and loading `logstash_functional` once.                                           | -                                              | -          | split              | `loadTestFile` composes three independent suites at lines 24-26; Scout should migrate each target as its own spec or closely scoped describe.                                   |
| 2   | `src/platform/test/functional/apps/discover/group8/_default_route.ts` | test   | Verifies Discover can be opened from the Kibana `defaultRoute` advanced setting, including saved-search and URL-with-filters routes. | 2                                              | simple     | UI test            | Explicit migration comment says Scout; the behavior is an app-shell navigation integration between advanced settings, Discover routing, saved searches, query bar, and filters. |
| 3   | `src/platform/test/functional/apps/discover/group8/_flyouts.ts`       | test   | Verifies opening one Discover flyout closes the currently open doc viewer, ES                                                        | QL docs, or Lens edit flyout.                  | 5          | medium             | UI test                                                                                                                                                                         | Explicit migration comment says Scout; this is a real multi-feature UI integration smoke test that cannot be reduced to API coverage. |
| 4   | `src/platform/test/functional/apps/discover/group8/_sidenav_link.ts`  | test   | Verifies the side-nav Discover link restores the last Discover URL in classic, ES                                                    | QL, ad-hoc data-view, and saved-session flows. | 4          | medium             | UI test                                                                                                                                                                         | Explicit migration comment says Scout; the coverage is browser navigation and Chrome side-nav state restoration.                      |
| 5   | `src/platform/test/functional/apps/discover/group8/config.ts`         | config | Wires the group8 directory into the platform functional base config.                                                                 | -                                              | -          | Scout config reuse | No group-specific server args or custom services; target existing Discover Scout UI parallel config.                                                                            |

### Proposed file splits

Files that test multiple roles or unrelated flows and should become separate specs:

- `index.ts`: split by `loadTestFile` target:
  - `ui/parallel_tests/core/tabs/default_route.spec.ts` from `_default_route.ts`
  - `ui/parallel_tests/core/tabs/flyouts.spec.ts` from `_flyouts.ts`
  - `ui/parallel_tests/core/tabs/sidenav_link.spec.ts` from `_sidenav_link.ts`

---

## 2. Test type routing

### UI tests

| FTR file                                                              | Proposed spec path                                                                                  | Key flows covered                                                                                                  |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| `src/platform/test/functional/apps/discover/group8/_default_route.ts` | `src/platform/plugins/shared/discover/test/scout/ui/parallel_tests/core/tabs/default_route.spec.ts` | Saved-search `defaultRoute` loads `A Saved Search`; URL `defaultRoute` preserves filter/query state and hit count. |
| `src/platform/test/functional/apps/discover/group8/_flyouts.ts`       | `src/platform/plugins/shared/discover/test/scout/ui/parallel_tests/core/tabs/flyouts.spec.ts`       | Doc viewer, ES                                                                                                     | QL docs quick reference, and Lens edit flyout mutually dismiss each other.              |
| `src/platform/test/functional/apps/discover/group8/_sidenav_link.ts`  | `src/platform/plugins/shared/discover/test/scout/ui/parallel_tests/core/tabs/sidenav_link.spec.ts`  | Discover side-nav link restores classic last URL, ES                                                               | QL last URL, ignores unsaved ad-hoc data-view URL, and restores a saved ad-hoc session. |

### API tests

| FTR file | Proposed spec path | Why API not UI |
| -------- | ------------------ | -------------- |

### Unit tests (RTL/Jest)

| FTR file | Component under test | Proposed test path | What to test |
| -------- | -------------------- | ------------------ | ------------ |

---

## 3. Parallelism plan

### Parallel-safe (can be space-isolated)

| Proposed spec                                       | Why parallel-safe                                                                                                                        |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `ui/parallel_tests/core/tabs/default_route.spec.ts` | Uses space-scoped saved objects and UI settings (`defaultIndex`, `timepicker:timeDefaults`, `defaultRoute`); no cluster/global mutation. |
| `ui/parallel_tests/core/tabs/flyouts.spec.ts`       | Uses shared read-only `logstash_functional` ES data plus space-scoped Discover saved objects and UI settings.                            |
| `ui/parallel_tests/core/tabs/sidenav_link.spec.ts`  | Uses shared read-only ES data, space-scoped saved objects, and per-test browser navigation state.                                        |

### Must be sequential

| Proposed spec | Why sequential |
| ------------- | -------------- |

---

## 4. Test data and setup

### Archives inventory

| Archive path                                                            | Contents                                                                                   | Size               | Used by (files)                                                 | Verdict                                                                      |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------ | --------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `src/platform/test/functional/fixtures/es_archiver/logstash_functional` | `logstash-*` fixture indices used for Discover hit counts and ES                           | QL queries.        | NEEDS VERIFICATION                                              | `index.ts:19`; indirectly all three test files                               | Keep shared; already loaded in `test/scout/ui/parallel_tests/global.setup.ts` lines 31-36. |
| `src/platform/test/functional/fixtures/kbn_archiver/discover`           | Discover saved objects including `logstash-*` data view and saved search `A Saved Search`. | NEEDS VERIFICATION | `_default_route.ts:31`, `_flyouts.ts:33`, `_sidenav_link.ts:35` | Keep; use existing `DISCOVER_KBN_ARCHIVE` constant and load per Scout space. |

### UI settings mutations

| FTR call                                                          | Semantics                                                                                                                                                                  | Files                                                           |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `kibanaServer.uiSettings.replace({ defaultIndex: 'logstash-*' })` | Wipes all settings, then sets default data view. In Scout, prefer space-scoped `scoutSpace.uiSettings.setDefaultIndex(DEFAULT_DATA_VIEW)`.                                 | `_default_route.ts:34`, `_flyouts.ts:36`, `_sidenav_link.ts:38` |
| `timePicker.setDefaultAbsoluteRangeViaUiSettings()`               | Sets the FTR default absolute time range for `logstash_functional`. In Scout, use `DEFAULT_TIME_RANGE` and `scoutSpace.uiSettings.setDefaultTime(...)`.                    | `_default_route.ts:35`, `_flyouts.ts:37`, `_sidenav_link.ts:39` |
| `kibanaServer.uiSettings.update({ defaultRoute: ... })`           | Merges a `defaultRoute` advanced setting for the next root Kibana navigation.                                                                                              | `_default_route.ts:47`, `_default_route.ts:60`                  |
| `kibanaServer.uiSettings.replace({})`                             | Wipes all UI settings during cleanup. In Scout, unset only the keys touched by the spec (`defaultIndex`, `timepicker:timeDefaults`, `defaultRoute`) in the isolated space. | `_default_route.ts:42`, `_flyouts.ts:53`, `_sidenav_link.ts:46` |

### API setup to prefer over UI setup

| Setup need                                                                | Preferred Scout strategy                                                                                                                                                               | Files                                                   |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Load Discover saved objects and saved search fixture                      | Use archive/API setup in the isolated Scout space; do not click through Discover to create baseline saved objects.                                                                     | all three files                                         |
| Set `defaultIndex`, `timepicker:timeDefaults`, and `defaultRoute`         | Use `scoutSpace.uiSettings`/core settings APIs before navigation.                                                                                                                      | all three files; `_default_route.ts` for `defaultRoute` |
| Create saved session needed only as precondition for side-nav restoration | Prefer Saved Objects/API setup if it preserves the tested route-restoration behavior; use the Discover save UI only if the UI save interaction is part of the behavior being asserted. | `_sidenav_link.ts:135-161`                              |
| Create ad-hoc data view                                                   | Keep UI creation only where the test is specifically about unsaved ad-hoc state affecting last-URL persistence; otherwise prefer API setup.                                            | `_sidenav_link.ts:104-132`, `_sidenav_link.ts:135-161`  |

### Shared constants to extract

Values reused across >=2 files where extracting removes real duplication. Prefer existing constants where present.

| Value                                                           | Occurrences        | Current locations                                                                                                                |
| --------------------------------------------------------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `'src/platform/test/functional/fixtures/kbn_archiver/discover'` | 3 files            | `_default_route.ts:31`, `_flyouts.ts:33`, `_sidenav_link.ts:35`; existing `DISCOVER_KBN_ARCHIVE` covers this.                    |
| `'logstash-*'`                                                  | 3 files            | `_default_route.ts:34`, `_flyouts.ts:36`, `_sidenav_link.ts:38`; existing `DEFAULT_DATA_VIEW` covers this.                       |
| FTR default absolute time range                                 | 3 files            | `_default_route.ts:35`, `_flyouts.ts:37`, `_sidenav_link.ts:39`; existing `DEFAULT_TIME_RANGE` covers this.                      |
| `'A Saved Search'`                                              | 1 direct assertion | `_default_route.ts:54`; existing `SAVED_SEARCH_TITLE` can still be reused for consistency with neighboring Discover Scout specs. |

---

## 5. Auth and roles

### Role inventory

| Role name              | Source                                                                | Privileges (summary)                                                                 | Used by (files)                                                 | Scout role target                                                                                                                                                            | Notes                                                                                                                                |
| ---------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `test_logstash_reader` | `src/platform/test/functional/config.base.js:127`                     | Elasticsearch `read` and `view_index_metadata` on `logstash*`; no Kibana privileges. | All three test files via `security.testUser.setRoles(...)`      | `loginWithCustomRole` or existing Discover fixture auth that includes logstash read access                                                                                   | Needed because these tests query `logstash-*`; built-in viewer/editor alone may not grant index access to fixture data.              |
| `kibana_admin`         | FTR default role and explicit `security.testUser.setRoles(...)` calls | Kibana admin privileges from standard FTR role.                                      | `_default_route.ts:30`, `_flyouts.ts:32`, `_sidenav_link.ts:34` | Start with `loginAsAdmin()` for migration parity; later reduce only if Scout fixtures prove editor privileges cover advanced settings, saved objects, and save-search flows. | The tests set default routes/UI settings through APIs and exercise save/search/edit flows; admin is acceptable for migration parity. |
| FTR default roles      | `src/platform/test/functional/config.base.js:494`                     | `test_logstash_reader` + `kibana_admin`.                                             | Config default for the suite                                    | Same as above                                                                                                                                                                | Test files also set these explicitly.                                                                                                |

### Over-privileged tests

Tests running as `superuser` that likely don't need it:

| File | What it actually exercises | Suggested minimum privilege |
| ---- | -------------------------- | --------------------------- |

### Roles deserving shared helpers (used in >=3 files)

- `kibana_admin` + `test_logstash_reader`: used in all three files; prefer a shared Discover Scout fixture/helper if one already exists for loading `DISCOVER_KBN_ARCHIVE`, default data view, default time, and admin/logstash auth.

---

## 6. Reusability audit

### FTR services and page objects in use

| FTR name                     | What it does                                                                                                | Used by (files)                         | Scout equivalent exists?                                                                    | Hidden assertions?                                                                  | Recommended scope                                                                                                                                                         |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `PageObjects.discover`       | Navigate/query Discover, switch query modes, open Lens edit flyout, save search, read query name/hit count. | all three files                         | yes (`DiscoverApp`)                                                                         | Some FTR methods combine waits/assertions; Scout has explicit locators and methods. | use existing shared Scout page object; add only missing methods.                                                                                                          |
| `PageObjects.timePicker`     | Sets default absolute time via UI settings.                                                                 | all three files                         | yes via `scoutSpace.uiSettings.setDefaultTime(...)` and `DEFAULT_TIME_RANGE`                | no                                                                                  | use existing fixtures/constants.                                                                                                                                          |
| `PageObjects.header`         | Waits for loading and clicks Dashboard/Discover nav entries.                                                | all three files                         | partial; Scout uses app/page-object readiness and `CollapsibleNav`/`page.gotoApp` patterns. | yes: FTR global loading waits are implicit assertions.                              | use page-specific waits and `CollapsibleNav`; avoid adding generic loading waits after every click.                                                                       |
| `PageObjects.common`         | Navigates to Discover.                                                                                      | `_flyouts.ts`, `_sidenav_link.ts`       | yes (`page.gotoApp`, `DiscoverApp.goto`)                                                    | no                                                                                  | use existing Scout page navigation.                                                                                                                                       |
| `getService('dataGrid')`     | Opens row toggle and checks doc viewer visibility.                                                          | `_flyouts.ts`                           | partial; `DiscoverApp.isShowingDocViewer()` exists, but `DataGrid` lacks `clickRowToggle`.  | FTR `isShowingDocViewer()` returns boolean after wait.                              | add shared `DataGrid.clickRowToggle` or Discover-specific helper if no direct Playwright locator exists.                                                                  |
| `getService('esql')`         | Opens and checks ES                                                                                         | QL quick reference/docs flyout.         | `_flyouts.ts`                                                                               | partial; DiscoverApp has ES                                                         | QL menu helpers but no direct quick-reference open/state method found.                                                                                                    | FTR method waits via `retry.waitFor`.                         | add `DiscoverApp.openEsqlQuickReferenceFlyout()` and locator getter/state helper. |
| `getService('filterBar')`    | Checks that the URL default route created the expected filter.                                              | `_default_route.ts`                     | yes (`FilterBar.hasFilter`)                                                                 | no                                                                                  | use existing shared page object.                                                                                                                                          |
| `getService('queryBar')`     | Reads and writes classic query text.                                                                        | `_default_route.ts`, `_sidenav_link.ts` | yes (`QueryBar`; DiscoverApp also has query helpers)                                        | no                                                                                  | use existing shared page object.                                                                                                                                          |
| `getService('appsMenu')`     | Opens side nav.                                                                                             | `_sidenav_link.ts`                      | yes (`CollapsibleNav`)                                                                      | no                                                                                  | use existing shared page object.                                                                                                                                          |
| `getService('monacoEditor')` | Writes/reads ES                                                                                             | QL editor content.                      | `_sidenav_link.ts`                                                                          | yes (`DiscoverApp.codeEditor`)                                                      | no                                                                                                                                                                        | use existing code editor wrapper.                             |
| `getService('testSubjects')` | Clicks query submit, checks missing inline ES                                                               | QL editor.                              | `_flyouts.ts`, `_sidenav_link.ts`                                                           | yes (`page.testSubj`)                                                               | yes for `missingOrFail`.                                                                                                                                                  | keep assertions in specs with `expect(locator).toBeHidden()`. |
| `getService('dataViews')`    | Creates ad-hoc data views from the Discover search bar.                                                     | `_sidenav_link.ts`                      | yes (`DiscoverApp.createDataViewFromSearchBar`)                                             | no                                                                                  | use existing method only when ad-hoc UI state is the behavior under test; otherwise prefer API setup.                                                                     |
| `getService('retry')`        | Retries assertions after navigation/search.                                                                 | `_default_route.ts`, `_sidenav_link.ts` | do not port                                                                                 | no                                                                                  | do not replace with `retry.try`, `expect.poll`, custom polling, or another Scout retry equivalent; rely on concrete action readiness and direct locator/value assertions. |

### EUI components interacted with directly

| Component                          | Interaction pattern                                                                 | Files                                                                                                      |
| ---------------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------- |
| `EuiDataGrid`                      | Open row-detail/doc-viewer flyout through row toggle; assert doc viewer visibility. | `_flyouts.ts:58`, `_flyouts.ts:66`, `_flyouts.ts:76`, `_flyouts.ts:93`                                     |
| `EuiFlyout` / popover              | ES                                                                                  | QL docs quick reference, Lens chart switch popover, doc viewer flyout dismiss each other.                  | `_flyouts.ts:57-96` |
| `EuiComboBox` / data view switcher | Create ad-hoc `logs*` data view from Discover search bar.                           | `_sidenav_link.ts:112`, `_sidenav_link.ts:139`                                                             |
| Chrome side nav                    | Navigate Discover -> Dashboard -> Discover.                                         | `_sidenav_link.ts:64-70`, `_sidenav_link.ts:90-96`, `_sidenav_link.ts:121-127`, `_sidenav_link.ts:149-155` |

### Brittle locator strategies

Locators that need `data-test-subj` added to source code:

| File | Line | Current locator | Target component |
| ---- | ---- | --------------- | ---------------- |

No FTR `find.byCssSelector` / `find.byClassName` usage appears in the group8 files. Existing Scout gaps should be solvable with current `data-test-subj` selectors unless `DataGrid.clickRowToggle` needs a missing selector.

### Page objects with hidden assertions

FTR helpers that contain assertions internally (page objects should return state, not assert):

| FTR helper                   | Method                                     | Assertion                                                                                          | File:line                                                                                                  |
| ---------------------------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `getService('testSubjects')` | `missingOrFail('InlineEditingESQLEditor')` | Throws if visible/present.                                                                         | `_flyouts.ts:86`                                                                                           |
| `PageObjects.header`         | `waitUntilLoadingHasFinished()`            | Global loading wait; can hide real app-specific readiness assumptions.                             | all three files, e.g. `_default_route.ts:51`                                                               |
| `getService('dataGrid')`     | `isShowingDocViewer()`                     | Boolean waits up to 30s before returning; preserve as explicit locator expectation where possible. | `_flyouts.ts:59`, `_flyouts.ts:61`, `_flyouts.ts:67`, `_flyouts.ts:69`, `_flyouts.ts:77`, `_flyouts.ts:94` |

---

## 7. Server configuration

### FTR server args (full chain)

| Arg                                               | Source config                                       | Category                             | Notes                                                                                                                              |
| ------------------------------------------------- | --------------------------------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `...commonConfig.get('kbnTestServer.serverArgs')` | `src/platform/test/functional/config.base.js:35-36` | already in Scout default / inherited | Group8 adds no local Kibana server args. NEEDS VERIFICATION only if executor discovers a hidden Discover Scout config requirement. |

### ES server args

| Arg                                                                            | Source config                                    | Notes                                                              |
| ------------------------------------------------------------------------------ | ------------------------------------------------ | ------------------------------------------------------------------ |
| `xpack.security.enabled=${process.env.ES_SECURITY_ENABLED ? 'true' : 'false'}` | `src/platform/test/functional/config.base.js:30` | Standard platform FTR security setting; no group-specific ES args. |

---

## 8. Deployment targets

| Proposed spec                                       | Where it should run                                  | Reasoning                                                                                                                                             |
| --------------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ui/parallel_tests/core/tabs/default_route.spec.ts` | stateful local classic (`'@local-stateful-classic'`) | Issue 274723 says tests without serverless copies should use local-stateful-classic; no matching serverless copies were found for these suite titles. |
| `ui/parallel_tests/core/tabs/flyouts.spec.ts`       | stateful local classic (`'@local-stateful-classic'`) | Same as above; also relies on classic Discover/logstash setup already present in the stateful Discover Scout parallel suite.                          |
| `ui/parallel_tests/core/tabs/sidenav_link.spec.ts`  | stateful local classic (`'@local-stateful-classic'`) | Same as above; Chrome side-nav behavior is currently covered only by platform stateful FTR manifest.                                                  |

### Cloud portability issues

Non-portable assumptions found in FTR tests:

| File                                                                  | Line   | Issue                                                                                                                                                          |
| --------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/platform/test/functional/apps/discover/group8/_default_route.ts` | 50, 64 | Uses `browser.navigateTo(deployment.getHostPort())`; in Scout, use `page.goto('/')` or equivalent base-url navigation rather than hardcoded host construction. |

---

## 9. FTR test smells

| Smell                            | File                                                   | Lines                                                                                 | Description                                                                                                                                 | Context                                                                                                                                                                                    |
| -------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Retry wrapper                    | `_default_route.ts`                                    | 53-56, 67-71                                                                          | `retry.try` wraps assertions after default-route navigation.                                                                                | Do not port to `retry.try`, `expect.poll`, custom loops, or Scout retry equivalents; wait for the specific navigation/search action to finish once, then assert observable state directly. |
| Retry wrapper                    | `_sidenav_link.ts`                                     | 72-75, 98-101, 129-132, 157-161                                                       | `retry.try` wraps assertions after side-nav return.                                                                                         | Do not port to `retry.try`, `expect.poll`, custom loops, or Scout retry equivalents; use direct assertions after the side-nav navigation readiness point.                                  |
| Global loading wait              | `_default_route.ts`                                    | 51, 65                                                                                | Uses `header.waitUntilLoadingHasFinished()` before Discover-specific waits.                                                                 | Remove generic header waits where Discover readiness already proves the page is loaded.                                                                                                    |
| Global loading wait              | `_flyouts.ts`                                          | 42, 45                                                                                | Uses global header waits around Discover mode switching.                                                                                    | Prefer `DiscoverApp.goto` and `selectTextBaseLang`; add only one targeted readiness wait when the next interaction needs it.                                                               |
| Global loading wait              | `_sidenav_link.ts`                                     | 56, 60, 66, 70, 80, 86, 92, 96, 106, 110, 114, 118, 123, 127, 137, 141, 146, 151, 155 | Many app-shell waits throughout side-nav journeys.                                                                                          | Collapse repeated waits into the minimum page-specific readiness point after each actual app transition.                                                                                   |
| Shared mutable browser/app state | `_sidenav_link.ts`                                     | 54-161                                                                                | Each `it` is independent but all mutate the same browser-side last-URL state and saved objects unless Scout space/page isolation resets it. | Keep one flow per test with fresh page/space setup, or explicitly reset Discover query mode and relevant UI state.                                                                         |
| UI settings replace-all cleanup  | `_default_route.ts`, `_flyouts.ts`, `_sidenav_link.ts` | 42, 53, 46                                                                            | `uiSettings.replace({})` wipes all settings.                                                                                                | In Scout, unset only touched settings in the test space.                                                                                                                                   |
| Over-privileged execution        | all three test files                                   | `_default_route.ts:30`, `_flyouts.ts:32`, `_sidenav_link.ts:34`                       | Tests run with `kibana_admin` even though most assertions are read/navigation behavior.                                                     | Preserve admin for initial migration parity; consider reducing later only after validating advanced-settings and save-search privileges.                                                   |

---

## 10. Migration batches

### Batch 1: Quick wins

Simple tests, all dependencies exist, no new abstractions needed.

| #   | Proposed spec                                       | From FTR file       | Complexity | Notes                                                                                                                                                                                                                                                     |
| --- | --------------------------------------------------- | ------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `ui/parallel_tests/core/tabs/default_route.spec.ts` | `_default_route.ts` | simple     | Reuse `DISCOVER_KBN_ARCHIVE`, `DEFAULT_DATA_VIEW`, `DEFAULT_TIME_RANGE`, `SAVED_SEARCH_TITLE`, `FilterBar`, `QueryBar`, and `DiscoverApp`. Needs root navigation helper for `defaultRoute`. Use API/UI-settings setup; do not use retry-style assertions. |

- **Human involvement**: `autopilot` (executor can handle end-to-end)
- **Dependencies**: existing Discover Scout fixtures and page objects
- **Blockers**: none

### Batch 2: Needs small shared page-object additions

| #   | Proposed spec                                      | From FTR file      | Complexity | Notes                                                                                                         |
| --- | -------------------------------------------------- | ------------------ | ---------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2   | `ui/parallel_tests/core/tabs/flyouts.spec.ts`      | `_flyouts.ts`      | medium     | Needs row-toggle/doc-viewer interaction if existing `DiscoverApp.isShowingDocViewer()` is not enough, plus ES | QL quick-reference open/state helpers.                                                                                                                                                                                    |
| 3   | `ui/parallel_tests/core/tabs/sidenav_link.spec.ts` | `_sidenav_link.ts` | medium     | Reuses navigation, query bar, ES                                                                              | QL editor, ad-hoc data-view creation, and save-search helpers; needs careful isolation of last-URL state per test. Prefer API setup for saved-session prerequisites if the UI save action is not the behavior under test. |

- **Human involvement**: `autopilot` with local validation; pause only if required `data-test-subj` is missing for the data-grid row toggle or ES|QL quick-reference flyout
- **Dependencies**: any page-object helpers added for Batch 2 should live in shared Scout page objects when generally useful
- **Blockers**: none known; `DataGrid.clickRowToggle` and ES|QL quick-reference helpers are the only likely missing abstractions

---

## 11. Effort summary

| Metric                                    | Value                                   |
| ----------------------------------------- | --------------------------------------- | ---------------------------------------------------------------------- |
| Total FTR test files analyzed             | `3`                                     |
| > UI tests                                | `3`                                     |
| > API tests                               | `0`                                     |
| > Unit tests (RTL/Jest)                   | `0`                                     |
| > Dropped                                 | `0`                                     |
| > Deferred                                | `0`                                     |
| New page objects needed                   | `0-2` (`DataGrid.clickRowToggle` and ES | QL quick-reference helpers may be needed in shared Scout page objects) |
| New API services needed                   | `0`                                     |
| `data-test-subj` additions to source code | `0 known`                               |
| Custom server config sets                 | `0` new / `0` reuse existing            |
| Migration batches                         | `2`                                     |

### Risks and open questions

- NEEDS VERIFICATION: archive sizes for `logstash_functional` and `kbn_archiver/discover` were not measured during planning.
- NEEDS VERIFICATION: exact Scout auth helper to combine Kibana admin privileges with `logstash*` read access; start from existing Discover Scout fixture patterns and preserve FTR parity.
- NEEDS VERIFICATION: whether current data-grid selectors support a robust row-toggle helper without source changes.
- NEEDS VERIFICATION: exact ES|QL quick-reference flyout test subject in current UI; FTR uses `esql.openQuickReferenceFlyout()` and `esql.isOpenQuickReferenceFlyout()`.
- Execution constraint: do not introduce `retry.try`, `expect.poll`, custom polling loops, or other retry-equivalent wrappers while migrating these assertions.
- Execution constraint: reduce FTR's repeated generic loading waits to the minimum targeted app/readiness waits needed for the next action.
- Execution constraint: use API setup for saved objects, UI settings, and saved-session prerequisites when the setup action itself is not the behavior being tested.
- Human sign-off: stateful-only routing with `'@local-stateful-classic'` follows issue 274723 and current branch memory; do not use `tags.deploymentAgnostic` unless a matching serverless copy is identified later.
