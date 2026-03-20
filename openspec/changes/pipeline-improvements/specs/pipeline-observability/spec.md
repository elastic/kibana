## ADDED Requirements

### Requirement: Pipeline Audit Logging
The pipeline SHALL log all significant actions (case creation, alert attachment) to the Kibana Audit log.

#### Scenario: Pipeline creates a case
- **WHEN** the pipeline creates a new case for unmatched alerts
- **THEN** an audit event is recorded indicating the system user created the case, including the case ID and attached alert IDs.

### Requirement: Health Alerting
The system SHALL trigger alerts if the pipeline fails consecutively or exceeds processing time thresholds.

#### Scenario: Pipeline is stuck
- **WHEN** the pipeline task execution time exceeds the configured maximum threshold
- **THEN** a health alert is generated and sent to the configured Kibana monitoring endpoint.
