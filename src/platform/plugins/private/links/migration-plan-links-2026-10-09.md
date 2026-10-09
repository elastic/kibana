# FTR to Scout Migration Plan

| Field | Value |
|-------|-------|
| Source | `src/platform/test/functional/apps/dashboard_elements/links` |
| Target module root | `src/platform/plugins/private/links` (existing `test/scout/api`; new `test/scout/ui`) |
| Generated | 2026-10-09 |
| Deployment targets | stateful (FTR runs stateful only today); serverless deferred, see §8 |
| FTR config chain | `links/config.ts` > `functional/config.base.js` + `common/config.js` |

---

## 1. Test inventory

| # | FTR file | Type | Description | `it` count | Complexity | Decision | Justification |
|---|----------|------|-------------|-----------|------------|----------|---------------|
| 1 | `links_navigation.ts` | test | Links panel navigation: add panel, dashboard links (filters/time/new tab/missing), external links (policy, new tab, same tab) | 7 | complex | UI test | Real user flows; external URL policy needs boot-time server arg |
| 2 | `links_create_edit.ts` | test | Links panel create (by-ref/by-value), library save/unlink, reorder/edit/delete links | 9 (whole suite `describe.skip`, issue #274890) | complex | UI test | Real editor flows; currently skipped, so migration also re-enables coverage |
| 3 | `index.ts` | index | Shared `before`: loads dashboard es_archive + kbn_archive, sets roles, defaultIndex, navigates | - | - | split | Setup moves into each spec's `beforeAll` |
| 4 | `config.ts` | config | Adds `--externalUrl.policy` (deny `danger.example.com`, allow `example.com`) | - | complex | custom server config set | Boot-time arg, not runtime-settable |

### Proposed file splits

- `links_navigation.ts` (7 `it`, 3 flows) into:
  - `add_from_library.spec.ts` (1 test)
  - `links_dashboard_navigation.spec.ts` (4 tests)
  - `links_external_navigation.spec.ts` (3 tests, needs custom server config)
- `links_create_edit.ts` into:
  - `links_create.spec.ts` (policy violation, by-ref, cancel, by-value journey)
  - `links_edit.spec.ts` (reorder, edit, delete)

### Tests to drop

None.

### Tests to defer

None. `links_create_edit` is skipped upstream; migrate and, if still flaky, keep `test.skip` with the issue link rather than dropping.

### Scenario parity map

| FTR file | FTR `it()` title | Behavior and assertions | Scout destination | Disposition | Rationale |
|----------|------------------|-------------------------|-------------------|-------------|-----------|
| `links_navigation.ts` | adds links panel to top of dashboard | Add saved links panel from library; first panel title is "a few horizontal links" | `add_from_library.spec.ts` | Scout `test` | Single flow |
| `links_navigation.ts` | should disable link if dashboard does not exist | `links 001` shows `Error fetching dashboard` link, disabled | `links_dashboard_navigation.spec.ts` | Scout `test` | Independent |
| `links_navigation.ts` | useFilters should pass filter pills and query | links 002 → links 001: 2 filters passed, time range not overridden | same | Scout `test` | Independent; was `skipFIPS` (Scout has no FIPS lane, noted) |
| `links_navigation.ts` | useTimeRange should pass date range | links 001 → links 002: time passed, 1 filter | same | Scout `test` | Independent |
| `links_navigation.ts` | openInNewTab should create an external link | links 001 → links 003 opens new page; dashboard id, no filters, own time | same | Scout `test` | Use Playwright `context.waitForEvent('page')` |
| `links_navigation.ts` | should disable link if forbidden by external url policy | `externalLink--external link violation--error` disabled | `links_external_navigation.spec.ts` | Scout `test` | Needs policy server arg |
| `links_navigation.ts` | should create an external link when openInNewTab is enabled | New page URL `https://example.com/1` | same | Scout `test` | Intercept/route example.com so CI needs no internet |
| `links_navigation.ts` | should open in same tab when openInNewTab is disabled | Same page URL `https://example.com/2` | same | Scout `test` | Same |
| `links_create_edit.ts` | can not add an external link that violates externalLinks.policy | `danger.example.com` shows `links--linkDestination--error` | `links_create.spec.ts` → `test.step` | `test.step` | Needs policy server arg; shares journey |
| `links_create_edit.ts` | can create a new by-reference links panel | 4 links, save modal, linked to library | `links_create.spec.ts` | Scout `test` | Independent after reset |
| `links_create_edit.ts` | does not close the flyout when the user cancels the save as modal | Cancel keeps flyout open | `links_create.spec.ts` | Scout `test` | Independent |
| `links_create_edit.ts` | can create a new by-value links panel | Horizontal layout, 4 links, not linked | `links_create.spec.ts` → `test.step` | `test.step` | Journey with next two |
| `links_create_edit.ts` | can save by-value links panel to the library | Navigate away/back, save to library | same | `test.step` | Same journey |
| `links_create_edit.ts` | can unlink a panel from the library | Unlink | same | `test.step` | Same journey |
| `links_create_edit.ts` | can reorder links in an existing panel | links 001: move 3rd link to 2nd; assert text | `links_edit.spec.ts` | Scout `test` | Independent (mutates saved object; fresh archive per test) |
| `links_create_edit.ts` | can edit link in existing panel | Rename link 5 | same | Scout `test` | Same |
| `links_create_edit.ts` | can delete link from existing panel | Delete link 5; 4 remain | same | Scout `test` | Same |

---

## 2. Test type routing

### UI tests

| FTR file | Proposed spec path | Key flows covered |
|----------|--------------------|-------------------|
| `links_navigation.ts` | `test/scout/ui/tests/add_from_library.spec.ts`, `links_dashboard_navigation.spec.ts`, `links_external_navigation.spec.ts` | Add panel, dashboard link options, external link policy/tab behavior |
| `links_create_edit.ts` | `test/scout/ui/tests/links_create.spec.ts`, `links_edit.spec.ts` | Create by-ref/by-value, edit/reorder/delete |

### API tests

None new (existing `test/scout/api` covers CRUD).

### Unit tests (RTL/Jest)

None. Possible follow-up: external-policy validation in the link editor is already unit-testable; not required for parity.

---

## 3. Parallelism plan

### Parallel-safe

| Proposed spec | Why parallel-safe |
|--------------|------------------|
| `add_from_library`, `links_dashboard_navigation`, `links_create`, `links_edit` | State is space-scoped (kbn archive loaded per space via `scoutSpace.savedObjects.load`, uiSettings per space). Dashboards' saved IDs in archive are fixed; space-scoped load makes this safe. |

### Must be sequential

| Proposed spec | Why sequential |
|--------------|---------------|
| `links_external_navigation.spec.ts` + external-policy test in `links_create.spec.ts` | Not about state: they require the custom server config set, so they run in a separate Playwright config/lane (`test/scout_external_url_policy/ui`) |

NEEDS VERIFICATION: space-scoped loading of the saved-object archive with fixed IDs and cross-dashboard links (links reference dashboards by ID within the same space).

---

## 4. Test data and setup

### Archives inventory

| Archive path | Contents | Size | Used by | Verdict |
|-------------|----------|------|---------|---------|
| `src/platform/test/functional/fixtures/es_archiver/dashboard/current/data` | logstash data | shared | `index.ts` only | Likely drop: links tests do not query data unless panels render; NEEDS VERIFICATION |
| `src/platform/test/functional/fixtures/kbn_archiver/dashboard/current/kibana` | Dashboards incl. links 001/002/003/005, link panels, "dashboard with external links" (3.3k lines) | large | all | Keep; ideally trim to a links-specific archive under `test/scout/ui/fixtures` (plugin-local) |
| `es_archiver/kibana_sample_data_flights` + `kbn_archiver/kibana_sample_data_flights_index_pattern` | Flights data/index pattern | large | `links_navigation.ts` | Underused: only needed because filters/time on links dashboards reference it; NEEDS VERIFICATION whether still required |

### UI settings mutations

| FTR call | Semantics | Files |
|----------|-----------|-------|
| `uiSettings.replace({defaultIndex})` | replace-all | `index.ts:23`, `links_navigation.ts:45` |
| `common.setTime` / `unsetTime` | global time | `links_navigation.ts:48,64` |

Target: space-scoped `scoutSpace.uiSettings.setDefaultIndex` / `setDefaultTime`.

### Shared constants to extract

| Value | Occurrences | Current locations |
|-------|-------------|-------------------|
| Dashboard titles `links 001/002/003`, IDs `0930f310-...`, `24751520-...`, `27398c50-...` | several | `links_navigation.ts` |
| FROM/TO time | 1 | `links_navigation.ts:23-24` |

Put in a plugin-local `test/scout/ui/constants.ts`.

### Fresh server required

- External-link policy tests need a server booted with `externalUrl.policy`.

---

## 5. Auth and roles

| Role | Source | Privileges | Used by | Scout target | Notes |
|------|--------|-----------|---------|--------------|-------|
| `kibana_admin`, `test_logstash_reader`, `animals` | `index.ts:30` | admin Kibana + logstash read + custom `animals` | all | `loginAsPrivilegedUser()` | Tests edit dashboards and create saved objects; no permission-scoped assertions, so the custom roles are incidental |
| `kibana_admin`, `kibana_sample_admin`, `test_logstash_reader` | `links_navigation.ts:20` | same | navigation | `loginAsViewer()` for pure navigation specs (read-only); `loginAsPrivilegedUser()` for add-panel spec | Narrower role suffices |

No special auth patterns.

---

## 6. Reusability audit

| FTR name | What it does | Used by | Scout equivalent? | Hidden assertions? | Scope |
|----------|-------------|---------|-------------------|-------------------|-------|
| `PageObjects.dashboard` | navigate/save/load dashboards | both | yes (`pageObjects.dashboard`) | yes (`waitForRenderComplete`) | use existing; verify `loadSavedDashboard`/`getDashboardIdFromCurrentUrl` equivalents |
| `dashboardLinks` | links panel/flyout helpers | `links_create_edit.ts`, a11y test | missing | yes (`expect` in `reorderLinks`, `expectPanelEditorFlyoutIsOpen`) | plugin-local Scout page object in `links/test/scout/ui/page_objects`; FTR page object stays (used by `x-pack/platform/test/accessibility/apps/group1/dashboard_links.ts`) |
| `dashboardAddPanel` | add panel flyout | both | partial (dashboard Scout page object `addEmbeddable` / add-panel flyout) | yes | use existing; verify "Links" UI action link path |
| `dashboardPanelActions` | edit/library save/unlink | create_edit | yes (`expectLinkedToLibrary`, `saveToLibrary`, `unlinkFromLibrary`) | yes | use existing |
| `filterBar`, `timePicker` | read filters/time | navigation | yes (`filterBar`, `datePicker`) | no | use existing |
| `comboBox` | pick dashboard destination | link editor | yes (`page.testSubj.locator` + EUI combobox helper) | no | use EUI helper |
| `browser` windows | new tab handling | navigation | Playwright pages | no | `context.waitForEvent('page')` |

### EUI components interacted with directly

| Component | Interaction | Files |
|----------|-------------|-------|
| `EuiComboBox` | set dashboard destination | `dashboard_page_links.ts` |
| `EuiSwitch` | filters/time/new tab/encode/by-reference | same |
| `EuiDragDropContext` (draggable) | keyboard reorder (Space/Arrow/Space) | `reorderLinks` |

### Brittle locator strategies

| File | Line | Current locator | Target |
|------|------|----------------|--------|
| `dashboard_page_links.ts` | ~115 | `label[for="dashboardLink"]`, `label[for="externalLink"]` | radio labels; consider data-test-subj on labels |
| `links_create_edit.ts` | 345-347 | `li:nth-child(2)` in listGroup | use `getByRole('listitem').nth(1)` |
| `dashboard_page_links.ts` | ~92 | `:nth-child(index)` on draggable | `locator(...).nth()` |

### Page objects with hidden assertions

| Helper | Method | Assertion | File:line |
|--------|--------|-----------|-----------|
| `dashboardLinks` | `reorderLinks` | `expect(...isDragging).to.be(false)` | `dashboard_page_links.ts` |
| `dashboardLinks` | `expectPanelEditorFlyoutIsOpen` | `retry.waitFor` | same |
| `testSubjects` | `existOrFail`/`missingOrFail` | throws | built-in |

---

## 7. Server configuration

| Arg | Source config | Category | Notes |
|-----|-------------|----------|-------|
| `--externalUrl.policy=[{allow:false,host:'danger.example.com'},{allow:true,host:'example.com'}]` | `links/config.ts:20` | **requires custom config set** | Boot-time; not runtime-settable. No existing Scout config set has it. |
| `xpack.security.enabled=false` etc. | `common/config.js` | already handled by Scout default | no action |

### Custom server config needed?

- **Reason**: `externalUrl.policy` only applies at Kibana boot.
- **Closest existing config set**: `banners` (pattern: spread `defaultConfig` + extra `serverArgs`).
- **Args that require it**: `externalUrl.policy`.
- **Placement**: new `src/platform/packages/shared/kbn-scout/src/servers/configs/config_sets/links_external_url_policy/stateful/classic.stateful.config.ts` (name NEEDS VERIFICATION per kbn-scout conventions), plus `--serverConfigSet` wiring for the plugin's second Playwright config. Only the 4 policy-dependent tests (3 external-navigation + 1 create) use it; everything else uses the default config.

NEEDS VERIFICATION: whether a default-config alternative exists (e.g. assert disabled state via URL not covered by default policy). The default policy allows all, so the "forbidden" cases cannot be tested without the arg.

---

## 8. Deployment targets

| Proposed spec | Where it should run | Reasoning |
|--------------|--------------------|-----------|
| `add_from_library`, `links_dashboard_navigation`, `links_create`(non-policy), `links_edit` | stateful + serverless (`tags.deploymentAgnostic`) | Links panel exists everywhere; FTR was stateful-only (`ftr_platform_stateful_configs.yml:71`), so this expands coverage. NEEDS VERIFICATION in serverless run. |
| `links_external_navigation` + policy test | stateful only | Custom server config set is local-only (no Cloud) |

### Stateful/serverless mirror FTR files

None found after searching by basename (`links_navigation`, `links_create_edit`), test titles, and `Links panel` text under `src/platform/test`, `x-pack/platform/test`, `x-pack/solutions`. Related but not a mirror: `x-pack/platform/test/accessibility/apps/group1/dashboard_links.ts` (a11y, stays in FTR and keeps using the `dashboardLinks` FTR page object).

### Cloud portability issues

| File | Line | Issue |
|------|------|-------|
| `config.ts` | 20 | Custom `externalUrl.policy` server arg (not Cloud portable) |
| `links_create_edit.ts` | 22 | `deployment.getHostPort()` builds `/app/foo` URLs; use Playwright `baseURL`/`kbnUrl` |
| `links_navigation.ts` | 118-125 | Real navigation to `https://example.com`; should be route-mocked to avoid external network |

---

## 9. FTR test smells

| Smell | File | Lines | Description | Context |
|-------|------|-------|-------------|---------|
| Skipped suite | `links_create_edit.ts` | 11 | `describe.skip`, issue #274890 | Migration must diagnose, not blindly skip |
| Sequential journey | `links_create_edit.ts` | 78-130 | by-value create → save to library → unlink | convert to `test.step`; reset: `afterEach` discards changes |
| Shared mutable state | `links_create_edit.ts` | edit tests | each test mutates `links 001`; later tests depend on earlier reorder/rename (edit link index 5 then delete index 5) | Isolate via per-test archive reload or merge into a journey |
| Retry wrappers | `dashboard_page_links.ts` | many | `retry.try/waitFor` | replace with web-first assertions |
| UI-based setup | `links_create_edit.ts` | 33-42 | creates a dashboard through UI in `before` | use API/archive |
| Global loading wait | both | many | `header.waitUntilLoadingHasFinished` | use element-specific waits |
| Skip tag | `links_navigation.ts` | 82 | `skipFIPS` | dropped; Scout lane has no FIPS |
| Brittle selector | see §6 | - | nth-child | - |
| Over-privileged | `index.ts` | 30 | admin + custom roles | see §5 |
| Test ordering dependency | `links_navigation.ts` | external links `before` | loads dashboard once then three `it`s | each test navigates itself |

---

## 10. Migration batches

### Batch 1: Quick wins

| # | Proposed spec | From | Complexity | Notes |
|---|--------------|------|------------|-------|
| 1 | `add_from_library.spec.ts` | `links_navigation.ts` | simple | Default config |
| 2 | `links_dashboard_navigation.spec.ts` | `links_navigation.ts` | medium | New page object helpers (dashboard-id from URL), new-page handling |

- **Human involvement**: `autopilot`
- **Dependencies**: plugin-local `ui` Playwright config, fixtures, constants (create `test/scout/ui/playwright.config.ts`, `.meta` manifest)
- **Blockers**: none

### Batch 2: Links page object

| # | Proposed spec | From | Complexity | Notes |
|---|--------------|------|------------|-------|
| 3 | `links_edit.spec.ts` | `links_create_edit.ts` | medium | New `LinksPanel` page object (flyouts, reorder via keyboard) |
| 4 | `links_create.spec.ts` (non-policy tests) | `links_create_edit.ts` | complex | Currently skipped upstream; may reveal flake |

- **Human involvement**: `guided` (flaky issue #274890 decision)
- **Dependencies**: batch 1 scaffolding
- **Blockers**: none, but possible `data-test-subj` additions for radio labels

### Batch 3: Custom server config

| # | Proposed spec | From | Complexity | Notes |
|---|--------------|------|------------|-------|
| 5 | `links_external_navigation.spec.ts` + policy test | `links_navigation.ts`, `links_create_edit.ts` | complex | New kbn-scout config set + second Playwright config |

- **Human involvement**: `hands-on` (new config set; naming/CI wiring)
- **Dependencies**: batches 1-2
- **Blockers**: kbn-scout config set registration

Post-migration cleanup: delete `links/` FTR dir, remove line 71 from `.buildkite/ftr-manifests/ftr_platform_stateful_configs.yml`; keep `dashboard_page_links.ts` (used by a11y test); update CODEOWNERS/Scout manifest as needed.

---

## 11. Effort summary

| Metric | Value |
|--------|-------|
| Total FTR test files analyzed | 2 (+ index, config) |
| > UI tests | 2 (→ 5 specs) |
| > API tests | 0 |
| > Unit tests (RTL/Jest) | 0 |
| > Dropped | 0 |
| > Deferred | 0 |
| New page objects needed | 1 (plugin-local `LinksPanel`) |
| New API services needed | 0 |
| `data-test-subj` additions to source code | 0-2 (radio labels, NEEDS VERIFICATION) |
| Custom server config sets | 1 new / 0 reuse |
| Migration batches | 3 |

### Risks and open questions

- NEEDS VERIFICATION: space-scoped loading of the shared kbn archive with fixed dashboard IDs.
- NEEDS VERIFICATION: whether `es_archiver` data/flights archives are still required.
- NEEDS VERIFICATION: Scout dashboard page object coverage for `loadSavedDashboard`, `getDashboardIdFromCurrentUrl`, "Links" add-panel UI action.
- Decision: keep `links_create_edit` skip (issue #274890) if the migrated tests are also flaky?
- Decision: custom config set name and placement.
- Decision: expand to serverless (`deploymentAgnostic`) for the non-policy specs.

---

## Execution notes (2026-10-09)

- Specs landed in `test/scout/ui/tests/` (`add_from_library`, `links_dashboard_navigation`, `links_create`, `links_edit`) and `test/scout_links_external_url_policy/ui/tests/links_external_url_policy.spec.ts`. The policy-violation test from `links_create_edit.ts` moved into the policy spec because it needs the custom server config.
- New config set: `kbn-scout/.../config_sets/links_external_url_policy`. Plugin-local page object: `LinksPanel`. `global.setup.ts` loads the dashboard ES archive (the time picker is disabled without a time-based index); the flights archives were not needed and were dropped.
- Verified locally (stateful classic): 12/12 default-config specs, 4/4 policy specs. Serverless run **not verified** (Docker unavailable).
- FTR `links/` directory and its `ftr_platform_stateful_configs.yml` entry removed; `dashboard_page_links.ts` kept for the accessibility FTR test.

- Converted to sequential (`test` + `kbnClient.importExport.load`, fixed archive ids, default space) instead of parallel `spaceTest`; `global.setup.ts` removed and the ES archive is loaded in the navigation spec. Re-verified: 11/11 default-config, 4/4 policy.
