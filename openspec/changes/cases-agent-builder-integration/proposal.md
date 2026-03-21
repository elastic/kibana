## Why

Security analysts spend significant time on repetitive, manual work when investigating cases: reading through alerts and comments, cross-referencing threat intel, composing investigation summaries, updating case status, and creating cases from investigation findings. The Agent Builder already has a read-only `platform.core.cases` tool, security-focused skills (alert triage, threat intel, host analysis), and a Threat Hunting Agent — but none of these can *write back* to Cases. Analysts cannot ask the agent to create a case, add an investigation comment, update a case's status/severity, or generate a structured investigation report. Bridging this gap with a small set of write-capable tools, investigation-oriented skills, and a workflow step would immediately demonstrate the value of Agent Builder + Kibana Workflows for Security Cases users with minimal implementation effort.

## What Changes

- **Case mutation tools**: New built-in tools that extend the existing read-only `platform.core.cases` tool with write capabilities: `cases.add_comment` (add a user comment or investigation findings to an existing case), `cases.update` (update case status, severity, tags, assignees, or description), and `cases.create` (create a new case pre-populated with title, description, severity, tags, and optionally linked alerts). These use the server-side `CasesClient` already available via `CasesServerStart.getCasesClientWithRequest()`.
- **Case investigation summary skill**: A new skill that instructs the agent to perform a structured investigation of a case — reading the case and its alerts, enriching with entity risk scores and threat intel, correlating related alerts across cases, and producing a formatted investigation summary that is added directly to the case as a comment. This skill composes the existing security tools (`security.alerts`, `security.entity_risk_score`, `security.security_labs_search`) with the new case mutation tools.
- **Alert-to-case triage skill**: A new skill that guides the agent through a workflow of triaging one or more alerts, assessing severity/impact, grouping related alerts, and either creating a new case or adding findings to an existing case. This builds on the existing `alert-triage` skill but adds the "last mile" of case creation/update.
- **Case investigation report workflow step**: A Kibana Workflow step (`generate_case_report`) that, given a case ID, runs the Threat Hunting Agent with the case investigation summary skill to produce and attach an investigation report. This enables no-code automation — e.g., "when a critical case is created, automatically generate an investigation summary."
- **Case context attachment type**: A new Agent Builder attachment type (`case_context`) that allows a case (or set of cases) to be passed as context to an agent conversation. When an analyst opens Agent Builder from a case detail view, the case data is automatically attached so the agent understands the investigation context without the user needing to describe it.

## Capabilities

### New Capabilities
- `cases-mutation-tools`: Write-capable Cases tools — `cases.add_comment`, `cases.update`, `cases.create` — that enable the agent to create cases, add investigation comments, and update case metadata (status, severity, tags, assignees).
- `case-investigation-skills`: Investigation-oriented skills — `case-investigation-summary` and `alert-to-case-triage` — that compose existing security tools with the new mutation tools to deliver end-to-end investigation workflows via natural language.
- `case-workflow-integration`: Kibana Workflow step for automated case investigation reports plus a `case_context` attachment type that passes case data into agent conversations from the Cases UI.

### Modified Capabilities
<!-- No existing specs to modify — the existing `platform.core.cases` read-only tool remains unchanged -->

## Impact

- **Packages affected**:
  - `@kbn/agent-builder-common` — new tool IDs added to `platformCoreTools` for the cases mutation tools
  - `agent_builder_platform` plugin server (`x-pack/platform/plugins/shared/agent_builder_platform/server/tools/cases/`) — new tool definitions for `cases.add_comment`, `cases.update`, `cases.create` alongside the existing `cases.ts`
  - `agent_builder_platform` plugin server — new attachment type definition for `case_context`
  - `@kbn/agent-builder-server` — allow list updates for new tool IDs
  - Security Solution plugin server (`x-pack/solutions/security/plugins/security_solution/server/agent_builder/skills/`) — new skill definitions: `case_investigation_summary_skill.ts`, `alert_to_case_triage_skill.ts`
  - Security Solution plugin server — updated `register_skills.ts` to include new skills
  - Security Solution plugin server — Threat Hunting Agent updated to include new case mutation tools in its tool set
  - Agent Builder plugin — new workflow step definition `generate_case_report` (common + server + public step type)
- **APIs**: No new API routes — all tools use the existing `CasesClient` CRUD methods server-side. The Kibana Workflow step uses the existing `RunAgent` step infrastructure.
- **Dependencies**: The `agent_builder_platform` plugin already has `cases` as an optional dependency. No new plugin dependencies required.
- **RBAC**: Case mutation tools respect existing Cases RBAC — the `CasesClient` enforces permissions based on the request's user context. No new permission model needed.
- **Risk**: Write operations are irreversible (comments cannot be easily deleted, case status changes are logged). Tool confirmation policies should be configured so the user sees what the agent intends to write before it executes.
