## Context

The Agent Builder platform provides a tool/skill/attachment/workflow architecture for AI-assisted workflows in Kibana. The Security Solution registers security-specific tools (`security.alerts`, `security.entity_risk_score`, `security.attack_discovery_search`, `security.security_labs_search`, `security.create_detection_rule`), skills (`alert-triage`, `host-analysis`, `threat-intel`, `network-forensics`), attachments (`alert`, `entity`, `rule`), and a `Threat Hunting Agent`.

The Cases plugin (`x-pack/platform/plugins/shared/cases/`) provides full CRUD via a server-side `CasesClient` (obtained through `CasesServerStart.getCasesClientWithRequest(request)`). The `CasesClient` exposes `cases.create()`, `cases.bulkUpdate()`, `cases.get()`, `cases.find()`, and attachment operations (`attachments.add()`, `attachments.bulkCreate()`). The existing `platform.core.cases` tool in `agent_builder_platform` is **read-only** — it can retrieve and search cases but cannot create, update, or add comments.

Key architecture constraints:
- **File paths**: Cases tools live in `x-pack/platform/plugins/shared/agent_builder_platform/server/tools/cases/`. Security skills live in `x-pack/solutions/security/plugins/security_solution/server/agent_builder/skills/`.
- **Tool registration**: Built-in tools are registered via `agentBuilder.tools.register()` during plugin setup. Tool IDs must be in the allow list (`@kbn/agent-builder-server/allow_lists.ts`) and in `platformCoreTools` or domain-specific constants.
- **Skill registration**: Skills are registered via `agentBuilder.skills.register()`. Each skill defines `getAllowedTools()` and optional `getInlineTools()`.
- **Attachment types**: Registered via `agentBuilder.attachments.registerType()`. Each type defines a schema, display metadata, and optionally provides bounded tools.
- **Workflow steps**: Registered via `workflowsExtensions.registerStepDefinition()`. The Agent Builder already provides a `RunAgent` step that can execute any agent with input/output schemas.
- **RBAC**: The `CasesClient` enforces permissions based on the request user. No additional permission model is needed — the tools inherit the user's Cases permissions.
- **Tool confirmation**: `BuiltinToolDefinition` supports a `confirmation` field (`ToolConfirmationPolicy`) that can require user confirmation before execution. This is critical for write operations.

## Goals / Non-Goals

**Goals:**
- The agent can create new security cases with title, description, severity, tags, and optional alert attachments
- The agent can add investigation findings as comments to existing cases
- The agent can update case metadata (status, severity, tags, assignees) based on investigation results
- Write operations require user confirmation before execution (tool confirmation policy)
- A `case-investigation-summary` skill guides the agent through a structured end-to-end case investigation that reads case data, enriches with security context, and writes findings back as a case comment
- An `alert-to-case-triage` skill guides the agent through alert triage, grouping, and case creation/update
- A Kibana Workflow step enables no-code automation of case investigation reports
- A `case_context` attachment type enables passing case data into agent conversations from the Cases UI
- All new tools are available to the Threat Hunting Agent
- All write operations respect existing Cases RBAC

**Non-Goals:**
- No changes to the existing read-only `platform.core.cases` tool (it continues to work as-is)
- No custom Cases UI changes (no new buttons in the Cases detail view in this iteration — the attachment type enables future integration)
- No case template creation or management
- No bulk case operations beyond what `CasesClient` already supports
- No real-time case monitoring or webhooks
- No modifications to the Cases plugin itself — all changes are in `agent_builder_platform` and `security_solution`
- No changes to Cases RBAC or permissions model

## Decisions

### 1. Three separate mutation tools (not one mega-tool)

**Decision**: Create three distinct tools — `cases.add_comment`, `cases.update`, and `cases.create` — rather than extending the existing `platform.core.cases` tool or creating a single `cases.mutate` tool.

**Rationale**: The existing `platform.core.cases` tool is already complex (3 operation modes, 15+ parameters). Adding write operations would make its schema unwieldy for the LLM to navigate. Separate tools with focused schemas are:
- Easier for the LLM to select the right tool for the intent
- Clearer in tool confirmation dialogs (user sees "Add comment to case X" not "Cases operation with mode=add_comment")
- Independently gatable via allow lists if needed
- Consistent with how other platforms separate read/write (e.g., `attachment_read` vs `attachment_update`)

**Alternatives considered**:
- *Extend `platform.core.cases`*: Too complex, degrades LLM tool selection accuracy
- *Single `cases.write` tool with action discriminator*: Better than extending the read tool, but still mixes concerns in one schema

