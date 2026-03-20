## ADDED Requirements

### Requirement: Threat Intelligence Integration
The pipeline SHALL enrich extracted entities using available Threat Intelligence feeds before performing case matching.

#### Scenario: Malicious IP detected
- **WHEN** an IP entity is extracted from an alert and matches an active Threat Intel indicator
- **THEN** the pipeline tags the entity as malicious and boosts its weight during case matching.

### Requirement: MITRE ATT&CK Sequence Analysis
The pipeline SHALL correlate alerts based on MITRE ATT&CK tactical progression.

#### Scenario: Lateral movement follows initial access
- **WHEN** multiple alerts occur on the same host representing initial access followed by lateral movement
- **THEN** the pipeline clusters them together even if entity similarity is below the standard threshold.
