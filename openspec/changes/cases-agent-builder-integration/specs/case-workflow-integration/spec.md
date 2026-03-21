## ADDED Requirements

### Requirement: Workflow step for automated case investigation reports

The system SHALL provide a Kibana Workflow step `generate_case_report` that automates the case investigation summary workflow. The step SHALL accept `caseId` (required string) as input and optionally `agentId` (string, defaults to the Threat Hunting Agent ID). The step SHALL execute the specified agent with the `case-investigation-summary` skill context, instructing it to investigate the case and add findings as a comment. The step SHALL return the agent's response text and the case's markdown link as output. The step SHALL be registered using the existing `workflowsExtensions.registerStepDefinition()` API.

#### Scenario: Workflow step executes investigation on a case

- **WHEN** a workflow triggers the `generate_case_report` step with `{ caseId: "abc-123" }`
- **THEN** the step runs the Threat Hunting Agent with the investigation skill, and the agent posts an investigation comment to the case

#### Scenario: Workflow step with custom agent

- **WHEN** a workflow triggers the `generate_case_report` step with `{ caseId: "abc-123", agentId: "custom-security-agent" }`
- **THEN** the step runs the specified custom agent instead of the Threat Hunting Agent

#### Scenario: Invalid case ID

- **WHEN** a workflow triggers the step with a `caseId` that does not exist
- **THEN** the step returns an error output indicating the case was not found

#### Scenario: Step is available in the workflow builder UI

- **WHEN** a user opens the Kibana Workflow builder
- **THEN** the `generate_case_report` step appears in the AI actions category with label "Generate Case Investigation Report" and description "Run an AI agent to investigate a case and add findings as a comment"

---

### Requirement: Case context attachment type for agent conversations

The system SHALL provide an attachment type `case_context` registered in the `agent_builder_platform` plugin via `agentBuilder.attachments.registerType()`. The attachment SHALL:

- Accept a schema with `caseId` (required string) and `includeComments` (optional boolean, default `true`)
- On creation, fetch the case data via `CasesClient` and store a snapshot including: case ID, title, description, status, severity, tags, assignees, total alerts count, total comments count, and markdown link
- Provide a display renderer that shows a case card in the conversation (title, status badge, severity badge, link)
- Provide a bounded tool `case_context.get_case` that returns the attached case snapshot data

#### Scenario: Case attached to a conversation

- **WHEN** a case with ID "abc-123" is attached to an agent conversation as `case_context`
- **THEN** the agent's conversation context includes the case metadata and the bounded tool `case_context.get_case` is available

#### Scenario: Agent reads attached case context

- **WHEN** the agent calls `case_context.get_case` during a conversation with a case context attachment
- **THEN** the tool returns the case snapshot: `{ id, title, description, status, severity, tags, assignees, totalAlerts, totalComments, markdownLink }`

#### Scenario: Case context displayed in conversation UI

- **WHEN** a conversation has a `case_context` attachment
- **THEN** the conversation UI displays a case card showing the case title, status badge (color-coded: open=primary, in-progress=warning, closed=default), severity badge (color-coded: critical=danger, high=warning, medium=default, low=subdued), and a clickable link to the case

#### Scenario: Case not found during attachment creation

- **WHEN** a `case_context` attachment is created with a `caseId` that does not exist
- **THEN** the attachment creation fails with an error: "Case {caseId} not found"

---

### Requirement: Case context attachment is available when Cases plugin is present

The `case_context` attachment type SHALL only be registered when the `cases` plugin is available. If the Cases plugin is not installed, the attachment type SHALL NOT appear in the registry.

#### Scenario: Cases plugin available

- **WHEN** the Cases plugin is enabled and `agent_builder_platform` starts
- **THEN** the `case_context` attachment type is registered and available for use

#### Scenario: Cases plugin not available

- **WHEN** the Cases plugin is not enabled
- **THEN** the `case_context` attachment type is not registered

---

### Requirement: Workflow step is registered when Workflows plugin is present

The `generate_case_report` workflow step SHALL only be registered when both the `workflowsExtensions` plugin and the `cases` plugin are available. The step definition SHALL include both a server-side step handler (in `agent_builder` plugin server) and a public-side step definition (in `agent_builder` plugin public).

#### Scenario: Both plugins available

- **WHEN** both `workflowsExtensions` and `cases` plugins are available
- **THEN** the `generate_case_report` step is registered in both server and public

#### Scenario: Workflows plugin not available

- **WHEN** the `workflowsExtensions` plugin is not available
- **THEN** the `generate_case_report` step is not registered

#### Scenario: Cases plugin not available

- **WHEN** the `cases` plugin is not available (but `workflowsExtensions` is)
- **THEN** the `generate_case_report` step is not registered (it depends on Cases)
