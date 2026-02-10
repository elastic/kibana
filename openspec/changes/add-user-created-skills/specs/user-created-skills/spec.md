## ADDED Requirements

### Requirement: Persisted skill storage
The system SHALL store user-created skills in Elasticsearch using the `chatSystemIndex('skills')` index via `StorageIndexAdapter`. Each persisted skill document SHALL contain: `id`, `name`, `space`, `description`, `content`, `tool_ids`, `referenced_content` (reserved, unused), `created_at`, and `updated_at`. All queries SHALL be scoped to the current Kibana space using `createSpaceDslFilter`.

#### Scenario: Skill document is space-scoped
- **WHEN** a user creates a skill in space "marketing"
- **THEN** the skill document SHALL have `space: "marketing"` and SHALL only be visible to users in the "marketing" space

#### Scenario: Timestamps are set on creation
- **WHEN** a user creates a new skill
- **THEN** the system SHALL set both `created_at` and `updated_at` to the current ISO timestamp

#### Scenario: Updated_at changes on update
- **WHEN** a user updates an existing skill
- **THEN** the system SHALL update `updated_at` to the current ISO timestamp while preserving `created_at`

### Requirement: Dual-provider skill service
The system SHALL compose a `ReadonlySkillProvider` (built-in skills from `SkillRegistry`) and a `WritableSkillProvider` (user-created skills from Elasticsearch) into a `CompositeSkillRegistry`. The composite registry SHALL be the unified interface for all skill operations.

#### Scenario: Built-in provider is read-only
- **WHEN** the composite registry lists skills
- **THEN** built-in skills SHALL be returned with `readonly: true`

#### Scenario: Persisted provider is writable
- **WHEN** the composite registry lists skills
- **THEN** user-created skills SHALL be returned with `readonly: false`

#### Scenario: Built-in skills take priority in lookup
- **WHEN** a skill ID is looked up via `get()`
- **THEN** the system SHALL check the built-in provider first, then the persisted provider

### Requirement: Create skill API
The system SHALL provide a `POST /api/agent_builder/skills` endpoint that creates a user-created skill. The request body SHALL include `id`, `name`, `description`, `content`, and optionally `tool_ids`. The endpoint SHALL require `manageAgentBuilder` privilege.

#### Scenario: Successful skill creation
- **WHEN** a user sends a valid create request with `id`, `name`, `description`, and `content`
- **THEN** the system SHALL persist the skill and return the created skill with `readonly: false`

#### Scenario: Duplicate ID rejected
- **WHEN** a user attempts to create a skill with an ID that already exists (built-in or user-created)
- **THEN** the system SHALL return a 400 error indicating the ID is already in use

#### Scenario: Invalid skill ID rejected
- **WHEN** a user sends a create request with an invalid skill ID (e.g., containing special characters)
- **THEN** the system SHALL return a 400 error with a validation message

### Requirement: List skills API
The system SHALL provide a `GET /api/agent_builder/skills` endpoint that returns all skills from both built-in and persisted providers. The endpoint SHALL require `readAgentBuilder` privilege.

#### Scenario: List returns both sources
- **WHEN** a user lists skills
- **THEN** the response SHALL include both built-in skills (`readonly: true`) and user-created skills (`readonly: false`)

#### Scenario: Empty persisted provider
- **WHEN** no user-created skills exist
- **THEN** the list SHALL return only built-in skills

### Requirement: Get skill API
The system SHALL provide a `GET /api/agent_builder/skills/{skillId}` endpoint that returns a single skill by ID from either provider. The endpoint SHALL require `readAgentBuilder` privilege.

#### Scenario: Get built-in skill
- **WHEN** a user requests a built-in skill by ID
- **THEN** the system SHALL return the skill with `readonly: true`

#### Scenario: Get user-created skill
- **WHEN** a user requests a user-created skill by ID
- **THEN** the system SHALL return the skill with `readonly: false`

#### Scenario: Skill not found
- **WHEN** a user requests a skill ID that does not exist
- **THEN** the system SHALL return a 404 error

### Requirement: Update skill API
The system SHALL provide a `PUT /api/agent_builder/skills/{skillId}` endpoint that updates a user-created skill. The request body MAY include `name`, `description`, `content`, and `tool_ids`. The endpoint SHALL require `manageAgentBuilder` privilege.

