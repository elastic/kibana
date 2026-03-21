# Spec: Scout Defend Workflows Tests

## ADDED Requirements

### Requirement: Scout test directory and layout

The system SHALL provide a Scout test root under `x-pack/solutions/security/test/scout_defend_workflows/` with a UI test layout. The layout SHALL include a Playwright/Scout config (parallel or sequential as appropriate), a `tsconfig.json`, fixtures directory, and test directories (e.g. `parallel_tests/` or `tests/`). Optional `common/` or page-object directories MAY be present for shared helpers.

#### Scenario: Scout root exists and is discoverable

- **WHEN** a developer or CI looks for Defend Workflows Scout tests under Security Solution
- **THEN** the directory `x-pack/solutions/security/test/scout_defend_workflows/` exists and contains at least `ui/` with a Playwright config and a test entry (e.g. example or migrated spec)

#### Scenario: Config is valid for Scout runner

- **WHEN** Scout/Playwright runs tests using the Defend Workflows Scout config
- **THEN** the config loads without error and test discovery succeeds (at least one spec is found)

---

### Requirement: Fixtures and shared utilities

The system SHALL provide fixtures (e.g. constants, base fixtures) and MAY provide shared page objects or common helpers so that migrated specs can reuse authentication, navigation, and endpoint-management patterns consistent with SCOUT_MIGRATION_GUIDE.

#### Scenario: Fixtures are importable

- **WHEN** a Scout spec under `scout_defend_workflows` imports from the suite fixtures
- **THEN** the fixture module resolves and exports at least constants or a base fixture usable in tests

#### Scenario: Shared helpers support endpoint/management flows

- **WHEN** a test needs to navigate to Defend Workflows areas (e.g. endpoint list, policy, response actions)
- **THEN** shared helpers or page objects (if present) support those flows without duplicating Cypress-era logic in each spec

---

### Requirement: Coverage of Defend Workflows domains

The Scout suite SHALL cover Defend Workflows E2E concerns: endpoint management, response actions, artifacts, policy, RBAC, and tamper protection. Coverage MAY be implemented incrementally; the suite SHALL be structured so that specs can be added per domain (e.g. response_actions, policy) without changing the overall layout.

#### Scenario: At least one domain is covered by a migrated or placeholder spec

- **WHEN** the migration is in progress
- **THEN** at least one of endpoint management, response actions, artifacts, policy, RBAC, or tamper protection is covered by a Scout spec (or a clearly named placeholder that will be implemented)

#### Scenario: Specs follow Cypress-to-Scout migration patterns

- **WHEN** Cypress specs are migrated to Scout
- **THEN** the migration follows SCOUT_MIGRATION_GUIDE (selectors, assertions, fixtures, page objects) so behavior is preserved and patterns are consistent across Kibana Scout suites

---

### Requirement: CI integration for Scout Defend Workflows

The system SHALL integrate Scout Defend Workflows into CI so that the suite runs on relevant pipelines (e.g. pull_request Defend Workflows, and optionally serverless). New Buildkite step(s) SHALL invoke the Scout runner for `scout_defend_workflows`; pipeline YAML or pipeline generation SHALL include these steps. Existing Cypress Defend Workflows steps SHALL remain until migration is complete and retirement is agreed.

#### Scenario: Scout step runs in Defend Workflows pipeline

- **WHEN** the Defend Workflows PR pipeline runs (e.g. `defend_workflows.yml`)
- **THEN** a step runs the Scout Defend Workflows suite (stateful and/or serverless as designed) and reports success or failure

#### Scenario: Scout step is path-triggered or keyed

- **WHEN** pipeline logic triggers Defend Workflows jobs (e.g. on changes under `x-pack/solutions/security/test/scout_defend_workflows/` or related app code)
- **THEN** the Scout Defend Workflows step is included so that changes to the Scout suite or Defend Workflows code run the Scout tests

---

### Requirement: Manifest and discoverability

The system SHALL register the Scout Defend Workflows config in the Kibana Scout test-config manifests so that central tooling (e.g. `node scripts/scout.js update-test-config-manifests`, Scout CLI) discovers the suite.

#### Scenario: Manifest includes scout_defend_workflows config

- **WHEN** test config manifests are generated or updated
- **THEN** the Defend Workflows Scout config (under `x-pack/solutions/security/test/scout_defend_workflows/`) is included so that Scout run/listing commands can target it
