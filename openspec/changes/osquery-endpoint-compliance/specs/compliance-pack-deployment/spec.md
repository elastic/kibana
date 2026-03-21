## ADDED Requirements

### Requirement: Convert compliance rules to osquery scheduled pack

The compliance pack deployment service SHALL convert enabled compliance rules into an osquery scheduled pack format compatible with the Fleet osquery_manager integration. For each enabled rule:
- `id` → the rule's `rule_id`
- `query` → the rule's osquery SQL
- `interval` → the rule's evaluation interval (default 300 seconds)
- `platform` → the rule's target platform
- `version` → minimum osquery version required (default `*`)

#### Scenario: Pack contains only enabled rules for the target platform
- **WHEN** compliance pack deployment is triggered for an agent policy with macOS agents
- **THEN** the generated pack SHALL contain only rules with `platform: 'darwin'` and `enabled: true`

#### Scenario: Pack excludes muted rules
- **WHEN** a rule is muted (excluded from scoring)
- **THEN** the rule SHALL still be included in the pack (findings are still collected), but its muted state is metadata-only — muting affects scoring, not collection

### Requirement: Sync compliance packs to Fleet package policies

The service SHALL sync generated compliance packs to Fleet package policies that include the `osquery_manager` integration. This follows the existing pattern used by `update_global_packs.ts` in the osquery plugin.

When a compliance benchmark is enabled:
1. Generate the compliance pack from enabled rules
2. Find all Fleet package policies with osquery_manager
3. Add or update the compliance pack input on each policy
4. Fleet propagates the updated policy to agents

#### Scenario: Benchmark is enabled and pack is deployed
- **WHEN** the user enables the CIS macOS 15 benchmark via `POST /api/endpoint_compliance/deploy`
- **THEN** the system SHALL generate a compliance pack and sync it to all osquery-enabled agent policies

#### Scenario: Rule is disabled and pack is updated
- **WHEN** the user disables a specific compliance rule
- **THEN** the system SHALL regenerate the compliance pack (without the disabled rule) and re-sync to Fleet

#### Scenario: No osquery integration installed
- **WHEN** the user attempts to deploy a compliance benchmark but no agent policies have the osquery_manager integration
- **THEN** the system SHALL return an error with guidance: "Install the Osquery Manager integration on at least one agent policy first"

### Requirement: Deploy API

The system SHALL provide `POST /api/endpoint_compliance/deploy` with body:
```json
{
  "benchmark_id": "cis_macos_15",
  "agent_policy_ids": ["policy-1", "policy-2"]  // optional, defaults to all osquery-enabled policies
}
```

#### Scenario: Deploy to specific agent policies
- **WHEN** the user specifies `agent_policy_ids`
- **THEN** the compliance pack SHALL be synced only to the specified policies

#### Scenario: Deploy to all osquery-enabled policies
- **WHEN** the user omits `agent_policy_ids`
- **THEN** the compliance pack SHALL be synced to all policies that include the osquery_manager integration

### Requirement: Pack naming convention

Compliance packs SHALL use the naming convention `compliance-{benchmark_id}` (e.g., `compliance-cis_macos_15`). This distinguishes them from user-created osquery packs and prevents naming collisions.

#### Scenario: Compliance pack does not conflict with user packs
- **WHEN** a user has a custom osquery pack named `my-security-pack` and a compliance pack `compliance-cis_macos_15`
- **THEN** both packs SHALL coexist on the same agent without conflict

### Requirement: Compliance query result identification

The system SHALL tag compliance pack queries so that the finding evaluator can distinguish compliance query results from regular osquery results. This SHALL be achieved by using the `schedule_id` field pattern: `compliance-{rule_id}`.

#### Scenario: Finding evaluator identifies compliance results
- **WHEN** osquery results arrive with `schedule_id` matching `compliance-*`
- **THEN** the finding evaluator SHALL process these results and produce compliance findings
- **WHEN** osquery results arrive with a `schedule_id` not matching `compliance-*`
- **THEN** the finding evaluator SHALL ignore these results (they are regular scheduled queries)
