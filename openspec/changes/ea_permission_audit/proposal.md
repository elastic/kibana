## Why

Entity Analytics exposes multiple feature surfaces — Home Page, Management Page, Explore pages
(Hosts/Users Risk tabs), and the Entity Flyout — each gated by different combinations of
Elasticsearch index privileges and cluster privileges. There is currently no single artifact
that documents which privilege grants result in which UI states across all of these surfaces.

This creates a blind spot when onboarding customers with restrictive RBAC setups, debugging
permission-related support tickets, and verifying that new features properly degrade when
privileges are reduced.

A one-time, locally-executable audit script calls privilege-check API endpoints as a set of
purpose-built test personas, checks key `data-test-subj` elements via a headless browser, and
opens a seeded entity's flyout to verify what each persona can see inside it. The result is a
compact three-section Markdown report: **API**, **UI**, and **Flyout**.

## What Changes

A standalone script at `scripts/entity_analytics_permission_audit/` orchestrates:

1. **Setup** — creates 15 test roles + users via the Elasticsearch native security API (admin
   credentials via `--es-url`).
2. **Seed** — writes a synthetic user entity (`ea-audit-test-user`) with full data across
   four surfaces: entity store record, risk score, asset criticality, and a watchlist. This
   gives the flyout probe something real to check. Seeded data is tagged (`entity.source:
   ea-audit-fixture`) for safe cleanup.
3. **Browser Probe** — for each persona, launches headless Chromium (Playwright), logs in via
   `/login`, and runs two sub-probes in the same browser session:
   - **API sub-probe** — calls each privilege endpoint from within the browser's authenticated
     session (`page.evaluate → fetch`), capturing `has_read_permissions` / `has_write_permissions`.
   - **UI sub-probe** — navigates to each target page and asserts `data-test-subj` presence
     or absence per the correlation map.
4. **Flyout sub-probe** — for personas that have entity store read, navigates to the EA Home
   Page, clicks the "Open entity details" expand button on the `ea-audit-test-user` row, and
   checks each flyout panel against the flyout correlation map.
5. **Correlate** — merges API + UI + flyout observations into `PASS / FAIL / SKIP` per
   persona × feature.
6. **Report** — renders a single Markdown file with **three trimmed tables** (5 columns each):
   API section, UI section, Flyout section.
7. **Cleanup** — deletes all test roles, users, and seeded entity data (runs in `finally`).

## Capabilities

### New Capabilities

- `ea-permission-audit`: A runnable Node.js/Playwright script that produces a compact,
  three-section Markdown permissions audit report for all Entity Analytics features.

### Modified Capabilities

- **Report format** — trimmed from a dense multi-column matrix to three focused 5-column
  tables: `Endpoint / URL / Panel | Permissions | Persona | Access granted | Result`.

## Privilege Surfaces Covered

### Endpoints probed (5 total)

| Privilege endpoint                                | Feature area                    |
|---------------------------------------------------|---------------------------------|
| `GET /internal/risk_score/engine/privileges`      | Risk Score / Risk Engine        |
| `GET /internal/security/entity_store/check_privileges` | Entity Store (V2)          |
| `GET /api/entity_analytics/watchlists/privileges` | Watchlists                      |
| `GET /internal/entity_analytics/leads/privileges` | Lead Generation (Leads panel)   |
| `GET /internal/asset_criticality/privileges`      | Asset Criticality               |

### Index patterns and privilege types per feature

| Feature            | Index pattern                               | Privilege types checked              |
|--------------------|---------------------------------------------|--------------------------------------|
| Leads              | `.internal.*entity-leads-*`                 | `read`, `write`                      |
| Watchlists         | `.entity_analytics.watchlists.<namespace>`  | `read`, `write`                      |
| Asset Criticality  | `.asset-criticality.asset-criticality-*`    | `read`, `write`                      |
| Risk Score (index) | `risk-score.risk-score-*`                   | `read`, `write`                      |
| Risk Engine        | (same + cluster)                            | `manage_transform`, `manage_index_templates`, `manage_ingest_pipelines` |
| Entity Store       | `.entities.*`, `.entities.v1.updates.*`     | `read`, `manage`                     |
| Entity Store (src) | all security data view source indices       | `read`, `view_index_metadata`        |
| Entity Store       | (cluster)                                   | `manage_index_templates`, `manage_transform`, `manage_ingest_pipelines`, `manage_enrich` |

