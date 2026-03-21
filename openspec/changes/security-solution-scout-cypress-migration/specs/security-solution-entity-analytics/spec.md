# Spec: Security Solution Entity Analytics Scout Tests

## ADDED Requirements

### Requirement: Entity Analytics Scout test coverage

The system SHALL provide Scout tests that cover the Entity Analytics feature in Security Solution: risk score, entity store, asset criticality, privileged user monitoring, and entity flyout. The tests SHALL replicate the behavior of the 15 Cypress specs under `cypress/e2e/entity_analytics/`.

#### Scenario: Entity Store and dashboard are covered

- **WHEN** a Scout spec runs the Entity Analytics dashboard tests
- **THEN** it covers: Entity Store enablement, dashboard load, risk score display, and entity analytics overview

#### Scenario: Entity flyout is covered

- **WHEN** a Scout spec runs the entity flyout tests
- **THEN** it covers: user details flyout, host details flyout, asset criticality display within flyout, and entity detail interactions

#### Scenario: Anomalies dashboard is covered

- **WHEN** a Scout spec runs the anomalies dashboard tests
- **THEN** it covers: Entity Analytics dashboard with anomalies data, anomaly detection display

#### Scenario: Privileged user monitoring is covered

- **WHEN** a Scout spec runs the privileged user monitoring (priv_mon) tests
- **THEN** it covers: priv_mon page, integration onboarding, index onboarding, CSV onboarding, and PUM workflow validation

#### Scenario: Threat hunting page is covered

- **WHEN** a Scout spec runs the threat hunting page tests
- **THEN** it covers: threat hunting page with entity analytics context, ES archive loading (e.g. `all_users`) for test data

#### Scenario: ESS and Serverless support

- **WHEN** Entity Analytics Scout tests run
- **THEN** they support both ESS and Serverless deployments as per current CI structure
