# FTR to Scout Migration Plan

| Field | Value |
|-------|-------|
| Source | `x-pack/platform/test/api_integration/apis/content_management` |
| Target module root | `src/platform/plugins/shared/content_management` |
| Generated | `2026-06-16` |
| Deployment targets | stateful only (see §8 for expansion notes) |
| FTR config chain | `config.ts` → `x-pack/platform/test/api_integration/config.ts` → `x-pack/platform/test/functional/config.base.ts` → `@kbn/test-suites-src/functional/config.base` |

---

## 1. Test inventory

Sorted by estimated complexity (simple to complex).

| # | FTR file (relative) | Type | Description | `it` count | Complexity | Decision | Justification |
|---|---------------------|------|-------------|-----------|------------|----------|---------------|
| 1 | `index.ts` | index | Loads 3 sub-suites; no shared hooks | — | — | split | Each `loadTestFile` target becomes its own spec |
| 2 | `config.ts` | config | Local FTR config; wraps base api_integration config | — | — | drop | Config artefact — no tests |
| 3 | `helpers.ts` | helper | Creates/destroys custom roles, users; login via basic auth to get cookie | — | — | extract | Converted to a shared auth setup helper in the Scout module |
| 4 | `created_by.ts` | test | Asserts `meta.created_by` field on Dashboard API for non-interactive vs interactive user | 2 | simple | API test | Pure HTTP assertions against REST API; no browser |
| 5 | `updated_by.ts` | test | Asserts `meta.updated_by` field on Dashboard API for various user combos | 3 | medium | API test | Pure HTTP assertions; `beforeEach` creates a dashboard; no browser |
| 6 | `favorites.ts` | test | Asserts favorites API behavior (CRUD, spaces, user isolation, telemetry stats) for both interactive user and error cases | 7 | medium | API test | Pure HTTP assertions against `/internal/content_management/favorites/*`; no browser |

### Proposed file splits (omit if none)

No splitting needed beyond the existing 1:1 FTR→spec mapping.

### Tests to drop (omit if empty)

- `config.ts`: FTR-only wiring artefact; has no test logic.

### Tests to defer (omit if empty)

None — all tests can be migrated in the batches below.

---

## 2. Test type routing

### UI tests

None. All tests are pure HTTP API calls.

### API tests

| FTR file | Proposed spec path | Why API not UI |
|----------|--------------------|----------------|
| `created_by.ts` | `test/scout/api/tests/created_by.spec.ts` | Creates a dashboard via REST, asserts response body fields; no navigation or DOM interaction |
| `updated_by.ts` | `test/scout/api/tests/updated_by.spec.ts` | Creates, updates, and reads a dashboard via REST; no navigation or DOM interaction |
| `favorites.ts` | `test/scout/api/tests/favorites.spec.ts` | All assertions are on `/internal/content_management/favorites/*` response bodies; no navigation or DOM interaction |

### Unit tests (RTL/Jest)

None.

---

## 3. Parallelism plan

### Parallel-safe (can be space-isolated)

| Proposed spec | Why parallel-safe |
|--------------|------------------|
| `created_by.spec.ts` | Creates dashboards scoped to the default space; no global mutations; can run in an isolated space |
| `updated_by.spec.ts` | Creates/updates dashboards scoped to the default space via `beforeEach`; isolated per space |

### Must be sequential

| Proposed spec | Why sequential |
|--------------|---------------|
| `favorites.spec.ts` | The "reports favorites stats" test asserts exact telemetry aggregate counts (`total: 3`, `total_users_spaces: 3`). It explicitly depends on cumulative state left by "can favorite a dashboard". It also calls `esArchiver.emptyKibanaIndex()` in `before` to guarantee a clean Kibana index. These global state requirements make true parallelism unsafe without a significant redesign. |

---

## 4. Test data and setup

### Archives inventory

| Archive path | Contents | Size | Used by (files) | Verdict |
|-------------|----------|------|-----------------|---------|
| `esArchiver.emptyKibanaIndex()` | Wipes entire `.kibana` index | N/A | `favorites.ts:before` | Replace — see below |

`emptyKibanaIndex()` is used in `favorites.ts` to guarantee zero pre-existing favorites before the telemetry stats test. This is a **Cloud portability blocker** (see §8). In Scout, replace with explicit per-test cleanup: after each test, delete favorites via the API, or scope favorites to a freshly created Kibana space that is deleted after the suite.

### UI settings mutations

None.

### Shared constants to extract

