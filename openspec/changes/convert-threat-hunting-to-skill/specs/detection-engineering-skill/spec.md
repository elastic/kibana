## ADDED Requirements

### Requirement: Detection engineering skill registration
The security_solution plugin SHALL register a built-in skill with id `detection-engineering` via `agentBuilder.skill.registerSkill()` during plugin setup. The skill SHALL have `basePath: 'skills/security/alerts/rules'` and `name: 'detection-engineering'`, placing it at `skills/security/alerts/rules/detection-engineering/SKILL.md` in the VFS.

#### Scenario: Skill registered at plugin startup
- **WHEN** the security_solution plugin setup runs and `agentBuilder` dependency is available
- **THEN** a skill with id `detection-engineering` is registered in the SkillRegistry

#### Scenario: Skill appears in VFS when SKILLS_ENABLED is true
- **WHEN** `SKILLS_ENABLED` is `true` and the SkillsStore is created
- **THEN** the file `skills/security/alerts/rules/detection-engineering/SKILL.md` exists in the VFS

#### Scenario: Skill is inactive when SKILLS_ENABLED is false
- **WHEN** `SKILLS_ENABLED` is `false`
- **THEN** the file `skills/security/alerts/rules/detection-engineering/SKILL.md` does NOT exist in the VFS

### Requirement: Detection engineering skill content
The skill content SHALL provide a structured workflow for creating and managing detection rules: assessing coverage gaps, choosing the right rule type (KQL, EQL, ES|QL, threshold, ML), writing queries, mapping to MITRE ATT&CK, setting severity/risk scores, configuring exceptions, and testing against production data volume. The content SHALL reference the threat-hunting skill for discovering new detection opportunities and the alert-analysis skill for validating rule effectiveness.

#### Scenario: Agent reads skill for rule creation request
- **WHEN** a user asks "Create a detection rule for PowerShell download cradle execution" and `SKILLS_ENABLED` is `true`
- **THEN** the research agent identifies the detection-engineering skill and reads it

#### Scenario: Content covers rule type selection
- **WHEN** the agent reads the detection-engineering skill
- **THEN** the content includes guidance on choosing between KQL (simple field matching), EQL (multi-step sequences), ES|QL (aggregation-based), threshold (count-based), and ML (baseline anomaly) rule types

### Requirement: Detection engineering skill tool scoping
The skill SHALL expose 4 tools via `getAllowedTools()`: `security.alerts`, `security.attack_discovery_search`, `security.create_detection_rule`, `security.manage_rule_exceptions`. The skill SHALL NOT define any inline tools — rule lifecycle operations require plugin services (`RulesClient`, `ExceptionListClient`) only available to registry tools.

#### Scenario: Registry tools activated on skill read
- **WHEN** the agent reads `skills/security/alerts/rules/detection-engineering/SKILL.md`
- **THEN** `loadSkillTools()` adds `security.alerts`, `security.attack_discovery_search`, `security.create_detection_rule`, and `security.manage_rule_exceptions` to the ToolManager

#### Scenario: Tool count within limit
- **WHEN** `validateSkillDefinition()` runs on the detection-engineering skill
- **THEN** the total tool count (4 allowed + 0 inline = 4) does not exceed the 7-tool limit

### Requirement: manage_rule_exceptions registry tool
A new registry tool `security.manage_rule_exceptions` SHALL be created and registered via `agentBuilder.tools.register()`. The tool SHALL accept a `rule_id` and an array of exception items, each with a name, description, field-matching entries (match, match_any, exists, wildcard), optional tags, OS types, and comments. The tool SHALL create exception items on the rule's default exception list, creating the list if it does not exist.

#### Scenario: Exception created on existing rule
- **WHEN** the tool is called with a valid `rule_id` and one exception item with a `match` entry for `process.name = "svchost.exe"`
- **THEN** an exception item is created on the rule's default exception list and the response includes the created item details

#### Scenario: Default exception list auto-created
- **WHEN** the tool is called with a `rule_id` for a rule that has no default exception list
- **THEN** a new default exception list is created and associated with the rule before creating the exception item

#### Scenario: Rule not found
- **WHEN** the tool is called with a `rule_id` that does not match any detection rule
- **THEN** the tool returns an error result with message indicating the rule was not found

#### Scenario: Tool added to allow list
- **WHEN** the tool is registered
- **THEN** `security.manage_rule_exceptions` is present in `AGENT_BUILDER_BUILTIN_TOOLS` in `@kbn/agent-builder-server/allow_lists.ts`

### Requirement: Detection engineering referenced content
The skill SHALL include referenced content with rule templates for common detection patterns, stored under `./templates/`. Templates SHALL cover at minimum: KQL field-matching rules, EQL sequence rules, and threshold rules.

#### Scenario: KQL rule template accessible
- **WHEN** the agent browses the detection-engineering skill directory
- **THEN** a file at `./templates/kql-rule.md` contains a parameterized KQL rule template with placeholders for index pattern, query, severity, and MITRE mapping

#### Scenario: EQL sequence template accessible
- **WHEN** the agent browses the detection-engineering skill directory
- **THEN** a file at `./templates/eql-sequence.md` contains an EQL sequence rule template with `maxspan`, `by` clause, and multi-event pattern placeholders
