## ADDED Requirements

### Requirement: Compliance rule schema

Each compliance rule SHALL be defined as a saved object of type `endpoint-compliance-rule` with the following fields:

| Field | Type | Required | Description |
|---|---|---|---|
| `rule_id` | keyword | yes | Unique rule identifier (e.g., `cis_macos_15_1_1`) |
| `name` | text | yes | Human-readable rule name |
| `description` | text | yes | What the rule checks |
| `query` | text | yes | Osquery SQL that returns rows when compliant |
| `remediation` | text | yes | How to fix a failing check |
| `benchmark_id` | keyword | yes | Benchmark identifier (e.g., `cis_macos_15`) |
| `benchmark_name` | text | yes | Human-readable benchmark name |
| `benchmark_version` | keyword | yes | Benchmark version (e.g., `v1.0.0`) |
| `rule_number` | keyword | yes | Benchmark-specific rule number (e.g., `1.1`) |
| `section` | keyword | yes | CIS section grouping (e.g., `1 System Preferences`) |
| `level` | integer | yes | CIS Level (1 or 2) |
| `platform` | keyword | yes | Target OS: `darwin`, `windows`, or `linux` |
| `frameworks` | nested | no | Cross-framework mappings: `[{id, version, control}]` |
| `tags` | keyword[] | no | Freeform tags for filtering |
| `enabled` | boolean | yes | Whether this rule is active for evaluation |
| `interval` | integer | yes | Evaluation interval in seconds (default 300) |

#### Scenario: Rule is created with valid schema
- **WHEN** a compliance rule is registered with all required fields populated
- **THEN** the saved object is created and the rule appears in rule listing APIs

#### Scenario: Rule is created with invalid platform
- **WHEN** a compliance rule is registered with `platform` not in `[darwin, windows, linux]`
- **THEN** the system SHALL reject the rule with a validation error

#### Scenario: Rule includes framework cross-mapping
- **WHEN** a rule is created with `frameworks: [{id: 'nist_800_53', version: 'r5', control: 'CM-6'}]`
- **THEN** the framework mapping SHALL be stored and queryable via the rules API

### Requirement: Benchmark metadata

Each benchmark SHALL be represented by a logical grouping derived from the rules' `benchmark_id` field. The system SHALL provide a benchmarks API that aggregates:
- Benchmark ID, name, version
- Total rule count, enabled rule count
- Supported platforms
- CIS levels available

#### Scenario: List available benchmarks
- **WHEN** the user requests `GET /api/endpoint_compliance/benchmarks`
- **THEN** the system SHALL return a list of distinct benchmarks derived from registered rules, with counts of total and enabled rules per benchmark

### Requirement: Muted rules state

The system SHALL support muting individual rules to exclude them from scoring. Muted rules state SHALL be stored in a saved object of type `endpoint-compliance-benchmark-state`, keyed by `benchmark_id + benchmark_version + rule_number`.

#### Scenario: Mute a rule
- **WHEN** the user invokes `POST /api/endpoint_compliance/rules/_bulk_action` with action `mute` and a list of rule identifiers
- **THEN** the rules SHALL be excluded from score calculation but their findings SHALL still be collected

#### Scenario: Unmute a rule
- **WHEN** the user invokes the bulk action with action `unmute`
- **THEN** the rules SHALL be re-included in score calculation

### Requirement: Prebuilt CIS rule packs

The system SHALL ship with prebuilt compliance rule packs for:
- CIS macOS 15 Sequoia (10 rules, Level 1)
- CIS Windows 11 Enterprise (10 rules, Level 1)
- CIS Linux RHEL 9 / Ubuntu 22.04 (10 rules, Level 1)

Each pack SHALL be registered as a set of `endpoint-compliance-rule` saved objects when the feature is first enabled.

#### Scenario: Prebuilt rules are registered on first activation
- **WHEN** the `endpointComplianceMonitoring` feature flag is enabled and Kibana starts
- **THEN** all prebuilt compliance rules SHALL be created as saved objects if they do not already exist

#### Scenario: Prebuilt rules are not duplicated on restart
- **WHEN** Kibana restarts with the feature flag enabled and prebuilt rules already exist
- **THEN** existing rules SHALL NOT be duplicated; only missing rules SHALL be created

### Requirement: Rules management API

The system SHALL provide CRUD+search APIs for compliance rules:
- `GET /api/endpoint_compliance/rules/_find` — paginated search with filters (benchmark_id, platform, section, level, enabled, tags)
- `GET /api/endpoint_compliance/rules/{id}` — get single rule
- `POST /api/endpoint_compliance/rules` — create custom rule
- `PUT /api/endpoint_compliance/rules/{id}` — update rule
- `DELETE /api/endpoint_compliance/rules/{id}` — delete custom rule (prebuilt rules cannot be deleted, only disabled)
- `POST /api/endpoint_compliance/rules/_bulk_action` — mute/unmute/enable/disable in bulk

#### Scenario: Search rules by benchmark and platform
- **WHEN** the user requests `GET /api/endpoint_compliance/rules/_find?benchmark_id=cis_macos_15&platform=darwin`
- **THEN** the system SHALL return only rules matching both filters, paginated

#### Scenario: Prevent deletion of prebuilt rules
- **WHEN** the user attempts to delete a prebuilt compliance rule
- **THEN** the system SHALL reject the request with a 400 error indicating prebuilt rules can only be disabled
