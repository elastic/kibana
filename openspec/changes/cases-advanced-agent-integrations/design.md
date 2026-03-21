## Context

This change builds on the foundational `cases-agent-builder-integration` which provides three case mutation tools (`cases.create`, `cases.add_comment`, `cases.update`), two investigation skills, a workflow step, and a case context attachment type. That foundation gives the agent basic read/write access to Cases. This change adds higher-order capabilities that compose those primitives into workflows that would take analysts hours or days to perform manually.

Key architecture elements this design builds on:

- **Detection rule investigation guides**: Detection rules store a `note` field (markdown) that contains step-by-step investigation instructions. These are displayed in the alert flyout's Investigation tab. The rules client (`alerting.getRulesClientWithRequest()`) can fetch rule details including the `note`. The security alerts tool already uses `runSearchTool` which generates ES|QL from natural language — the same infrastructure can execute investigation guide steps.
- **Cases observables**: Cases have a first-class `observables` system (`CasesClient.addObservable()`, `CasesClient.updateObservable()`, `CasesClient.bulkAddObservables()`). Observables are typed IOCs (IP, hash, domain, URL, etc.) that can be used for `CasesClient.similar()` cross-case correlation. The observable data model is already defined in Cases — no new data model needed.
- **ES|QL execution**: The `@kbn/agent-builder-genai-utils` package provides `executeEsql()` for direct query execution and `runSearchTool()` for NL-to-ES|QL. The `platform.core.execute_esql` and `platform.core.generate_esql` tools expose this to agents. IOC hunting queries are well-suited for templated ES|QL.
- **Create detection rule tool**: `security.create_detection_rule` already exists — it takes a natural language description and produces a fully configured detection rule. The detection gap analysis skill can use this directly.
- **Kibana Workflows**: The `workflowsExtensions` API supports step definitions with triggers, conditions, and actions. The existing `RunAgent` step enables executing any agent from a workflow. Case escalation can be built as a workflow step that composes conditions (severity check) with agent execution.
- **Planning mode** (from `agent-builder-planning-mode` change): The advanced skills — especially `playbook-executor` and `campaign-analysis` — are natural candidates for the planning mode. The agent can create a structured plan from the investigation guide steps, get user approval, then execute. This design assumes planning mode may or may not be available and the skills should work in both modes.

## Goals / Non-Goals

**Goals:**
- The agent can read a detection rule's investigation guide and execute each step using available tools, producing per-step results and a final investigation report
- The agent can correlate multiple cases to identify attack campaigns, shared IOCs, common MITRE techniques, and affected entity overlap
- The agent can extract IOCs from case data and run proactive threat hunting queries across the environment
- The agent can identify detection gaps after an investigation and propose new detection rules
- The agent can extract and manage case observables (IOCs) to power cross-case correlation
- The agent can generate post-incident retrospectives with response metrics and improvement recommendations
- Automated case escalation workflows can trigger on severity/tag/SLA conditions
- All capabilities work with the planning mode when available (creating a plan from investigation guide steps, getting approval, then executing)

