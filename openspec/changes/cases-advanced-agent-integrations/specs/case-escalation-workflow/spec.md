## ADDED Requirements

### Requirement: Case escalation workflow step automates escalation actions

The system SHALL provide a Kibana Workflow step `case_escalation` that automates case escalation based on configurable conditions and actions.

**Input schema:**
- `caseId` (required string): The case to evaluate for escalation
- `conditions` (required object): Escalation trigger conditions
  - `severity` (optional string or array): Trigger when case severity matches (e.g., `"critical"` or `["critical", "high"]`)
  - `tags` (optional string array): Trigger when case has any of the specified tags (e.g., `["escalate", "incident-response"]`)
  - `minOpenHours` (optional number): Trigger when case has been open longer than this duration (SLA-based escalation)
- `actions` (required object): Actions to take when conditions are met
  - `assignTo` (optional string array): User profile UIDs to reassign the case to
  - `addTags` (optional string array): Tags to add to the case (e.g., `["escalated", "tier-2"]`)
  - `updateSeverity` (optional string): New severity to set (e.g., escalate from `high` to `critical`)
  - `pushToConnector` (optional boolean): Push the case to the configured external connector (Jira, ServiceNow, etc.)
  - `generateSummary` (optional boolean): Run the Threat Hunting Agent with the `case-investigation-summary` skill and add the report as a comment
  - `addComment` (optional string): Add a custom escalation comment to the case

**Behavior**: The step fetches the case, evaluates all conditions (AND logic — all specified conditions must be true), and if met, executes all specified actions sequentially.

#### Scenario: Severity-based escalation

- **WHEN** the workflow triggers `case_escalation` with `{ caseId: "abc-123", conditions: { severity: "critical" }, actions: { assignTo: ["senior-analyst-uid"], addTags: ["escalated"], addComment: "Auto-escalated: critical severity case" } }`
- **AND** the case severity is `critical`
- **THEN** the step reassigns the case, adds tags, and adds the escalation comment

#### Scenario: Conditions not met — no action taken

- **WHEN** the workflow triggers `case_escalation` with `{ conditions: { severity: "critical" } }` but the case severity is `medium`
- **THEN** the step returns `{ escalated: false, reason: "Conditions not met: severity is 'medium', required 'critical'" }` and takes no action

#### Scenario: SLA-based escalation with investigation summary

- **WHEN** the workflow triggers `case_escalation` with `{ conditions: { minOpenHours: 24 }, actions: { generateSummary: true, assignTo: ["manager-uid"], addComment: "SLA breach: case open > 24 hours without resolution" } }`
- **AND** the case has been open for more than 24 hours
- **THEN** the step generates an investigation summary, reassigns the case, and adds the SLA breach comment

#### Scenario: Push to external ticketing system

- **WHEN** the workflow triggers `case_escalation` with `{ actions: { pushToConnector: true } }` and conditions are met
- **AND** the case has a configured external connector (e.g., Jira)
- **THEN** the step calls `CasesClient.push()` to sync the case to the external system

#### Scenario: No external connector configured

- **WHEN** `pushToConnector` is true but the case has no external connector configured
- **THEN** the step logs a warning and continues with other actions: "Cannot push to external system — no connector configured on case"

---

### Requirement: Escalation workflow step is registered conditionally

The `case_escalation` step SHALL only be registered when both the `workflowsExtensions` plugin and the `cases` plugin are available. The step SHALL appear in the "Automation" category in the workflow builder UI with label "Case Escalation" and description "Automatically escalate cases based on severity, tags, or SLA conditions."

#### Scenario: Both plugins available

- **WHEN** `workflowsExtensions` and `cases` are both available
- **THEN** the `case_escalation` step is registered in both server and public

#### Scenario: Missing plugin dependency

- **WHEN** either `workflowsExtensions` or `cases` is not available
- **THEN** the `case_escalation` step is not registered
