# Spec: Fleet Scout Test Scaffold

## ADDED Requirements

### Requirement: Shared Scout test scaffold for Fleet plugin

The system SHALL provide a shared Scout test scaffold under `x-pack/platform/plugins/shared/fleet/test/scout/` with fixtures, page objects, API helpers, and roles that support all Fleet Cypress migration specs. The scaffold SHALL extend the existing Scout layout (privileges, browse/copy integrations) and follow SCOUT_MIGRATION_GUIDE patterns.

#### Scenario: Scout root exists and is discoverable

- **WHEN** a developer or CI looks for Fleet Scout tests
- **THEN** the directory `x-pack/platform/plugins/shared/fleet/test/scout/` exists and contains `ui/` with a Playwright config, fixtures, page objects, and test specs

#### Scenario: Config is valid for Scout runner

- **WHEN** Scout/Playwright runs tests using the Fleet Scout config
- **THEN** the config loads without error and test discovery succeeds for all migrated specs

---

### Requirement: Fixtures and shared page objects

The system SHALL provide fixtures and page objects that map Fleet Cypress screens and navigation to Scout/Playwright patterns. Page objects SHALL cover Fleet home, agent list, agent policies, enrollment tokens, uninstall tokens, settings, outputs, integrations, and agent flyout flows.

#### Scenario: Fixtures are importable

- **WHEN** a Scout spec under `fleet/test/scout` imports from the suite fixtures
- **THEN** the fixture module resolves and exports page objects, constants, and shared helpers usable in tests

#### Scenario: Page objects support Fleet navigation

- **WHEN** a test needs to navigate to Fleet areas (agents, policies, settings, enrollment tokens, integrations)
- **THEN** shared page objects support those flows without duplicating Cypress-era logic

---

### Requirement: API helpers for Fleet Cypress custom tasks

The system SHALL provide Scout API helpers that replicate Fleet Cypress custom tasks: `insertDoc`, `insertDocs`, `deleteDocsByQuery`, `installTestPackage`, `uninstallTestPackage`. These helpers SHALL use the Scout `kbnClient` or equivalent for Elasticsearch and Fleet API operations.

#### Scenario: insertDoc and insertDocs are available

- **WHEN** a test needs to create agent docs in `.fleet-agents` or other indices
- **THEN** an API helper inserts one or many documents and refreshes the index

#### Scenario: deleteDocsByQuery is available

- **WHEN** a test needs to clean up agents or other data by query
- **THEN** an API helper deletes documents matching the query and refreshes

#### Scenario: installTestPackage and uninstallTestPackage are available

- **WHEN** a test needs to install or uninstall a test package (e.g. input packages, integration packages from `cypress/packages/`)
- **THEN** API helpers perform the Fleet EPM install/uninstall via the Fleet API

---

### Requirement: Cleanup and setup helpers

The system SHALL provide helpers for `cleanupAgentPolicies`, `deleteAgentDocs`, `unenrollAgent`, `cleanupDownloadSources`, `setupFleetServer`, and `setFleetServerHost` as Scout API or fixture utilities.

#### Scenario: Cleanup helpers prevent test pollution

- **WHEN** a test creates agent policies, agents, or download sources
- **THEN** cleanup helpers remove them in `afterAll`/`afterEach` so subsequent tests start clean

---

### Requirement: Manifest and discoverability

The system SHALL register the Fleet Scout config in Kibana Scout test-config manifests so that central tooling (e.g. `node scripts/scout.js update-test-config-manifests`, Scout CLI) discovers the suite.

#### Scenario: Manifest includes Fleet Scout config

- **WHEN** test config manifests are generated or updated
- **THEN** the Fleet Scout config (under `x-pack/platform/plugins/shared/fleet/test/scout/`) is included so that Scout run/listing commands can target it