**Non-Goals:**
- No real-time streaming of investigation guide execution (the agent executes steps sequentially and reports at the end of each step; real-time per-step streaming is a future enhancement)
- No custom investigation guide editor (the existing rule `note` markdown field is the source of truth)
- No automated observable extraction from unstructured text (the agent extracts IOCs from structured alert fields; NLP-based extraction from comment text is out of scope)
- No graph visualization of campaign relationships (the campaign report is text-based; a visual graph is a future UI enhancement)
- No automatic rule deployment (the `create_detection_rule` tool creates the rule but it starts disabled; an analyst must review and enable it)
- No SLA tracking system (the escalation workflow checks time-based conditions but doesn't implement a full SLA tracking framework)

## Decisions

### 1. Playbook executor parses investigation guides as ordered step lists

**Decision**: The `playbook-executor` skill instructs the agent to treat the investigation guide markdown as an ordered list of investigation steps. Each markdown heading (`###`) or numbered item is a step. The agent maps each step to available tool calls, executes them, collects results, and produces a per-step report.

**Rationale**: Investigation guides are semi-structured markdown with varying formats across rules. Rather than building a rigid parser, we rely on the LLM's ability to understand natural language instructions and map them to tool calls. The skill content provides:
- Instructions on how to read the guide (treat headings as steps)
- A mapping guide from common investigation phrases to tool calls (e.g., "check if the user..." → ES|QL query, "review network connections" → network forensics skill)
- A template for per-step reporting (step name, tool used, findings, assessment)

**Risk**: LLM may misinterpret ambiguous steps or fail to map them to tools. **Mitigation**: The skill includes fallback instructions: "If you cannot determine which tool to use for a step, note it as 'Manual step — requires analyst action' and proceed to the next step."

**Planning mode synergy**: When planning mode is available, the agent can first create a plan from the investigation guide (one plan item per step), get analyst approval, then execute. This gives the analyst a chance to modify the execution sequence before the agent starts working.

### 2. Investigation guide fetched via inline tool, not direct rules client access

**Decision**: The `playbook-executor` skill provides an inline tool `security.playbook.get-investigation-guide` that fetches the investigation guide for a given rule ID or alert ID. The tool uses the alerting `rulesClient` to fetch the rule and extract the `note` field.

**Rationale**: Skills can define inline tools via `getInlineTools()`. This keeps the rules client access encapsulated within the tool handler rather than requiring the agent to have direct access to the rules client. The inline tool:
- Accepts either `ruleId` or `alertId` (and extracts the rule ID from the alert)
- Returns the investigation guide markdown, rule name, severity, and MITRE technique references
- Returns an error if no investigation guide exists for the rule

### 3. Campaign analysis uses observables + alert correlation

**Decision**: The `campaign-analysis` skill uses a two-pronged approach:
1. **Observable-based**: Uses `CasesClient.similar()` to find cases with matching observables (IPs, hashes, domains)
2. **Alert-based**: Uses `platform.core.cases` with `alertIds` to find cases sharing alerts, then `security.attack_discovery_search` to find attack discoveries linking the same alerts

**Rationale**: Neither approach alone is sufficient. Observable matching finds cases with shared IOCs even if they don't share alerts. Alert matching finds cases with shared detection triggers even if the IOCs differ. Together, they provide a comprehensive view of campaign scope. The skill output includes:
- Campaign timeline (earliest to latest activity)
- Shared IOCs across cases (with frequency counts)
- Common MITRE techniques
- Affected entities (hosts, users) with deduplication
- Attack progression narrative
- Recommended containment scope

### 4. IOC sweep tool generates templated ES|QL queries

**Decision**: The `security.hunt_iocs` tool takes a structured list of IOCs (`{ type: 'ip' | 'hash' | 'domain' | 'user', value: string }[]`) and generates targeted ES|QL queries per IOC type against appropriate indices. It does NOT use NL-to-ES|QL — instead, it uses templated queries with parameter substitution.

**Rationale**: IOC hunting queries are well-defined patterns:
- IP → search `source.ip`, `destination.ip` across logs and alerts
- Hash → search `process.hash.sha256`, `file.hash.sha256` across endpoint data
- Domain → search `dns.question.name`, `url.domain` across network data
- User → search `user.name` across authentication and alerts data

Templated queries are more reliable than NL-to-ES|QL for these specific patterns. The tool:
- Generates one query per IOC type/value combination
- Limits time range to a configurable window (default 30 days)
- Limits results per query (default 100)
- Returns structured results: `{ ioc, type, matches: [{ index, timestamp, context }] }`
- Batches queries to avoid overloading Elasticsearch (max 10 concurrent)

### 5. Detection gap analysis maps MITRE coverage

**Decision**: The `detection-gap-analysis` skill compares the MITRE ATT&CK techniques observed in a case (from alerts) against the techniques covered by existing detection rules. The gap is the set of observed techniques with no corresponding active rule.

**Rationale**: This is a concrete, actionable analysis:
- The agent reads all alerts in the case and extracts their MITRE technique IDs
- The agent queries the detection rules index for active rules covering each technique
- Techniques with no matching rule are flagged as gaps
- For each gap, the agent describes the attack behavior and proposes a detection rule description
- The analyst can approve rule creation using the existing `security.create_detection_rule` tool

The skill does NOT automatically create rules — it presents the gaps and proposed descriptions. The analyst uses the confirmation-gated `create_detection_rule` tool if they want to proceed.

### 6. Observable extraction tool follows the Cases observable schema

**Decision**: The `platform.core.cases.add_observable` tool accepts `caseId` and an observable (`{ typeKey: string, value: string, description?: string }`). The `typeKey` follows the Cases observable type registry (e.g., `'ipv4'`, `'sha256'`, `'domain'`). The tool uses `CasesClient.addObservable()`.

**Rationale**: Cases already has a well-defined observable data model and type registry. The tool wraps `addObservable()` with:
- Validation against known observable types
- Deduplication check (does this observable already exist on the case?)
- User confirmation (same as other mutation tools)
- Returns the updated list of observables for the case

The `hunt-from-case` skill uses this tool to register discovered IOCs as observables, which then powers `CasesClient.similar()` for campaign analysis.

### 7. Case retrospective calculates response metrics from user actions

**Decision**: The `case-retrospective` skill calculates investigation metrics by analyzing the case's user action log (available via `CasesClient` user actions API). Key metrics:
- **Time-to-detect (TTD)**: Time from first alert timestamp to case creation
- **Time-to-respond (TTR)**: Time from case creation to first status change to `in-progress`
- **Time-to-resolve (TTRS)**: Time from case creation to status `closed`
- **Investigation steps**: Count and types of comments/actions taken
- **Escalation events**: Severity changes, assignee changes

**Rationale**: These metrics are directly derivable from existing case data without any new instrumentation. The retrospective also includes qualitative analysis: what went well, what could be improved, and detection coverage recommendations (connecting to the gap analysis skill).

### 8. Escalation workflow uses Cases connector actions

**Decision**: The `case_escalation` workflow step:
- Accepts conditions: `{ severity?: string, tags?: string[], slaMinutes?: number }`
- Accepts actions: `{ assignTo?: string[], pushToConnector?: boolean, generateSummary?: boolean }`
- Uses the existing Cases connector integration (`CasesClient.push()`) for external ticketing
- Uses `cases.update` for assignee changes
- Uses `cases.add_comment` for escalation summaries

**Rationale**: Cases already supports external service connectors (Jira, ServiceNow, IBM Resilient, Swimlane) via the `push` API. The escalation workflow composes existing primitives rather than building new escalation infrastructure. The workflow step is a thin condition-checker + action-dispatcher.

### 9. Skills designed for planning mode compatibility

**Decision**: All advanced skills include a "planning phase" section in their content that describes how the agent should create a plan when in planning mode. For example, the `playbook-executor` skill says:

> "If planning mode is active, first create a plan with one action item per investigation guide step. Mark the plan as ready and wait for approval before executing any steps."

**Rationale**: The planning mode (`agent-builder-planning-mode` change) is being developed in parallel. Skills that produce structured multi-step investigations are the ideal use case for planning mode — the analyst can review the investigation plan before the agent starts executing tools. By including planning-aware instructions in the skill content, the skills work optimally in both modes:
- **Agent mode**: Agent self-plans (creates a plan with `source: 'agent'`) and immediately executes
- **Planning mode**: Agent creates a plan, waits for approval, then executes step by step

## Risks / Trade-offs

**[Risk] Investigation guide formats vary widely across rules** — Some guides are well-structured with numbered steps and specific queries. Others are vague prose with no actionable steps.
→ **Mitigation**: The `playbook-executor` skill includes instructions for handling different guide formats. Steps that cannot be mapped to tools are marked as "Manual — requires analyst action." The skill also provides a fallback: if no investigation guide exists, it runs the `case-investigation-summary` skill from the foundational change instead.

**[Risk] IOC sweep queries may be expensive on large clusters** — Scanning 30 days of logs for multiple IOCs could be resource-intensive.
→ **Mitigation**: The `hunt_iocs` tool enforces: (1) time-bounded queries with configurable window, (2) per-query result limits, (3) concurrent query limit (max 10), (4) total IOC count limit (max 50 per invocation). The tool description warns the agent to limit the sweep scope.

**[Risk] Campaign analysis may produce false correlations** — Two cases sharing a common IP (e.g., a public DNS server) aren't necessarily part of the same campaign.
→ **Mitigation**: The skill instructions include IOC significance filtering: "Ignore commonly shared infrastructure (public DNS resolvers, CDN IPs, cloud provider ranges). Focus on IOCs that appear in fewer than 10 cases and are flagged by threat intelligence."

**[Risk] Detection rule creation from gap analysis may produce low-quality rules** — The `create_detection_rule` tool relies on LLM-generated ES|QL which may not be production-ready.
→ **Mitigation**: Rules are created in a disabled state. The skill output explicitly tells the analyst: "These rules have been created as disabled drafts. Review the detection logic, test against sample data, and enable when ready." The confirmation policy on the tool provides an additional review gate.

**[Risk] Retrospective metrics may be misleading for complex cases** — TTD/TTR calculations assume a linear case lifecycle. Cases with multiple reopenings, severity changes, or parallel investigations may have misleading metrics.
→ **Mitigation**: The retrospective includes raw timeline data alongside calculated metrics, so analysts can see the full picture. Metrics are presented as "approximate" with caveats for non-linear cases.

**[Trade-off] No real-time step-by-step UI for playbook execution** — The agent executes all steps and reports at the end, rather than showing live progress per step.
→ **Accepted**: Real-time per-step updates would require streaming events per investigation step, which is complex. The planning mode sidebar provides step-level progress tracking when available. For agent mode, the thinking panel shows tool calls in real time.

**[Trade-off] Campaign report is text-based, not visual** — No graph visualization of case relationships, IOC overlap, or attack progression.
→ **Accepted**: A visual campaign graph would require new UI components (force-directed graph, timeline visualization). The text-based report with structured sections is a strong starting point. Visual campaign analysis can be added as a separate UI change.

**[Trade-off] Observable extraction is agent-initiated, not automatic** — The agent must be asked to extract observables; they don't auto-populate when alerts are attached.
→ **Accepted**: Automatic observable extraction would require a Cases plugin hook (on alert attachment, extract IOCs). This is a Cases plugin change, which is out of scope. The agent-driven approach gives the analyst control over which IOCs are registered as observables.
