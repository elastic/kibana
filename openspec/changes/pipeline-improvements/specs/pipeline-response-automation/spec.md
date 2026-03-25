## ADDED Requirements

### Requirement: Automated Containment Actions
The pipeline SHALL be capable of triggering SOAR or Elastic Endpoint response actions for high-severity matched cases.

#### Scenario: Ransomware alert containment
- **WHEN** an alert is categorized as ransomware with high confidence
- **THEN** the pipeline automatically issues an endpoint isolation command to the affected host via the Actions Client.
