# FTR to Scout Migration Plan

| Field | Value |
|-------|-------|
| Source | `x-pack/platform/test/search_sessions_integration/config.management.ts` |
| Target module root | `src/platform/plugins/shared/data` |
| Generated | `2026-07-01` |
| Deployment targets | stateful only (search sessions feature not available in serverless) |
| FTR config chain | `config.management.ts` > `../functional/config.base.ts` > `@kbn/test-suites-src/functional/config.base` |

References issue: https://github.com/elastic/kibana/issues/274739

---

## 1. Test inventory

Sorted by estimated complexity (simple to complex).

| # | FTR file (relative) | Type | Description | `it` count | Complexity | Decision | Justification |
|---|---------------------|------|-------------|-----------|------------|----------|---------------|
| 1 | `tests/apps/management/search_sessions/index.ts` | index | Loads 2 sub-suites; shared `before` loads archives, sets UI settings | - | - | split | Each `loadTestFile` becomes its own spec |
| 2 | `tests/apps/lens/index.ts` | index | Loads lens search_sessions sub-suite; shared `before` loads logstash archive | - | - | split | Each `loadTestFile` becomes its own spec |
| 3 | `tests/apps/lens/search_sessions.ts` | test | Verifies search sessions indicator does NOT appear in Lens | 1 | simple | UI test | Requires navigating Lens UI and verifying element absence |
| 4 | `tests/apps/management/search_sessions/sessions_management_permissions.ts` | test | Tests RBAC: management visible/hidden based on `store_search_session` privilege | 2 | medium | UI test | Tests permission-scoped UI behavior; requires custom roles |
| 5 | `tests/apps/management/search_sessions/sessions_management.ts` | test | End-to-end journey: save session, verify in management, rename, view, delete, check sidebar name | 3 | complex | UI test | Full user journey across dashboard + management UI; sequential `it` blocks |

### Proposed file splits (none)

The 3 `it` blocks in `sessions_management.ts` form two logical groups:
- Tests 1+2 are a coupled journey (create → delete).
- Test 3 is independent (sidebar label check).

These will become 2 Scout tests in one spec file.

### Tests to drop (none)

All tests migrate to Scout UI tests.

---

## 2. Test type routing

### UI tests

| FTR file | Proposed spec path | Key flows covered |
|----------|--------------------|-------------------|
| `tests/apps/lens/search_sessions.ts` | `ui/tests/lens_search_sessions.spec.ts` | Lens does not show background search button when sessions enabled |
| `tests/apps/management/search_sessions/sessions_management_permissions.ts` | `ui/tests/sessions_management_permissions.spec.ts` | RBAC: without `store_search_session` → Stack Management hidden; with it → visible and search_sessions accessible |
| `tests/apps/management/search_sessions/sessions_management.ts` | `ui/tests/sessions_management.spec.ts` | Save session from dashboard, rename in flyout, verify in management (status, name, expires), navigate back to dashboard, delete; sidebar name check |

---

## 3. Parallelism plan

### Must be sequential

| Proposed spec | Why sequential |
|--------------|---------------|
| `sessions_management.spec.ts` | Creates/deletes search sessions saved objects; mutates UI settings globally; journey depends on state across steps |
| `sessions_management_permissions.spec.ts` | Creates temporary custom roles/users (via `loginWithCustomRole`); requires specific user session |
| `lens_search_sessions.spec.ts` | Loads shared archives; reads data in Lens which depends on logstash-* index |

All three specs go into `ui/tests/` (sequential), not `ui/parallel_tests/`.

---

## 4. Test data and setup

### Archives inventory

| Archive path | Contents | Used by | Verdict |
|-------------|----------|---------|---------|
| `x-pack/platform/test/fixtures/es_archives/logstash_functional` | `logstash-*` index with sample web traffic data | `sessions_management.spec.ts`, `lens_search_sessions.spec.ts` | Keep — required for dashboard and Lens to return data |
| `x-pack/platform/test/fixtures/es_archives/dashboard/async_search` | Elasticsearch backing data for async dashboard tests | `sessions_management.spec.ts` | Keep — provides data for "Delayed 5s" dashboard |
| `x-pack/platform/test/functional/fixtures/kbn_archives/dashboard_async/async_search.json` | Kibana saved objects: dashboards ("Delayed 5s", etc.), visualizations, index pattern | `sessions_management.spec.ts` | Keep — provides the "Delayed 5s" dashboard |
| `x-pack/platform/test/functional/fixtures/kbn_archives/lens/lens_basic.json` | Kibana saved objects: Lens visualizations (lnsXYvis, lnsPieVis), index patterns | `lens_search_sessions.spec.ts` | Keep — provides the lnsXYvis visualization |

