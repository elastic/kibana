# Tasks: Security Solution Scout Cypress Migration

## PR 1: Scaffold + Cloud Security Posture (2 specs)

### 1.1 Create shared Scout scaffold

- [ ] 1.1.1 Create directory `x-pack/solutions/security/test/scout_security_solution/ui/`
- [ ] 1.1.2 Add `parallel.playwright.config.ts` (or sequential) with Scout config sets for ESS and serverless
- [ ] 1.1.3 Add **single** `tsconfig.json` under `ui/` with kbn_references for `@kbn/scout`, `@kbn/es`, `@kbn/test`, etc.
- [ ] 1.1.4 Add `global.setup.ts` for infrastructure provisioning
- [ ] 1.1.5 Run `node scripts/scout.js update-test-config-manifests` (after `yarn kbn bootstrap`)

### 1.2 Create common fixtures, page objects, API helpers

- [ ] 1.2.1 Create `fixtures/index.ts` extending Scout base fixture (`page`, `browserAuth`, `kbnClient`)
- [ ] 1.2.2 Create `fixtures/page_objects/index.ts` with page object registry
- [ ] 1.2.3 Create shared page objects: `navigation.ts`, `alerts.ts`, `rules.ts`, `timelines.ts` (port from Cypress `tasks/` and `screens/`)
- [ ] 1.2.4 Create `common/constants.ts` (URLs, selectors, `waitForPageReady`, `dismissAllToasts`)

### 1.3 Create common roles

- [ ] 1.3.1 Create `common/roles.ts` with `KibanaRole` definitions for Security Solution roles (`t1_analyst`, `t2_analyst`, `soc_manager`, `rule_author`, `securitySolutionRulesV1.read`, `.all`, `.none`)

### 1.4 Create ES helper utilities

- [ ] 1.4.1 Create `common/es_helpers.ts` with `loadEsArchive(archiveName)` and `unloadEsArchive(archiveName)`
- [ ] 1.4.2 Create `common/api_helpers.ts` with rule/alert helpers: `createRule()`, `deleteAlertsAndRules()`, etc. (port from Cypress `tasks/api_calls/`)

### 1.5 Migrate Cloud Security Posture tests

- [ ] 1.5.1 Migrate `misconfiguration_contextual_flyout.cy.ts` → `tests/cloud_security_posture/misconfiguration_contextual_flyout.spec.ts`
- [ ] 1.5.2 Migrate `vulnerabilities_contextual_flyout.cy.ts` → `tests/cloud_security_posture/vulnerabilities_contextual_flyout.spec.ts`
- [ ] 1.5.3 Add Cloud Security Posture–specific page objects or fixtures if needed

### 1.6 Create CI pipeline for Cloud Security Posture

- [ ] 1.6.1 Add `.buildkite/scripts/steps/functional/cloud_security_posture_scout.sh` (ESS)
- [ ] 1.6.2 Add `.buildkite/scripts/steps/functional/cloud_security_posture_serverless_scout.sh` (serverless)
- [ ] 1.6.3 Wire Scout steps into `cloud_security_posture.yml` (alongside or replacing Cypress)

---

## PR 2: Automatic Import (1 spec, serverless only)

- [ ] 2.1 Add Automatic Import–specific fixtures/constants if needed
- [ ] 2.2 Migrate `automatic_import/feature_essentials.cy.ts` → `tests/automatic_import/feature_essentials.spec.ts`
- [ ] 2.3 Add `security_serverless_automatic_import_scout.sh` and wire into `automatic_import.yml`

---

## PR 3: AI4DSOC (4 specs, serverless only)

- [ ] 3.1 Add AI4DSOC-specific page objects/fixtures (capabilities, navigation)
- [ ] 3.2 Migrate `ai4dsoc/capabilities/access.cy.ts` → `tests/ai4dsoc/capabilities/access.spec.ts`
- [ ] 3.3 Migrate `ai4dsoc/privileges/security_privileges.cy.ts` → `tests/ai4dsoc/privileges/security_privileges.spec.ts`
- [ ] 3.4 Migrate `ai4dsoc/navigation/navigation.cy.ts` → `tests/ai4dsoc/navigation/navigation.spec.ts`
- [ ] 3.5 Migrate remaining AI4DSOC specs (if any)
- [ ] 3.6 Add `security_serverless_ai4dsoc_scout.sh` and wire into `ai4dsoc.yml` (use AI4DSOC server config set)

