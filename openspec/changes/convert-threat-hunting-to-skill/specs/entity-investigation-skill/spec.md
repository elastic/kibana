## ADDED Requirements

### Requirement: Entity investigation skill registration
The security_solution plugin SHALL register a built-in skill with id `entity-investigation` via `agentBuilder.skill.registerSkill()` during plugin setup. The skill SHALL have `basePath: 'skills/security/entities'` and `name: 'entity-investigation'`, placing it at `skills/security/entities/entity-investigation/SKILL.md` in the VFS.

#### Scenario: Skill registered at plugin startup
- **WHEN** the security_solution plugin setup runs and `agentBuilder` dependency is available
- **THEN** a skill with id `entity-investigation` is registered in the SkillRegistry

#### Scenario: Skill appears in VFS when SKILLS_ENABLED is true
- **WHEN** `SKILLS_ENABLED` is `true` and the SkillsStore is created
- **THEN** the file `skills/security/entities/entity-investigation/SKILL.md` exists in the VFS

#### Scenario: Skill is inactive when SKILLS_ENABLED is false
- **WHEN** `SKILLS_ENABLED` is `false`
- **THEN** the file `skills/security/entities/entity-investigation/SKILL.md` does NOT exist in the VFS

### Requirement: Entity investigation skill content
The skill content SHALL provide a structured workflow for entity-centric investigation: identifying the entity type (user, host, IP, domain), retrieving risk scores, profiling activity patterns, identifying anomalous behavior, correlating across data sources, and creating/updating cases for escalation. The content SHALL reference the alert-analysis skill for investigating entity-related alerts and the threat-hunting skill for deeper data exploration.

#### Scenario: Agent reads skill for entity query
- **WHEN** a user asks "Investigate user john.doe — is this account compromised?" and `SKILLS_ENABLED` is `true`
- **THEN** the research agent identifies the entity-investigation skill and reads it

#### Scenario: Content covers entity profiling
- **WHEN** the agent reads the entity-investigation skill
- **THEN** the content includes steps for: risk score retrieval, authentication pattern analysis, process execution baseline, network connection profiling, and anomaly identification

### Requirement: Entity investigation skill tool scoping
The skill SHALL expose 3 tools via `getAllowedTools()`: `security.entity_risk_score`, `platform.core.cases`, `platform.core.search`. The skill SHALL NOT define any inline tools.

#### Scenario: Tools activated on skill read
- **WHEN** the agent reads `skills/security/entities/entity-investigation/SKILL.md`
- **THEN** `loadSkillTools()` adds `security.entity_risk_score`, `platform.core.cases`, and `platform.core.search` to the ToolManager

#### Scenario: Tool count within limit
- **WHEN** `validateSkillDefinition()` runs on the entity-investigation skill
- **THEN** the total tool count (3 allowed + 0 inline = 3) does not exceed the 7-tool limit

### Requirement: Entity investigation referenced content
The skill SHALL include referenced content with ES|QL query templates for common entity investigation patterns, stored under `./queries/`. Templates SHALL cover at minimum: user authentication profiling and host process baseline.

#### Scenario: User auth profile query template accessible
- **WHEN** the agent browses the entity-investigation skill directory
- **THEN** a file at `./queries/user-auth-profile.md` contains a parameterized ES|QL query for analyzing authentication patterns (login times, source IPs, success/failure ratios) for a specific user

#### Scenario: Host process baseline template accessible
- **WHEN** the agent browses the entity-investigation skill directory
- **THEN** a file at `./queries/host-process-baseline.md` contains a parameterized ES|QL query for profiling process execution patterns on a specific host

### Requirement: Case creation from entity investigation
The skill content SHALL guide the agent to create or update a security case when the investigation identifies a confirmed or suspected compromise. The case SHALL include the entity identifier, risk assessment, key findings, and recommended remediation.

#### Scenario: Agent creates case for compromised entity
- **WHEN** the entity investigation reveals high-risk indicators (elevated risk score, anomalous auth patterns, suspicious process execution)
- **THEN** the skill content guides the agent to use `platform.core.cases` to create a case with structured tags (`incident-type:compromised-account`, `affected-entity:user.name`)
