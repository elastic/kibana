# Spec: Security Solution Scout Scaffold

## ADDED Requirements

### Requirement: Shared Scout test scaffold for Security Solution

The system SHALL provide a shared Scout test scaffold under `x-pack/solutions/security/test/scout_security_solution/` with fixtures, page objects, API helpers, roles, ES helpers, and tag mapping that support all Security Solution Cypress migration specs. The scaffold SHALL follow SCOUT_MIGRATION_GUIDE patterns and the osquery Scout layout (single tsconfig, common fixtures, page objects).

#### Scenario: Scout root exists and is discoverable

- **WHEN** a developer or CI looks for Security Solution Scout tests
- **THEN** the directory `x-pack/solutions/security/test/scout_security_solution/` exists and contains `ui/` with a Playwright config, fixtures, page objects, common helpers, and test specs

#### Scenario: Config is valid for Scout runner

- **WHEN** Scout/Playwright runs tests using the Security Solution Scout config
- **THEN** the config loads without error and test discovery succeeds for all migrated specs

---

### Requirement: Common fixtures and page objects

The system SHALL provide common fixtures and base page objects that map Security Solution Cypress screens and navigation to Scout/Playwright patterns. Page objects SHALL cover navigation (Security app, detections, alerts, timelines), login/navigation tasks, and shared selectors from Cypress `tasks/` and `screens/`.

#### Scenario: Fixtures are importable

- **WHEN** a Scout spec under `scout_security_solution` imports from the suite fixtures
- **THEN** the fixture module resolves and exports page objects, constants, and shared helpers usable in tests

#### Scenario: Base page objects support Security Solution navigation

- **WHEN** a test needs to navigate to Security Solution areas (alerts, rules, timelines, detections, explore)
- **THEN** shared page objects support those flows without duplicating Cypress-era logic

---

### Requirement: API helpers for Cypress custom tasks

The system SHALL provide Scout API helpers that replicate Security Solution Cypress custom tasks: `esArchiverLoad`, `esArchiverUnload`, and any `esClient` or rule/alert API operations. These helpers SHALL use Scout `kbnClient` or equivalent for Elasticsearch and Kibana API operations.

#### Scenario: esArchiver load/unload is available

- **WHEN** a test needs to load or unload an ES archive (e.g. `ti_indicators_data_single`, `auditbeat_multiple`, `all_users`)
- **THEN** an API helper loads or unloads the archive and refreshes indices as needed

#### Scenario: Rule and alert API helpers are available

- **WHEN** a test needs to create rules, delete alerts, or perform detection API operations
- **THEN** API helpers perform the operations via Kibana/Detection APIs

---

### Requirement: Custom roles mapping

The system SHALL provide KibanaRole definitions that map Security Solution Cypress roles (e.g. `t1_analyst`, `t2_analyst`, `soc_manager`, `rule_author`, read-only variants) to Scout `KibanaRole` definitions usable with `browserAuth.loginWithCustomRole()`.

#### Scenario: Security Solution roles are available

- **WHEN** a test needs to run with a specific Security Solution role (e.g. `securitySolutionRulesV1.read`, `securitySolutionRulesV1.all`)
- **THEN** the corresponding KibanaRole is defined and usable in the Scout fixture

---

### Requirement: Tag strategy for ESS and Serverless

The system SHALL map Cypress `@ess`, `@serverless`, `@skipInEss`, `@skipInServerless`, and `@skipInServerlessMKI` tags to Playwright tags so test selection and filtering work in Scout.

#### Scenario: ESS/Serverless tags are respected

- **WHEN** a test is tagged `@ess` or `@serverless`
- **THEN** Scout/Playwright can filter tests by deployment variant (stateful vs serverless)

#### Scenario: Skip tags exclude tests appropriately

- **WHEN** a test is tagged `@skipInEss` or `@skipInServerless`
- **THEN** the test is excluded from the corresponding deployment run

---

### Requirement: Manifest and discoverability

The system SHALL register the Security Solution Scout config(s) in Kibana Scout test-config manifests so that central tooling (e.g. `node scripts/scout.js update-test-config-manifests`, Scout CLI) discovers the suite.

#### Scenario: Manifest includes Security Solution Scout configs

- **WHEN** test config manifests are generated or updated
- **THEN** the Security Solution Scout config(s) under `x-pack/solutions/security/test/scout_security_solution/` are included so that Scout run/listing commands can target them
