## ADDED Requirements

### Requirement: Canonical skill location and structure
The system SHALL store canonical skill definitions in the `elastic-skill-compiler` repository
under `skills/<skill-id>/` and each skill directory MUST include `SKILL.md`,
`skill.requirements.yaml`, and any referenced assets.

#### Scenario: New canonical skill added
- **WHEN** a new skill is introduced in the canonical repository
- **THEN** the skill directory contains `SKILL.md` and `skill.requirements.yaml` at minimum

### Requirement: Required metadata and IO contracts
The canonical requirements file MUST define `id`, `title`, `owners`, `targets`, `inputs`, and
`outputs` fields to make the skill portable across target generators.

#### Scenario: Canonical requirements parsed
- **WHEN** the compiler parses `skill.requirements.yaml`
- **THEN** it validates the presence of `id`, `title`, `owners`, `targets`, `inputs`, and `outputs`

### Requirement: Behavior expressed as scenarios
The canonical requirements file MUST express behavior as named scenarios with explicit
`when` and `then` statements so evaluation adapters can compile them into target evals.

#### Scenario: Behavior-to-eval mapping
- **WHEN** a requirement includes a scenario with `when` and `then` statements
- **THEN** evaluation adapters generate a corresponding test case for each target
