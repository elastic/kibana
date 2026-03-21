## ADDED Requirements

### Requirement: Playbook executor skill reads and executes investigation guides

The system SHALL provide a skill `playbook-executor` registered in the Security Solution plugin. The skill SHALL instruct the agent to:

1. **Identify the investigation guide**: Given a case ID, fetch the case and its attached alerts. For each alert, extract the detection rule ID. Use the inline tool `security.playbook.get-investigation-guide` to fetch the investigation guide (`rule.note` markdown) from the first alert's rule (or a user-specified rule).
2. **Parse the guide into steps**: Treat each markdown heading (`###`) or numbered list item as a discrete investigation step. If the guide is unstructured prose, the agent SHALL decompose it into logical steps.
3. **Map steps to tool invocations**: For each step, determine which available tool(s) can fulfill it. Common mappings include:
   - "Check user login activity" → `security.alerts` or `platform.core.execute_esql`
   - "Review network connections" → network-forensics inline tools
   - "Assess host compromise" → host-analysis inline tools
   - "Look up hash reputation" → threat-intel inline tools
   - "Check entity risk" → `security.entity_risk_score`
4. **Execute each step**: Call the mapped tools and collect results.
5. **Report findings**: Produce a per-step report and a final summary. Add the report to the case as a comment using `platform.core.cases.add_comment`.

The skill SHALL mark steps it cannot map to any tool as "Manual — requires analyst action" and proceed to the next step.

#### Scenario: Execute a well-structured investigation guide

- **WHEN** the agent activates the `playbook-executor` skill on a case whose alert rule has a structured investigation guide with headings like "### 1. Check user activity", "### 2. Review network logs"
- **THEN** the agent parses each heading as a step, maps them to tool calls, executes sequentially, and posts a multi-section investigation report to the case

#### Scenario: Investigation guide contains unmappable steps

- **WHEN** the investigation guide includes a step like "Contact the asset owner to verify the activity"
- **THEN** the agent marks that step as "Manual — requires analyst action: Contact the asset owner to verify the activity" in the report and proceeds to the next step

#### Scenario: No investigation guide exists for the rule

- **WHEN** the detection rule associated with the case's alerts has no `note` field (no investigation guide)
- **THEN** the agent falls back to the `case-investigation-summary` skill and reports: "No investigation guide found for rule '{ruleName}'. Proceeding with general investigation."

#### Scenario: Planning mode creates a plan from investigation guide steps

- **WHEN** the agent is in planning mode and the `playbook-executor` skill is activated
- **THEN** the agent creates a plan with one action item per investigation guide step (using `create_plan`), marks it as `ready`, and waits for user approval before executing

#### Scenario: Multiple alerts with different rules

- **WHEN** a case has alerts from multiple detection rules with different investigation guides
- **THEN** the agent uses the investigation guide from the highest-severity alert's rule and notes: "Case has alerts from {N} rules. Using the investigation guide from '{ruleName}' (highest severity: {severity})."

---

### Requirement: Inline tool to fetch investigation guide from detection rules

The skill SHALL provide an inline tool `security.playbook.get-investigation-guide` that fetches the investigation guide for a given rule.

- **Input**: `{ ruleId?: string, alertId?: string }` — at least one required. If `alertId` is provided, the tool extracts the rule ID from the alert.
- **Output**: `{ ruleName, ruleId, severity, investigationGuide: string | null, mitreTechniques: Array<{ id, name, tactic }> }`
- **Behavior**: Uses the alerting `rulesClient` to fetch the rule. Returns `null` for `investigationGuide` if no `note` field exists.

#### Scenario: Fetch guide by rule ID

- **WHEN** the agent calls `security.playbook.get-investigation-guide` with `{ ruleId: "abc-123" }`
- **THEN** the tool returns the rule's investigation guide markdown, name, severity, and MITRE techniques

#### Scenario: Fetch guide by alert ID

- **WHEN** the agent calls `security.playbook.get-investigation-guide` with `{ alertId: "xyz-456" }`
- **THEN** the tool extracts the rule ID from the alert's `kibana.alert.rule.uuid` field and returns the guide

#### Scenario: Rule has no investigation guide

- **WHEN** the agent calls the tool for a rule that has no `note` field
- **THEN** the tool returns `{ investigationGuide: null }` with the rule name and other metadata
