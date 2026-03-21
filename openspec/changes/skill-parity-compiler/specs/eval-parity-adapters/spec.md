## ADDED Requirements

### Requirement: Shared expectation schema
The canonical requirements file MUST expose a shared expectations schema that can be compiled
into cursor-plugin-evals and kbn/evals without loss of scenario intent.

#### Scenario: Expectations compiled to eval frameworks
- **WHEN** the compiler processes canonical expectations
- **THEN** it generates equivalent eval cases for both cursor-plugin-evals and kbn/evals

### Requirement: Target-specific extensions
The adapter SHALL allow target-specific evaluation extensions while preserving shared
expectations as the minimum parity baseline.

#### Scenario: Target extension provided
- **WHEN** a target includes an eval extension field
- **THEN** the adapter merges it with the shared expectations without removing baseline cases

### Requirement: Scenario traceability
Each generated eval case MUST retain a stable identifier that maps back to the canonical
scenario name for reporting and drift detection.

#### Scenario: Eval results reported
- **WHEN** evaluation results are produced in a target framework
- **THEN** the report includes the canonical scenario identifier
