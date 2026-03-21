# Design: Security Solution Cypress → Scout Migration

## Context

- **Current state**: Security Solution has 249 Cypress specs in `security_solution_cypress` (main suite) plus 84 specs in Defend Workflows (`security_solution/public/management/cypress/`). Tests are split across 13 team/domain areas, each with its own CI pipeline (e.g. `cloud_security_posture.yml`, `rule_management.yml`, `defend_workflows.yml`). Cypress uses FTR, `esArchiver`/`esClient` tasks, `@cypress/grep` tags (`@ess`, `@serverless`, `@skipInEss`, `@skipInServerless`), and custom roles.
- **Constraint**: Follow SCOUT_MIGRATION_GUIDE; reuse patterns from Osquery Scout migration (single tsconfig, fixtures, page objects, CI).
- **Stakeholders**: Security Solution teams (Cloud Security Posture, AI4DSOC, Asset Inventory, AI Assistant, Entity Analytics, Explore, Rule Management, Investigations, Detection Engine, Defend Workflows).

## Goals / Non-Goals

**Goals:**

- Create a shared Scout scaffold under `x-pack/solutions/security/test/scout_security_solution/` with fixtures, page objects, API helpers, roles, and ES helpers.
- Migrate all 333 specs incrementally via per-team PRs (scaffold + Cloud Security Posture first, then one PR per team).
- Preserve ESS/Serverless deployment variants and tag-based filtering.
- Replicate `esArchiver`/`esClient` as Scout API helpers.
- Replicate SAML auth and transparent API proxy for Defend Workflows.
- One CI pipeline per team, matching current structure.

**Non-Goals:**

- Removing Cypress in this change (deprecation is a separate follow-up).
- Changing product behavior or APIs (test infrastructure only).

---

## Decisions

### 1. Shared scaffold directory structure

**Decision**: Use a single shared Scout root at `x-pack/solutions/security/test/scout_security_solution/` with a flat `ui/` layout. All teams' tests live under this root. Defend Workflows tests live in a subdirectory (e.g. `ui/tests/defend_workflows/`) since they require different infrastructure (SAML, endpoint/Fleet).

```
x-pack/solutions/security/test/scout_security_solution/
├── ui/
│   ├── parallel.playwright.config.ts    # or sequential where needed
│   ├── tsconfig.json                     # SINGLE tsconfig for all tests
│   ├── common/
│   │   ├── api_helpers.ts                # esArchiver, rules, alerts, etc.
│   │   ├── roles.ts                      # KibanaRole definitions
│   │   ├── constants.ts                  # URLs, selectors, waitForPageReady
│   │   └── es_helpers.ts                 # loadArchive, unloadArchive
│   ├── fixtures/
│   │   ├── index.ts                      # Base fixture extending @kbn/scout
│   │   └── page_objects/
│   │       ├── index.ts
│   │       ├── navigation.ts             # Shared Security nav
│   │       ├── alerts.ts
│   │       ├── rules.ts
│   │       ├── timelines.ts
│   │       └── ...                       # Team-specific as needed
│   └── tests/
│       ├── global.setup.ts
│       ├── cloud_security_posture/       # 2 specs
│       ├── automatic_import/             # 1 spec
│       ├── ai4dsoc/                      # 4 specs
│       ├── asset_inventory/              # 4 specs
│       ├── ai_assistant/                 # 7 specs
│       ├── entity_analytics/             # 15 specs
│       ├── explore/                      # ~25 specs
│       ├── rule_management/              # ~46 specs
│       ├── investigations/              # ~59 specs
│       ├── detection_engine/              # ~93 specs
│       └── defend_workflows/             # 84 specs (SAML, endpoint infra)
```

**Rationale**: Single root keeps all Security Solution Scout tests discoverable; per-team subdirs match current CI splits and allow incremental PRs. Osquery lesson: one tsconfig avoids rootDir conflicts.

**Alternative**: Separate `scout_defend_workflows` root (as in defend-workflows migration proposal). Rejected for this change because the proposal consolidates under `scout_security_solution`; Defend Workflows can still have its own config set and CI entry.