## Test Personas (15 total)

| ID  | Name                    | Privilege profile                                           |
|-----|-------------------------|-------------------------------------------------------------|
| P1  | `no_ea_access`          | Kibana feature only — no ES index/cluster grants            |
| P2  | `read_all`              | `read` on all EA indices, no write, no cluster privs        |
| P3  | `full_all`              | `read+write` on all EA indices + all required cluster privs |
| P4  | `entity_store_no`       | `full_all` minus entity store indices                       |
| P5  | `entity_store_read`     | `full_all`, entity store: `read+view_index_metadata` only   |
| P6  | `risk_score_no`         | `full_all` minus `risk-score.risk-score-*`                  |
| P7  | `risk_score_read`       | `full_all`, risk score: `read` only                         |
| P8  | `watchlists_no`         | `full_all` minus watchlists index                           |
| P9  | `watchlists_read`       | `full_all`, watchlists: `read` only                         |
| P10 | `leads_no`              | `full_all` minus leads index                                |
| P11 | `leads_read`            | `full_all`, leads: `read` only                              |
| P12 | `asset_crit_no`         | `full_all` minus asset criticality index                    |
| P13 | `asset_crit_read`       | `full_all`, asset criticality: `read` only                  |
| P14 | `no_manage_transform`   | `full_all`, cluster: no `manage_transform`                  |
| P15 | `no_enable_cluster`     | `full_all`, cluster: no `manage_index_templates` / `manage_ingest_pipelines` |

All personas are granted the Kibana feature privilege `siem: all` as a precondition.

## Report Format (3 sections, 5 columns each)

### Section 1 — API

| Endpoint | Permissions checked | Persona | Access granted | Result |
|----------|---------------------|---------|----------------|--------|
| `/internal/risk_score/engine/privileges` | `read`, `write` | `read_all` | `read` | PASS |

### Section 2 — UI

| URL | Permissions checked | Persona | Access granted | Result |
|-----|---------------------|---------|----------------|--------|
| `/app/security/entity_analytics_home_page` | `entity_store.read` | `no_ea_access` | denied | PASS |

### Section 3 — Flyout

| Panel | Permissions checked | Persona | Access granted | Result |
|-------|---------------------|---------|----------------|--------|
| `risk-summary-result-score` visible | `risk_engine.read` | `risk_score_no` | denied | PASS |
| `asset-criticality-change-btn` present | `asset_crit.write` | `asset_crit_read` | read only | PASS |
| `entityWatchlistsCell` visible | `watchlists.read` | `watchlists_no` | denied | PASS |

**Result values**: `PASS` (observed matches expected), `FAIL` (mismatch), `SKIP` (flyout
unreachable — entity store denied for this persona).

## Feature → Expected UI Behavior Correlation Maps

### UI Correlation Map

| Feature | Permissions gate | Expected state | Element present | Element absent |
|---------|-----------------|----------------|-----------------|----------------|
| EA Home: full page blocked | `entity_store.has_read=false` | NoPrivileges page | `noPrivilegesPage` | `entityAnalyticsHomePage` |
| EA Home: risk callout | `risk_engine` missing read | Callout shown | `callout-missing-risk-engine-privileges` | — |
| EA Home: leads panel hidden | `leads.has_read=false` | Panel absent | — | `topThreatHuntingLeads` |
| EA Mgmt: missing privs callout | `entity_store.has_all=false` | Callout shown | `callout-missing-privileges-callout` | — |
| EA Mgmt: Engine Status tab | `entity_store.has_all=false` | Tab absent | — | `engineStatusTab` |
| EA Mgmt: Clear Entity Data btn | `entity_store.has_all=false` | Button absent | — | `clear-entity-data-button` |
| Watchlists: no read callout | `watchlists.has_read=false` | Callout shown | `callout-missing-privileges-callout` | — |
| Watchlists: Create btn disabled | `watchlists.has_write=false` | Button disabled | `watchlistsTabCreateButton[disabled]` | — |
| Asset Criticality: no write | `asset_crit.has_write=false` | Uploader hidden | `asset-criticality-insufficient-privileges` | — |
| Explore → Hosts → Risk tab | `risk_engine` missing read | Tab replaced | `callout-missing-risk-engine-privileges` | — |
| Explore → Users → Risk tab | `risk_engine` missing read | Tab replaced | `callout-missing-risk-engine-privileges` | — |

