# FTR to Scout Migration Plan

| Field | Value |
|-------|-------|
| Source | `src/platform/test/functional/apps/discover/group7/_huge_fields.ts` |
| Target module root | `src/platform/plugins/shared/discover` |
| Generated | `2026-05-26` |
| Deployment targets | `both` |
| FTR config chain | `src/platform/test/functional/apps/discover/group7/config.ts` > `src/platform/test/functional/config.base.js` > `src/platform/test/common/config.js` |

---

## 1. Test inventory

Sorted by estimated complexity (simple to complex).

| # | FTR file (relative) | Type | Description | `it` count | Complexity | Decision | Justification |
|---|---------------------|------|-------------|-----------|------------|----------|---------------|
| 1 | `src/platform/test/functional/apps/discover/group7/config.ts` | config | Wires the group7 suite to base functional config | - | - | keep config context | Needed to map role/server/UI-settings inheritance (`readConfigFile('../../../config.base.js')`) |
| 2 | `src/platform/test/functional/apps/discover/group7/index.ts` | index | Loads group7 suites and sets browser size | - | - | no direct migration for this issue | `_huge_fields.ts` can become a standalone Scout spec (no `loadTestFile` dependency) |
| 3 | `src/platform/test/functional/apps/discover/group7/_huge_fields.ts` | test | Verifies virtualized sidebar field rendering with a very large field list | 1 | simple | UI test | Browser-driven scroll/visibility behavior (`field-myvar1050` appears only after scrolling) must remain UI-level |

### Tests to defer

- `src/platform/test/functional/apps/discover/group7/_indexpattern_without_timefield.ts`: out of scope for issue #270754 (separate migration item)
- `src/platform/test/functional/apps/discover/group7/_indexpattern_with_unmapped_fields.ts`: out of scope for issue #270754
- `src/platform/test/functional/apps/discover/group7/_runtime_fields_editor.ts`: out of scope for issue #270754
- `src/platform/test/functional/apps/discover/group7/_search_on_page_load.ts`: out of scope for issue #270754
- `src/platform/test/functional/apps/discover/group7/_request_cancellation.ts`: out of scope for issue #270754
- `src/platform/test/functional/apps/discover/group7/_new_search.ts`: out of scope for issue #270754

---

## 2. Test type routing

### UI tests

| FTR file | Proposed spec path | Key flows covered |
|----------|--------------------|-------------------|
| `src/platform/test/functional/apps/discover/group7/_huge_fields.ts` | `src/platform/plugins/shared/discover/test/scout/ui/parallel_tests/core/huge_fields_sidebar.spec.ts` | Load `huge_fields` archive, select `testhuge*` data view, assert `field-myvar1050` is absent before scrolling and visible after scrolling `fieldToggle-myvar1029` into view |

### API tests

| FTR file | Proposed spec path | Why API not UI |
|----------|--------------------|----------------|
| none | - | N/A |

### Unit tests (RTL/Jest)

| FTR file | Component under test | Proposed test path | What to test |
|----------|---------------------|-------------------|-------------|
| none | - | - | N/A |

---

## 3. Parallelism plan

### Parallel-safe (can be space-isolated)

| Proposed spec | Why parallel-safe |
|--------------|------------------|
| `core/huge_fields_sidebar.spec.ts` | Uses dedicated ES fixture index (`testhuge*`) and per-space UI settings; no cluster-level mutations |

### Must be sequential

| Proposed spec | Why sequential |
|--------------|---------------|
| none | N/A |

---

## 4. Test data and setup

### Archives inventory

| Archive path | Contents | Size | Used by (files) | Verdict |
|-------------|----------|------|-----------------|---------|
| `src/platform/test/functional/fixtures/es_archiver/huge_fields` | `testhuge*` index with many fields for sidebar virtualization | medium | `_huge_fields.ts` | Keep (required for this migration) |

### UI settings mutations

| FTR call | Semantics | Files |
|----------|-----------|-------|
| `kibanaServer.uiSettings.update({ 'timepicker:timeDefaults': ... })` | Merge-only update for default time range | `_huge_fields.ts` (`before`, line ~28) |
| `kibanaServer.uiSettings.unset('timepicker:timeDefaults')` | Cleanup specific setting | `_huge_fields.ts` (`after`, line ~48) |

### Shared constants to extract

Values that appear in ≥2 files and should live in a shared constants file:

| Value | Occurrences | Current locations |
|-------|-------------|-------------------|
| `'src/platform/test/functional/fixtures/es_archiver/huge_fields'` | 2 | `_huge_fields.ts` (`loadIfNeeded`, `unload`) |
| `'testhuge*'` | 2 | `_huge_fields.ts` (`setRoles` index privilege reference in config + data-view selection) |

---

## 5. Auth and roles

### Role inventory

| Role name | Source | Privileges (summary) | Used by (files) | Notes |
|-----------|--------|---------------------|-----------------|-------|
| `kibana_admin` | built-in role via test user role switching in test | Kibana app/admin capabilities | `_huge_fields.ts` | Needed to access Discover and manage runtime state |
| `test_testhuge_reader` | `src/platform/test/functional/config.base.js` (~line 155) | ES read + `view_index_metadata` on `testhuge*` | `_huge_fields.ts` | Narrow index access for this dataset |
| default test roles (`test_logstash_reader`, `kibana_admin`) | `config.base.js` (~line 494) | default user baseline | inherited | `_huge_fields.ts` overrides roles explicitly |

### Over-privileged tests

| File | What it actually exercises | Suggested minimum privilege |
|------|---------------------------|----------------------------|
| `_huge_fields.ts` | Read-only Discover interactions and sidebar scrolling | current role mix is already relatively narrow (`kibana_admin` + `test_testhuge_reader`) |

