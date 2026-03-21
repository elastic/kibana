## ADDED Requirements

### Requirement: Target-specific generation
The compiler SHALL generate platform-native artifacts for each target listed in the canonical
requirements file, including `agent-skills-sandbox` and `kibana-agent-builder`.

#### Scenario: Sandbox target enabled
- **WHEN** a canonical skill lists `agent-skills-sandbox` as a target
- **THEN** the compiler emits sandbox-native artifacts to the configured output path

### Requirement: Native constraint enforcement
Sandbox generation MUST use script-based tooling and MUST fail if Kibana-native tool
definitions are referenced; Kibana generation MUST use Agent Builder tool definitions
and MUST fail if script-only tooling is referenced.

#### Scenario: Invalid target tooling detected
- **WHEN** a canonical skill references a tooling type that is not allowed for a target
- **THEN** generation fails with a target-specific validation error

### Requirement: Deterministic outputs and CI check mode
Generators MUST produce deterministic outputs and provide a `--check` mode that fails when
generated artifacts are out of date relative to the canonical spec.

#### Scenario: CI parity verification
- **WHEN** CI runs the generator in `--check` mode
- **THEN** it fails if any generated artifact differs from the canonical source
