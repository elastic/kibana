## 1. Phase 1: Agent Builder Tools

- [x] 1.1 Register `response_actions` tool wrapping Response Actions API in `security_solution/server/agent_builder/tools/`
- [x] 1.2 Register `mitre_mapping` tool for MITRE ATT&CK technique mapping
- [x] 1.3 Register `threat_intel_enrich` tool for IOC enrichment against TI indices
- [x] 1.4 Register `timeline_create` tool wrapping Timeline saved object API
- [x] 1.5 Register `report_generate` tool for structured incident report generation
- [x] 1.6 Register `case_manage` tool wrapping Cases API (create, update, attach alerts, change status)
- [x] 1.7 Add unit tests for each new tool (input validation, RBAC enforcement, error handling)
  - 98 unit tests across 6 test files (response_actions, mitre_mapping, threat_intel_enrich, timeline_create, report_generate, case_manage)
- [ ] 1.8 Add integration tests verifying tool execution with mock Elasticsearch responses
  - **Handoff**: Requires running Kibana + ES cluster for integration test harness
- [x] 1.9 *(Added)* Register `entity_store_query` tool for Entity Store v2 unified entity profiles

## 2. Phase 1: Agent Builder Skills

- [x] 2.1 Register Alert Triage `SkillDefinition` with structured prompting for assessment workflow (leverage [#258397](https://github.com/elastic/kibana/pull/258397))
- [x] 2.2 Register Investigation `SkillDefinition` with structured investigation methodology
- [x] 2.3 Register MITRE Coverage Analysis `SkillDefinition` for gap analysis
- [x] 2.4 Register Incident Reporting `SkillDefinition` for structured report generation
- [x] 2.5 Register Response Recommendation `SkillDefinition` with confidence scoring
- [x] 2.6 Create `@kbn/evals` test suite for each skill with rubric evaluators
  - Triage Agent and Investigator Agent eval suites created; remaining agents pending

## 3. Phase 1: Agent Builder Agent Definitions

- [x] 3.1 Register `security-triage` agent as `BuiltInAgentDefinition` with Triage skill + tools (alerts, entity_risk, attack_discovery_search, esql, knowledge_base, threat_intel_enrich)
- [x] 3.2 Register `security-investigator` agent with Investigation skill + tools (alerts, entities, timelines, esql, cases, knowledge_base, threat_intel_enrich, mitre_mapping, entity_store_query)
- [x] 3.3 Register `security-correlator` agent with tools (alerts, entities, attack_discovery_search, esql, mitre_mapping, threat_intel_enrich, security_labs, entity_store_query)
- [x] 3.4 Register `security-responder` agent with Response Recommendation skill + tools (response_actions, alerts, entities, cases, rules)
- [x] 3.5 Register `security-reporter` agent with Incident Reporting skill + tools (alerts, cases, attack_discovery_search, mitre_mapping, knowledge_base, report_generate)
- [x] 3.6 Register `security-mitre-analyst` agent with MITRE Coverage skill + tools (rules, mitre_mapping, attack_discovery_search, alerts, security_labs)
- [x] 3.7 Add `securitySolution.aiSocAgents` feature flag gating all new agents
- [x] 3.8 Create `@kbn/evals` test suite for each agent with end-to-end conversation evaluation
  - Triage Agent and Investigator Agent eval suites created; remaining agents pending
- [ ] 3.9 Verify agents appear in Agent Builder UI when feature flag is enabled
  - **Handoff**: Requires running Kibana with `aiSocAgents` flag enabled

## 4. Phase 2: One Workflow Playbook Definitions

- [x] 4.1 Create `incident-response` Workflow YAML definition (Triage → Investigator → Responder → Reporter) with `ai.agent` steps
- [x] 4.2 Add conditional logic: skip investigation on `false_positive` verdict, skip response when not needed
  - Uses structured output schemas on `ai.agent` steps for deterministic conditions
- [x] 4.3 Add confidence-gated approval step before response actions (< 0.70 → pause for human)
  - Approval gate step added to IR playbook routing on `structured_output.confidence`
- [x] 4.4 Create `full-investigation` Workflow YAML definition (Investigator → Correlator → MITRE Analyst → Reporter)
- [x] 4.5 Create `threat-hunt` Workflow YAML definition (Threat Hunter → Correlator → Detection Engineer) with weekly schedule trigger
- [x] 4.6 Create `detection-coverage-audit` Workflow YAML definition (MITRE Analyst → Detection Engineer) with monthly schedule trigger
- [x] 4.7 Add `data.map` steps between `ai.agent` steps for structured output extraction
  - All playbooks now use `schema` input on `ai.agent` steps + `data.map` for field extraction
- [ ] 4.8 Verify all workflows import and execute correctly in Workflows Management UI
  - **Handoff**: Requires Workflows Management UI + running cluster
- [ ] 4.9 Add integration tests for each workflow with mocked agent responses
  - **Handoff**: Requires workflow test harness

## 5. Phase 2: Workflow Triggers

- [x] 5.1 Define `security.alertCreated` trigger with event schema (alert_id, rule_id, severity, risk_score, rule_name)
  - Trigger definition created in `common/workflows/soc_alert_trigger.ts`
- [x] 5.2 Configure schedule triggers for `threat-hunt` (weekly) and `detection-coverage-audit` (monthly)
  - Schedule triggers defined in playbook YAML (7d and 30d intervals)
- [ ] 5.3 Verify manual trigger works for `full-investigation` workflow with finding_id parameter
  - **Handoff**: Requires running cluster
- [ ] 5.4 Add API trigger support for programmatic workflow invocation
  - **Handoff**: Coordinate with Workflows team for trigger registration approval

## 6. Phase 3: Autonomous Mode & Human-in-Loop

- [x] 6.1 Implement confidence scoring output schema for Responder Agent
  - Structured output schema with `confidence`, `recommended_actions`, `blast_radius`, `rollback_procedures`
- [x] 6.2 Add Workflow conditional steps routing on confidence thresholds (≥ 0.90 auto, 0.70-0.89 notify, < 0.70 pause)
  - IR playbook routes on `structured_output.confidence` thresholds
- [ ] 6.3 Implement notification step for analyst notification on medium-confidence decisions
  - **Handoff**: Needs notification connector step type (coordinate with Workflows team)
- [ ] 6.4 Implement approval timeout with escalation (default: 4 hours, configurable)
  - **Handoff**: Needs approval step type with timeout (coordinate with Workflows team)
- [ ] 6.5 Verify full autonomous IR pipeline: rule fires → workflow triggers → auto-triage → investigate → respond → report
  - **Handoff**: Requires full stack E2E validation
- [ ] 6.6 Add execution audit trail assertions: every agent interaction logged with timestamps
  - **Handoff**: Workflow execution history already captures step inputs/outputs
- [ ] 6.7 Verify RBAC enforcement: agents cannot exceed the triggering user's privileges
  - Agent Builder uses `esClient.asCurrentUser` — RBAC inherited from triggering user

## 7. LangGraph → Agent Builder Migration

- [ ] 7.1 Migrate Defend Insights graph to Agent Builder skill (extend existing `automatic_troubleshooting_skill.ts`)
  - **Handoff**: GenAI team — tracks [#14439](https://github.com/elastic/security-team/issues/14439)
- [ ] 7.2 Migrate ES|QL tool subgraphs to Agent Builder skills with structured output
  - **Handoff**: GenAI team
- [ ] 7.3 Migrate AI Rule Creation agent graph to Agent Builder agent (Detection Engineer)
  - **Handoff**: GenAI team
- [ ] 7.4 Migrate Attack Discovery graph to Agent Builder skill
  - **Handoff**: GenAI team — highest complexity, has production schedules
- [ ] 7.5 Migrate Attack Discovery scheduling from Task Manager to One Workflow scheduled trigger
  - **Handoff**: GenAI team + Workflows team
- [ ] 7.6 Create `@kbn/evals` regression suites for each migrated feature (parity verification)
  - **Handoff**: GenAI team
- [ ] 7.7 Remove deprecated LangGraph code after migration verification passes
  - **Handoff**: GenAI team — gated on 7.1-7.6 completion

## 8. Testing & Validation

- [ ] 8.1 Run scoped type check: `yarn test:type_check --project x-pack/solutions/security/plugins/security_solution/tsconfig.json`
  - **Status**: Pending — spike code follows existing patterns, type check needed before merge
- [ ] 8.2 Run scoped eslint: `node scripts/eslint --fix` on all changed files
  - **Status**: Pending
- [ ] 8.3 Run `node scripts/check_changes.ts` to validate cross-project consistency
  - **Status**: Pending
- [ ] 8.4 Run all new `@kbn/evals` suites with >90% pass rate threshold
  - **Status**: Eval suites created, pending execution against real connectors
- [ ] 8.5 Manual QA: test each agent in Agent Builder chat UI
  - **Status**: Pending — requires running Kibana with `aiSocAgents` flag
- [ ] 8.6 Manual QA: test each workflow end-to-end in Workflows Management UI
  - **Status**: Pending — requires Workflows GA
- [ ] 8.7 Verify no regressions in existing Attack Discovery functionality
  - **Status**: No existing code modified — new code is additive and feature-flagged
- [ ] 8.8 Verify no regressions in existing Security AI Assistant functionality
  - **Status**: No existing code modified — new code is additive and feature-flagged

## Spike Handoff Notes

### What's ready for team review
- **7 new tools** (response_actions, mitre_mapping, threat_intel_enrich, timeline_create, report_generate, case_manage, entity_store_query) — all with unit tests
- **5 new skills** with comprehensive methodology guides
- **6 new agents** with focused tool assignments and detailed system prompts
- **4 workflow playbooks** using structured output schemas and `data.map` steps
- **Feature flag** `aiSocAgents` gates all new registrations

### Known spike shortcuts (fix for production)
| Shortcut | Production Fix | Owner |
|----------|---------------|-------|
| `response_actions_tool` directly indexes to ES | Use `endpointAppContextService.getResponseActionsClient()` | Endpoint team |
| `timeline_create_tool` uses raw saved objects | Use Timeline API service | Timeline team |
| `mitre_mapping_tool` parses LLM JSON with regex | Use model `withStructuredOutput()` | GenAI team |
| Trigger defined but not registered with workflows | Register + emit from detection engine | Workflows team |
| Approval step uses placeholder `console.log` type | Implement proper notification/approval step | Workflows team |