### Roles deserving shared helpers (used in ≥3 files)

- `kibana_admin` (widely used in group7 and broader Discover FTR suites)

---

## 6. Reusability audit

### FTR services and page objects in use

| FTR name | What it does | Used by (files) | Scout equivalent exists? | Hidden assertions? | Recommended scope |
|----------|-------------|-----------------|-------------------------|-------------------|-------------------|
| `PageObjects.discover.selectIndexPattern` | Selects data view/index pattern | `_huge_fields.ts` | yes (`pageObjects.discover.selectDataView`) | no | use existing shared Scout discover page object |
| `testSubjects.exists` | Boolean existence checks | `_huge_fields.ts` | yes (`locator().isVisible()` / `expect(...).toBeVisible()`) | no | use direct Scout page/testSubj in spec |
| `testSubjects.scrollIntoView` | Scrolls field list to realize virtualized items | `_huge_fields.ts` | yes (`page.testSubj.scrollIntoView`) | no | use direct Scout page/testSubj in spec |
| `security.testUser.setRoles` | Runtime role switching | `_huge_fields.ts` | partial (`browserAuth.*` helpers cover common users) | no | `NEEDS VERIFICATION`: keep role switch via API fixture or use privileged login if `testhuge*` is readable |

### EUI components interacted with directly

| Component | Interaction pattern | Files |
|----------|-------------------|-------|
| Unified field list virtualized sidebar | Scroll to a near-by toggle and assert distant field render state change | `_huge_fields.ts` |

### Brittle locator strategies

| File | Line | Current locator | Target component |
|------|------|----------------|-----------------|
| none | - | Uses stable `data-test-subj` ids (`field-myvar1050`, `fieldToggle-myvar1029`) | N/A |

### Page objects with hidden assertions

| FTR helper | Method | Assertion | File:line |
|-----------|--------|-----------|-----------|
| none in this test | - | - | - |

---

## 7. Server configuration

### FTR server args (full chain)

| Arg | Source config | Category | Notes |
|-----|-------------|----------|-------|
| `xpack.security.enabled=<env>` | `src/platform/test/functional/config.base.js` (~line 30) | already in Scout default | no migration action |
| `--savedObjects.allowHttpApiAccess=false` | `src/platform/test/functional/config.base.js` (~line 40) | already in Scout default/compatible | no migration action |
| `--uiSettings.globalOverrides.hideAnnouncements=true` | `src/platform/test/functional/config.base.js` (~line 49) | runtime-settable / default-compatible | no migration action |
| `--mockIdpPlugin.enabled=false` (local only) | `src/platform/test/functional/config.base.js` (~line 53) | environment-specific | unrelated to this spec |

### ES server args

| Arg | Source config | Notes |
|-----|-------------|-------|
| `xpack.security.enabled=<env>` | `src/platform/test/functional/config.base.js` (~line 30) | standard functional-test arg |

---

## 8. Deployment targets

| Proposed spec | Where it should run | Reasoning |
|--------------|--------------------|-----------|
| `core/huge_fields_sidebar.spec.ts` | everywhere | Platform Discover behavior without serverless-only blockers; should use `tags.deploymentAgnostic` via `DISCOVER_CORE_TAGS` |

### Cloud portability issues

Non-portable assumptions found in FTR tests:

| File | Line | Issue |
|------|------|-------|
| none | - | No localhost/file-path/topology assumptions in `_huge_fields.ts` |

---

## 9. FTR test smells

| Smell | File | Lines | Description | Context |
|-------|------|-------|------------|---------|
| Over-privileged (minor) | `_huge_fields.ts` | ~25 | Uses `kibana_admin` where read-only Discover login may be sufficient | Likely retained for simplicity and parity with existing role model |
| Missing explicit post-test data-view cleanup (minor) | `_huge_fields.ts` | ~49 | Uses broad `cleanStandardList()` rather than targeted cleanup | Acceptable but should stay scoped in Scout space cleanup |

---

## 10. Migration batches

### Batch 1: Quick wins

Simple tests, all dependencies exist, no new abstractions needed.

| # | Proposed spec | From FTR file | Complexity | Notes |
|---|--------------|--------------|------------|-------|
| 1 | `core/huge_fields_sidebar.spec.ts` | `_huge_fields.ts` | simple | Reuses existing Discover Scout page object + testSubj locators |

- **Human involvement**: `guided` (needs one auth decision about runtime role handling)
- **Dependencies**: none
- **Blockers**: none

---

## 11. Effort summary

| Metric | Value |
|--------|-------|
| Total FTR test files analyzed | `1` (target) + `2` support files (`index.ts`, `config.ts`) |
| > UI tests | `1` |
| > API tests | `0` |
| > Unit tests (RTL/Jest) | `0` |
| > Dropped | `0` |
| > Deferred | `6` (other `group7` files, out of issue scope) |
| New page objects needed | `0` (`0` shared, `0` plugin-local) |
| New API services needed | `0` |
| `data-test-subj` additions to source code | `0` |
| Custom server config sets | `0` new / `0` reuse existing |
| Migration batches | `1` |

### Risks and open questions

- `NEEDS VERIFICATION`: best Scout auth approach for this spec — keep explicit role switching equivalent to FTR (`kibana_admin` + `test_testhuge_reader`) vs `browserAuth.loginAsAdmin()` if index access is already sufficient.
- Confirm CI tagging intent: FTR currently runs in platform **stateful** manifest only (`.buildkite/ftr-manifests/ftr_platform_stateful_configs.yml`); migration target is deployment-agnostic unless product owners require stateful-only parity.
