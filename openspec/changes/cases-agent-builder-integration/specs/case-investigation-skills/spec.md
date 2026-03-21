## ADDED Requirements

### Requirement: Case investigation summary skill performs structured investigation

The system SHALL provide a skill `case-investigation-summary` registered in the Security Solution plugin. The skill SHALL instruct the agent to perform a 5-step structured investigation of a given case:

1. **Read Case**: Fetch the case with comments using `platform.core.cases`
2. **Analyze Alerts**: Fetch and analyze all alerts attached to the case using `security.alerts`
3. **Enrich Context**: Query entity risk scores (`security.entity_risk_score`) for hosts/users mentioned in alerts, and search threat intelligence (`security.security_labs_search`) for relevant IOCs
4. **Correlate**: Search for related cases sharing the same alert IDs using `platform.core.cases` with `alertIds`
5. **Report**: Compile a structured markdown investigation summary and add it as a comment using `platform.core.cases.add_comment`

The skill's `getAllowedTools()` SHALL return: `['platform.core.cases', 'platform.core.cases.add_comment', 'security.alerts', 'security.entity_risk_score', 'security.security_labs_search']`.

#### Scenario: Full investigation on a case with alerts

- **WHEN** the user asks the agent to "investigate case abc-123" and the `case-investigation-summary` skill is active
- **THEN** the agent reads the case, fetches attached alerts, enriches with entity risk and threat intel, checks for related cases, and posts a structured investigation comment to the case

#### Scenario: Case with no attached alerts

- **WHEN** the agent runs the investigation skill on a case that has no attached alerts
- **THEN** the agent notes "No alerts attached to this case" in the report, skips the alert analysis and entity enrichment steps, and still produces a summary based on the case description and comments

#### Scenario: Entity risk score service unavailable

- **WHEN** the `security.entity_risk_score` tool returns an error (e.g., entity analytics not enabled)
- **THEN** the agent notes "Entity risk data unavailable" in the report and continues with the remaining investigation steps

---

### Requirement: Investigation summary follows a structured markdown template

The investigation comment produced by the `case-investigation-summary` skill SHALL follow a structured markdown format with these sections:

1. **Executive Summary** — 2-3 sentence overview of findings and risk level
2. **Alert Analysis** — Table or list of attached alerts with name, severity, MITRE tactic, timestamp, and key entities
3. **Entity Risk Assessment** — Risk scores and anomaly indicators for hosts/users involved
4. **Threat Intelligence** — Relevant threat intel findings (matching IOCs, known campaigns, Elastic Security Labs references)
5. **Related Cases** — List of other cases sharing alerts with this case, with links
6. **Recommended Actions** — Prioritized list of next steps (escalate, isolate, investigate further, close as false positive)

The skill content SHALL include this template with section headers and guidance for each section.

#### Scenario: Complete investigation produces all sections

- **WHEN** the agent completes a full investigation with alerts, entity risk data, and threat intel matches
- **THEN** the posted comment includes all six sections with populated content

#### Scenario: Partial data produces sections with "not available" notes

- **WHEN** some enrichment steps return no data (e.g., no threat intel matches)
- **THEN** the corresponding section includes a note like "No matching threat intelligence found" rather than being omitted

---

### Requirement: Alert-to-case triage skill handles the full triage-to-case lifecycle

The system SHALL provide a skill `alert-to-case-triage` registered in the Security Solution plugin. The skill SHALL instruct the agent to:

1. **Triage Alerts**: For each alert, gather details (name, severity, MITRE tactics, entities) and assess true-positive vs false-positive likelihood — following the same methodology as the existing `alert-triage` skill
2. **Group Related Alerts**: Identify alerts that share entities (same host, user, source IP) or attack patterns (same MITRE technique) and group them
3. **Check Existing Cases**: Search for existing cases related to these alerts using `platform.core.cases` with `alertIds`
4. **Create or Update Case**: If a related case exists, add the triage findings as a comment (`platform.core.cases.add_comment`) and optionally update severity (`platform.core.cases.update`). If no related case exists, create a new case (`platform.core.cases.create`) with the triage findings as the description.

The skill's `getAllowedTools()` SHALL return: `['security.alerts', 'platform.core.cases', 'platform.core.cases.create', 'platform.core.cases.add_comment', 'platform.core.cases.update', 'security.entity_risk_score', 'security.security_labs_search']`.

#### Scenario: Single alert triaged into a new case

- **WHEN** the user asks the agent to "triage alert xyz-456" and the `alert-to-case-triage` skill is active, and no existing case contains this alert
- **THEN** the agent triages the alert, creates a new case with the alert summary as description, severity matching the alert severity, and tags derived from MITRE tactics

#### Scenario: Alert triaged into an existing case

- **WHEN** the user asks the agent to "triage alert xyz-456" and an existing case already contains this alert
- **THEN** the agent adds the new triage findings as a comment to the existing case and optionally escalates severity if the findings warrant it

#### Scenario: Multiple alerts grouped into one case

- **WHEN** the user asks the agent to "triage these alerts" with multiple alert IDs, and the alerts share the same host and MITRE technique
- **THEN** the agent groups them, creates a single case covering all related alerts, and includes a summary of the common attack pattern

#### Scenario: Mixed alerts — some with existing cases, some without

- **WHEN** the user provides multiple alerts, some of which already belong to existing cases
- **THEN** the agent adds findings to existing cases for those alerts and creates new cases for the remaining alerts

---

### Requirement: Skills are registered alongside existing security skills

Both new skills SHALL be registered in the Security Solution plugin's `register_skills.ts` file using `agentBuilder.skills.register()`. They SHALL follow the same `defineSkillType` pattern as existing skills (`alert-triage`, `host-analysis`, etc.). The skill IDs SHALL be `case-investigation-summary` and `alert-to-case-triage`. The skill `basePath` SHALL be `skills/security/cases`.

#### Scenario: Skills appear in the skills registry

- **WHEN** the Security Solution plugin starts with Agent Builder available
- **THEN** both `case-investigation-summary` and `alert-to-case-triage` skills are registered and discoverable

#### Scenario: Skills are available to the Threat Hunting Agent

- **WHEN** the Threat Hunting Agent is loaded with skills enabled
- **THEN** both new skills are available for use alongside the existing security skills
