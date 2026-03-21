# Spec: Security Solution Detection Engine Scout Tests

## ADDED Requirements

### Requirement: Detection Engine Scout test coverage

The system SHALL provide Scout tests that cover the Detection Engine in Security Solution: detection alerts, enrichments, rule execution, rule creation, rule edit, rule gaps, exceptions, alert suppression, and value lists. The tests SHALL replicate the behavior of the ~93 Cypress specs under `cypress/e2e/detection_response/detection_engine/`.

#### Scenario: Rule creation is covered

- **WHEN** a Scout spec runs the rule creation tests
- **THEN** it covers: EQL rule creation (including source data overrides, query validation), ES|QL rule creation (creation, query validation, investigation fields), and common creation flows

#### Scenario: Rule edit is covered

- **WHEN** a Scout spec runs the rule edit tests
- **THEN** it covers: ESQL rule edit (with/without suppression), indicator match rule (with/without suppression, DOES NOT MATCH), custom saved query (non-existent saved query)

#### Scenario: Rule gaps are covered

- **WHEN** a Scout spec runs the rule gaps tests
- **THEN** it covers: auto gap fill (platinum user, read-only user), auto gap fill basic license, bulk fill rule gaps, fill all rule gaps, bulk manual rule run

#### Scenario: Detection alerts are covered

- **WHEN** a Scout spec runs the detection alerts tests
- **THEN** it covers: assignments (basic rendering, updating single/bulk assignees, alerts filtering), privileges, status (ESS), missing privileges callout (Detections home, Rule Details, Rules Management), expandable flyout. ES archive: `auditbeat_multiple`

#### Scenario: Alert suppression is covered

- **WHEN** a Scout spec runs the alert suppression tests
- **THEN** it covers: ESQL rule suppression, EQL sequence rule suppression, machine learning rule suppression, suppression window advanced setting

#### Scenario: Exceptions are covered

- **WHEN** a Scout spec runs the exceptions tests
- **THEN** it covers: add/edit exception in rule details flow, shared exception lists (read only ESS, serverless essentials tier access)

#### Scenario: ESS and Serverless support

- **WHEN** Detection Engine Scout tests run
- **THEN** they support both ESS and Serverless, with separate pipeline jobs for detection_engine and detection_engine_exceptions as per current CI