| Value | Occurrences | Current locations |
|-------|-------------|-------------------|
| Role `'content_manager_dashboard'` | `helpers.ts`, referenced implicitly via user setup | `helpers.ts:4` |
| Role `'content_reader_dashboard'` | `helpers.ts`, referenced implicitly via user setup | `helpers.ts:5` |
| Users `usersEditor`, `usersReader` | `helpers.ts:6-7`, used in `created_by.ts`, `updated_by.ts`, `favorites.ts` | Extract to shared constants in the Scout module |

The entire `helpers.ts` (role/user lifecycle + interactive login) should become a Scout API test helper at `test/scout/api/helpers/interactive_user.ts`.

### Fresh server required (omit if none)

None — tests use API cleanup rather than needing a fresh server.

---

## 5. Auth and roles

### Role inventory

| Role name | Source | Privileges (summary) | Used by (files) | Notes |
|-----------|--------|---------------------|-----------------|-------|
| `superuser` (FTR default) | `x-pack/platform/test/functional/config.base.ts` | Full cluster + all Kibana features | `created_by.ts`, `updated_by.ts`, `favorites.ts` (non-interactive sections) | Appropriate — these tests specifically verify the _absence_ of profile metadata for non-profile-enabled users |
| `content_manager_dashboard` | `helpers.ts:4,14-22` | `dashboard: all` in spaces `['default','custom']` | `created_by.ts`, `updated_by.ts`, `favorites.ts` | Inline custom role; used to test `created_by`/`updated_by` population |
| `content_reader_dashboard` | `helpers.ts:5,23-31` | `dashboard: read` in spaces `['default','custom']` | `favorites.ts` | Inline custom role; used to verify readers can favorite |

### Over-privileged tests

| File | What it actually exercises | Suggested minimum privilege |
|------|---------------------------|----------------------------|
| All non-interactive sections (`created_by.ts:18`, `updated_by.ts:18`, `favorites.ts:18`) | Creates/reads dashboards or checks favorites rejection | `dashboard: all` (or `dashboard: read`) would suffice; `superuser` is used purely for convenience of the FTR setup, not because the _test_ needs elevated privileges. However since the non-interactive test is deliberately testing "no profile_uid tracking for non-interactive users" (i.e. machine accounts), `superuser` is acceptable to keep. |

### Roles deserving shared helpers (used in ≥3 files)

- `content_manager_dashboard` + `content_reader_dashboard` roles and their associated users are used across all three test files via `helpers.ts`. The `helpers.ts` extraction to `test/scout/api/helpers/interactive_user.ts` covers this.

### Special auth patterns

- **Basic auth session login** (`helpers.ts:72-88`): calls `POST /internal/security/login` with `providerType: 'basic'` to obtain a session cookie, then uses that cookie in subsequent requests. This pattern is possible in Scout's default stateful config because the `cloud-basic` provider (order 1) is still configured alongside SAML. **NEEDS VERIFICATION**: confirm `POST /internal/security/login` with basic credentials still works when the SAML IdP plugin is active (i.e. the selector is disabled and SAML is order 0).

---

## 6. Reusability audit

### FTR services and page objects in use

| FTR name | What it does | Used by (files) | Scout equivalent exists? | Hidden assertions? | Recommended scope |
|----------|-------------|-----------------|-------------------------|-------------------|-------------------|
| `getService('supertest')` | Pre-authenticated HTTP client (elastic/changeme) | All 3 test files | yes — `supertestWithSuperuser` / `apiClient` | no | use existing Scout supertest fixture |
| `getService('supertestWithoutAuth')` | Unauthenticated HTTP client | `helpers.ts`, `created_by.ts`, `updated_by.ts`, `favorites.ts` | yes — Scout `request` fixture (unauthenticated) | no | use existing |
| `getService('security')` | Create/delete roles and users | `helpers.ts` | NEEDS VERIFICATION — Scout API tests provide `samlAuth` for SAML users; creating arbitrary custom users with passwords requires using the security API directly via `supertestWithSuperuser` | no | implement in `interactive_user.ts` helper using security API calls |
| `getService('spaces')` | Create/delete Kibana spaces | `helpers.ts:9` | no direct Scout fixture; use `apiClient` / `supertestWithSuperuser` to call Kibana spaces API (`POST /api/spaces/space`, `DELETE /api/spaces/space/{id}`) | no | implement in `interactive_user.ts` |
| `getService('esArchiver')` | `emptyKibanaIndex()` — wipes `.kibana` | `favorites.ts:before` | no — Cloud portability blocker, must be replaced | no | replace with per-spec cleanup |

