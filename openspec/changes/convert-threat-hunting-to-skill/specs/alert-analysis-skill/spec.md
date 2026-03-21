## ADDED Requirements

### Requirement: Alert analysis skill registration
The security_solution plugin SHALL register a built-in skill with id `alert-analysis` via `agentBuilder.skill.registerSkill()` during plugin setup. The skill SHALL have `basePath: 'skills/security/alerts'` and `name: 'alert-analysis'`, placing it at `skills/security/alerts/alert-analysis/SKILL.md` in the VFS.

#### Scenario: Skill registered at plugin startup
- **WHEN** the security_solution plugin setup runs and `agentBuilder` dependency is available
- **THEN** a skill with id `alert-analysis` is registered in the SkillRegistry

#### Scenario: Skill appears in VFS when SKILLS_ENABLED is true
- **WHEN** `SKILLS_ENABLED` is `true` and the SkillsStore is created
- **THEN** the file `skills/security/alerts/alert-analysis/SKILL.md` exists in the VFS

#### Scenario: Skill is inactive when SKILLS_ENABLED is false
- **WHEN** `SKILLS_ENABLED` is `false`
- **THEN** the file `skills/security/alerts/alert-analysis/SKILL.md` does NOT exist in the VFS

### Requirement: Alert analysis skill content
The skill content SHALL provide a structured alert triage methodology covering initial alert assessment, related alert discovery, threat intelligence enrichment via Security Labs, related case lookup, threat identification, and finding synthesis. The content SHALL reference the entity-investigation skill for deep entity profiling and the detection-engineering skill for rule tuning.

#### Scenario: Agent reads skill for alert investigation
- **WHEN** a user asks "Investigate alert XYZ-123" and `SKILLS_ENABLED` is `true`
- **THEN** the research agent identifies the alert-analysis skill from the `## SKILLS` index and reads it

#### Scenario: Content guides multi-step investigation
- **WHEN** the agent reads the alert-analysis skill
- **THEN** the content describes a sequential workflow: fetch alert → find related alerts → search security labs → find related cases → assess threat → synthesize findings

### Requirement: Alert analysis skill tool scoping
The skill SHALL expose 3 tools via `getAllowedTools()`: `security.alerts`, `security.security_labs_search`, `security.entity_risk_score`. The skill SHALL define 1 inline tool: `get-related-alerts` which queries alerts sharing entities (host, user, IP) with a given alert within a configurable time window.

#### Scenario: Registry tools activated on skill read
- **WHEN** the agent reads `skills/security/alerts/alert-analysis/SKILL.md`
- **THEN** `loadSkillTools()` adds `security.alerts`, `security.security_labs_search`, and `security.entity_risk_score` to the ToolManager

#### Scenario: Inline tool activated on skill read
- **WHEN** the agent reads the alert-analysis skill
- **THEN** the inline tool `get-related-alerts` is available in the ToolManager with schema accepting `alertId: string` and `timeWindowHours: number`

#### Scenario: Tool count within limit
- **WHEN** `validateSkillDefinition()` runs on the alert-analysis skill
- **THEN** the total tool count (3 allowed + 1 inline = 4) does not exceed the 7-tool limit

### Requirement: Alert analysis inline tool — get-related-alerts
The `get-related-alerts` inline tool SHALL accept an `alertId` (string, required) and `timeWindowHours` (number, default 24, min 1, max 168). It SHALL query the `.alerts-security.alerts-*` index for alerts sharing entity values (host.name, user.name, source.ip, destination.ip) with the source alert within the specified time window. It SHALL return matching alert IDs and index names.

#### Scenario: Related alerts found by shared host
- **WHEN** the tool is called with an `alertId` whose source alert has `host.name: "server-01"`
- **THEN** the tool returns alerts from the last `timeWindowHours` hours that also have `host.name: "server-01"`

#### Scenario: No related alerts found
- **WHEN** the tool is called with an `alertId` whose entities have no matching alerts in the time window
- **THEN** the tool returns an empty results array

### Requirement: Alert analysis referenced content
The skill SHALL include referenced content with an ES|QL query template for finding related alerts by entity values, stored at `./queries/related-by-entities.md`.

#### Scenario: Query template accessible
- **WHEN** the agent browses the alert-analysis skill directory
- **THEN** the file `skills/security/alerts/alert-analysis/./queries/related-by-entities.md` is visible and contains a parameterized ES|QL query