### 2. Tool confirmation required for all write operations

**Decision**: All three mutation tools use `confirmation: { policy: 'always' }` to require user confirmation before execution.

**Rationale**: Case mutations are visible to the entire security team and are logged in the case's user action history. An accidental comment, status change, or case creation would be disruptive. Requiring confirmation:
- Prevents accidental writes from LLM hallucinations or misinterpreted intent
- Gives the user a chance to review what the agent will write
- Aligns with the principle of least surprise for shared data
- The confirmation dialog shows the tool parameters, so the user sees the exact comment text / status change / case details before approving

**Trade-off**: This adds one extra click per write operation. For high-frequency workflows (e.g., bulk triage), this could feel heavy. We accept this for v1 and can add a "trust mode" or batch confirmation later.

### 3. Tools registered in `agent_builder_platform` (not `security_solution`)

**Decision**: The three case mutation tools are registered in the `agent_builder_platform` plugin, alongside the existing `platform.core.cases` read tool.

**Rationale**: Cases is a platform-level feature (used by Security, Observability, and Stack Management). The mutation tools are not security-specific — they work with any case owner. Registering them in `agent_builder_platform`:
- Keeps all Cases tools co-located (`server/tools/cases/`)
- Makes them available to any agent (not just the Threat Hunting Agent)
- Shares the existing `CasesClient` setup code in `helpers.ts`
- Follows the pattern: platform tools in `agent_builder_platform`, domain skills in solution plugins

### 4. Skills registered in `security_solution`

**Decision**: The `case-investigation-summary` and `alert-to-case-triage` skills are registered in the Security Solution plugin.

**Rationale**: These skills are security-domain-specific — they reference security tools (`security.alerts`, `security.entity_risk_score`), use security terminology (MITRE ATT&CK, threat intel, IOCs), and target security workflows. They belong alongside the existing `alert-triage`, `host-analysis`, `threat-intel`, and `network-forensics` skills.

### 5. Case investigation summary skill structure

**Decision**: The `case-investigation-summary` skill follows a 5-step structured investigation:
1. Read the case (using `platform.core.cases` with `includeComments: true`)
2. Fetch and analyze attached alerts (using `security.alerts`)
3. Enrich with entity risk scores (using `security.entity_risk_score`) and threat intel (using `security.security_labs_search`)
4. Correlate — check for related cases sharing the same alerts (using `platform.core.cases` with `alertIds`)
5. Compile findings and add as a structured comment (using `cases.add_comment`)

**Rationale**: This mirrors the manual investigation workflow analysts already follow. By codifying it as a skill, the agent follows a systematic approach rather than ad-hoc exploration. The output is a structured markdown comment with sections: Executive Summary, Alert Analysis, Entity Risk Assessment, Threat Intelligence, Related Cases, and Recommended Actions.

The skill uses `getAllowedTools()` to declare its tool dependencies:
```typescript
getAllowedTools: () => [
  'platform.core.cases',
  'cases.add_comment',
  'security.alerts',
  'security.entity_risk_score',
  'security.security_labs_search',
]
```

### 6. Alert-to-case triage skill builds on existing alert-triage

**Decision**: The `alert-to-case-triage` skill extends the existing `alert-triage` skill's workflow with case creation/update as the final step. It does NOT replace `alert-triage`.

**Rationale**: The existing `alert-triage` skill covers steps 1-3 (gather details, review rule context, compile findings) but stops at producing a summary. The new skill adds:
- Step 4: Check for existing related cases (using `platform.core.cases` with `alertIds`)
- Step 5: If related case exists → add findings as a comment (using `cases.add_comment`) and optionally update severity (using `cases.update`). If no related case → create a new case (using `cases.create`) with the triage findings as the description.

The skill references the `alert-triage` skill content conceptually but is a separate skill definition. This avoids modifying the existing skill and allows both to be used independently.

### 7. Workflow step uses existing `RunAgent` infrastructure

**Decision**: The `generate_case_report` workflow step is implemented as a thin wrapper around the existing `RunAgent` step type, pre-configured with the Threat Hunting Agent and the `case-investigation-summary` skill.

**Rationale**: The `RunAgent` step (`x-pack/platform/plugins/shared/agent_builder/common/step_types/`) already handles agent execution within workflows. Rather than building a new step type from scratch, we create a specialized step that:
- Accepts `caseId` as input
- Constructs the agent prompt: "Investigate case {caseId} using the case-investigation-summary skill and add your findings as a case comment."
- Uses the Threat Hunting Agent (which has all the necessary tools)
- Returns the agent's response as output

