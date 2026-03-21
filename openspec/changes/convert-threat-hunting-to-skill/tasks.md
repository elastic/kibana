## 1. Scaffolding and feature flag gating

- [ ] 1.1 Create `server/agent_builder/skills/` directory in security_solution plugin (alongside existing `agents/` and `tools/`)
- [ ] 1.2 Import `SKILLS_ENABLED` from the agent_builder plugin's skills constants module
- [ ] 1.3 Update `createThreatHuntingAgent` availability handler to return `{ status: 'unavailable', reason: 'Replaced by security skills' }` when `SKILLS_ENABLED` is `true`, delegating to `getAgentBuilderResourceAvailability` otherwise
- [ ] 1.4 Add unit test: agent returns `unavailable` when `SKILLS_ENABLED` is `true`
- [ ] 1.5 Add unit test: agent delegates to space-based availability when `SKILLS_ENABLED` is `false`

## 2. New registry tool — manage_rule_exceptions

- [ ] 2.1 Create `server/agent_builder/tools/manage_rule_exceptions_tool.ts` following the `create_detection_rule_tool.ts` pattern — accepts `rule_id` and `items` array with exception entries
- [ ] 2.2 Implement entry schema as discriminated union: `match` (field + value), `match_any` (field + values), `exists` (field), `wildcard` (field + pattern) — each with `operator: 'included' | 'excluded'`
- [ ] 2.3 Implement handler: use `core.getStartServices()` → `alerting.getRulesClientWithRequest()` to find rule by `rule_id`, `lists.getExceptionListClient()` to create exception items
- [ ] 2.4 Implement `getOrCreateDefaultExceptionList` helper — finds existing default list or creates one and associates it with the rule
- [ ] 2.5 Add availability handler gated by `getAgentBuilderResourceAvailability` (space check)
- [ ] 2.6 Export `SECURITY_MANAGE_RULE_EXCEPTIONS_TOOL_ID` and `manageRuleExceptionsTool` from tool index
- [ ] 2.7 Register tool in `register_tools.ts` via `agentBuilder.tools.register(manageRuleExceptionsTool(core, logger))`
- [ ] 2.8 Add `security.manage_rule_exceptions` to `AGENT_BUILDER_BUILTIN_TOOLS` in `@kbn/agent-builder-server/allow_lists.ts`
- [ ] 2.9 Add unit test: tool returns error for nonexistent rule_id
- [ ] 2.10 Add unit test: tool creates exception item on rule with existing default exception list
- [ ] 2.11 Add unit test: tool auto-creates default exception list when rule has none
- [ ] 2.12 Add unit test: tool validates entry schema (rejects invalid entry types)

## 3. Threat hunting skill

- [ ] 3.1 Create `server/agent_builder/skills/threat_hunting_skill.ts` with `defineSkillType()` — id: `threat-hunting`, basePath: `skills/security`, name: `threat-hunting`
- [ ] 3.2 Write skill content: hypothesis formulation, data source identification, iterative ES|QL exploration workflow, IOC enrichment steps, anomaly identification, finding documentation, cross-references to alert-analysis/detection-engineering/entity-investigation skills
- [ ] 3.3 Implement `getAllowedTools()` returning `['platform.core.generate_esql', 'platform.core.execute_esql', 'platform.core.search', 'platform.core.list_indices', 'platform.core.get_index_mapping']`
- [ ] 3.4 Add referenced content: `./queries/lateral-movement.md` — ES|QL template for lateral movement detection
- [ ] 3.5 Add referenced content: `./queries/c2-beaconing.md` — ES|QL template for C2 beaconing patterns
- [ ] 3.6 Add referenced content: `./queries/brute-force.md` — ES|QL template for brute force / credential spraying
- [ ] 3.7 Add referenced content: `./queries/rare-process-execution.md` — ES|QL template for rare process execution
- [ ] 3.8 Add unit test: skill validates successfully via `validateSkillDefinition()` (5 tools, under 7 limit)
- [ ] 3.9 Add unit test: skill content is non-empty and description is under 1024 characters

## 4. Alert analysis skill

