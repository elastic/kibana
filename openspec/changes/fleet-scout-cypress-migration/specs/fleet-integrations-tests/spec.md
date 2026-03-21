# Spec: Fleet Integrations Tests

## ADDED Requirements

### Requirement: Integration install with real API

The system SHALL allow installing an integration from the Integrations browse page, adding it to an agent policy, and verifying the integration appears in the installed integrations list. Tests SHALL use the real Fleet EPM API (no mocking).

#### Scenario: Install package and add to policy

- **WHEN** a user installs an integration (e.g. Apache) and adds it to an agent policy
- **THEN** the integration is installed
- **AND** the package policy is created and associated with the agent policy
- **AND** the integration appears in the installed integrations list

#### Scenario: Browse integrations with real API

- **WHEN** a user navigates to Integrations
- **THEN** the integration list loads from the real API
- **AND** infinite scroll or pagination loads more integrations as needed
- **AND** search and filter work correctly

---

### Requirement: Integration upgrade (mocked)

The system SHALL support testing package and policy upgrade flows using mocked API responses. Tests SHALL verify upgrade UI and request handling when the API is mocked.

#### Scenario: Upgrade package with mocked API

- **WHEN** the Fleet EPM API is mocked to return upgradeable packages
- **THEN** the user can trigger a package upgrade
- **AND** the upgrade request is sent with the expected parameters

#### Scenario: Upgrade package policy with mocked API

- **WHEN** a package policy has an available upgrade
- **THEN** the user can upgrade the package policy from the UI
- **AND** the upgrade flow completes without errors (against mock)

---

### Requirement: Automatic import integration creation

The system SHALL support automatic import integration creation. Tests SHALL verify that integrations with automatic import can be created and configured correctly.

#### Scenario: Create integration via automatic import

- **WHEN** a user creates an integration that uses automatic import
- **THEN** the integration is created with the expected configuration
- **AND** the integration appears in the appropriate lists

---

### Requirement: Input packages with custom data stream type

The system SHALL support input packages with custom data stream types. Tests SHALL install and configure input test packages, verify pipeline and mapping behavior, and clean up after tests.

#### Scenario: Input package with custom data stream

- **WHEN** a user installs an input package with a custom data stream type
- **THEN** the package installs successfully
- **AND** package policies can be created with the correct data stream configuration

---

### Requirement: Integration packages with OTel

The system SHALL support OpenTelemetry (OTel) input packages. Tests SHALL install the OTel input test package, verify configuration, and uninstall cleanly.

#### Scenario: OTel input package install and uninstall

- **WHEN** a user installs the OTel input test package
- **THEN** the package installs successfully
- **AND** it can be uninstalled without leaving orphaned data

---

### Requirement: Package policy pipelines and mappings

The system SHALL support pipelines and mappings for input and integration packages. Tests SHALL verify that package policies for packages with pipeline/mapping requirements correctly configure ingest pipelines and index mappings.

#### Scenario: Input package pipelines and mappings

- **WHEN** an input package requires custom pipelines or mappings
- **THEN** creating a package policy provisions the pipelines and mappings
- **AND** the package policy settings reflect the correct configuration

#### Scenario: Integration package pipelines and mappings

- **WHEN** an integration package requires custom pipelines or mappings
- **THEN** creating a package policy provisions them correctly
- **AND** packages without dataset names are handled appropriately