### 2. TypeScript project structure: single tsconfig

**Decision**: Use **one** `tsconfig.json` under `scout_security_solution/ui/` that includes all test subdirectories. Do NOT create separate tsconfigs for `cloud_security_posture/`, `rule_management/`, etc.

**Rationale**: Osquery migration discovered that separate TS projects for test subdirectories cause `rootDir` conflicts when tests import shared code from a sibling project. Kibana's `@kbn/ts-projects` and `lint_ts_projects` enforce strict boundaries; a single project avoids "files belong to multiple tsconfig" errors.

### 3. Per-team organization

**Decision**: Each team's specs live in `tests/<team>/` (e.g. `tests/rule_management/`, `tests/detection_engine/`). Team-specific page objects go in `fixtures/page_objects/` with names like `rule_management.ts` or `prebuilt_rules.ts` when not shared. Shared page objects (navigation, alerts, rules, timelines) are used by multiple teams.

**Rationale**: Aligns with current Cypress layout and CI splits; enables parallel development and targeted code review.

### 4. PR strategy

**Decision**:

- **PR 1**: Scaffold + Cloud Security Posture (2 specs). Establishes base structure, common fixtures, API helpers, roles, ES helpers, and first green pipeline.
- **PR 2–11**: One PR per remaining main-suite team, ordered by size (smallest first for early wins): Automatic Import (1), AI4DSOC (4), Asset Inventory (4), AI Assistant (7), Entity Analytics (15), Explore (~25), Rule Management (~46), Investigations (~59), Detection Engine (~93).
- **PR 12**: Defend Workflows (84 specs). Separate because of SAML auth, transparent API proxy, and different plugin location.

**Rationale**: Incremental PRs reduce risk, allow early CI feedback, and match team ownership. Cloud Security Posture is smallest (2 specs) so first PR is minimal.

### 5. Tag strategy

**Decision**: Map Cypress tags to Playwright/Scout tags:

| Cypress Tag            | Scout/Playwright Tag | Meaning                          |
|------------------------|----------------------|----------------------------------|
| `@ess`                 | `ess` or `stateful`  | Run in ESS/stateful only         |
| `@serverless`         | `serverless`        | Run in serverless only           |
| `@skipInEss`          | `skipInEss`         | Exclude from ESS runs            |
| `@skipInServerless`   | `skipInServerless`  | Exclude from serverless runs     |
| `@skipInServerlessMKI`| `skipInServerlessMKI`| Exclude from serverless MKI runs|

Configs or grep filters use these tags so `node scripts/scout.js run --grep @ess` (or equivalent) selects the right subset.

**Rationale**: Preserves current Cypress behavior; allows parallel ESS and serverless pipelines without code duplication.

### 6. ESS/Serverless variants

**Decision**: Use Scout config sets (e.g. `security_solution_ess`, `security_solution_serverless`, `ai4dsoc_serverless`) that map to existing FTR/cli_config equivalents. Each pipeline job runs with the appropriate config set. Tests tagged `@ess` run only in ESS job; `@serverless` only in serverless; untagged run in both where applicable.

**Rationale**: Matches current Cypress `cypress:ess` vs `cypress:serverless` and `cypress:ai4dsoc:serverless`; no new concepts.

### 7. ES helpers (esArchiver / esClient replacement)

**Decision**: Provide Scout API helpers:

- `loadEsArchive(archiveName: string)`: Load an archive (e.g. `ti_indicators_data_single`, `auditbeat_multiple`, `all_users`) via Kibana/ES API. Use `kbnClient` or ES client to ingest archive data.
- `unloadEsArchive(archiveName: string)`: Unload and optionally delete.
- Rule/alert helpers: `createRule()`, `deleteAlertsAndRules()`, etc., ported from Cypress `tasks/api_calls/`.

**Rationale**: Direct replacement for `cy.task('esArchiverLoad', { archiveName })`; tests call helpers in `beforeAll`/`afterAll` instead of Cypress tasks.

### 8. SAML auth for Defend Workflows

