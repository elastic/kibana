## ADDED Requirements

### Requirement: Agent can create a new case

The system SHALL provide a built-in tool `platform.core.cases.create` that creates a new case via the `CasesClient.cases.create()` API. The tool SHALL accept `title` (required string), `description` (required string), `owner` (required enum: `securitySolution` | `observability` | `cases`), `severity` (optional enum: `low` | `medium` | `high` | `critical`, default `low`), `tags` (optional string array), `assignees` (optional string array of user profile UIDs), and `category` (optional string). The tool SHALL return the created case's `id`, `title`, `status`, `severity`, and `markdown_link`. The tool SHALL require user confirmation before execution (`confirmation.policy: 'always'`).

#### Scenario: Create a security case with required fields only

- **WHEN** the agent calls `platform.core.cases.create` with `{ title: "Suspicious lateral movement", description: "Multiple hosts show signs of lateral movement via RDP", owner: "securitySolution" }`
- **THEN** the system creates a case with status `open`, severity `low` (default), and returns the case ID and markdown link

#### Scenario: Create a case with full metadata

- **WHEN** the agent calls `platform.core.cases.create` with `{ title: "Phishing Campaign", description: "...", owner: "securitySolution", severity: "high", tags: ["phishing", "email"], category: "incident" }`
- **THEN** the system creates a case with the specified severity, tags, and category

#### Scenario: User confirmation is required

- **WHEN** the agent calls `platform.core.cases.create` with any valid parameters
- **THEN** the system presents a confirmation dialog showing the case title, description, and severity before creating the case

#### Scenario: User lacks Cases write permissions

- **WHEN** the agent calls `platform.core.cases.create` but the current user does not have `cases:create` permission for the specified owner
- **THEN** the system returns an error result with a user-friendly message: "You don't have permission to create cases for {owner}. Contact your administrator."

#### Scenario: Invalid owner value

- **WHEN** the agent calls `platform.core.cases.create` with an `owner` value not in the allowed enum
- **THEN** the tool schema validation rejects the call before execution

---

### Requirement: Agent can add a comment to an existing case

The system SHALL provide a built-in tool `platform.core.cases.add_comment` that adds a user comment to an existing case via the `CasesClient.attachments.add()` API with attachment type `user`. The tool SHALL accept `caseId` (required string) and `comment` (required string, supports markdown). The tool SHALL return a confirmation with the case ID, comment length, and the case's markdown link. The tool SHALL require user confirmation before execution. The confirmation dialog SHALL display the full comment text so the user can review it before posting.

#### Scenario: Add investigation findings as a comment

- **WHEN** the agent calls `platform.core.cases.add_comment` with `{ caseId: "abc-123", comment: "## Investigation Summary\n\nAnalysis of alert..." }`
- **THEN** the system adds the markdown comment to the case and returns a success result with the case's markdown link

#### Scenario: Case does not exist

- **WHEN** the agent calls `platform.core.cases.add_comment` with a `caseId` that does not exist
- **THEN** the system returns an error result: "Case {caseId} not found."

#### Scenario: User confirmation shows the full comment text

- **WHEN** the agent calls `platform.core.cases.add_comment` with any valid parameters
- **THEN** the confirmation dialog displays the `caseId` and the full `comment` markdown text

#### Scenario: Empty comment rejected

- **WHEN** the agent calls `platform.core.cases.add_comment` with `comment: ""`
- **THEN** the tool schema validation rejects the call (comment must be non-empty)

---

### Requirement: Agent can update case metadata

The system SHALL provide a built-in tool `platform.core.cases.update` that updates metadata on an existing case via the `CasesClient.cases.bulkUpdate()` API. The tool SHALL accept `caseId` (required string) and at least one of: `status` (optional enum: `open` | `in-progress` | `closed`), `severity` (optional enum: `low` | `medium` | `high` | `critical`), `tags` (optional string array — replaces all tags), `assignees` (optional string array of user profile UIDs — replaces all assignees), `title` (optional string), `description` (optional string). The tool SHALL first fetch the case's current `version` (required for optimistic concurrency) then perform the update. The tool SHALL return the updated case's metadata and markdown link. The tool SHALL require user confirmation before execution.

#### Scenario: Update case status to in-progress

- **WHEN** the agent calls `platform.core.cases.update` with `{ caseId: "abc-123", status: "in-progress" }`
- **THEN** the system fetches the current case version, updates the status to `in-progress`, and returns the updated metadata

#### Scenario: Escalate case severity based on investigation

- **WHEN** the agent calls `platform.core.cases.update` with `{ caseId: "abc-123", severity: "critical" }`
- **THEN** the system updates the severity and returns the updated case

#### Scenario: Update multiple fields at once

- **WHEN** the agent calls `platform.core.cases.update` with `{ caseId: "abc-123", status: "in-progress", severity: "high", tags: ["escalated", "lateral-movement"] }`
- **THEN** the system updates all specified fields in a single operation

#### Scenario: No update fields provided

- **WHEN** the agent calls `platform.core.cases.update` with only `caseId` and no other fields
- **THEN** the system returns an error: "At least one field to update must be provided."

#### Scenario: Optimistic concurrency conflict

- **WHEN** the agent calls `platform.core.cases.update` but the case was modified by another user between the version fetch and the update
- **THEN** the system retries once with the new version, and if it fails again, returns an error: "Case was modified by another user. Please try again."

---

### Requirement: Mutation tools are registered in the platform tool registry

All three mutation tools (`platform.core.cases.create`, `platform.core.cases.add_comment`, `platform.core.cases.update`) SHALL be registered as `BuiltinToolDefinition` entries in the `agent_builder_platform` plugin during setup, alongside the existing `platform.core.cases` read tool. Their tool IDs SHALL be added to the allow list in `@kbn/agent-builder-server`. The tools SHALL be available to any agent that includes them in its tool configuration.

#### Scenario: Tools appear in the tool registry

- **WHEN** the agent builder platform plugin starts
- **THEN** the tools `platform.core.cases.create`, `platform.core.cases.add_comment`, and `platform.core.cases.update` are registered and discoverable via the tool registry

#### Scenario: Threat Hunting Agent includes mutation tools

- **WHEN** the Threat Hunting Agent is configured
- **THEN** its tool set includes the three mutation tool IDs in addition to the existing `platform.core.cases` read tool

---

### Requirement: Mutation tools respect Cases RBAC

All mutation tools SHALL delegate to the `CasesClient` which enforces the current user's permissions. The tools SHALL NOT implement their own authorization logic. If the `CasesClient` raises a permission error, the tool SHALL catch it and return a user-friendly error message indicating which permission is missing.

#### Scenario: Unprivileged user cannot create cases

- **WHEN** a user without `cases:create` permission triggers `platform.core.cases.create` via the agent
- **THEN** the tool returns an error result explaining the missing permission

#### Scenario: Read-only user cannot add comments

- **WHEN** a user with only `cases:read` permission triggers `platform.core.cases.add_comment`
- **THEN** the tool returns an error result explaining that write access is required

---

### Requirement: Mutation tools are available when Cases plugin is present

The mutation tools SHALL only be registered when the `cases` plugin is available (it is an optional dependency of `agent_builder_platform`). If the Cases plugin is not installed or disabled, the tools SHALL NOT appear in the registry.

#### Scenario: Cases plugin not available

- **WHEN** the Kibana instance does not have the Cases plugin enabled
- **THEN** the mutation tools are not registered and not available to agents

#### Scenario: Cases plugin available

- **WHEN** the Cases plugin is enabled and `agent_builder_platform` starts
- **THEN** all four Cases tools (read + three mutation) are registered
