## 1. Prerequisites & Allow List

- [ ] 1.1 Add `security.hunt_iocs` and `platform.core.cases.add_observable` to tool ID constants and allow lists in `@kbn/agent-builder-common` and `@kbn/agent-builder-server`
- [ ] 1.2 Verify the foundational `cases-agent-builder-integration` mutation tools are available (dependency)

## 2. Observable Extraction Tool

- [ ] 2.1 Create `cases_add_observable.ts` in `agent_builder_platform/server/tools/cases/` — implement `platform.core.cases.add_observable` using `CasesClient.addObservable()` with confirmation policy, duplicate detection, and observable type validation
- [ ] 2.2 Register the tool in `agent_builder_platform` plugin setup, gated on Cases plugin availability
- [ ] 2.3 Write unit tests — cover: successful add, duplicate rejection, invalid type, permission error

## 3. IOC Sweep Tool

- [ ] 3.1 Create `hunt_iocs_tool.ts` in `security_solution/server/agent_builder/tools/` — implement `security.hunt_iocs` with templated ES|QL queries per IOC type (IP, hash, domain, user), time windowing, batch execution (max 10 concurrent), and result limits
- [ ] 3.2 Define ES|QL query templates for each IOC type in a separate `hunt_iocs_queries.ts` helper — IP searches `source.ip`/`destination.ip`, hash searches `process.hash.*`/`file.hash.*`, domain searches `dns.question.name`/`url.domain`, user searches `user.name`
- [ ] 3.3 Register the tool in `security_solution/server/agent_builder/tools/register_tools.ts`
- [ ] 3.4 Write unit tests — cover: single IOC hunt, multi-type hunt, too many IOCs rejection, no matches, time window validation

## 4. Executable Playbooks Skill

- [ ] 4.1 Create `playbook_executor_skill.ts` in `security_solution/server/agent_builder/skills/` — define the skill with step parsing instructions, tool mapping guidance, planning mode instructions, and per-step report template
- [ ] 4.2 Implement the inline tool `security.playbook.get-investigation-guide` — fetch rule investigation guide via alerting `rulesClient`, accept `ruleId` or `alertId`, return guide markdown + rule metadata + MITRE techniques
- [ ] 4.3 Register the skill in `register_skills.ts`

## 5. Campaign Analysis Skill

- [ ] 5.1 Create `campaign_analysis_skill.ts` in `security_solution/server/agent_builder/skills/` — define the skill with dual correlation approach (observable + alert based), IOC significance filtering instructions, campaign report template, and planning mode section
- [ ] 5.2 Register the skill in `register_skills.ts`

## 6. Hunt-from-Case Skill

- [ ] 6.1 Create `hunt_from_case_skill.ts` in `security_solution/server/agent_builder/skills/` — define the skill with IOC extraction instructions, benign indicator filtering, `security.hunt_iocs` orchestration, observable registration, and follow-up case creation guidance
- [ ] 6.2 Register the skill in `register_skills.ts`

## 7. Detection Gap Analysis Skill

- [ ] 7.1 Create `detection_gap_analysis_skill.ts` in `security_solution/server/agent_builder/skills/` — define the skill with MITRE technique extraction, rule coverage inventory, gap identification, rule proposal composition, and `security.create_detection_rule` integration
- [ ] 7.2 Register the skill in `register_skills.ts`

## 8. Case Retrospective Skill

- [ ] 8.1 Create `case_retrospective_skill.ts` in `security_solution/server/agent_builder/skills/` — define the skill with timeline reconstruction, TTD/TTR/TTRS calculation instructions, investigation summary, detection coverage analysis, and lessons-learned template
- [ ] 8.2 Register the skill in `register_skills.ts`

## 9. Threat Hunting Agent Update

- [ ] 9.1 Update `threat_hunting_agent.ts` to include `security.hunt_iocs` in `SECURITY_TOOL_IDS` and `platform.core.cases.add_observable` in `PLATFORM_TOOL_IDS`

## 10. Escalation Workflow Step

- [ ] 10.1 Create `case_escalation` step common definition in `agent_builder/common/step_types/` — define step type ID, input schema (caseId, conditions, actions), output schema
- [ ] 10.2 Create server-side step handler — implement condition evaluation (severity check, tag check, SLA duration check with AND logic), then action execution (update case, push to connector, generate summary, add comment)
- [ ] 10.3 Create public-side step definition with label "Case Escalation", description, and Automation category
- [ ] 10.4 Gate registration on both `workflowsExtensions` and `cases` plugin availability
- [ ] 10.5 Write unit tests for condition evaluation — cover: severity match, tag match, SLA check, all conditions AND logic, conditions not met

## 11. Integration Testing

- [ ] 11.1 Write integration test for `security.hunt_iocs` — verify ES|QL query generation and execution against a test index with sample data
- [ ] 11.2 Write integration test for `platform.core.cases.add_observable` — verify observable is added to a case and deduplication works
- [ ] 11.3 Write integration test for the escalation workflow step — verify condition evaluation and action execution end-to-end