---

## PR 4: Asset Inventory (4 specs)

- [ ] 4.1 Add Asset Inventory–specific page objects (asset_inventory_page, onboarding flows)
- [ ] 4.2 Migrate `asset_inventory/asset_inventory_page.cy.ts`
- [ ] 4.3 Migrate `asset_inventory/asset_inventory_onboarding_aws.cy.ts`
- [ ] 4.4 Migrate `asset_inventory/asset_inventory_onboarding_azure.cy.ts`
- [ ] 4.5 Migrate `asset_inventory/asset_inventory_onboarding_gcp.cy.ts`
- [ ] 4.6 Add `asset_inventory_scout.sh` and wire into `asset_inventory.yml`

---

## PR 5: AI Assistant (7 specs)

- [ ] 5.1 Add AI Assistant–specific page objects (conversations, prompts, chat)
- [ ] 5.2 Migrate `ai_assistant/conversations.cy.ts`
- [ ] 5.3 Migrate `ai_assistant/shared_conversations.cy.ts`
- [ ] 5.4 Migrate `ai_assistant/prompts.cy.ts`
- [ ] 5.5 Migrate remaining AI Assistant specs
- [ ] 5.6 Add `security_solution_ai_assistant_scout.sh` and `security_serverless_ai_assistant_scout.sh`; wire into `ai_assistant.yml`

---

## PR 6: Entity Analytics (15 specs)

- [ ] 6.1 Add Entity Analytics–specific page objects (entity flyout, dashboard, priv_mon, threat hunting)
- [ ] 6.2 Add ES helper usage for `all_users` archive in threat hunting spec
- [ ] 6.3 Migrate `entity_analytics/dashboard.cy.ts`
- [ ] 6.4 Migrate `entity_analytics/entity_flyout.cy.ts`
- [ ] 6.5 Migrate `entity_analytics/dashboards/entity_analytics/anomalies.cy.ts`
- [ ] 6.6 Migrate `entity_analytics/priv_mon/*.cy.ts` (4 specs)
- [ ] 6.7 Migrate `entity_analytics/threat_hunting/threat_hunting_page.cy.ts`
- [ ] 6.8 Migrate remaining Entity Analytics specs
- [ ] 6.9 Add `security_solution_entity_analytics_scout.sh` and `security_serverless_entity_analytics_scout.sh`; wire into `entity_analytics.yml`

---

## PR 7: Explore (~25 specs)

- [ ] 7.1 Add Explore–specific page objects (hosts, network, users, cases, navigation)
- [ ] 7.2 Migrate `explore/navigation/navigation.cy.ts` (ESS + serverless variants)
- [ ] 7.3 Migrate `explore/cases/connector_options.cy.ts`
- [ ] 7.4 Migrate `explore/inspect/inspect_button.cy.ts`
- [ ] 7.5 Migrate `explore/urls/state.cy.ts`
- [ ] 7.6 Migrate explore hosts, network, users specs
- [ ] 7.7 Add `security_solution_explore_scout.sh` and `security_serverless_explore_scout.sh`; wire into `explore.yml`

---

## PR 8: Rule Management (~46 specs)

- [ ] 8.1 Add Rule Management–specific page objects (rules table, rule details, prebuilt rules, coverage overview, bulk actions)
- [ ] 8.2 Migrate `detection_response/rule_management/rules_table/*.cy.ts`
- [ ] 8.3 Migrate `detection_response/rule_management/rule_details/*.cy.ts`
- [ ] 8.4 Migrate `detection_response/rule_management/rule_actions/bulk_actions/*.cy.ts`
- [ ] 8.5 Migrate `detection_response/rule_management/prebuilt_rules/**/*.cy.ts` (installation, management, upgrade, customization)
- [ ] 8.6 Migrate `detection_response/rule_management/coverage_overview/*.cy.ts`
- [ ] 8.7 Migrate `detection_response/rule_management/maintenance_windows/*.cy.ts`
- [ ] 8.8 Migrate remaining Rule Management specs
- [ ] 8.9 Add Scout steps for: rule_management, prebuilt_rules_management, prebuilt_rules_installation, prebuilt_rules_upgrade, prebuilt_rules_customization (ESS + serverless); wire into `rule_management.yml`

