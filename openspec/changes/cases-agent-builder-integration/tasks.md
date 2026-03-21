## 1. Allow List & Common Types

- [ ] 1.1 Add `platform.core.cases.create`, `platform.core.cases.add_comment`, and `platform.core.cases.update` to `platformCoreTools` in `@kbn/agent-builder-common`
- [ ] 1.2 Add the three new tool IDs to the allow list in `@kbn/agent-builder-server/allow_lists.ts`

## 2. Cases Mutation Tools

- [ ] 2.1 Create `cases_create.ts` in `agent_builder_platform/server/tools/cases/` — implement the `platform.core.cases.create` tool using `CasesClient.cases.create()` with confirmation policy `always`
- [ ] 2.2 Create `cases_add_comment.ts` in `agent_builder_platform/server/tools/cases/` — implement the `platform.core.cases.add_comment` tool using `CasesClient.attachments.add()` with type `user` and confirmation policy `always`
- [ ] 2.3 Create `cases_update.ts` in `agent_builder_platform/server/tools/cases/` — implement the `platform.core.cases.update` tool using `CasesClient.cases.bulkUpdate()` with version fetch + retry logic and confirmation policy `always`
- [ ] 2.4 Add shared helpers in `helpers.ts` for user-friendly error wrapping of CasesClient permission errors
- [ ] 2.5 Register all three mutation tools in the `agent_builder_platform` plugin setup, gated on the `cases` optional plugin being available
- [ ] 2.6 Write unit tests for `cases_create.ts` — cover: successful creation, required-only fields, full metadata, permission error, validation error
- [ ] 2.7 Write unit tests for `cases_add_comment.ts` — cover: successful comment, case not found, empty comment rejection, permission error
- [ ] 2.8 Write unit tests for `cases_update.ts` — cover: successful update, multi-field update, no-fields error, version conflict retry, permission error

## 3. Case Investigation Skills

- [ ] 3.1 Create `case_investigation_summary_skill.ts` in `security_solution/server/agent_builder/skills/` — define the skill with the 5-step investigation process, structured markdown template, and `getAllowedTools()` returning the 5 required tool IDs
- [ ] 3.2 Create `alert_to_case_triage_skill.ts` in `security_solution/server/agent_builder/skills/` — define the skill with the 4-step triage-to-case lifecycle and `getAllowedTools()` returning the 7 required tool IDs
- [ ] 3.3 Update `register_skills.ts` in the Security Solution plugin to register both new skills via `agentBuilder.skills.register()`
- [ ] 3.4 Update the Threat Hunting Agent tool set in `threat_hunting_agent.ts` to include `platform.core.cases.create`, `platform.core.cases.add_comment`, and `platform.core.cases.update` in `PLATFORM_TOOL_IDS`

## 4. Case Context Attachment Type

- [ ] 4.1 Create `case_context.ts` attachment type definition in `agent_builder_platform/server/tools/cases/` (or a new `attachments/` directory) — define the schema (`caseId`, `includeComments`), the snapshot fetcher, the display metadata, and the bounded tool `case_context.get_case`
- [ ] 4.2 Register the `case_context` attachment type in `agent_builder_platform` plugin setup, gated on the `cases` optional plugin being available
- [ ] 4.3 Write unit tests for the case context attachment — cover: successful creation, case not found, bounded tool returns snapshot data

## 5. Workflow Step

- [ ] 5.1 Create the `generate_case_report` step common definition in `agent_builder/common/step_types/` — define the step type ID, input schema (`caseId`, optional `agentId`), and output schema
- [ ] 5.2 Create the server-side step handler in `agent_builder/server/step_types/` — implement agent execution with the case investigation skill prompt
- [ ] 5.3 Create the public-side step definition in `agent_builder/public/step_types/` — register with `workflowsExtensions` with label, description, and AI actions category
- [ ] 5.4 Gate step registration on both `workflowsExtensions` and `cases` plugins being available
- [ ] 5.5 Write unit tests for the server-side step handler — cover: successful execution, invalid case ID, custom agent ID

## 6. Integration Testing

- [ ] 6.1 Write an integration test verifying the `platform.core.cases.create` tool creates a case end-to-end via the Agent Builder tool execution API
- [ ] 6.2 Write an integration test verifying the `platform.core.cases.add_comment` tool adds a comment to an existing case
- [ ] 6.3 Write an integration test verifying the `platform.core.cases.update` tool updates case metadata
- [ ] 6.4 Write an integration test verifying the case context attachment is created and the bounded tool returns data