This is a minimal implementation that leverages existing infrastructure. A more sophisticated step (with custom UI, progress tracking, etc.) can be built later.

### 8. Case context attachment type

**Decision**: A new `case_context` attachment type allows passing case data into agent conversations. The attachment:
- Has a schema accepting `caseId: string` and optional `includeComments: boolean`
- On creation, fetches the case data via `CasesClient` and stores a snapshot
- Provides a bounded tool `case_context.get_case` that returns the attached case data
- Is displayed in the conversation as a case card (title, status, severity, link)

**Rationale**: When an analyst opens Agent Builder from within a case investigation, the agent needs to know which case the analyst is working on. Without this attachment, the analyst must type "I'm investigating case X" and the agent must call the cases tool to fetch it. The attachment eliminates this friction:
- The case data is immediately available in the conversation context
- The agent's system prompt includes the case summary
- Future UI integration can auto-attach the case when launching Agent Builder from the case detail view

### 9. Tool IDs follow existing naming convention

**Decision**: New tool IDs use the `platform.core.cases.*` namespace:
- `platform.core.cases.add_comment`
- `platform.core.cases.update`
- `platform.core.cases.create`

**Rationale**: This follows the existing pattern where `platform.core.cases` is the read tool. The dot-separated namespace makes the relationship clear and groups them logically in the tool registry. The allow list in `@kbn/agent-builder-server` needs to be updated to include these new IDs.

### 10. Comment format: markdown with investigation structure

**Decision**: The `cases.add_comment` tool accepts a `comment` string (markdown) and a `caseId`. The skill instructions specify the expected markdown structure for investigation summaries.

**Rationale**: Cases comments support markdown natively. Rather than having the tool enforce a rigid structure (which would require a complex schema), we keep the tool generic (any markdown comment) and let the skill instructions define the structure. This means:
- The tool can be used for any comment, not just investigation summaries
- The skill controls the output format via its content instructions
- Different skills can produce different comment formats using the same tool

## Risks / Trade-offs

**[Risk] LLM may produce low-quality investigation summaries** — The investigation skill relies on the LLM synthesizing data from multiple tool calls into a coherent, accurate summary.
→ **Mitigation**: The skill content includes a detailed template with section headers, expected content per section, and examples. The confirmation dialog shows the full comment before it's posted, letting the analyst edit or reject it.

**[Risk] Tool confirmation fatigue** — Requiring confirmation for every write operation may be annoying for power users or batch workflows.
→ **Mitigation**: Accept for v1. Tool confirmation is a standard pattern and prevents errors. Future iterations can add "trust mode" or batch confirmation for workflow-driven operations.

**[Risk] CasesClient permissions may not be obvious to the user** — If the user doesn't have Cases write permissions, the tool will fail with a permission error that may be confusing.
→ **Mitigation**: The tool description includes a note about required permissions. The error handler wraps CasesClient errors with user-friendly messages. The tool's `availability.handler` can check Cases RBAC upfront.

**[Risk] Case context attachment may become stale** — The snapshot taken when the attachment is created may not reflect subsequent case updates.
→ **Mitigation**: The bounded tool `case_context.get_case` fetches fresh data on demand. The initial snapshot is for display and quick context only. The skill instructions tell the agent to re-fetch the case before writing findings.

**[Risk] Alert-to-case triage may create duplicate cases** — If the agent fails to find existing related cases (e.g., due to search limitations), it may create a duplicate case.
→ **Mitigation**: The tool confirmation for `cases.create` shows the case title and description, giving the analyst a chance to recognize a duplicate. The skill instructions explicitly tell the agent to search for related cases before creating a new one.

**[Trade-off] No bulk operations** — The tools operate on one case at a time. Bulk triage of 50 alerts into cases requires multiple tool calls.
→ **Accepted**: The agent can loop through alerts, and the planning mode can create a plan for batch triage. Bulk-specific tools can be added later if needed.

**[Trade-off] No custom Cases UI integration** — There's no "Run AI Investigation" button in the Cases detail view yet.
→ **Accepted**: The `case_context` attachment type is the foundation for this. The UI integration (a button that opens Agent Builder with the case auto-attached) is a natural follow-up but is out of scope for the initial capability delivery.

**[Trade-off] Workflow step is minimal** — The `generate_case_report` step is a thin wrapper around RunAgent, without custom UI or progress tracking.
→ **Accepted**: This demonstrates the concept and enables basic automation. A richer step with progress indicators and custom configuration can be built incrementally.
