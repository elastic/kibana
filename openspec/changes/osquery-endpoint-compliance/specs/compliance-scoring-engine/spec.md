## ADDED Requirements

### Requirement: Periodic score aggregation task

The system SHALL register a Kibana task manager task (`endpoint-compliance:score-aggregation`) that runs every 5 minutes and:
1. Queries the latest findings (deduped by rule.id + host.id)
2. Excludes findings for muted rules
3. Aggregates pass/fail/na counts grouped by: benchmark, section, host
4. Computes score as `passed / (passed + failed) * 100` (not_applicable excluded from denominator)
5. Writes score documents to `logs-endpoint_compliance.scores-default`

#### Scenario: Score is calculated correctly
- **WHEN** a benchmark has 7 passed, 3 failed, and 2 not_applicable findings
- **THEN** the score SHALL be `7 / (7 + 3) * 100 = 70.0`

#### Scenario: Muted rules are excluded from scoring
- **WHEN** 2 of the 3 failed rules are muted
- **THEN** the score SHALL be `7 / (7 + 1) * 100 = 87.5`

#### Scenario: All rules are not_applicable
- **WHEN** all findings for a benchmark on a host are `not_applicable`
- **THEN** the score SHALL be `0` (no meaningful evaluation possible) and the host SHALL be flagged as `evaluation_pending`

### Requirement: Score document schema

Each score document in `logs-endpoint_compliance.scores-default` SHALL contain:

| Field Path | Type | Description |
|---|---|---|
| `@timestamp` | date | When the score was computed |
| `score` | float | Compliance score (0-100) |
| `total_findings` | integer | Total findings evaluated |
| `passed_findings` | integer | Count of passed findings |
| `failed_findings` | integer | Count of failed findings |
| `not_applicable_findings` | integer | Count of NA findings |
| `rule.benchmark.id` | keyword | Benchmark this score is for |
| `rule.benchmark.name` | text | Benchmark display name |
| `rule.benchmark.version` | keyword | Benchmark version |
| `policy_template` | keyword | Always `endpoint_compliance` |
| `host_count` | integer | Number of hosts evaluated |
| `is_enabled_rules_score` | boolean | Whether muted rules were excluded |
| `namespace` | keyword | Kibana space namespace |

This schema mirrors CSP's score index fields for future cross-index compatibility.

#### Scenario: Score document enables trend queries
- **WHEN** the score aggregation task has run for 24 hours
- **THEN** the scores index SHALL contain at least 288 score documents per benchmark (one per 5-minute interval) enabling trend visualization

### Requirement: Per-section score breakdown

The score aggregation task SHALL also compute per-CIS-section scores within each benchmark. These SHALL be stored as nested fields or as separate score documents with a `section` field.

#### Scenario: Section scores identify weakest areas
- **WHEN** the dashboard requests section breakdown for benchmark `cis_macos_15`
- **THEN** the system SHALL return per-section scores sorted by ascending score (worst first), with passed/failed counts per section

### Requirement: Per-host compliance score

The score aggregation task SHALL compute a compliance score per host per benchmark. This enables the "worst-performing hosts" view and per-host drill-down.

#### Scenario: Identify worst-performing hosts
- **WHEN** the dashboard requests the 10 worst-performing hosts for `cis_macos_15`
- **THEN** the system SHALL return hosts sorted by ascending compliance score, with their individual pass/fail counts

### Requirement: Score index template

The system SHALL create an index template for `logs-endpoint_compliance.scores-*` with the score document mapping and an ILM policy (hot 30 days, delete after 90 days).

#### Scenario: Score index is created on feature activation
- **WHEN** the plugin starts with the feature flag enabled
- **THEN** the scores index template and ILM policy SHALL be created if they do not exist