### UI settings mutations

| FTR call | Semantics | Used in |
|----------|-----------|---------|
| `kibanaServer.uiSettings.replace({ defaultIndex: 'logstash-*' })` | Sets default data view | `sessions_management/index.ts`, `lens/index.ts` |
| `kibanaServer.uiSettings.replace({ 'search:timeout': 10000 })` | Sets search timeout to 10s | `sessions_management/index.ts` |

### Shared constants to extract

| Value | Usage |
|-------|-------|
| `'x-pack/platform/test/fixtures/es_archives/logstash_functional'` | ES archive path shared across specs |
| `'x-pack/platform/test/fixtures/es_archives/dashboard/async_search'` | ES archive path |
| `'x-pack/platform/test/functional/fixtures/kbn_archives/dashboard_async/async_search.json'` | KBN archive path |
| `'x-pack/platform/test/functional/fixtures/kbn_archives/lens/lens_basic.json'` | KBN archive path |
| `'24f3f950-69d9-11ea-a14d-e341629a29e6'` | Dashboard ID for "Delayed 5s" |

---

## 5. Auth and roles

### Role inventory

| Role name | Source | Privileges (summary) | Used by | Scout role target |
|-----------|--------|---------------------|---------|-------------------|
| Default (superuser equivalent) | FTR default | Full cluster + all Kibana features | `sessions_management.ts`, `lens/search_sessions.ts` | `loginAsAdmin()` |
| `data_analyst` (without sessions) | `sessions_management_permissions.ts` | `{ dashboard: ['read'] }` all spaces | permissions test 1 | `loginWithCustomRole({ kibana: [{ feature: { dashboard: ['read'] }, spaces: ['*'] }] })` |
| `data_analyst` (with sessions) | `sessions_management_permissions.ts` | `{ dashboard: ['read', 'store_search_session'] }` all spaces | permissions test 2 | `loginWithCustomRole({ kibana: [{ feature: { dashboard: ['read', 'store_search_session'] }, spaces: ['*'] }] })` |

### Over-privileged tests

The main management tests run as admin/superuser. This is appropriate since the tests exercise admin-level session management features.

---

## 6. Reusability audit

### FTR services and page objects in use

| FTR name | What it does | Scout equivalent |
|----------|-------------|-----------------|
| `PageObjects.dashboard` | Navigate to dashboard, wait for render | `pageObjects.dashboard` (Scout built-in) |
| `PageObjects.searchSessionsManagement` | Navigate to management UI, get list, rename, delete, view | **NEW** plugin-local `SearchSessionsManagementPage` |
| `PageObjects.lens` | Navigate to Lens, set time range, check no results, check session button | `pageObjects.lens` (Scout built-in) + `pageObjects.datePicker` |
| `PageObjects.visualize` | Navigate to Visualize listing, click viz title | `pageObjects.visualize` (Scout built-in) + listing table |
| `getService('searchSessions')` | Save session, open flyout, delete all sessions | **NEW** helper function in `beforeAll`/`afterAll` using `kbnClient.request()` |
| `getService('appsMenu')` | Read nav links | `pageObjects.collapsibleNav.getNavLinks()` |
| `getService('managementMenu')` | Get management sidebar sections | Simplified: check `page.testSubj.locator('search_sessions')` visible |

### New page objects needed

- **`SearchSessionsManagementPage`** (plugin-local, `ui/fixtures/page_objects/`):
  - `goTo()` — navigate to `/app/management/kibana/search_sessions`
  - `getRowCount()` — count rows in management table
  - `waitForRowStatus(status, timeout)` — wait for first row to reach target status
  - `getFirstRowName()` — get name text from first row
  - `getFirstRowExpires()` — get expires text from first row
  - `renameFirstRow(newName)` — rename first row via actions popover
  - `deleteFirstRow()` — delete first row via actions popover + confirm modal
  - `viewFirstRow()` — click name link to navigate back to source app
  - `waitForEmptyTable()` — wait for 0 rows

---

## 7. Server configuration

### FTR server args (from config.management.ts)

| Arg | Category | Notes |
|-----|----------|-------|
| `--data.search.sessions.enabled=true` | Already in `search_sessions` Scout config set | No action needed |
| `--data.search.sessions.management.refreshInterval=10s` | **Requires server config** | The management page auto-refreshes using this interval. Default is `0s` (disabled). Must be set at Kibana boot. |

### Custom server config needed

The `search_sessions` Scout config set must be updated to add `--data.search.sessions.management.refreshInterval=10s`. This enables the management UI to auto-refresh every 10 seconds so the test can wait for a session to transition to "complete" status.

