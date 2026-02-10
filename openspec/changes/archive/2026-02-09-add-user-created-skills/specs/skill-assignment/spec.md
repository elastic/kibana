## ADDED Requirements

### Requirement: Skill selection on agent configuration

The `AgentConfiguration` interface SHALL include an optional `skills` field of type `SkillSelection[]`, parallel to the existing `tools: ToolSelection[]` field.

```typescript
interface SkillSelection {
  skill_ids: string[];
}
```

When `skills` is undefined or an empty array, the agent has no skills assigned.

#### Scenario: Agent with explicit skill IDs
- **WHEN** an agent is configured with `skills: [{ skill_ids: ["skill-a", "skill-b"] }]`
- **THEN** only skills "skill-a" and "skill-b" are exposed to the agent at runtime

#### Scenario: Agent with no skills configured
- **WHEN** an agent is configured with `skills: []` or `skills` is undefined
- **THEN** no skills are exposed to the agent (skills feature is soft-disabled)

---

### Requirement: Wildcard skill selection for built-in agent

The system SHALL support a wildcard `"*"` value in `skill_ids` meaning "all built-in skills". This is used by the default agent to preserve current behavior.

#### Scenario: Default agent with wildcard
- **WHEN** the default agent (`elastic-ai-agent`) has `skills: [{ skill_ids: ["*"] }]`
- **THEN** all built-in skills are exposed to the agent

#### Scenario: Wildcard combined with explicit IDs
- **WHEN** an agent has `skills: [{ skill_ids: ["*", "user-skill-1"] }]`
- **THEN** all built-in skills AND the user-created skill "user-skill-1" are exposed

---

### Requirement: Default agent is assigned all built-in skills

The built-in default agent (`elastic-ai-agent`) SHALL have its configuration updated to include `skills: [{ skill_ids: ["*"] }]`, ensuring all built-in skills are available by default. This preserves backward compatibility with current behavior where all skills are exposed.

#### Scenario: Default agent retains all built-in skills
- **WHEN** the default agent runs after this change
- **THEN** all built-in skills are present in the agent's skill store, matching pre-change behavior

---

### Requirement: User-created agents default to no skills

When a new user-created agent is created without specifying `skills`, the system SHALL default to an empty skill selection (`skills: []`), effectively soft-disabling the skills feature for that agent.

#### Scenario: New user agent has no skills
- **WHEN** a user creates a new agent without specifying a `skills` field
- **THEN** the agent's configuration has `skills: []` and no skills are loaded at runtime

#### Scenario: User agent with explicit skills
- **WHEN** a user creates an agent with `skills: [{ skill_ids: ["my-skill"] }]`
- **THEN** only "my-skill" is exposed to the agent at runtime

---

### Requirement: Scoped skill store at runtime

The runtime `createStore()` function SHALL filter skills based on the agent's `SkillSelection[]`, only mounting skills the agent has access to into the `SkillsStore` and filesystem volume.

#### Scenario: Agent sees only assigned skills in filesystem
- **WHEN** the skill store is created for an agent with `skills: [{ skill_ids: ["skill-a"] }]` and skills "skill-a", "skill-b", "skill-c" exist
- **THEN** only "skill-a" is mounted in the `MemoryVolume` and visible via filesystem tools

#### Scenario: Agent with wildcard sees all built-in skills
- **WHEN** the skill store is created for an agent with `skills: [{ skill_ids: ["*"] }]`
- **THEN** all built-in skills are mounted in the `MemoryVolume`

#### Scenario: Agent with no skills gets empty skill volume
- **WHEN** the skill store is created for an agent with `skills: []`
- **THEN** the `MemoryVolume` for skills is empty

---

### Requirement: Skill selection validation on agent create/update

The system SHALL validate that all skill IDs in a `SkillSelection` exist in the composite skill registry (built-in + persisted) when an agent is created or updated, except for the wildcard `"*"`.

#### Scenario: Valid skill IDs
- **WHEN** an agent is created/updated with `skills: [{ skill_ids: ["existing-skill"] }]`
- **THEN** the operation succeeds

#### Scenario: Invalid skill ID
- **WHEN** an agent is created/updated with `skills: [{ skill_ids: ["nonexistent-skill"] }]`
- **THEN** a bad request error is thrown listing the invalid skill IDs

#### Scenario: Wildcard is always valid
- **WHEN** an agent is created/updated with `skills: [{ skill_ids: ["*"] }]`
- **THEN** the operation succeeds without looking up `"*"` as a skill ID

---

### Requirement: Backward-compatible migration for existing agents

Existing agents that do not have a `skills` field SHALL be migrated as follows:
- The built-in default agent (`elastic-ai-agent`) gets `skills: [{ skill_ids: ["*"] }]`
- User-created agents get `skills: []` (no skills)

This ensures no change in behavior for existing agents.

#### Scenario: Existing default agent migrated
- **WHEN** the system starts after migration
- **THEN** the default agent has `skills: [{ skill_ids: ["*"] }]` and all built-in skills are available

#### Scenario: Existing user agent migrated
- **WHEN** the system starts after migration for a user-created agent without `skills`
- **THEN** the agent has `skills: []` and no skills are loaded
