## ADDED Requirements

### Requirement: Finding evaluation from osquery results

The finding evaluator service SHALL consume osquery scheduled query results from the `logs-osquery_manager.results-*` data stream and produce compliance findings in the `logs-endpoint_compliance.findings-default` data stream.

Evaluation logic:
- Query returned **one or more rows** → `result.evaluation: 'passed'`
- Query returned **zero rows** → `result.evaluation: 'failed'`
- Query errored or table not available → `result.evaluation: 'not_applicable'`

#### Scenario: Compliant host produces passed finding
- **WHEN** an osquery scheduled compliance query returns one or more rows for a host
- **THEN** the evaluator SHALL write a finding with `result.evaluation: 'passed'` to the findings index

#### Scenario: Non-compliant host produces failed finding
- **WHEN** an osquery scheduled compliance query returns zero rows for a host
- **THEN** the evaluator SHALL write a finding with `result.evaluation: 'failed'` to the findings index

#### Scenario: Unavailable table produces not_applicable finding
- **WHEN** an osquery scheduled compliance query errors because the required virtual table is not available on the host's OS or osquery version
- **THEN** the evaluator SHALL write a finding with `result.evaluation: 'not_applicable'` to the findings index

### Requirement: Finding document schema

Each finding document in `logs-endpoint_compliance.findings-default` SHALL contain:

| Field Path | Type | Description |
|---|---|---|
| `@timestamp` | date | Time the evaluation occurred |
| `result.evaluation` | keyword | `passed`, `failed`, or `not_applicable` |
| `result.evidence` | object | Raw osquery result data (first 10 rows) |
| `rule.id` | keyword | Compliance rule ID |
| `rule.name` | text | Rule name |
| `rule.description` | text | Rule description |
| `rule.remediation` | text | Remediation guidance |
| `rule.benchmark.id` | keyword | Benchmark ID (e.g., `cis_macos_15`) |
| `rule.benchmark.name` | text | Benchmark display name |
| `rule.benchmark.version` | keyword | Benchmark version |
| `rule.benchmark.rule_number` | keyword | Rule number within benchmark |
| `rule.benchmark.posture_type` | keyword | Always `endpoint` |
| `rule.section` | keyword | CIS section grouping |
| `rule.level` | integer | CIS level (1 or 2) |
| `rule.frameworks` | nested | Framework cross-mappings |
| `rule.tags` | keyword[] | Rule tags |
| `host.id` | keyword | Host identifier |
| `host.name` | keyword | Hostname |
| `host.os.family` | keyword | OS family |
| `host.os.name` | keyword | OS name |
| `host.os.version` | keyword | OS version |
| `host.os.platform` | keyword | Platform (darwin, windows, linux) |
| `agent.id` | keyword | Elastic Agent ID |
| `agent.type` | keyword | Agent type |
| `agent.version` | keyword | Agent version |
| `resource.type` | keyword | Always `endpoint_configuration` |
| `resource.sub_type` | keyword | Check category (e.g., `encryption`, `firewall`) |
| `data_stream.dataset` | keyword | `endpoint_compliance.findings` |
| `data_stream.namespace` | keyword | Namespace |
| `data_stream.type` | keyword | `logs` |

This schema is deliberately aligned with CSP's `CspFinding` field structure.

#### Scenario: Finding contains full rule metadata
- **WHEN** a compliance evaluation produces a finding
- **THEN** the finding document SHALL embed the complete rule metadata (benchmark, section, rule_number, frameworks) so that findings are self-contained and queryable without joining to the rules saved objects

#### Scenario: Finding contains host context
- **WHEN** a compliance evaluation produces a finding
- **THEN** the finding document SHALL include `host.id`, `host.name`, `host.os.*`, `agent.id`, and `agent.version` from the originating agent

### Requirement: Finding deduplication via transform

The system SHALL maintain an ES transform that produces a "latest findings" alias containing only the most recent evaluation per (rule.id, host.id) pair. The transform destination SHALL be `endpoint_compliance.findings_latest-default`.

#### Scenario: Multiple evaluations for same rule and host
- **WHEN** the same compliance rule is evaluated on the same host at 10:00 and 10:05
- **THEN** the latest findings alias SHALL contain only the 10:05 evaluation

#### Scenario: Dashboard queries use latest findings
- **WHEN** the compliance dashboard or scoring engine queries findings
- **THEN** it SHALL query the latest findings alias, not the raw findings data stream, to avoid counting stale evaluations

### Requirement: Index template and ILM

The system SHALL create:
- An index template for `logs-endpoint_compliance.findings-*` with the finding document mapping
- An ILM policy with: hot tier (7 days), warm tier (23 days), delete after 30 days
- A data view `logs-endpoint_compliance.findings*` with `@timestamp` as time field

#### Scenario: Indices are created on feature activation
- **WHEN** the `endpointComplianceMonitoring` feature flag is enabled and the plugin starts
- **THEN** the index template, ILM policy, transform, and data view SHALL be created if they do not exist