**Decision**: Replicate Defend Workflows SAML auth in Scout. Options: (a) use Scout's `samlAuth` or equivalent if available; (b) add a custom auth fixture that performs SAML flow; (c) use a service account or API-based auth if SAML is not required for all tests. Confirm with Defend Workflows team which tests require SAML.

**Rationale**: Defend Workflows Cypress uses SAML for some flows; parity requires equivalent auth in Scout.

### 9. Custom roles

**Decision**: Define `KibanaRole` objects in `common/roles.ts` that mirror Security Solution roles:

- `t1_analyst`, `t2_analyst`, `soc_manager`, `rule_author`
- `securitySolutionRulesV1.read`, `securitySolutionRulesV1.all`, `securitySolutionRulesV1.none`
- Read-only, write, and no-access variants for rules, alerts, timelines

Use `browserAuth.loginWithCustomRole(role)` in fixtures. Port role definitions from Cypress `server/lib/detection_engine/rules/prebuilt_rules/roles` or equivalent.

### 10. Fixture hierarchy

**Decision**: Shared base fixture extends `@kbn/scout` and provides `page`, `browserAuth`, `kbnClient`, and shared page objects. Team-specific fixtures extend the base and add team page objects (e.g. `ruleManagementFixture` extends base and adds `prebuiltRules` page object). Prefer composition over deep inheritance.

### 11. CI pipeline

**Decision**: One Scout step per existing Cypress pipeline. Replace or add:

- `cloud_security_posture_scout.sh` → `cloud_security_posture.yml`
- `security_serverless_automatic_import_scout.sh` → `automatic_import.yml`
- `security_serverless_ai4dsoc_scout.sh` → `ai4dsoc.yml`
- `asset_inventory_scout.sh` → `asset_inventory.yml`
- `security_solution_ai_assistant_scout.sh` / `security_serverless_ai_assistant_scout.sh` → `ai_assistant.yml`
- Similar for entity_analytics, explore, rule_management (including prebuilt sub-jobs), investigations, detection_engine, defend_workflows

Each script runs `node scripts/scout.js run-tests --config <path> --testFiles <team_specs>` (or equivalent). Pipeline YAML keeps same structure; step command switches from Cypress to Scout when migration for that team is complete.

### 12. Transparent API proxy (Defend Workflows)

**Decision**: Replicate transparent API proxy for Defend Workflows if Cypress uses it. Scout server config or global setup must provide equivalent proxy for endpoint/Fleet API calls. Reference Defend Workflows FTR config for exact proxy setup.

---

## Risks / Trade-offs

- **Risk**: 333 specs is large; migration may take many PRs and months.  
  **Mitigation**: Parallel work by team; each team owns its PR; scaffold unblocks everyone.

- **Risk**: ES archive paths and formats may differ between FTR and Scout.  
  **Mitigation**: Reuse same archive files from `x-pack/solutions/security/test/`; helpers adapt loading if needed.

- **Risk**: SAML and endpoint infrastructure in Scout may need custom work.  
  **Mitigation**: Defend Workflows is last PR; leverage existing kbn-scout security configs where possible.

- **Trade-off**: Maintaining Cypress and Scout in parallel increases CI cost.  
  **Mitigation**: Plan Cypress retirement per-team once Scout parity is validated; path-triggered pipelines limit unnecessary runs.

---

## Migration Plan

1. **Scaffold (PR 1)**: Create `scout_security_solution/ui/`, single tsconfig, common fixtures, page objects, API helpers, roles, ES helpers. Add Cloud Security Posture specs (2). Add `cloud_security_posture_scout.sh` and wire into `cloud_security_posture.yml`.
2. **Manifests**: Run `node scripts/scout.js update-test-config-manifests` after adding configs.
3. **Per-team PRs (2–11)**: For each team, add team page objects/fixtures as needed, migrate specs, add Scout CI step, run until green.
4. **Defend Workflows (PR 12)**: Add SAML/auth, proxy, endpoint config; migrate 84 specs; add Scout step to `defend_workflows.yml`.
5. **Retirement**: Once parity validated, deprecate Cypress (separate change).

**Rollback**: Revert Scout CI steps; Cypress remains until retirement.