### Flyout Correlation Map

Flyout probe navigates to EA Home Page and clicks `button[aria-label="Open entity details"]`
on the `ea-audit-test-user` row. Skipped for personas where entity store read is denied.

| Panel / element | Permissions gate | Visible when | Element |
|-----------------|-----------------|--------------|---------|
| Flyout opened | `entity_store.read` | always (if reached) | `user-panel-header` |
| Risk score value | `risk_engine.read` | granted | `risk-summary-result-score` |
| Risk inputs section | `risk_engine.read` | granted | `riskInputs` |
| Asset criticality selector | `asset_crit.read` | granted | `asset-criticality-selector` |
| Asset criticality edit btn | `asset_crit.write` | granted | `asset-criticality-change-btn` |
| Watchlists cell | `watchlists.read` | granted | `entityWatchlistsCell` |
| Table tab (full doc) | `entity_store.read` | granted | `SecurityEntityPanelTableTab` |

## Seed Entity (`ea-audit-test-user`)

Created in the **seed phase** using admin credentials before personas are probed.
Cleaned up in the **cleanup phase** after all probes complete.

| Data surface | How seeded | Index / API |
|--------------|------------|-------------|
| Entity store record | ES `/_doc` direct write | `.entities.v2.latest.security_default` |
| Risk score | ES `/_doc` direct write | `risk-score.risk-score-latest-default` |
| Asset criticality | Kibana API | `PUT /api/asset_criticality/` |
| Watchlist + membership | Kibana API | `POST /api/entity_analytics/watchlists/` |

Entity store document includes: `entity.attributes.Privileged: true`, `asset.criticality:
high_impact`, `entity.risk.calculated_score_norm: 85`, `entity.source: ea-audit-fixture`
(tag used to scope deletion safely).

## Known Gaps

- `WatchlistFilter` on the EA Home Page header renders without a privilege pre-check. If the
  user lacks `read` on the watchlist index, the dropdown call fails silently. No `data-test-subj`
  to assert against — documented in report only.
- The entity store transform may overwrite the seeded `ea-audit-test-user` document during its
  scheduled run. The seed is written immediately before probing; the ~4 minute audit window
  is short enough that this race is unlikely in practice.

## Impact

- New/updated files in `scripts/entity_analytics_permission_audit/`:
  - `index.ts` — orchestration (setup → seed → probe → report → cleanup)
  - `personas.ts` — 15 role + user definitions
  - `endpoints.ts` — 5 privilege URLs + UI correlation map + flyout correlation map
  - `api.ts` — fetch wrapper (admin + per-persona Basic auth)
  - `browser.ts` — Playwright: login, API sub-probe, UI sub-probe, flyout sub-probe
  - `seed.ts` — **new**: create/delete `ea-audit-test-user` across four data surfaces
  - `correlate.ts` — merge API + UI + flyout results into unified status
  - `report.ts` — **updated**: three 5-column tables (API / UI / Flyout)
  - `cleanup.ts` — delete personas + seeded entity data
- Requires running Kibana (`--kibana-url`) and Elasticsearch (`--es-url`, default `localhost:9200`).
- Estimated run time: ~6–10 minutes (15 personas × page navigations + flyout per persona).

## Run Command

```bash
node --require @kbn/babel-register/install \
  scripts/entity_analytics_permission_audit/index.ts \
  --kibana-url http://localhost:5601 \
  --es-url http://localhost:9200 \
  --user elastic \
  --password changeme \
  --space default \
  --output entity_analytics_permissions_audit.md \
  --headed   # optional: show browser windows
```

## Out of Scope

- CI integration (one-time developer audit, not a recurring check)
- Privilege monitoring, detection engine, or non-EA features
- Testing Kibana feature privilege tier (`siem`, `securitySolution`) — treated as a precondition
- Seeding real alert data for the Entity Insights / CSP section of the flyout
