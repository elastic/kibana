# user-created-skills Specification

## Purpose
TBD - created by archiving change add-user-created-skills. Update Purpose after archive.
## Requirements
### Requirement: Persisted skill saved object type

The system SHALL define a new saved object type for user-created skills with the following schema:

| Field | Type | Constraints |
|---|---|---|
| `id` | `string` | Unique, auto-generated or user-provided |
| `name` | `string` | Max 64 chars, lowercase letters/numbers/hyphens/underscores only |
| `description` | `string` | Max 1024 chars, non-empty |
| `content` | `string` | Non-empty, markdown skill instructions |
| `referenced_content` | `ReferencedContent[]` | Optional, same schema as built-in skills |
| `tool_ids` | `string[]` | References to tools in the tool registry |

The saved object SHALL be space-scoped (following the same scoping as persisted tools).

#### Scenario: Saved object is created with valid data
- **WHEN** a skill saved object is created with all required fields valid
- **THEN** the saved object is persisted in Elasticsearch and retrievable by ID

#### Scenario: Saved object enforces space isolation
- **WHEN** a skill is created in space "A"
- **THEN** the skill SHALL NOT be visible in space "B"

---

### Requirement: Writable skill provider

The system SHALL implement a `WritableSkillProvider` that manages user-created skills persisted in Elasticsearch, supporting create, read, update, delete, list, and has operations.

The provider SHALL convert persisted skill definitions to internal `SkillDefinition` format, mapping `tool_ids` to `getAllowedTools()`.

#### Scenario: Provider lists all persisted skills in current space
- **WHEN** `list()` is called on the writable provider
- **THEN** all user-created skills in the current space are returned as `SkillDefinition` objects

#### Scenario: Provider creates a new skill
- **WHEN** `create()` is called with a valid skill definition
- **THEN** the skill is persisted and returned as an internal `SkillDefinition`

#### Scenario: Provider rejects creation with duplicate ID
- **WHEN** `create()` is called with an ID that already exists (in built-in or persisted)
- **THEN** a bad request error is thrown

#### Scenario: Provider updates an existing skill
- **WHEN** `update()` is called with a valid skill ID and updated fields
- **THEN** the persisted skill is updated and the updated `SkillDefinition` is returned

#### Scenario: Provider deletes an existing skill
- **WHEN** `delete()` is called with a valid skill ID
- **THEN** the skill is removed from persistence and `true` is returned

---

### Requirement: Readonly skill provider for built-in skills

The system SHALL wrap the existing `SkillRegistry` in a `ReadonlySkillProvider` interface, matching the readonly pattern used by the built-in tool provider.

#### Scenario: Provider exposes built-in skills as readonly
- **WHEN** `list()` is called on the readonly provider
- **THEN** all built-in skills registered at setup time are returned

#### Scenario: Provider rejects writes
- **WHEN** a write operation (create/update/delete) is attempted on a built-in skill
- **THEN** a bad request error is thrown indicating the skill is read-only

---

### Requirement: Composite skill registry

The system SHALL implement a composite skill registry that composes `ReadonlySkillProvider` (built-in) and `WritableSkillProvider` (persisted) with ordered lookup: built-in first, then persisted.

The registry SHALL expose: `has()`, `get()`, `list()`, `create()`, `update()`, `delete()`.

#### Scenario: Get resolves from built-in first
- **WHEN** `get(skillId)` is called and the skill exists in the built-in provider
- **THEN** the built-in skill is returned

#### Scenario: Get falls through to persisted provider
- **WHEN** `get(skillId)` is called and the skill does NOT exist in the built-in provider but exists in the persisted provider
- **THEN** the persisted skill is returned

#### Scenario: List returns skills from both providers
- **WHEN** `list()` is called
- **THEN** skills from both built-in and persisted providers are returned

#### Scenario: Create delegates to persisted provider
- **WHEN** `create()` is called
- **THEN** the skill is created via the persisted provider

#### Scenario: Update rejects built-in skills
- **WHEN** `update()` is called for a skill that exists in the built-in provider
- **THEN** a bad request error is thrown

#### Scenario: Delete rejects built-in skills
- **WHEN** `delete()` is called for a skill that exists in the built-in provider
- **THEN** a bad request error is thrown

---

### Requirement: Tool ID validation on skill create/update

The system SHALL validate that all `tool_ids` referenced by a user-created skill exist in the tool registry at creation and update time.

#### Scenario: All tool IDs exist
- **WHEN** a skill is created/updated with `tool_ids: ["tool-a", "tool-b"]` and both tools exist in the registry
- **THEN** the operation succeeds

#### Scenario: Some tool IDs do not exist
- **WHEN** a skill is created/updated with `tool_ids: ["tool-a", "nonexistent"]` and "nonexistent" does not exist in the registry
- **THEN** a bad request error is thrown listing the invalid tool IDs

---

### Requirement: Skill CRUD API routes

The system SHALL expose REST API routes for managing user-created skills:

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/agent_builder/skills` | Create a new skill |
| `GET` | `/api/agent_builder/skills` | List all skills (built-in + user-created) |
| `GET` | `/api/agent_builder/skills/{id}` | Get a skill by ID |
| `PUT` | `/api/agent_builder/skills/{id}` | Update a user-created skill |
| `DELETE` | `/api/agent_builder/skills/{id}` | Delete a user-created skill |

The list endpoint SHALL include a `readonly` field on each skill to distinguish built-in from user-created.

#### Scenario: Create skill via API
- **WHEN** `POST /api/agent_builder/skills` is called with valid body `{ name, description, content, tool_ids }`
- **THEN** a new skill is created and the full skill definition is returned with status 200

#### Scenario: List skills via API
- **WHEN** `GET /api/agent_builder/skills` is called
- **THEN** all skills (built-in and user-created) for the current space are returned

#### Scenario: Update built-in skill via API is rejected
- **WHEN** `PUT /api/agent_builder/skills/{id}` is called for a built-in skill
- **THEN** status 400 is returned with message indicating the skill is read-only

#### Scenario: Delete user-created skill via API
- **WHEN** `DELETE /api/agent_builder/skills/{id}` is called for a user-created skill
- **THEN** the skill is deleted and status 200 is returned

---

### Requirement: User-created skills resolve tools at runtime

When a user-created skill is loaded during agent execution, the system SHALL resolve the skill's `tool_ids` from the tool registry and make them available as dynamic tools.

#### Scenario: Skill tools are resolved from registry
- **WHEN** an agent reads a user-created skill file from the filesystem
- **THEN** `loadSkillTools()` resolves the skill's `tool_ids` from the tool registry and adds them to the tool manager

#### Scenario: Missing tool IDs are skipped gracefully
- **WHEN** a skill references a `tool_id` that no longer exists in the registry
- **THEN** the missing tool is skipped with a warning log, and remaining tools are still loaded

