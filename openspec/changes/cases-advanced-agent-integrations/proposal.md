## Why

The foundational Cases + Agent Builder integration (`cases-agent-builder-integration`) gives the agent the ability to read, create, update, and comment on cases. That unlocks basic investigation workflows. But the real transformative value comes from higher-order capabilities that compose multiple tools, cross-reference data across cases, and close feedback loops that analysts currently handle manually over days or weeks. These advanced integrations target three high-value gaps:

1. **Static playbooks become executable** — Detection rules ship with investigation guides (`rule.note` markdown), but analysts must manually follow each step. The agent can read these guides and *execute* them using available tools, turning static documentation into automated investigation workflows.

2. **Single-case investigations miss the bigger picture** — Real attacks span multiple cases, hosts, and time windows. Analysts must manually correlate cases, track IOCs across the environment, and identify campaigns. The agent can perform cross-case analysis, proactive IOC sweeps, and campaign identification at a speed no human can match.

3. **The detection feedback loop is broken** — After closing a case, the lessons rarely make it back into detection rules, knowledge bases, or team playbooks. The agent can automatically identify detection gaps, create new rules, extract observables, and generate retrospectives that feed forward into improved security posture.

This change assumes the foundational `cases-agent-builder-integration` change is implemented (mutation tools, basic skills, case context attachment).

## What Changes

- **Executable investigation playbooks skill**: A new skill `playbook-executor` that reads the investigation guide from detection rules associated with a case's alerts, parses the steps, and executes each one using available tools (ES|QL queries, alert searches, entity risk checks, host analysis, network forensics). The skill maps natural-language playbook steps to concrete tool invocations, reports results per step, and produces a final investigation report added to the case. This is the highest-impact capability — it turns every detection rule's investigation guide into an automated workflow.

- **Cross-case campaign analysis skill**: A new skill `campaign-analysis` that takes a set of cases (or a single case as a starting point), identifies shared IOCs, MITRE techniques, affected entities, and timelines across cases, and produces a campaign report. It uses the `CasesClient.similar()` API (via observables) and alert correlation to find related cases the analyst may not have connected. The report identifies the campaign's scope, progression, and recommended containment actions.

- **Proactive IOC sweep tool and skill**: A new tool `security.hunt_iocs` that, given a list of IOCs (IPs, hashes, domains, user names), generates and executes ES|QL threat hunting queries across security data indices to find other occurrences. Combined with a `hunt-from-case` skill that extracts IOCs from a case's investigation, runs the sweep, and creates new cases or updates the existing case with any newly discovered affected assets. This turns reactive investigation into proactive threat hunting.

- **Detection gap analysis and rule creation skill**: A new skill `detection-gap-analysis` that, after a case investigation, analyzes what detection rules fired vs. what attack techniques were used (MITRE mapping), identifies gaps where no rule existed, and uses the existing `security.create_detection_rule` tool to propose and create new rules. This closes the feedback loop from incident response back to detection engineering.

- **Observable extraction tool**: A new tool `platform.core.cases.add_observable` that extracts IOCs from case data (alerts, comments, agent findings) and adds them as Case observables using `CasesClient.addObservable()`. Observables (IPs, hashes, domains, user names) are first-class entities in Cases that power the `cases.similar()` API for cross-case correlation.

- **Case retrospective and lessons-learned skill**: A new skill `case-retrospective` that generates a post-incident retrospective when a case is closed: timeline from first alert to closure, mean-time-to-detect and mean-time-to-respond metrics, detection coverage analysis, investigation steps taken, and recommendations for improving detection and response. The retrospective is added as a final case comment.

- **Automated escalation workflow**: A Kibana Workflow that triggers on case condition changes (severity escalated to critical, specific tags added, SLA approaching) and automates escalation actions: update case assignees, push to external ticketing systems via Cases connectors, generate an escalation summary comment, and optionally trigger the investigation playbook.

## Capabilities

### New Capabilities
- `executable-playbooks`: The `playbook-executor` skill that reads detection rule investigation guides, maps steps to tool invocations, executes them, and reports findings back to the case.
- `cross-case-intelligence`: The `campaign-analysis` skill, the `security.hunt_iocs` tool, the `hunt-from-case` skill, and the `platform.core.cases.add_observable` tool — capabilities for correlating intelligence across cases, hunting IOCs proactively, and managing case observables.
- `detection-feedback-loop`: The `detection-gap-analysis` skill and the `case-retrospective` skill — capabilities that close the feedback loop from investigation back to detection engineering and team learning.
- `case-escalation-workflow`: A Kibana Workflow for automated case escalation based on severity, tags, or SLA conditions.

### Modified Capabilities
<!-- No existing specs to modify -->

## Impact

- **Packages affected**:
  - `@kbn/agent-builder-common` — new tool IDs for `security.hunt_iocs` and `platform.core.cases.add_observable`
  - `@kbn/agent-builder-server` — allow list updates
  - `agent_builder_platform` plugin server — new `cases.add_observable` tool, leveraging `CasesClient.addObservable()`
  - Security Solution plugin server (`server/agent_builder/skills/`) — four new skills: `playbook_executor_skill.ts`, `campaign_analysis_skill.ts`, `hunt_from_case_skill.ts`, `detection_gap_analysis_skill.ts`, `case_retrospective_skill.ts`
  - Security Solution plugin server (`server/agent_builder/tools/`) — new `hunt_iocs_tool.ts`
  - Agent Builder plugin — new `case_escalation` workflow step definition
  - Threat Hunting Agent — updated tool set to include `security.hunt_iocs` and `platform.core.cases.add_observable`
- **Dependencies**: Requires the `cases-agent-builder-integration` change (mutation tools, case context attachment). The `security.hunt_iocs` tool uses the existing ES|QL execution infrastructure (`@kbn/agent-builder-genai-utils`). The `playbook-executor` skill reads rule investigation guides via the Detection Engine rules client. The escalation workflow uses existing Cases connector/action infrastructure.
- **Data model**: No new data model changes beyond what the foundational change introduces. The `add_observable` tool uses the existing Cases observable data model.
- **Performance**: The `hunt_iocs` tool may execute multiple ES|QL queries against large indices. Queries should include time-bounded `WHERE` clauses and `LIMIT` to prevent resource exhaustion. The campaign analysis skill may fetch many cases — pagination and result limits are essential.
- **LLM complexity**: The `playbook-executor` skill requires the LLM to parse semi-structured markdown investigation guides and map steps to tool calls. This is the highest-risk capability from an LLM reliability standpoint and will need careful prompt engineering and testing.