**File to update**: `src/platform/packages/shared/kbn-scout/src/servers/configs/config_sets/search_sessions/stateful/classic.stateful.config.ts`

This change is backward-compatible: the existing API tests in `scout_search_sessions/api/` don't depend on the UI refresh interval.

---

## 8. Deployment targets

All tests: **stateful classic only**

Search sessions are a stateful-only feature (`data.search.sessions.enabled` is not available in serverless). Tag: `[...tags.stateful.classic]`

The issue confirms: "If there is no Serverless copy, the Scout test should be tagged with `'@local-stateful-classic'`"

---

## 9. FTR test smells

| Smell | File | Description |
|-------|------|------------|
| Sequential journey | `sessions_management.ts` | 3 `it` blocks forming one CRUD journey (create, delete, sidebar check). Tests 1+2 combined into one Scout `test` with `test.step`. Test 3 is separate. |
| Retry wrappers | `sessions_management.ts:52-60` | `retry.waitFor('first item to complete', ...)` around management status check. Replaced by `expect(locator).toHaveAttribute(...)` with timeout. |
| Shared mutable state | `sessions_management.ts` | `searchSessionName` set in first `it`, implicitly available in second `it` (via closure). Handled by combining into one test. |
| UI-based setup in before | `sessions_management.ts:27-40` | Before hook navigates to dashboard and uses UI to prepare state. In Scout, ES+KBN archives loaded via `esArchiver`/`kbnClient`; UI navigation moves to the test body. |
| Over-privileged | `sessions_management.ts` | Runs as default FTR superuser for basic management tasks. Migrated to `loginAsAdmin()`. |
| Missing cleanup for sessions | `sessions_management/index.ts` | `after` hook calls `searchSessions.deleteAllSearchSessions()` but individual tests don't clean up on failure. Scout tests call cleanup in `afterAll`. |

---

## 10. Migration batches

### Batch 1: Lens search session test (simple)

| # | Proposed spec | From FTR file | Complexity | Notes |
|---|--------------|--------------|------------|-------|
| 1 | `ui/tests/lens_search_sessions.spec.ts` | `lens/search_sessions.ts` | simple | No custom page objects; uses existing Scout `LensApp` + `VisualizeApp` + `DatePicker` |

- **Human involvement**: `autopilot`
- **Dependencies**: lens/lens_basic.json archive, logstash_functional archive

### Batch 2: Permissions tests (medium)

| # | Proposed spec | From FTR file | Complexity | Notes |
|---|--------------|--------------|------------|-------|
| 2 | `ui/tests/sessions_management_permissions.spec.ts` | `sessions_management_permissions.ts` | medium | Uses `loginWithCustomRole`; follows `advanced_settings_security.spec.ts` pattern |

- **Human involvement**: `autopilot`
- **Dependencies**: none (no archives needed, no sessions created)

### Batch 3: Sessions management journey (complex)

| # | Proposed spec | From FTR file | Complexity | Notes |
|---|--------------|--------------|------------|-------|
| 3 | `ui/tests/sessions_management.spec.ts` | `sessions_management.ts` | complex | New `SearchSessionsManagementPage` page object; end-to-end journey with search session lifecycle |

- **Human involvement**: `guided` (monitor that session status transitions work with 10s refresh interval)
- **Dependencies**: dashboard_async archive, logstash_functional archive, SearchSessionsManagementPage

---

## 11. Effort summary

| Metric | Value |
|--------|-------|
| Total FTR test files analyzed | 5 (2 index, 3 test) |
| > UI tests | 3 |
| > API tests | 0 |
| > Unit tests (RTL/Jest) | 0 |
| > Dropped | 0 |
| > Deferred | 0 |
| New page objects needed | 1 plugin-local (`SearchSessionsManagementPage`) |
| New API services needed | 0 |
| `data-test-subj` additions to source code | 0 |
| Custom server config sets | 0 new / 1 updated existing (`search_sessions`) |
| Migration batches | 3 |

### Risks and open questions

- The management auto-refresh at 10s means the `sessions_management.spec.ts` test may take up to 30s to see a session reach "complete" status. Use a 60s timeout on the status assertion.
- The `SearchSessionsManagementPage.getFirstRowName/Expires` methods use scoped locators. If the FTR selectors change (e.g., `sessionManagementNameCol` becomes a different test-subject), update accordingly.
- The `loginWithCustomRole` fixture creates a custom role at worker scope. Tests 1+2 in `sessions_management_permissions.spec.ts` use different role shapes — each test calls `loginWithCustomRole` with its specific role, which updates the shared custom role in-place.