---

## PR 9: Investigations (~59 specs)

- [ ] 9.1 Add Investigations–specific page objects (timelines, threat intelligence, SIEM migrations, dashboards, alerts expandable flyout)
- [ ] 9.2 Add ES helper usage for `ti_indicators_data_*`, `auditbeat_multiple`, and other archives
- [ ] 9.3 Migrate `investigations/timelines/**/*.cy.ts`
- [ ] 9.4 Migrate `investigations/timeline_templates/**/*.cy.ts`
- [ ] 9.5 Migrate `investigations/threat_intelligence/**/*.cy.ts`
- [ ] 9.6 Migrate `investigations/siem_migrations/**/*.cy.ts`
- [ ] 9.7 Migrate `investigations/dashboards/*.cy.ts`, `investigations/data_view/*.cy.ts`
- [ ] 9.8 Migrate `investigations/alerts/**/*.cy.ts`
- [ ] 9.9 Add `security_solution_investigations_scout.sh` and `security_serverless_investigations_scout.sh`; wire into `investigations.yml`

---

## PR 10: Detection Engine (~93 specs)

- [ ] 10.1 Add Detection Engine–specific page objects (rule creation, rule edit, rule gaps, detection alerts, exceptions, alert suppression)
- [ ] 10.2 Add ES helper usage for `auditbeat_multiple` and other archives
- [ ] 10.3 Migrate `detection_engine/rule_creation/**/*.cy.ts`
- [ ] 10.4 Migrate `detection_engine/rule_edit/**/*.cy.ts`
- [ ] 10.5 Migrate `detection_engine/rule_gaps/**/*.cy.ts`
- [ ] 10.6 Migrate `detection_engine/detection_alerts/**/*.cy.ts`
- [ ] 10.7 Migrate `detection_engine/alert_suppression/**/*.cy.ts`
- [ ] 10.8 Migrate `detection_engine/exceptions/**/*.cy.ts`
- [ ] 10.9 Migrate remaining Detection Engine specs (overview, rule_actions, value_lists, etc.)
- [ ] 10.10 Add `security_solution_detection_engine_scout.sh`, `security_serverless_detection_engine_scout.sh`, `*_exceptions_scout.sh`; wire into `detection_engine.yml`

---

## PR 11: (Reserved – Detection Engine continuation if split)

If Detection Engine is too large for one PR, split into sub-PRs (e.g. rule_creation+rule_edit, rule_gaps, detection_alerts, exceptions, etc.). Adjust task numbering accordingly.

---

## PR 12: Defend Workflows (84 specs)

### 12.1 Defend Workflows–specific setup

- [ ] 12.1.1 Add Defend Workflows server config set (endpoint, Fleet server, SAML auth if required)
- [ ] 12.1.2 Replicate SAML auth for Defend Workflows (Scout fixture or config)
- [ ] 12.1.3 Replicate transparent API proxy for endpoint/Fleet API (if used by Cypress)
- [ ] 12.1.4 Add Defend Workflows–specific fixtures and page objects (endpoint list, policy, response actions, artifacts, tamper protection)

### 12.2 Test file migration

- [ ] 12.2.1 Migrate endpoint management specs from `security_solution/public/management/cypress/`
- [ ] 12.2.2 Migrate response actions specs
- [ ] 12.2.3 Migrate artifacts specs (trusted apps, event filters, blocklist)
- [ ] 12.2.4 Migrate policy specs
- [ ] 12.2.5 Migrate RBAC specs
- [ ] 12.2.6 Migrate tamper protection specs
- [ ] 12.2.7 Migrate remaining Defend Workflows specs (84 total)

### 12.3 CI pipeline

- [ ] 12.3.1 Add `defend_workflows_scout.sh` (stateful)
- [ ] 12.3.2 Add `defend_workflows_serverless_scout.sh` (serverless)
- [ ] 12.3.3 Wire Scout steps into `defend_workflows.yml` (replace or run alongside Cypress)

---

## Post-migration (separate change)

- [ ] Deprecate Security Solution Cypress (`security_solution_cypress/`, Defend Workflows `management/cypress/`)
- [ ] Remove Cypress steps from CI pipelines
- [ ] Archive or remove Cypress-specific scripts and configs