### EUI components interacted with directly

None — these are pure API tests.

### Brittle locator strategies

None — these are pure API tests.

### Page objects with hidden assertions

None — these are pure API tests.

---

## 7. Server configuration

### FTR server args (full chain)

| Arg | Source config | Category | Notes |
|-----|-------------|----------|-------|
| `--xpack.security.session.idleTimeout=3600000` | `x-pack/platform/test/api_integration/config.ts` | already in Scout default | present in `kbn-scout` default stateful `base.config.ts` |
| `--telemetry.optIn=true` | `x-pack/platform/test/api_integration/config.ts` | already in Scout default | present in `kbn-scout` default stateful `base.config.ts`; overrides the earlier `--telemetry.optIn=false` that appears in the same file |
| `--server.restrictInternalApis=false` | `x-pack/platform/test/functional/config.base.ts` | already in Scout default | present in `kbn-scout` default stateful `base.config.ts` |
| `--xpack.security.authc.selector.enabled=false` | Scout default | already in Scout default | SAML+basic dual auth configured |
| `xpack.security.authc.api_key.enabled=true` | ES server args | already in Scout default | present in Scout ES server args |
| `path.repo=/tmp/` | ES server args | already in Scout default | not needed by these tests |

All server args needed by this test suite are already covered by Scout's default stateful config set (`kbn-scout/src/servers/configs/config_sets/default`).

### ES server args

None beyond defaults.

### Custom server config needed?

No — all required args are in the default Scout config set.

---

## 8. Deployment targets

| Proposed spec | Where it should run | Reasoning |
|--------------|--------------------|-----------| 
| `created_by.spec.ts` | stateful → expand to deployment-agnostic | Dashboard API exists in serverless; `created_by` field is a platform feature. Currently only in `ftr_platform_stateful_configs.yml`. No inherent stateful-only dependency. |
| `updated_by.spec.ts` | stateful → expand to deployment-agnostic | Same reasoning as `created_by`; pure Dashboard REST API assertions. |
| `favorites.spec.ts` | stateful only (for now) | Two blockers prevent serverless: (1) `esArchiver.emptyKibanaIndex()` requires direct index access unavailable in serverless/Cloud; (2) the telemetry stats test (`/internal/telemetry/clusters/_stats`) — NEEDS VERIFICATION on serverless availability. After fixing the cleanup strategy (see §4), revisit for serverless. |

### Coverage gaps

- `created_by.ts` and `updated_by.ts` currently run **only in stateful** (`ftr_platform_stateful_configs.yml`) but the Dashboard content-management API is available in all serverless projects. These should be tagged `deploymentAgnostic` in Scout.

### Cloud portability issues

| File | Issue |
|------|-------|
| `favorites.ts:before` | `esArchiver.emptyKibanaIndex()` wipes the `.kibana` index directly. This is impossible on Elastic Cloud / serverless where the Kibana index is managed. Must be replaced with API-based cleanup (delete favorites via the favorites API, or isolate the test suite in a dedicated Kibana space that is destroyed after the run). |
| `favorites.ts:"reports favorites stats"` | Calls `/internal/telemetry/clusters/_stats` with `refreshCache: true`. **NEEDS VERIFICATION**: check whether this internal endpoint is available and returns the same payload shape in serverless. |

---

## 9. FTR test smells

