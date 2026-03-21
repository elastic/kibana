# Spec: Security Solution Defend Workflows Scout Tests

## ADDED Requirements

### Requirement: Defend Workflows Scout test coverage

The system SHALL provide Scout tests that cover Defend Workflows in Security Solution: endpoint management, response actions, artifacts, policy, RBAC, and tamper protection. The tests SHALL replicate the behavior of the 84 Cypress specs under `security_solution/public/management/cypress/`. The Scout suite SHALL live under the shared Security Solution scaffold (or a dedicated sub-path) and integrate with the existing Defend Workflows CI pipeline.

#### Scenario: Endpoint management is covered

- **WHEN** a Scout spec runs the endpoint management tests
- **THEN** it covers: endpoint list, endpoint details, agent status, fleet integration for endpoints

#### Scenario: Response actions are covered

- **WHEN** a Scout spec runs the response actions tests
- **THEN** it covers: running response actions (e.g. from alerts, endpoint list), action results, response actions form

#### Scenario: Artifacts are covered

- **WHEN** a Scout spec runs the artifacts tests
- **THEN** it covers: trusted applications, event filters, blocklist, and other artifact management

#### Scenario: Policy is covered

- **WHEN** a Scout spec runs the policy tests
- **THEN** it covers: endpoint policy creation, edit, assignment, and policy settings

#### Scenario: RBAC is covered

- **WHEN** a Scout spec runs the RBAC tests
- **THEN** it covers: role-based access for Defend Workflows features, privilege checks for endpoint management

#### Scenario: Tamper protection is covered

- **WHEN** a Scout spec runs the tamper protection tests
- **THEN** it covers: tamper protection enablement, configuration, and related UI

---

### Requirement: Defend Workflows-specific infrastructure

The system SHALL replicate Defend Workflows Cypress infrastructure in Scout: SAML auth (if used), transparent API proxy, and endpoint/Fleet server configuration.

#### Scenario: SAML auth is available for Defend Workflows

- **WHEN** Defend Workflows tests require SAML authentication
- **THEN** Scout config or fixtures support SAML auth equivalent to Cypress `cypress:dw:run` setup

#### Scenario: Transparent API proxy is available

- **WHEN** Defend Workflows tests require API proxy for endpoint/Fleet
- **THEN** Scout server config or global setup provides equivalent proxy or connectivity

#### Scenario: Endpoint/Fleet infrastructure is available

- **WHEN** Defend Workflows Scout tests run
- **THEN** the server config includes Fleet server, endpoint agents, and any Docker/infrastructure needed for Defend Workflows (matching `defend_workflows.sh` / `defend_workflows_serverless.sh`)

---

### Requirement: Defend Workflows CI integration

The system SHALL integrate Defend Workflows Scout into CI so that the suite runs in the Defend Workflows pipeline (stateful and serverless), replacing or running alongside Cypress until migration is complete.

#### Scenario: Scout step runs in Defend Workflows pipeline

- **WHEN** the Defend Workflows PR pipeline runs
- **THEN** a step runs the Scout Defend Workflows suite and reports success or failure

#### Scenario: Pipeline triggers on Defend Workflows changes

- **WHEN** pipeline logic triggers Defend Workflows jobs
- **THEN** the Scout Defend Workflows step is included for changes to the Scout suite or Defend Workflows code