#### Scenario: Successful skill update
- **WHEN** a user updates a user-created skill with new `name` and `content`
- **THEN** the system SHALL persist the changes and return the updated skill

#### Scenario: Update built-in skill rejected
- **WHEN** a user attempts to update a built-in skill
- **THEN** the system SHALL return a 400 error indicating the skill is read-only

#### Scenario: Update non-existent skill
- **WHEN** a user attempts to update a skill ID that does not exist
- **THEN** the system SHALL return a 404 error

### Requirement: Delete skill API
The system SHALL provide a `DELETE /api/agent_builder/skills/{skillId}` endpoint that deletes a user-created skill. The endpoint SHALL require `manageAgentBuilder` privilege.

#### Scenario: Successful skill deletion
- **WHEN** a user deletes a user-created skill
- **THEN** the system SHALL remove the skill from Elasticsearch and return success

#### Scenario: Delete built-in skill rejected
- **WHEN** a user attempts to delete a built-in skill
- **THEN** the system SHALL return a 400 error indicating the skill is read-only

#### Scenario: Delete non-existent skill
- **WHEN** a user attempts to delete a skill ID that does not exist
- **THEN** the system SHALL return a 404 error

### Requirement: Tool ID validation
The system SHALL validate `tool_ids` when creating or updating a skill. Each tool ID MUST reference an existing tool in the `ToolRegistry`. The system SHALL enforce a maximum of 5 tool IDs per skill.

#### Scenario: Valid tool IDs accepted
- **WHEN** a user creates a skill with `tool_ids` referencing 3 existing tools
- **THEN** the system SHALL accept the request and persist the skill with those tool IDs

#### Scenario: Non-existent tool ID rejected
- **WHEN** a user creates a skill with a `tool_ids` entry that does not exist in the tool registry
- **THEN** the system SHALL return a 400 error identifying the invalid tool ID

#### Scenario: Exceeding 5 tools rejected
- **WHEN** a user creates or updates a skill with more than 5 `tool_ids`
- **THEN** the system SHALL return a 400 error indicating the maximum of 5 tools per skill

#### Scenario: Empty tool_ids accepted
- **WHEN** a user creates a skill with an empty `tool_ids` array or omits it
- **THEN** the system SHALL accept the request with no tool associations

### Requirement: Feature flag gating
All skill CRUD HTTP routes SHALL be gated behind the `AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID` UI setting via the `getHandlerWrapper` / `featureFlag` mechanism. When the setting is `false`, routes SHALL return 404 Not Found.

#### Scenario: Feature flag enabled
- **WHEN** the `agentBuilder:experimentalFeatures` UI setting is `true`
- **THEN** all skill CRUD routes SHALL be accessible and functional

#### Scenario: Feature flag disabled
- **WHEN** the `agentBuilder:experimentalFeatures` UI setting is `false`
- **THEN** all skill CRUD routes SHALL return 404 Not Found

### Requirement: Skill validation reuse
The system SHALL apply `validateSkillDefinition` rules to user-created skills, enforcing the same constraints on `name`, `description`, and `content` fields as built-in skills. The `validateSkillId` function SHALL validate skill IDs for user-created skills (e.g., no special characters, proper format).

#### Scenario: Name validation applied
- **WHEN** a user creates a skill with a name that violates validation rules
- **THEN** the system SHALL return a 400 error with the validation message

#### Scenario: Content validation applied
- **WHEN** a user creates a skill with empty content
- **THEN** the system SHALL return a 400 error indicating content is required

### Requirement: Runtime skill resolution
The runner's skill store SHALL load user-created skills alongside built-in skills at execution time. The `resolveSkillSelection` method on `CompositeSkillRegistry` SHALL be used to expand skill selections (including `*` wildcards) and resolve both built-in and persisted skills into `SkillDefinition` format for the skills volume.

#### Scenario: User-created skill loaded at runtime
- **WHEN** an agent configuration references a user-created skill by ID
- **THEN** the runner SHALL load that skill into the skills volume for execution

#### Scenario: Wildcard selection includes built-in only
- **WHEN** an agent configuration uses `*` for skill selection
- **THEN** the system SHALL expand `*` to all built-in skills (not user-created skills, which must be explicitly referenced)

#### Scenario: Persisted skill converted for runtime
- **WHEN** a user-created skill is resolved for runtime
- **THEN** the system SHALL convert it to `SkillDefinition` format with `getAllowedTools` returning the skill's `tool_ids`