| Smell | File | Lines | Description | Impact on migration |
|-------|------|-------|------------|---------------------|
| Sequential journey (shared mutable state across `it` blocks) | `favorites.ts` | ~183 | The `"reports favorites stats"` test explicitly says `// depends on the state from previous test` — it relies on cumulative favorites state created by `"can favorite a dashboard"` | **High** — each Scout spec must be independently runnable. The stats `it` block must either set up its own state from scratch, or be merged into the preceding `it` block. |
| Shared mutable state via `let` + `beforeEach` | `updated_by.ts` | 50–56 | `let createResponse: any` is set in `beforeEach` and read across all three `it` blocks. Individual tests still depend on execution order for their initial state. | **Low** — `beforeEach` resets `createResponse` before each test; tests are already mostly independent. The `any` type should be tightened. |
| Missing cleanup | `created_by.ts`, `updated_by.ts` | various | Dashboards created during tests (both as superuser and as interactive user) are never deleted after each `it`. Over many runs this accumulates orphaned saved objects. | **Low for correctness** (tests don't read back their own state across `it` blocks), but should be fixed in the Scout version with `afterEach` cleanup. |
| Missing cleanup | `favorites.ts` | `before` | Uses `esArchiver.emptyKibanaIndex()` to compensate for missing per-test cleanup of favorites. | **High** — must be replaced (see §4 and §8). |
| Over-broad `before`/`after` scope | All test files | `before`/`after` in each file | User/role lifecycle (create in `before`, delete in `after`) is repeated identically in all three files | **Cosmetic** — extract to a shared `beforeAll`/`afterAll` helper once (already planned via `interactive_user.ts`). |

---

## 10. Migration batches

### Batch 1: `created_by` and `updated_by` (quick wins)

Establish the Scout module scaffold, the shared interactive-user helper, and migrate the two simplest specs.

| # | Proposed spec | From FTR file | Complexity | Notes |
|---|--------------|--------------|------------|-------|
| 1 | `test/scout/api/helpers/interactive_user.ts` | `helpers.ts` | simple | Extracted helper: create/delete roles+users via security API, login via `POST /internal/security/login` |
| 2 | `test/scout/api/tests/created_by.spec.ts` | `created_by.ts` | simple | 2 `it` blocks; uses supertest (superuser) + interactive user helper |
| 3 | `test/scout/api/tests/updated_by.spec.ts` | `updated_by.ts` | medium | 3 `it` blocks; tighten `createResponse` type; add `afterEach` dashboard cleanup |

- **Human involvement**: `autopilot`
- **Dependencies**: Scout module scaffold (generate via `node scripts/scout.js generate`)
- **Blockers**: NEEDS VERIFICATION that `POST /internal/security/login` with `providerName: 'basic'` works under Scout's SAML-first auth config (see §5 special auth patterns)

### Batch 2: `favorites`

Migrate the favorites suite, fixing the sequential dependency and the `emptyKibanaIndex` blocker.

| # | Proposed spec | From FTR file | Complexity | Notes |
|---|--------------|--------------|------------|-------|
| 4 | `test/scout/api/tests/favorites.spec.ts` | `favorites.ts` | medium | 7 `it` blocks; replace `emptyKibanaIndex` with space-based isolation; merge or refactor `"reports favorites stats"` to set up its own state independently |

- **Human involvement**: `guided` — the sequential-journey fix for the telemetry stats test requires a design decision (merge into prior `it`, or set up state independently), and NEEDS VERIFICATION on whether the telemetry endpoint is available in the Scout environment
- **Dependencies**: interactive_user helper from batch 1; space lifecycle helpers
- **Blockers**: `esArchiver.emptyKibanaIndex()` replacement (no blocker if space-isolation approach is chosen); telemetry endpoint verification

---

## 11. Effort summary

| Metric | Value |
|--------|-------|
| Total FTR test files analyzed | 6 (3 tests, 1 helper, 1 index, 1 config) |
| > UI tests | 0 |
| > API tests | 3 |
| > Unit tests (RTL/Jest) | 0 |
| > Dropped | 1 (config.ts) |
| > Deferred | 0 |
| New page objects needed | 0 |
| New API services / helpers needed | 1 (`interactive_user.ts` — role+user lifecycle + basic-auth login) |
| `data-test-subj` additions to source code | 0 |
| Custom server config sets | 0 (default Scout stateful config covers all args) |
| Migration batches | 2 |

### Risks and open questions

1. **NEEDS VERIFICATION** — Will `POST /internal/security/login` with `providerType: 'basic'` succeed under Scout's default stateful config (SAML order 0, basic order 1, selector disabled)? If not, the interactive-user login approach needs an alternative (e.g. use Scout's `samlAuth` to create SAML sessions for pre-seeded users with the right roles, or configure the test server to allow basic auth as the default).
2. **NEEDS VERIFICATION** — Is `/internal/telemetry/clusters/_stats` available and returns `plugins.favorites` in Scout's stateful environment with `--telemetry.optIn=true`? If not, the telemetry stats test must be deferred or removed.
3. **Design decision** — `"reports favorites stats"` in `favorites.ts` has an explicit sequential dependency on prior test state. The migrated spec must either: (a) merge the stats assertion into the end of the `"can favorite a dashboard"` test, or (b) set up its own independent favorite state before asserting. Option (a) is simpler but creates one very large `it`; option (b) is the Scout-idiomatic approach.
4. **Serverless expansion** — `created_by.spec.ts` and `updated_by.spec.ts` have no stateful-only dependencies and should be tagged `deploymentAgnostic` in Scout, adding serverless CI coverage that doesn't exist today. Confirm the Dashboard API version (`2023-10-31`) behaves identically in serverless before enabling.
