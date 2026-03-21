## ADDED Requirements

### Requirement: Threat hunting skill registration
The security_solution plugin SHALL register a built-in skill with id `threat-hunting` via `agentBuilder.skill.registerSkill()` during plugin setup. The skill SHALL have `basePath: 'skills/security'` and `name: 'threat-hunting'`, placing it at `skills/security/threat-hunting/SKILL.md` in the VFS.

#### Scenario: Skill registered at plugin startup
- **WHEN** the security_solution plugin setup runs and `agentBuilder` dependency is available
- **THEN** a skill with id `threat-hunting` is registered in the SkillRegistry

#### Scenario: Skill appears in VFS when SKILLS_ENABLED is true
- **WHEN** `SKILLS_ENABLED` is `true` and the SkillsStore is created
- **THEN** the file `skills/security/threat-hunting/SKILL.md` exists in the VFS with frontmatter containing `name: threat-hunting` and the skill description

#### Scenario: Skill is inactive when SKILLS_ENABLED is false
- **WHEN** `SKILLS_ENABLED` is `false` and the SkillsStore is created
- **THEN** the file `skills/security/threat-hunting/SKILL.md` does NOT exist in the VFS

### Requirement: Threat hunting skill content
The skill content SHALL provide a structured threat hunting methodology covering hypothesis formulation, data source identification, iterative ES|QL exploration, IOC enrichment, anomaly identification, and finding documentation. The content SHALL include cross-references to sibling skills (alert-analysis, detection-engineering, entity-investigation) for adjacent workflows.

#### Scenario: Agent reads skill for a hunting query
- **WHEN** a user asks "Hunt for lateral movement in the last 7 days" and `SKILLS_ENABLED` is `true`
- **THEN** the research agent identifies the threat-hunting skill from the `## SKILLS` index and calls the `read` filestore tool on `skills/security/threat-hunting/SKILL.md`

#### Scenario: Skill content includes cross-references
- **WHEN** the agent reads the threat-hunting skill content
- **THEN** the content includes references to sibling skills such as "to operationalize findings as detection rules, read the detection-engineering skill at `skills/security/alerts/rules/detection-engineering/SKILL.md`"

### Requirement: Threat hunting skill tool scoping
The skill SHALL expose exactly 5 tools via `getAllowedTools()`: `platform.core.generate_esql`, `platform.core.execute_esql`, `platform.core.search`, `platform.core.list_indices`, `platform.core.get_index_mapping`. The skill SHALL NOT define any inline tools.

#### Scenario: Tools activated on skill read
- **WHEN** the agent reads `skills/security/threat-hunting/SKILL.md`
- **THEN** `loadSkillTools()` adds `generate_esql`, `execute_esql`, `search`, `list_indices`, and `get_index_mapping` to the ToolManager as dynamic tools

#### Scenario: Tool count within limit
- **WHEN** `validateSkillDefinition()` runs on the threat-hunting skill
- **THEN** the total tool count (5 allowed + 0 inline = 5) does not exceed the 7-tool limit

### Requirement: Threat hunting referenced content
The skill SHALL include referenced content files containing reusable ES|QL query templates for common hunting scenarios (e.g., lateral movement detection, C2 beaconing, brute force, rare process execution).

#### Scenario: Query template accessible via filestore
- **WHEN** the agent calls `ls` or `glob` on the threat-hunting skill directory
- **THEN** referenced content files are visible at paths like `skills/security/threat-hunting/./queries/lateral-movement.md`

#### Scenario: Agent reads a query template
- **WHEN** the agent calls `read` on a referenced content file
- **THEN** the file content contains a parameterized ES|QL query that the agent can adapt to the current hunting hypothesis

### Requirement: Threat hunting agent hidden when skills enabled
The Threat Hunting Agent (`security.agent`) availability handler SHALL return `{ status: 'unavailable', reason: 'Replaced by security skills' }` when `SKILLS_ENABLED` is `true`. When `SKILLS_ENABLED` is `false`, the handler SHALL delegate to `getAgentBuilderResourceAvailability()` as it does today.

#### Scenario: Agent hidden from list when skills are enabled
- **WHEN** `SKILLS_ENABLED` is `true` and the agent registry `list()` is called
- **THEN** the agent with id `security.agent` is NOT included in the results

#### Scenario: Agent returns error when accessed directly with skills enabled
- **WHEN** `SKILLS_ENABLED` is `true` and `agentRegistry.get('security.agent')` is called
- **THEN** a `BadRequestError` is thrown with message indicating the agent is not available

#### Scenario: Agent available when skills are disabled
- **WHEN** `SKILLS_ENABLED` is `false` and the agent registry `list()` is called in a security/classic space
- **THEN** the agent with id `security.agent` IS included in the results