- [ ] 4.1 Create `server/agent_builder/skills/alert_analysis_skill.ts` with `defineSkillType()` — id: `alert-analysis`, basePath: `skills/security/alerts`, name: `alert-analysis`
- [ ] 4.2 Write skill content: initial alert assessment, related alert discovery, Security Labs enrichment, related case lookup, threat identification, finding synthesis, cross-references to entity-investigation and detection-engineering skills
- [ ] 4.3 Implement `getAllowedTools()` returning `['security.alerts', 'security.security_labs_search', 'security.entity_risk_score']`
- [ ] 4.4 Implement `getInlineTools()` with `get-related-alerts` tool — schema: `{ alertId: z.string(), timeWindowHours: z.number().min(1).max(168).default(24) }`, handler queries `.alerts-security.alerts-*` using `esClient.asCurrentUser` for alerts sharing entity values (host.name, user.name, source.ip, destination.ip) with the source alert
- [ ] 4.5 Add referenced content: `./queries/related-by-entities.md` — ES|QL template for finding alerts by shared entities
- [ ] 4.6 Add unit test: skill validates successfully (3 allowed + 1 inline = 4 tools, under 7 limit)
- [ ] 4.7 Add unit test: `get-related-alerts` inline tool returns expected shape for known alert entities
- [ ] 4.8 Add unit test: `get-related-alerts` returns empty results when no related alerts exist

## 5. Detection engineering skill

- [ ] 5.1 Create `server/agent_builder/skills/detection_engineering_skill.ts` with `defineSkillType()` — id: `detection-engineering`, basePath: `skills/security/alerts/rules`, name: `detection-engineering`
- [ ] 5.2 Write skill content: coverage gap assessment, rule type selection (KQL/EQL/ES|QL/threshold/ML), query writing, MITRE ATT&CK mapping, severity/risk score assignment, exception management, production volume testing, cross-references to threat-hunting and alert-analysis skills
- [ ] 5.3 Implement `getAllowedTools()` returning `['security.alerts', 'security.attack_discovery_search', 'security.create_detection_rule', 'security.manage_rule_exceptions']`
- [ ] 5.4 Add referenced content: `./templates/kql-rule.md` — parameterized KQL detection rule template
- [ ] 5.5 Add referenced content: `./templates/eql-sequence.md` — parameterized EQL sequence rule template with maxspan/by clause
- [ ] 5.6 Add referenced content: `./templates/threshold-rule.md` — parameterized threshold rule template
- [ ] 5.7 Add unit test: skill validates successfully (4 allowed + 0 inline = 4 tools, under 7 limit)

## 6. Entity investigation skill

- [ ] 6.1 Create `server/agent_builder/skills/entity_investigation_skill.ts` with `defineSkillType()` — id: `entity-investigation`, basePath: `skills/security/entities`, name: `entity-investigation`
- [ ] 6.2 Write skill content: entity type identification, risk score retrieval, activity profiling (auth patterns, process execution, network connections), anomaly identification, cross-source correlation, case creation/update guidance, cross-references to alert-analysis and threat-hunting skills
- [ ] 6.3 Implement `getAllowedTools()` returning `['security.entity_risk_score', 'platform.core.cases', 'platform.core.search']`
- [ ] 6.4 Add referenced content: `./queries/user-auth-profile.md` — ES|QL template for user authentication pattern analysis
- [ ] 6.5 Add referenced content: `./queries/host-process-baseline.md` — ES|QL template for host process execution profiling
- [ ] 6.6 Add unit test: skill validates successfully (3 tools, under 7 limit)

## 7. Skill registration

- [ ] 7.1 Create `server/agent_builder/skills/register_skills.ts` that exports `registerSkills(agentBuilder)` calling `agentBuilder.skill.registerSkill()` for all 4 skills
- [ ] 7.2 Update `server/agent_builder/skills/index.ts` to re-export `registerSkills` and all skill definitions
- [ ] 7.3 Verify `registerSkills` is called in the security_solution plugin setup (uncomment existing call on feature branch and wire up)
- [ ] 7.4 Add integration test: all 4 skills are registered in the SkillRegistry after plugin setup
- [ ] 7.5 Add integration test: all 4 skills appear in the VFS when `SKILLS_ENABLED` is `true`
- [ ] 7.6 Add integration test: no skills appear in VFS when `SKILLS_ENABLED` is `false`

## 8. Cross-skill and cross-tool validation

- [ ] 8.1 Add test: no duplicate skill IDs across all 4 skills
- [ ] 8.2 Add test: no duplicate skill paths (basePath + name combinations) across all 4 skills
- [ ] 8.3 Add test: all `getAllowedTools()` tool IDs reference tools that exist in `AGENT_BUILDER_BUILTIN_TOOLS` allow list
- [ ] 8.4 Add test: skill descriptions are distinct (no two descriptions are semantically identical)
- [ ] 8.5 Verify `SkillsDirectoryStructure` already supports all 4 basePaths — no type changes needed
- [ ] 8.6 Verify `security.create_detection_rule` exists in registry and is in allow list (already present on feature branch)
- [ ] 8.7 Verify `security.manage_rule_exceptions` is in allow list after task 2.8
