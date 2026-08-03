# FTR to Scout Migration Plan

| Field | Value |
|-------|-------|
| Source | `src/platform/test/functional/apps/console` (+ satellite suites: `x-pack/platform/test/serverless/functional/test_suites/console`, `x-pack/platform/test/api_integration/apis/console`, `src/platform/test/accessibility/apps/console.ts`, `x-pack/platform/test/stack_functional_integration/apps/ccs/ccs_console.ts`) |
| Target module root | `src/platform/plugins/shared/console` |
| Generated | 2026-07-29 |
| Deployment targets | both (stateful + serverless) |
| FTR config chain | `src/platform/test/functional/apps/console/config.ts` > `src/platform/test/functional/config.base.js` > `src/platform/test/common/config.js` (wrapped in `configureHTTP2`); serverless: `x-pack/platform/test/serverless/functional/configs/{search,observability}/config.group1.ts` + `security/config.group18.ts` > `config.<solution>.base.ts`; API: `x-pack/platform/test/api_integration/apis/console/config.ts` > `x-pack/platform/test/api_integration/config.ts`; CCS: `src/platform/test/functional/config.ccs.ts` > `config.base.js`; a11y: `src/platform/test/accessibility/config.ts` |

**GitHub issue**: elastic/kibana#281241

**Existing Scout coverage (dedupe baseline)** — under `src/platform/plugins/shared/console/test/scout` (PRs #241561, #260734, #276365):

- API specs: `autocomplete_entities.spec.ts`, `autocomplete_entities_stateful.spec.ts`, `es_config.spec.ts`, `proxy_route.spec.ts`, `proxy_route_stateful.spec.ts`, `spec_definitions.spec.ts` — these cover the console HTTP routes (autocomplete entities settings matrix, es host config, proxy header behavior/system-index warnings, spec definitions). They do **not** cover the authz/feature-control behavior of `/api/console/proxy` tested by `feature_controls.ts`.
- UI spec: `ui/tests/copy_output.spec.ts` — covers "copy selected output to clipboard shows toast + clipboard content" (deploymentAgnostic). This **fully covers** `_output_panel.ts` case `should be able to copy the response of a request` (the Scout version is a stronger, regression-guarded variant).
- UI fixtures: plugin-local `ConsolePage` page object (`ui/fixtures/page_objects/console_page.ts`) with `gotoWithRequestLoaded` (load_from data-URI navigation), `sendRequest`, `selectOutput`, `slowClickCopyOutput`. It must be substantially extended for this migration.

No other FTR case is covered by existing Scout specs.

---

## 1. Test inventory

Sorted by estimated complexity (simple to complex).

| # | FTR file (relative) | Type | Description | `it` count | Complexity | Decision | Justification |
|---|---------------------|------|-------------|-----------|------------|----------|---------------|
| 1 | `src/platform/test/functional/apps/console/large_input.ts` | fixture | Exports `LARGE_INPUT` constant (large request payload) used by `_misc_console_behavior.ts` | 0 | - | move as fixture | Not a test; becomes a Scout fixture constant |
| 2 | `src/platform/test/functional/apps/console/quote_heavy_input.ts` | fixture | Exports `QUOTE_HEAVY_INPUT` (escaped-quote-heavy payload, ES\|QL freeze regression) used by `_misc_console_behavior.ts` | 0 | - | move as fixture | Not a test; becomes a Scout fixture constant |
| 3 | `src/platform/test/functional/apps/console/index.ts` | index | Loads all sub-suites; `before` sets window size 1300x1100; branches on `esTestCluster.ccs` to load only `_console_ccs` | - | - | split | Each `loadTestFile` target becomes its own spec; window sizing moves into specs/config |
| 4 | `src/platform/test/functional/apps/console/config.ts` | config | Wires `testFiles` onto `config.base.js` + `configureHTTP2` | - | - | drop | Scout default servers config replaces it |
| 5 | `src/platform/test/accessibility/apps/console.ts` | test | a11y snapshots of shell view and config tab | 2 | simple | UI test (merge) | Fold both snapshots into the functional specs that already reach those states, as `page.checkA11y()` calls inside `test.step` blocks (Scout maintainer guidance on PR #281288: avoid separate a11y specs, add checks in existing functional tests; reference `src/platform/plugins/shared/discover/test/scout/metrics_experience/ui/parallel_tests/flyout_persistence.spec.ts`) |
| 6 | `src/platform/test/functional/apps/console/_output_panel.ts` | test | Copy output, per-request line-number comments in output, clear output empty state | 3 | simple | UI test | Real output-panel user flows; 1 of 3 cases already covered by Scout `copy_output.spec.ts` (drop it) |
| 7 | `src/platform/test/functional/apps/console/_settings.ts` | test | Monaco a11y overlay shows on Escape; can be disabled via Config tab | 2 | simple | UI test | Editor/config interaction needs real browser |
| 8 | `src/platform/test/functional/apps/console/_output_filter.ts` | test | JQ/regex output filter row: expand/collapse, apply filter, clear filter, active-dot indicator | 5 | simple | UI test | Output-panel UI flows |
| 9 | `src/platform/test/functional/apps/console/_vector_tile.ts` | test | Executes `_mvt` request against sample-data logs; asserts binary vector-tile response renders as text | 1 | medium | UI test | Value is Console's rendering of a binary response in the output panel; setup (sample data) moves from UI to API |
| 10 | `src/platform/test/functional/apps/console/_text_input.ts` | test | `load_from` data-URI loading (valid + invalid) and console history (list, load, restore-and-execute, clear) | 5 | medium | UI test | Navigation + history user flows |
| 11 | `x-pack/platform/test/serverless/functional/test_suites/console/console.ts` | test | Serverless smoke: default request shown, default request executes, docs link opens | 3 | simple | merge + delete | Strict subset of `_console.ts` (2 its) + `_context_menu.ts` docs it; covered by tagging migrated specs for serverless |
| 12 | `x-pack/platform/test/serverless/functional/test_suites/console/index.ts` | index | Loads serverless console suite, tags `esGate` | - | - | drop | Goes away with the merged suite |
| 13 | `src/platform/test/functional/apps/console/_comments.ts` | test | Data-driven: single-line/multiline comments accepted in URL and body; invalid syntax highlighted | 15 | medium | UI test | Asserts Monaco error markers (`.squiggly-error`) end-to-end; consolidate the 15 data-driven `it`s into fewer specs with `test.step`. Partial downgrade to Jest against the console parser is possible — `NEEDS VERIFICATION` whether `@kbn/monaco` console parser unit tests already cover these grammars |
| 14 | `src/platform/test/functional/apps/console/_xjson.ts` | test | Input validation (invalid method/path/body), `_msearch` multi-body, triple-quote escaping, inline comments, deprecation warning for `GET .kibana` | 11 | medium | UI test | Same Monaco-marker + execution flows; `.kibana` deprecation cases need a stateful-only carve-out (see §8) |
| 15 | `src/platform/test/functional/apps/console/_variables.ts` | test | Config-tab variables CRUD, copy to clipboard, interpolation in URL/body/inline | 6 | medium | UI test | Multi-tab user flow (Config ↔ Shell) with request execution |
| 16 | `src/platform/test/functional/apps/console/_onboarding_tour.ts` | test | 5-step onboarding tour: run, advance all steps, skip, re-run | 4 | medium | UI test | Tour popover flows; heavy custom wait helpers must be rebuilt on Playwright auto-waiting |
| 17 | `src/platform/test/functional/apps/console/_console.ts` | test | Core: default request, empty-state output, execute, resize, clear input, tabs URL routing, mixed-case methods, `kbn:` prefix, query params, multi-request output, actions-menu visibility off-viewport, 200-empty-body OK, error body | 14 | complex | UI test | Broad core flows; split into `console_core` + `console_tabs` specs; `POST /_cluster/voting_config_exclusions` case needs stateful-only carve-out or a replacement request (see §8) |
| 18 | `x-pack/platform/test/api_integration/apis/console/feature_controls.ts` | test | `/api/console/proxy` authz: anonymous 401, kibana_user/kibana_admin/global-all/global-read 200, dashboard-only 403, space-scoped dev_tools access | 8 | complex | API test | Pure HTTP authz assertions; no browser needed. Custom roles are the subject under test (permission-scoped behavior) — keep custom roles, do not downgrade to built-ins |
| 19 | `src/platform/test/functional/apps/console/_context_menu.ts` | test | Context menu: open, options visible, copy-as-curl/language, kbn-request restrictions, change default language (2 save paths), open docs in new tab, auto-indent, shortcut badges | 11 | complex | UI test | Clipboard permissions, external-tab handling, localStorage-persisted default language |
| 20 | `src/platform/test/functional/apps/console/_misc_console_behavior.ts` | test | Keyboard shortcuts (popover, Ctrl+Enter/I/Up/Down//), shortcut toggle, font size, help popover, invalid-request toasts, file import/export, clickable links (Cmd+Click new tab), large-content + quote-heavy responsiveness | 19 | complex | UI test | Real keyboard/clipboard/file/new-tab interactions; the two large-payload cases depend on autocomplete behavior |
| 21 | `src/platform/test/functional/apps/console/_autocomplete.ts` | test | Autocomplete: basics, inline JSON, no duplicates, HTTP methods, endpoints, placeholder fields, dynamic index/field suggestions, conditional snapshot-repo templates, ES\|QL triple-quote context; **entire suite `describe.skip`ped** (flaky, #257917); inner comment-context describe also skipped (#248964) | 18 | complex | UI test (guided) | Genuine editor UX, but suite is fully disabled today — re-enabling is a product/flake decision, not a mechanical port (see risks) |
| 22 | `src/platform/test/functional/apps/console/_console_ccs.ts` | test | CCS: `GET ftr-remote:logstash-*/_search` returns remote index docs | 1 | complex | defer | Scout has no remote-cluster/CCS topology; blocked until Scout supports a CCS server config |
| 23 | `x-pack/platform/test/stack_functional_integration/apps/ccs/ccs_console.ts` | test | Stack-integration CCS variant (`ftr-remote:makelogs工程-*`) | 1 | complex | out of scope | Legacy stack integration suite, separately provisioned real clusters; not FTR-manifest driven; leave in place |

### Proposed file splits

- `_console.ts` (14 `it` blocks across unrelated flows), split into:
  - `console_core.spec.ts` (default request, execute, clear input/output, mixed-case methods, query params, `kbn:` prefix, multi-request output, empty-body OK, error body)
  - `console_tabs.spec.ts` (tabs update URL, tabs navigable via URL, actions-menu-off-viewport/resize behaviors)
- `_misc_console_behavior.ts` (19 `it` blocks), split into:
  - `keyboard_shortcuts.spec.ts` (shortcuts popover, Ctrl+Enter/I/Up/Down, Ctrl+/ docs, shortcut toggle)
  - `console_config.spec.ts` (font size customization, help popover — can absorb `_settings.ts` a11y-overlay cases)
  - `import_export.spec.ts` (file import, file export)
  - `editor_robustness.spec.ts` (invalid-request toasts, clickable links, large-content + quote-heavy payloads via the two fixture constants)
- `_context_menu.ts` (11 `it` blocks), split into:
  - `context_menu.spec.ts` (open/options/auto-indent/docs/shortcut badges)
  - `copy_as_language.spec.ts` (copy-as-curl, kbn restrictions, language change/default flows)

### Tests to drop

- `_output_panel.ts` — `should be able to copy the response of a request`: already covered (and hardened) by Scout `ui/tests/copy_output.spec.ts`. No coverage lost.
- `x-pack/platform/test/serverless/functional/test_suites/console/console.ts` (whole file): all 3 cases are duplicates of `_console.ts` / `_context_menu.ts` cases; coverage moves to the merged deployment-agnostic Scout specs. Delete together with its `index.ts` and the three serverless config `loadTestFile` references once the Scout specs run in serverless CI.

### Tests to defer

- `src/platform/test/functional/apps/console/_console_ccs.ts`: blocked by missing remote-cluster (CCS) topology in Scout test servers. Keep the FTR file and `config.ccs.ts` entry until Scout supports CCS. Tracked in the deferred-CCS umbrella issue #281791.
- `x-pack/platform/test/stack_functional_integration/apps/ccs/ccs_console.ts`: legacy stack-integration suite (real multi-cluster deployments); out of scope for Scout migration. Document only; do not touch.

---

## 2. Test type routing

### UI tests

Proposed module: `src/platform/plugins/shared/console/test/scout/ui/tests/`.

| FTR file | Proposed spec path | Key flows covered |
|----------|--------------------|-------------------|
| `_console.ts` | `ui/tests/console_core.spec.ts`, `ui/tests/console_tabs.spec.ts` | Default request, execution, output states, tab routing, request edge cases |
| `_output_panel.ts` | fold remaining 2 cases into `ui/tests/console_core.spec.ts` (or `output_panel.spec.ts`) | Line-number comments in output, clear output |
| `_output_filter.ts` | `ui/tests/output_filter.spec.ts` | Filter row toggle, JQ filter apply/clear, active indicator |
| `_settings.ts` | `ui/tests/console_config.spec.ts` | a11y overlay enable/disable |
| `_comments.ts` | `ui/tests/comments.spec.ts` | Comment syntaxes accepted; invalid syntax flagged |
| `_xjson.ts` | `ui/tests/input_validation.spec.ts` | Method/path/body validation, msearch, triple quotes, deprecation warning |
| `_variables.ts` | `ui/tests/variables.spec.ts` | Variables CRUD + interpolation |
| `_text_input.ts` | `ui/tests/load_from_and_history.spec.ts` | `load_from` URI, history list/load/execute |
| `_onboarding_tour.ts` | `ui/tests/onboarding_tour.spec.ts` | Tour run/advance/skip/re-run |
| `_context_menu.ts` | `ui/tests/context_menu.spec.ts`, `ui/tests/copy_as_language.spec.ts` | Menu actions, copy-as flows, docs link |
| `_misc_console_behavior.ts` | `ui/tests/keyboard_shortcuts.spec.ts`, `ui/tests/console_config.spec.ts`, `ui/tests/import_export.spec.ts`, `ui/tests/editor_robustness.spec.ts` | Shortcuts, config, files, robustness |
| `_autocomplete.ts` | `ui/tests/autocomplete.spec.ts` (guided; see risks) | Autocomplete behaviors incl. ES\|QL context |
| `_vector_tile.ts` | `ui/tests/vector_tile_response.spec.ts` | Binary `_mvt` response rendering |
| `src/platform/test/accessibility/apps/console.ts` | merged: `page.checkA11y()` inside `test.step` blocks in `console_core.spec.ts` (shell view) and `console_config.spec.ts` (config tab) | a11y checks live in the functional specs that already reach those states (Scout maintainer recipe, PR #281288); no standalone a11y spec |

### API tests

Proposed module: `src/platform/plugins/shared/console/test/scout/api/tests/`.

| FTR file | Proposed spec path | Why API not UI |
|----------|--------------------|----------------|
| `x-pack/platform/test/api_integration/apis/console/feature_controls.ts` | `api/tests/proxy_route_authz.spec.ts` | Pure HTTP status assertions on `/api/console/proxy` per role/space; no browser interaction. Scout supports custom roles (`getApiKeyForCustomRole` in `kbn-scout` saml_auth_manager) and a `spaces` API service |

### Unit tests (RTL/Jest)

None mandatory. Optional follow-up: comment/grammar validation cases from `_comments.ts`/`_xjson.ts` overlap with the console Monaco language parser; `NEEDS VERIFICATION` whether `@kbn/monaco` console parser Jest tests already cover them — if so, the UI specs can keep only one representative case per marker type.

---

## 3. Parallelism plan

Console state (history, variables, settings, default copy-language, tour progress) lives in browser `localStorage` (`src/platform/plugins/shared/console/public/services/{settings,history}.ts`), which is per-Playwright-context — inherently parallel-safe in Scout.

### Parallel-safe (can be space-isolated / context-isolated)

| Proposed spec | Why parallel-safe |
|--------------|------------------|
| `console_tabs.spec.ts`, `output_filter.spec.ts`, `console_config.spec.ts`, `comments.spec.ts`, `input_validation.spec.ts` (validation-only cases), `variables.spec.ts`, `load_from_and_history.spec.ts`, `onboarding_tour.spec.ts`, `context_menu.spec.ts`, `copy_as_language.spec.ts`, `keyboard_shortcuts.spec.ts`, `import_export.spec.ts` | Only read-only ES requests (`GET _search`, `_cat`) plus localStorage state scoped to the browser context |
| `console_core.spec.ts` | Mostly read-only; the multi-request case (`PUT test-index` / `DELETE test-index`) must switch to a unique per-run index name to avoid cross-worker collision |
| `autocomplete.spec.ts` | Index-fields case already uses a unique `index_field_test-${Date.now()}-${Math.random()}` name; the "Dynamic autocomplete" case must switch its hardcoded `test` index to a unique name **and add cleanup** (missing today) |
| `editor_robustness.spec.ts` | Payloads are typed/imported, not executed (except read-only requests) |

### Must be sequential

| Proposed spec | Why sequential |
|--------------|---------------|
| `vector_tile_response.spec.ts` | Installs/removes the global `logs` sample data set (cluster-wide indices `kibana_sample_data_logs`); collides with any other test using sample data |
| `console_core.spec.ts` — `Shows OK when status code is 200 but body is empty` case | `POST /_cluster/voting_config_exclusions` is a cluster-level mutation with no cleanup; either replace the request (preferred, see §8) or isolate it |

---

## 4. Test data and setup

### Archives inventory

| Archive path | Contents | Size | Used by (files) | Verdict |
|-------------|----------|------|-----------------|---------|
| `src/platform/test/functional/fixtures/es_archiver/logstash_functional` | `logstash-*` indices (remote cluster) | ~large | `_console_ccs.ts` only | Deferred with the CCS test |
| (sample data set `logs`, installed via UI) | `kibana_sample_data_logs` index + saved objects | ~MB | `_vector_tile.ts` | Replace UI install with Scout sample-data API service (`kbn-scout` `apis/sample_data`); load in `beforeAll`, remove in `afterAll` |
| `large_input.ts` / `quote_heavy_input.ts` (in-repo constants) | Editor payload text | ~10KB / ~300KB | `_misc_console_behavior.ts` | Keep; relocate to `test/scout/ui/fixtures/` |

No es_archiver/kbn_archiver usage in the primary (non-CCS) suite.

### UI settings mutations

| FTR call | Semantics | Files |
|----------|-----------|-------|
| (none) | No `kibanaServer.uiSettings.*` calls in any console FTR file | - |

Base FTR config sets `--uiSettings.globalOverrides.hideAnnouncements=true` and `accessibility:disableAnimations` defaults (`config.base.js:49,60`). `NEEDS VERIFICATION`: whether Scout's default config sets equivalents; if not, tour/announcement popovers may auto-appear and the migrated specs need the `skipTourIfExists` equivalent (the FTR suite already defensively skips the tour everywhere, so the executor should port that helper regardless).

### Shared constants to extract

| Value | Occurrences | Current locations |
|-------|-------------|-------------------|
| `LARGE_INPUT` / `QUOTE_HEAVY_INPUT` payloads | 2 files | `large_input.ts`, `quote_heavy_input.ts` (imported by `_misc_console_behavior.ts:15-16`) — move to `test/scout/ui/fixtures/` |
| `GET _search\n{"query": {"match_all": {}}}` + its auto-indented form | 3 files | `_context_menu.ts:274,280`, `_misc_console_behavior.ts:72,77`, `_text_input.ts:82,91` — extract only the indented-pair (input/expected) used by auto-indent assertions |

Nothing else recurs enough to justify constants; prefer inline.

### Fresh server required

None. No test needs a clean ES/Kibana boot state.

---

## 5. Auth and roles

Note: the stateful FTR config runs with `xpack.security.enabled=false` on ES (`config.base.js:30`) unless `ES_SECURITY_ENABLED` is set, so the `security.testUser.setRoles` calls below are only effective on security-enabled runs. Scout always runs with security enabled.

### Role inventory

| Role name | Source | Privileges (summary) | Used by (files) | Scout role target | Notes |
|-----------|--------|---------------------|-----------------|-------------------|-------|
| default FTR test user (effectively superuser) | `config.base.js` | Everything | all UI files | `browserAuth.loginAsAdmin()` | See over-privilege note below |
| `kibana_admin` + `test_index` | `config.base.js:273` (`test-index`: read/manage/create/index) | ES index privileges on `test-index` | `_console.ts:186` | `loginAsAdmin()` | Scoping was defensive, not under test |
| `kibana_admin` + `kibana_sample_admin` | `config.base.js:198` (`kibana_sample*`: read/manage/create/index) | Sample-data index management | `_vector_tile.ts:20` | `loginAsAdmin()` | Sample data now installed via API service, not UI |
| serverless `admin` | `console.ts:24` (`svlCommonPage.loginAsAdmin`) | Project admin | serverless `console.ts` | `loginAsAdmin()` | TODO #176582: security-project `viewer` has no Console access — admin keeps one role working across all projects |
| anonymous | `feature_controls.ts:16` | none | `feature_controls.ts` | unauthenticated request | Expect 401 |
| `kibana_user`, `kibana_admin` (built-in ES roles) | `feature_controls.ts:24,47` | Built-in Kibana access | `feature_controls.ts` | keep as-is (native realm users or API keys) | Behavior under test |
| `global_all` (custom) | `feature_controls.ts:76` | Kibana `base: ['all']`, spaces `*` | `feature_controls.ts` | `getApiKeyForCustomRole` | Permission-scoped behavior — keep custom |
| `global_read` (custom) | `feature_controls.ts:108` | Kibana `base: ['read']`, spaces `*` | `feature_controls.ts` | `getApiKeyForCustomRole` | Keep custom |
| `dashboard_all` (custom) | `feature_controls.ts:141` | Kibana `feature: { dashboard: ['all'] }`, spaces `*` | `feature_controls.ts` | `getApiKeyForCustomRole` | Negative case (403) — keep custom |
| `user_1` (custom, space-scoped) | `feature_controls.ts:186` | `dev_tools: all` in `space_1`; `dashboard: all` in `space_2` | `feature_controls.ts` | `getApiKeyForCustomRole` + spaces API service | Space-scoping is the behavior under test — keep custom |

### Over-privileged tests

Tests running as admin/superuser that likely don't need it:

| File | What it actually exercises | Suggested minimum privilege |
|------|---------------------------|----------------------------|
| all UI specs | Console (dev_tools feature) + mostly read-only ES calls | In stateful and search/oblt serverless, `viewer` suffices for read-only flows; **but** security serverless requires admin (#176582), and several specs create indices. Recommendation: keep `loginAsAdmin()` uniformly for deployment-agnostic specs; do not fragment auth per project. Documented over-privilege acceptance |

### Roles deserving shared helpers (used in ≥3 files)

- Admin login: every UI spec — already a one-liner (`browserAuth.loginAsAdmin()`), no helper needed.
- `feature_controls` custom roles: single file — define inline in that spec.

### Special auth patterns

- Anonymous access check (`feature_controls.ts:16-22`): request with no credentials expecting 401. The executor must confirm the Scout `apiClient` can send an unauthenticated request; otherwise use a raw fetch. `NEEDS VERIFICATION`.
- FTR used basic auth (`.auth(username, password)`); Scout uses API keys for custom roles — equivalent for authz semantics, but the 401-anonymous case must not silently inherit worker credentials.

---

## 6. Reusability audit

### FTR services and page objects in use

| FTR name | What it does | Used by (files) | Scout equivalent exists? | Hidden assertions? | Recommended scope |
|----------|-------------|-----------------|-------------------------|-------------------|-------------------|
| `PageObjects.console` (`src/platform/test/functional/page_objects/console_page.ts`, 656 lines) | Everything: Monaco input/output text, keypresses, autocomplete, context menu, history, variables, settings, tour | all UI files | partial — plugin-local Scout `ConsolePage` has 5 methods; needs a large extension (~30 methods) | yes — see below | plugin-local (`test/scout/ui/fixtures/page_objects/console_page.ts`) |
| `PageObjects.common` | `navigateToApp('console')`, `sleep` | all UI files | yes (`page.gotoApp('dev_tools', {hash})` — pattern already in `ConsolePage.gotoWithRequestLoaded`) | no | use existing |
| `PageObjects.header.waitUntilLoadingHasFinished` | Global loading-spinner wait | most UI files | yes (Scout page objects) — prefer element-level waits instead | yes (throws) | replace with targeted waits (`waitForRequestToComplete` equivalent) |
| `PageObjects.home` | Sample data install/remove via UI | `_vector_tile.ts` | yes — Scout `sample_data` API service (better) | no | use API service, drop UI setup |
| `PageObjects.svlCommonPage` | Serverless login | serverless `console.ts` | yes (`browserAuth`) | no | use existing |
| `getService('toasts')` | Read/dismiss toasts | `_context_menu`, `_misc`, `_output_panel`, `_text_input` | yes (`pageObjects.toasts`, used in `copy_output.spec.ts`) | no | use existing |
| `getService('testSubjects')` | Locators | several | yes (`page.testSubj`) | `existOrFail` used in `_onboarding_tour.ts:67` | use existing |
| `getService('browser')` | Window size, tabs, clipboard, `execute` | `_console`, `_context_menu`, `_misc`, `_onboarding_tour`, `_variables` | yes (Playwright: viewport, `context.waitForEvent('page')`, `grantPermissions`, `page.evaluate`) | no | use Playwright natives |
| `getService('security')` (`testUser.setRoles`) | Switch test-user roles | `_console.ts`, `_vector_tile.ts` | yes (`browserAuth`) | no | replace with `loginAsAdmin` |
| `getService('supertestWithoutAuth')`, `security.user/role`, `spaces` | API authz plumbing | `feature_controls.ts` | yes (`apiClient`, `requestAuth`/custom roles, spaces API service) | no | use existing |
| `getService('a11y')` | Axe snapshot | a11y `console.ts` | yes (`page.checkA11y`) | yes (throws on violations) | use existing, merged as `test.step` a11y checks inside the functional specs (Scout maintainer recipe, PR #281288) |
| `getService('remoteEsArchiver')` | Load archive into remote cluster | `_console_ccs.ts` | no | no | deferred with CCS |

### FTR ConsolePage methods with hidden assertions / hidden conditionals (restructure when porting)

| FTR helper | Method | Issue | File:line |
|-----------|--------|-----------|-----------|
| `PageObjects.console` | `promptAutocomplete` | embeds `retry.waitFor('autocomplete to be visible')` | `console_page.ts:89-96` |
| `PageObjects.console` | `getAutocompleteSuggestion` | embeds `retry.waitFor` assertion | `console_page.ts:105-119` |
| `PageObjects.console` | `clickPlayAndWaitForResults` / `waitForRequestToComplete` | throws on failure inside page object | `console_page.ts:250-278` |
| `PageObjects.console` | `setFontSizeSetting` | contains `expect(...)` | `console_page.ts:445-455` |
| `PageObjects.console` | `clickClearInput` / `clickClearOutput` | silent no-op if button missing (conditional) | `console_page.ts:288-302` |
| `PageObjects.console` | `isAutocompleteVisible` | `.catch(() => null)` swallows locator errors | `console_page.ts:98-103` |

### EUI components interacted with directly

| Component | Interaction pattern | Files |
|----------|-------------------|-------|
| `EuiTour` / `EuiPopover` | Class check `euiPopover-isOpen`, step buttons | `_onboarding_tour.ts:34-58`, `console_page.ts:325-337` |
| `EuiSwitch` | `setEuiSwitch` for a11y overlay / keyboard shortcuts | `console_page.ts:390-393,457-460` |
| `EuiModal` | Language selector, import confirm (`confirmModalConfirmButton`) | `_context_menu.ts:167-246`, `console_page.ts:321-323` |
| `EuiBasicTable` | Variables table rows (`euiTableRow` class) | `console_page.ts:424-443` |
| Toasts (`EuiGlobalToastList`) | Read title, dismiss, index-based lookup | `_context_menu.ts:57`, `_output_panel.ts:55` |
| `EuiBadge` | Response status badge | `console_page.ts:478-482` |

The executor should use Scout's EUI helpers (`page.components.*`) where wrappers exist (switches, modals, toasts) instead of porting the FTR class-based lookups.

### Brittle locator strategies

Monaco has no `data-test-subj` hooks internally; its class-based selectors (`view-lines`, `suggest-widget`, `monaco-list-row`, `label-name`, `margin-view-overlays`, `squiggly-error`, `detected-link`) are unavoidable and should be centralized in the Scout `ConsolePage`. Genuine source-code gaps:

| File | Line | Current locator | Target component |
|------|------|----------------|-----------------|
| `console_page.ts` | 649-655 | `span[style*="border-radius"]` inside button wrapper | Output-filter "active" dot indicator — add a `data-test-subj` to the indicator in `output_filter_row.tsx` / the filter button badge |
| `console_page.ts` | 316-318 | `#importConsoleFile` CSS id | File-import input — acceptable (stable id) but a `data-test-subj` would be cleaner; optional |
| `_onboarding_tour.ts` | 34-40 | class check `euiPopover-isOpen` on tour steps | Tour step open-state; prefer visibility of step content in Playwright |

---

## 7. Server configuration

### FTR server args (full chain)

| Arg | Source config | Category | Notes |
|-----|-------------|----------|-------|
| `--telemetry.optIn=false` | `config.base.js:37` | already in Scout default | no action |
| `--savedObjects.maxImportPayloadBytes=10485760` | `config.base.js:38` | irrelevant to console | no action |
| `--savedObjects.allowHttpApiAccess=false` | `config.base.js:40` | irrelevant to console | no action |
| `--server.restrictInternalApis=false` | `config.base.js:42` | not needed | console tests hit only public APIs (`/api/spaces/space`, `/api/alerting/rule`, `/api/console/*`) |
| `--xpack.reporting.enabled=false` | `config.base.js:44` | irrelevant | no action |
| `--xpack.task_manager.unsafe.exclude_task_types=[Fleet-Metrics-Task]` | `config.base.js:47` | FTR-infra hygiene | no action |
| `--uiSettings.globalOverrides.hideAnnouncements=true` | `config.base.js:49` | runtime-relevant | see §4 — `NEEDS VERIFICATION` whether Scout default covers it; otherwise dismiss tours/announcements in specs |
| HTTP/2 wrapper (`configureHTTP2`) | `apps/console/config.ts:16` | FTR-infra | no Scout action needed |

### ES server args

| Arg | Source config | Notes |
|-----|-------------|-------|
| `xpack.security.enabled=false` (unless `ES_SECURITY_ENABLED`) | `config.base.js:30` | Scout runs security-enabled; behavior parity fine — all requests go through Kibana's proxy with the logged-in user |
| `esTestCluster.ccs.remoteClusterUrl` | `config.ccs.ts:57` | CCS only — deferred |

### Custom server config needed?

No. All specs target Scout's **default servers config**. No console-specific boot-time args exist.

---

## 8. Deployment targets

Console is a platform plugin available in stateful and all serverless projects. Current FTR coverage: the full suite runs **stateful-only** (`.buildkite/ftr-manifests/ftr_platform_stateful_configs.yml:68`); serverless runs only the 3-case smoke suite (search/oblt group1, security group18 configs). Migration expands serverless coverage.

| Proposed spec | Where it should run | Reasoning |
|--------------|--------------------|-----------|
| `console_core.spec.ts` | everywhere (`tags.deploymentAgnostic`) with 2 stateful-only carve-outs | Core flows are universal. Carve-outs: (a) `POST /_cluster/voting_config_exclusions` (cluster-scope API, not exposed on serverless/Cloud — either move the "200-empty-body shows OK" case to a stateful-only spec or find a deployment-agnostic empty-body-200 request, `NEEDS VERIFICATION`); (b) `GET kbn:/api/spaces/space` asserting `"name": "Default"` should hold everywhere but verify on serverless projects |
| `console_tabs.spec.ts`, `output_filter.spec.ts`, `console_config.spec.ts`, `comments.spec.ts`, `variables.spec.ts`, `load_from_and_history.spec.ts`, `onboarding_tour.spec.ts`, `context_menu.spec.ts`, `copy_as_language.spec.ts`, `keyboard_shortcuts.spec.ts`, `import_export.spec.ts`, `editor_robustness.spec.ts` | everywhere (`tags.deploymentAgnostic`) | Pure client-side console behavior |
| `input_validation.spec.ts` | everywhere, except the two deprecation-warning cases (`GET .kibana`) → stateful-only | Serverless blocks direct system-index access; the deprecation-`#!` warning rendering needs a stateful request. `NEEDS VERIFICATION`: whether a serverless-compatible deprecated API exists to keep the case agnostic |
| `autocomplete.spec.ts` | everywhere (once re-enabled) | Autocomplete is universal; snapshot-repo `fs` template may behave differently on Cloud — the test only types text, never executes, so fine |
| `vector_tile_response.spec.ts` | everywhere | Sample data + `_mvt` available in serverless; `NEEDS VERIFICATION` that `_mvt` endpoint is exposed on serverless projects |
| `api/tests/proxy_route_authz.spec.ts` | stateful only (`tags.stateful.classic`) | Custom Kibana roles/spaces matrix mirrors today's stateful-only API FTR coverage; serverless uses predefined project roles (different authz model). Expanding to serverless custom roles is a separate decision |

### Stateful/serverless mirror FTR files

Mirror-suite discovery performed by basename, `describe` titles (`console app`, `Console App CCS`), `consoleMonacoEditor` usage, and `loadTestFile` references across `x-pack/platform/test/serverless/**`, `x-pack/solutions/*/test/**`, and stateful roots.

| Primary FTR file | Mirror FTR file | Similarity | Current tags/skips | Decision | Notes |
|------------------|-----------------|------------|--------------------|----------|-------|
| `src/platform/test/functional/apps/console/_console.ts` (+ `_context_menu.ts` docs case) | `x-pack/platform/test/serverless/functional/test_suites/console/console.ts` | near-identical (strict subset, serverless side adds `loginAsAdmin` + `esGate` tag) | serverless index tags `esGate` | merge | Tag migrated specs `deploymentAgnostic`; delete serverless file + `index.ts` + 3 config references (`configs/search/config.group1.ts:20`, `configs/observability/config.group1.ts:20`, `configs/security/config.group18.ts:19`) |
| `src/platform/test/functional/apps/console/_console_ccs.ts` | `x-pack/platform/test/stack_functional_integration/apps/ccs/ccs_console.ts` | near-identical (different remote index/archives) | `includeFirefox` | keep both, defer | Both blocked on CCS topology; stack-integration variant out of scope |

No other mirrors found.

### Coverage gaps

- 13 of 14 stateful UI files run only stateful today but the features exist in all serverless projects — migration expands them to serverless via `tags.deploymentAgnostic`.
- Embedded console (`x-pack/solutions/search` embedded_console page object) is a different feature and out of scope.

### Cloud portability issues

| File | Line | Issue |
|------|------|-------|
| `_console.ts` | 254-256 | `POST /_cluster/voting_config_exclusions?node_names=node` — cluster-topology API; unavailable on serverless and likely restricted on ECH. Needs replacement request or stateful-only tag |
| `_xjson.ts` | 117-120 | `GET .kibana` direct system-index access for deprecation warning — restricted on serverless |
| `_context_menu.ts` / `_misc_console_behavior.ts` | 249-270 / 102-123 | Docs tests open external `www.elastic.co` — needs outbound network from the test browser; fine locally and in Cloud CI, but flag as an external dependency (flaky if elastic.co redirects change) |
| `_misc_console_behavior.ts` | 226, 250, 331 | File import/export paths under `REPO_ROOT/target/functional-tests/downloads` — rework to Playwright's download/`setInputFiles` APIs (browser-local, Cloud-safe) |
| `_context_menu.ts`, `_output_panel.ts`, `_variables.ts` | various | Clipboard read/write — handled by `context().grantPermissions(['clipboard-read','clipboard-write'])` (Chromium), already proven in `copy_output.spec.ts` |

---

## 9. FTR test smells

| Smell | File | Lines | Description | Context |
|-------|------|-------|------------|---------|
| Suite fully skipped | `_autocomplete.ts` | 38 | `describe.skip` on the whole file (flaky, #257917) | Migrating it re-enables ~18 dormant tests — needs human sign-off |
| Suite partially skipped | `_autocomplete.ts` | 415 | Inner `describe.skip` "Autocomplete shouldnt trigger within" (flaky, #248964) | Comment-context suppression cases |
| Conditional test logic | `_context_menu.ts` | 60-63, 152-155 | `if (toastText.includes('Write permission denied')) return;` silently passes on clipboard failure | Remove — Scout grants clipboard permissions deterministically |
| Conditional assertions | `_context_menu.ts`, `_output_panel.ts` | 68-72, 97-100, 160-164 / 59-63 | `if (canReadClipboard) { assert }` — assertion skipped when permission missing | Same fix: grant permissions, assert unconditionally |
| Hardcoded timeouts | `_context_menu.ts` | 103, 136, 198 | `common.sleep(1000/300)` waiting for clipboard/UI updates | Replace with Playwright auto-wait / toast waits |
| Hardcoded timeouts | `_misc_console_behavior.ts` | 185, 232, 248, 341, 371 | `sleep(1000)` after import/export/indent | Replace with state-based waits |
| Hardcoded timeouts (systemic) | all files via `sleepForDebouncePeriod` | `console_page.ts:611-615` | Fixed 100-1000ms sleeps to outwait the autocomplete debounce | Needs a deliberate strategy in Scout (e.g. wait for suggest-widget state) rather than sleeps |
| Hardcoded timeout | `_onboarding_tour.ts` | 14, 76-79 | `DELAY_FOR = 1000` + `sleep` after loading | Replace with tour-step visibility waits |
| Retry wrappers | all files | pervasive | `retry.try` / `retry.waitFor` around text assertions | Map to `expect.poll` / web-first assertions |
| UI-based setup/teardown | `_vector_tile.ts` | 20-30, 42-49 | Installs/removes sample data by clicking through Home UI | Use Scout sample-data API service |
| UI-based setup/teardown | `_autocomplete.ts` | 346-358 | Creates/deletes index by typing console requests in before/after | Use ES client (`esClient.index` / `indices.delete`) |
| Missing cleanup | `_autocomplete.ts` | 213-218 | "Dynamic autocomplete" creates `test` index via `POST test/_doc`, never deleted | Add cleanup + unique name |
| Missing cleanup (cluster state) | `_console.ts` | 250-263 | `voting_config_exclusions` mutation never cleared (`DELETE /_cluster/voting_config_exclusions` never called) | Replace request or clean up |
| Onboarding dismissal | every UI file | `before` hooks | `skipTourIfExists()` clicks tour skip | Centralize in navigation helper; verify whether tour auto-shows under Scout at all |
| Shared state across `it`s | `_context_menu.ts` | 114-246 | Default copy-language persisted in localStorage flows across tests (curl → Python → Ruby → PHP), order-sensitive | Make each test set its own starting state |
| Sequential journey as separate `it`s | `_console.ts` | 78-132 | Tabs-navigation `it`s share browser URL state | Merge into one spec with `test.step` |
| Global loading indicator waits | `_console.ts`, `_output_panel.ts`, `_variables.ts`, `_text_input.ts`, `_xjson.ts` | pervasive | `header.waitUntilLoadingHasFinished()` after actions | Replace with output/status-badge waits (`waitForRequestToComplete` pattern) |
| Brittle selector | `console_page.ts` | 649-655 | `span[style*="border-radius"]` for filter-active dot | Needs `data-test-subj` in source (see §6) |
| Brittle selector | `_misc_console_behavior.ts` | 296-301 | `.detected-link` class + raw webdriver actions for Cmd+Click | Monaco-internal; Playwright `click({ modifiers })` simplifies |
| try/catch swallowing | `console_page.ts` | 99 | `find.byClassName('suggest-widget').catch(() => null)` | Intentional presence-check; port carefully so real errors surface |
| Over-privileged execution | serverless `console.ts` | 19-24 | `loginAsAdmin` with TODO #176582 (viewer should suffice on search/oblt) | Documented acceptance; keep admin for cross-project consistency |
| Duplicate tests | `_comments.ts` | 45-150 | 15 data-driven `it`s differing only in payload | Consolidate into table-driven specs with `test.step` |
| Test-generation anti-pattern | `_comments.ts` | 44-49 | `async describe` with `await runTests(...)` generating `it`s (needs eslint-disable) | Straightforward to restructure in Playwright |

---

## 10. Migration batches

### Batch 1: Core + output + validation (quick wins, biggest page-object build-out)

| # | Proposed spec | From FTR file | Complexity | Notes |
|---|--------------|--------------|------------|-------|
| 1 | `console_core.spec.ts` | `_console.ts` (+2 remaining `_output_panel.ts` cases, + shell-view `checkA11y` step from a11y `console.ts`) | complex | Unique index names; voting_config carve-out decision; absorbs serverless mirror cases |
| 2 | `console_tabs.spec.ts` | `_console.ts` (tabs) | simple | URL assertions |
| 3 | `output_filter.spec.ts` | `_output_filter.ts` | simple | Needs `data-test-subj` for active-dot (or a visibility-based locator) |
| 4 | `console_config.spec.ts` | `_settings.ts` + `_misc_console_behavior.ts` (font size, help popover) + config-tab `checkA11y` step from a11y `console.ts` | simple | EuiSwitch helpers; a11y checks folded in as `test.step` blocks (no separate a11y spec) |
| 5 | `comments.spec.ts` | `_comments.ts` | medium | Consolidate data-driven cases |
| 6 | `input_validation.spec.ts` | `_xjson.ts` | medium | `.kibana` deprecation cases stateful-only |
| 7 | `load_from_and_history.spec.ts` | `_text_input.ts` | medium | `gotoWithRequestLoaded` already exists |

- **Human involvement**: `guided` — one decision needed on the voting_config_exclusions replacement and the `.kibana`-deprecation tagging; the rest is mechanical
- **Dependencies**: extends plugin-local `ConsolePage` (editor text, enterText, clear, send, output text, status badge, invalid-syntax marker, tabs, history, config-tab helpers) — created in this batch
- **Blockers**: none

### Batch 2: Menus, clipboard, files, keyboard, variables, tour

| # | Proposed spec | From FTR file | Complexity | Notes |
|---|--------------|--------------|------------|-------|
| 8 | `context_menu.spec.ts` | `_context_menu.ts` | medium | New-tab handling via `context.waitForEvent('page')` |
| 9 | `copy_as_language.spec.ts` | `_context_menu.ts` | complex | Clipboard grants; per-test default-language reset |
| 10 | `keyboard_shortcuts.spec.ts` | `_misc_console_behavior.ts` | medium | `ControlOrMeta` modifiers |
| 11 | `import_export.spec.ts` | `_misc_console_behavior.ts` | medium | Playwright `setInputFiles` + download API instead of REPO_ROOT paths |
| 12 | `variables.spec.ts` | `_variables.ts` | medium | Table + clipboard |
| 13 | `onboarding_tour.spec.ts` | `_onboarding_tour.ts` | medium | Rebuild tour-step waits on visibility, drop class-attribute checks |
| 14 | `vector_tile_response.spec.ts` | `_vector_tile.ts` | medium | Sample-data API service; sequential (global sample data) |

- **Human involvement**: `autopilot` (with batch-1 page object in place); `guided` only if the docs-link external navigation proves flaky in CI
- **Dependencies**: batch 1 `ConsolePage` extensions
- **Blockers**: none

### Batch 3: Autocomplete + robustness (re-enable decision required)

| # | Proposed spec | From FTR file | Complexity | Notes |
|---|--------------|--------------|------------|-------|
| 15 | `autocomplete.spec.ts` | `_autocomplete.ts` | complex | Whole FTR suite is `describe.skip` (#257917); inner comment-context suite also skipped (#248964). Migrating means re-enabling — flake root cause must be assessed first |
| 16 | `editor_robustness.spec.ts` | `_misc_console_behavior.ts` (invalid-request toasts, clickable links, large-content, quote-heavy) + fixture files `large_input.ts`, `quote_heavy_input.ts` | complex | Large payloads via file import; depends on autocomplete visibility helpers |

- **Human involvement**: `hands-on` — decide per skipped case: migrate-and-fix, migrate-skipped with issue link, or drop; typing-debounce strategy needs design (replace `sleepForDebouncePeriod`)
- **Dependencies**: batch 1-2 page object (autocomplete + import helpers)
- **Blockers**: open flake issues #257917, #248964

### Batch 4: API authz

| # | Proposed spec | From FTR file | Complexity | Notes |
|---|--------------|--------------|------------|-------|
| 17 | `api/tests/proxy_route_authz.spec.ts` | `x-pack/platform/test/api_integration/apis/console/feature_controls.ts` | medium | Custom roles via `getApiKeyForCustomRole`; spaces via Scout spaces API service; anonymous-401 case needs unauthenticated request support (`NEEDS VERIFICATION`) |

- **Human involvement**: `guided` (anonymous-request mechanics; confirm stateful-only tagging)
- **Dependencies**: none on batches 1-3
- **Blockers**: none known

### Deferred / out of scope (no batch)

- `_console_ccs.ts` + `src/platform/test/functional/config.ccs.ts` entry: deferred until Scout supports remote-cluster (CCS) topology. FTR file stays.
- `x-pack/platform/test/stack_functional_integration/apps/ccs/ccs_console.ts`: legacy stack-integration; out of scope, untouched.

### Cleanup after all batches pass in CI

- Delete `src/platform/test/functional/apps/console/` files migrated (all except `_console_ccs.ts`, and keep `config.ts`/`index.ts` reduced to the CCS branch) and the manifest entry `src/platform/test/functional/apps/console/config.ts` in `.buildkite/ftr-manifests/ftr_platform_stateful_configs.yml:68` once the directory only serves CCS (or keep it if CCS remains — decide at cleanup: the index currently loads CCS through `config.ccs.ts`, so `apps/console/config.ts` can be removed entirely and `index.ts` trimmed to the CCS branch. `NEEDS VERIFICATION` that `config.ccs.ts` does not depend on `apps/console/config.ts`; it resolves `./apps/console/_console_ccs` directly, so it should not).
- Delete serverless suite (`test_suites/console/`) + 3 config references + `x-pack/platform/test/api_integration/apis/console/` + its manifest entry (`ftr_platform_stateful_configs.yml:386`).
- Delete `src/platform/test/accessibility/apps/console.ts` and its `apps` index entry.
- Audit `src/platform/test/functional/page_objects/console_page.ts` consumers before deletion — `embedded_console.ts` and other suites may import it (`NEEDS VERIFICATION`).

### Scout CI registration (do in the PR that adds the first Scout config)

Required for CI to discover and run the new specs — do once per plugin, and re-run whenever specs or tags change (kapral18, PR #281731 — committing it avoids a later metadata-cleanup PR):

- Add the plugin under `plugins.enabled` (alphabetical) in `.buildkite/scout_ci_config.yml`.
- Regenerate and commit the Scout test-config manifest: `node scripts/scout.js update-test-config-manifests --includingUpToDate --noSummary`. Commit only this plugin's `test/scout/.meta/**`; the command also regenerates other plugins' manifests, so revert that unrelated drift (`git checkout -- <paths>`) before staging.
- Verify discovery finds the config: `node scripts/scout discover-playwright-configs --target local-stateful-only --configs src/platform/plugins/shared/console/test/scout/ui/playwright.config.ts` (expect "Found Playwright config files in 1 plugin(s)").

---

## 11. Effort summary

| Metric | Value |
|--------|-------|
| Total FTR test files analyzed | 18 (+2 fixtures, +4 configs/indexes) |
| > UI tests | 15 files → ~16 Scout specs (a11y checks merged into functional specs as `test.step` blocks; serverless mirror merged) |
| > API tests | 1 (`feature_controls.ts`) |
| > Unit tests (RTL/Jest) | 0 (optional parser follow-up) |
| > Dropped | 1 case (copy output — Scout-covered) + serverless mirror file (merged) |
| > Deferred | 2 (CCS: FTR + stack-integration) |
| New page objects needed | 0 new / 1 large extension of plugin-local `ConsolePage` |
| New API services needed | 0 (spaces + sample-data + custom-role auth exist in kbn-scout) |
| `data-test-subj` additions to source code | 1 required (output-filter active dot), 1 optional (`#importConsoleFile`) |
| Custom server config sets | 0 (Scout default everywhere) |
| Migration batches | 4 (+1 deferred bucket) |

### Risks and open questions

- **`NEEDS VERIFICATION` — voting_config_exclusions**: `POST /_cluster/voting_config_exclusions` (cluster-scope, no cleanup) is used to test "200 + empty body renders OK" (`_console.ts:250-263`). Verify it is rejected on serverless/ECH and pick a deployment-agnostic empty-body-200 replacement, or tag stateful-only and add cleanup.
- **`NEEDS VERIFICATION` — `GET .kibana` deprecation cases** (`_xjson.ts:117-125`): confirm serverless blocks them and whether an agnostic deprecated request exists; default plan is stateful-only carve-out.
- **`NEEDS VERIFICATION` — tour auto-show under Scout**: FTR sets `hideAnnouncements=true` globally, yet every suite defensively calls `skipTourIfExists`. Confirm whether the console tour auto-opens under Scout's default config; port the skip helper regardless.
- **`NEEDS VERIFICATION` — anonymous request via Scout `apiClient`** for the 401 case in `feature_controls.ts`.
- **`NEEDS VERIFICATION` — `_mvt` on serverless** for `vector_tile_response.spec.ts` deployment-agnostic tagging.
- **`NEEDS VERIFICATION` — Jest coverage of the console grammar** (comments/xjson validation) to decide how far to consolidate the marker tests.
- **`NEEDS VERIFICATION` — FTR `console_page.ts` external consumers** (e.g. `embedded_console.ts`) before deleting the FTR page object at cleanup.
- **Human sign-off needed**: re-enabling `_autocomplete.ts` (whole file `describe.skip`, #257917 + #248964). Migrating it as-is would enable ~18 tests that were disabled for flakiness; the debounce-sleep pattern (`sleepForDebouncePeriod`) must be replaced with deterministic waits or the flake will follow the migration.
- **Human sign-off needed**: serverless coverage expansion — migrating stateful-only suites as `deploymentAgnostic` triples their CI surface; agree that's intended (it matches issue #281241's premise).
- **Missing Scout capability blocking deferred tests**: remote-cluster/CCS topology (blocks `_console_ccs.ts`).
