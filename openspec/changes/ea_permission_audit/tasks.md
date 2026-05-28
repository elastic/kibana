# Tasks

## Status key
- `[ ]` pending
- `[x]` complete
- `[-]` skipped / superseded

---

## Phase 1 — Core audit script (complete)

- [x] **T1** Scaffold directory + CLI entry point (`index.ts`)
  - CLI args: `--kibana-url`, `--es-url`, `--user`, `--password`, `--space`, `--output`, `--headed`
  - Orchestration: setup → seed → probe → correlate → report → cleanup

- [x] **T2** Define 15 personas (`personas.ts`)
  - Each persona: `{ id, name, username, password, roleName, roleDefinition }`
  - `createPersona`: POST role via Kibana API + PUT user via ES native `/_security/user`
  - Covers: no access, read-only, full, per-feature read/no-read/no-write (see proposal matrix)

- [x] **T3** Define endpoints + UI correlation map (`endpoints.ts`)
  - 5 privilege endpoint paths + versions
  - `CORRELATION_MAP`: feature → `{ page, url, presentWhenFalse, absentWhenFalse }` per entry

- [x] **T4** HTTP fetch wrapper (`api.ts`)
  - `adminFetch(url, adminAuth, opts)` — includes `x-elastic-internal-origin: Kibana`
  - `personaFetch(url, username, password, version)` — Basic auth, same internal header

- [x] **T5** Browser probe — API + UI sub-probes (`browser.ts`)
  - Playwright launch (headless/headed)
  - `loginAsPersona`: navigate to `/login`, fill credentials, wait for redirect
  - `fetchAllPrivilegesInBrowser`: call all 5 privilege endpoints via `page.evaluate → fetch`
    (inherits session cookies, satisfies `x-elastic-internal-origin` requirement)
  - `checkCorrelationEntry`: navigate to page, assert present/absent selectors
  - `probeBrowserForPersonas`: loop 15 personas, return `PersonaBrowserResult[]`

- [x] **T6** Correlate results (`correlate.ts`)
  - Input: `Persona[]`, `CorrelationEntry[]`, `PersonaBrowserResult[]`
  - Output: `AuditResult[]` with `{ personaId, featureId, apiResult, uiResult, status }`

- [x] **T7** Report renderer (`report.ts`)
  - **Pending update** — currently dense matrix; see T11 for the trimmed 3-section format

- [x] **T8** Cleanup (`cleanup.ts`)
  - `deleteResource(url, adminAuth, label, needsKbnXsrf)`
  - Deletes roles via Kibana API, users via ES `/_security/user`

---

## Phase 2 — Flyout section + report trim (new)

- [ ] **T9** Seed entity (`seed.ts`)
  - `seedTestEntity(kibanaUrl, esUrl, adminAuth, spaceId)` → creates `ea-audit-test-user`
    1. Create watchlist via `POST /api/entity_analytics/watchlists/` → capture `watchlistId`
    2. Set asset criticality via `PUT /api/asset_criticality/`
       `{ id_field: "user.name", id_value: "ea-audit-test-user", criticality_level: "high_impact" }`
    3. Write risk score doc via ES direct:
       `PUT ${esUrl}/risk-score.risk-score-latest-default/_doc/ea-audit-test-user`
       `{ user.name, user.risk.calculated_score_norm: 85, user.risk.calculated_level: "High", @timestamp }`
    4. Write entity store record via ES direct:
       `PUT ${esUrl}/.entities.v2.latest.security_default/_doc/ea-audit-test-user`
       `{ user.name, entity.attributes.Privileged: true, entity.attributes.watchlists: [watchlistId],`
       `  asset.criticality: "high_impact", entity.risk.calculated_score_norm: 85,`
       `  entity.source: "ea-audit-fixture" }`
  - `cleanupTestEntity(kibanaUrl, esUrl, adminAuth, spaceId, watchlistId)` → reverses all writes

- [ ] **T10** Flyout sub-probe (`browser.ts` — extend existing)
  - `probeFlyoutForPersona(page, kibanaUrl, space, flyoutCorrelationMap)`:
    1. Navigate to EA Home Page
    2. Wait for entity table to load
    3. Find `button[aria-label="Open entity details"]` in the row containing `ea-audit-test-user`
    4. Click it, wait for `[data-test-subj="user-panel-header"]` to appear
    5. For each `FlyoutCorrelationEntry`: check `presentWhenGranted` / `absentWhenDenied` selector
    6. Return `FlyoutCheckResult[]`
  - Skip and record `{ status: "SKIP", reason: "entity store denied" }` for personas where
    `entity_store.has_read_permissions === false`
  - Add `flyoutResults: FlyoutCheckResult[]` to `PersonaBrowserResult`

- [ ] **T11** Trim report to 3-section format (`report.ts` — rewrite)
  - Replace current dense matrix with three separate `EuiBasicTable`-style Markdown tables,
    each with exactly 5 columns:
    - **API**: `Endpoint | Permissions checked | Persona | Access granted | Result`
    - **UI**: `URL | Permissions checked | Persona | Access granted | Result`
    - **Flyout**: `Panel | Permissions checked | Persona | Access granted | Result`
  - Result values: `✅ PASS`, `❌ FAIL`, `⏭ SKIP`
  - Known Gaps section: unchanged (append after the three tables)

- [ ] **T12** Update `correlate.ts` for flyout results
  - Extend `AuditResult` to include `flyoutChecks: FlyoutCheckResult[]`
  - Derive flyout PASS/FAIL/SKIP per panel per persona

- [ ] **T13** Update `cleanup.ts` for entity data
  - Accept `watchlistId` from seed phase
  - Delete entity store doc, risk score doc, asset criticality, watchlist
  - All deletes scoped by `entity.source: ea-audit-fixture` or explicit IDs

- [ ] **T14** Wire seed + flyout into `index.ts`
  - After persona creation, call `seedTestEntity` → capture `watchlistId`
  - Pass flyout correlation map into `probeBrowserForPersonas`
  - Pass `watchlistId` into `cleanupPersonas` / `cleanupTestEntity`
  - Update step labels: `[1/4] Personas`, `[2/4] Seed`, `[3/4] Probe`, `[4/4] Report + Cleanup`

- [ ] **T15** Define flyout correlation map (`endpoints.ts` — extend)
  - `FLYOUT_CORRELATION_MAP: FlyoutCorrelationEntry[]`
  - Each entry: `{ panelLabel, permissionsGate, presentSelector?, absentSelector? }`
  - Entries (verified `data-test-subj` values from source):
    | Panel label | Selector | Present when |
    |---|---|---|
    | Flyout opened | `user-panel-header` | entity store read |
    | Risk score value | `risk-summary-result-score` | risk engine read |
    | Risk inputs | `riskInputs` | risk engine read |
    | Criticality selector | `asset-criticality-selector` | asset crit read |
    | Criticality edit btn | `asset-criticality-change-btn` | asset crit write |
    | Watchlists cell | `entityWatchlistsCell` | watchlists read |
    | Table tab | `SecurityEntityPanelTableTab` | entity store read |
