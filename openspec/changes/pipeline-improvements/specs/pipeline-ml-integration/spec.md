## ADDED Requirements

### Requirement: ML-driven Behavioral Anomaly Scoring
The pipeline SHALL integrate with Elastic ML to adjust alert risk scores based on user and host behavioral baselines.

#### Scenario: Rare process execution
- **WHEN** an alert is triggered for a process execution
- **THEN** the pipeline queries ML baselines and increases the alert's priority score if the process is exceptionally rare for that host/user combination.
