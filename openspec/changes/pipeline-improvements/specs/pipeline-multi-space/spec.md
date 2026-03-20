## ADDED Requirements

### Requirement: Pipeline Multi-Space Processing
The pipeline SHALL dynamically resolve indices and configurations based on the current Kibana space instead of a hardcoded default space index.

#### Scenario: Running pipeline in a non-default space
- **WHEN** the pipeline is triggered from a specific Kibana space (e.g., `spaceId: 'sec-ops'`)
- **THEN** it fetches alerts only from `.alerts-security.alerts-sec-ops` (or equivalent space pattern) and matches cases only within that space.
