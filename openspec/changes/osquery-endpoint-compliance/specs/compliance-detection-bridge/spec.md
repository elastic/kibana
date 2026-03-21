## ADDED Requirements

### Requirement: Generate detection rule from compliance failure

The system SHALL provide a utility to generate a Security detection rule from a failing compliance check. The generated rule SHALL be a **threshold rule** that alerts when a compliance finding with `result.evaluation: 'failed'` exists for a specific `rule.id`.

Generated rule properties:
- **Name**: `Compliance: {rule.name}` (e.g., `Compliance: FileVault Is Disabled`)
- **Description**: `Endpoint compliance check failed: {rule.description}`
- **Index pattern**: `logs-endpoint_compliance.findings-*`
- **Query**: `result.evaluation: "failed" AND rule.id: "{rule_id}"`
- **Threshold**: count ≥ 1, grouped by `host.id`
- **Severity**: maps from CIS level — Level 1 → `medium`, Level 2 → `high`
- **Risk score**: Level 1 → 47, Level 2 → 73
- **Tags**: `Compliance`, `CIS`, `Endpoint`, the benchmark ID, the section name
- **MITRE ATT&CK**: mapped per-rule based on the check category

#### Scenario: Generate detection rule for a single compliance rule
- **WHEN** the user clicks "Create Detection Rule" on a failing compliance finding
- **THEN** the system SHALL create a threshold detection rule with the properties described above and navigate the user to the rule detail page

#### Scenario: Detection rule references the compliance rule
- **WHEN** a detection rule is generated from a compliance failure
- **THEN** the rule's tags SHALL include `compliance-rule:{rule_id}` so the compliance UI can show which rules have associated detection rules

### Requirement: Bulk detection rule generation

The system SHALL support generating detection rules for all failing rules in a benchmark at once via `POST /api/endpoint_compliance/rules/_generate_detection_rules` with body:
```json
{
  "benchmark_id": "cis_macos_15",
  "only_failing": true
}
```

#### Scenario: Generate rules for all failing checks
- **WHEN** the user triggers bulk rule generation with `only_failing: true`
- **THEN** the system SHALL create one detection rule per compliance rule that has at least one failing finding, skipping rules that already have a linked detection rule

#### Scenario: No duplicate detection rules
- **WHEN** a detection rule for a compliance rule already exists (matched by `compliance-rule:{rule_id}` tag)
- **THEN** the system SHALL skip that rule and report it as "already exists"

### Requirement: MITRE ATT&CK mapping for compliance rules

The detection rule bridge SHALL map compliance check categories to MITRE ATT&CK techniques:

| Check Category | MITRE Technique |
|---|---|
| Disk encryption (FileVault, BitLocker) | T1486 (Data Encrypted for Impact) / Defense Evasion |
| Firewall configuration | T1562.004 (Disable or Modify System Firewall) |
| Auto-updates / patching | T1211 (Exploitation for Defense Evasion) |
| Screen lock / session timeout | T1078 (Valid Accounts) |
| SSH hardening | T1021.004 (Remote Services: SSH) |
| Password policy | T1110 (Brute Force) |
| Audit logging | T1562.002 (Disable Windows Event Logging) |
| Privilege escalation (UAC, SUID) | T1548 (Abuse Elevation Control Mechanism) |
| AV/EDR (Defender, SIP) | T1562.001 (Disable or Modify Tools) |
| Network configuration | T1090 (Proxy) / T1071 (Application Layer Protocol) |

#### Scenario: Generated rule has correct MITRE mapping
- **WHEN** a detection rule is generated for a firewall compliance check
- **THEN** the rule SHALL include MITRE technique `T1562.004` (Disable or Modify System Firewall) under tactic `Defense Evasion`

### Requirement: Compliance response action

The system SHALL register "Run Compliance Check" as an osquery response action that can be executed from the alert details or host details context. This action:
1. Identifies the host's OS and applicable benchmarks
2. Runs all enabled compliance rules for that benchmark as a live osquery query batch
3. Ingests the results as compliance findings (same as scheduled evaluation)

#### Scenario: Run compliance check from alert investigation
- **WHEN** an analyst investigating an alert clicks "Run Compliance Check" on the affected host
- **THEN** the system SHALL execute all enabled compliance rules for that host's OS via live osquery, display results in a flyout, and ingest the findings into the findings index

#### Scenario: Compliance check respects platform filtering
- **WHEN** a compliance check is triggered on a Windows host
- **THEN** only rules with `platform: 'windows'` SHALL be executed
