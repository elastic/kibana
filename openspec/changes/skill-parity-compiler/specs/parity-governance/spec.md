## ADDED Requirements

### Requirement: Ownership and review enforcement
Each canonical skill MUST declare `owners`, and CI MUST validate that a matching CODEOWNERS
entry exists for the canonical skill directory.

#### Scenario: Ownership validation
- **WHEN** CI checks a canonical skill change
- **THEN** it fails if the skill lacks `owners` or a matching CODEOWNERS entry

### Requirement: Parity drift detection
CI MUST run generators in `--check` mode for each target repo and fail if generated artifacts
are out of date with the canonical spec.

#### Scenario: Drift detected in target repo
- **WHEN** generated outputs differ from the canonical spec
- **THEN** the parity check fails and reports the stale artifacts

### Requirement: User-created skill export policy
Kibana MUST provide an export path that converts user-created skills into the canonical
requirements format, and only skills explicitly marked as `parity: required` SHALL be
subject to parity enforcement.

#### Scenario: User skill exported
- **WHEN** a user-created skill is exported for parity
- **THEN** it produces a canonical requirements file with `parity: required` or `parity: optional`
