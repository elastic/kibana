## Why

Built-in skills can only be registered by solutions at plugin setup time. Users need the ability to create, edit, and delete their own skills to customize agent behavior without code changes. This follows the same dual-provider pattern already established for agents and tools, where built-in definitions coexist with user-persisted ones.

## What Changes

- **Dual-provider skills service**: Refactor the skills service to compose a `ReadonlySkillProvider` (built-in skills from the `SkillRegistry`) and a `WritableSkillProvider` (user-created skills persisted to Elasticsearch) via a `CompositeSkillRegistry`.
- **Persisted skills provider**: New Elasticsearch-backed provider using a `skills` index suffix (`.kibana-chat-system-skills`), storing: `id`, `space`, `name`, `description`, `content`, `tool_ids`, `created_at`, `updated_at`. No `referencedContent` handling for now. Limit of 5 tools per skill.
- **CRUD HTTP APIs**: New versioned routes for skills — create (`POST`), get (`GET /:id`), list (`GET`), update (`PUT /:id`), delete (`DELETE /:id`). List returns both built-in and user-created skills. Delete only works for user-created skills. Modeled after the tools routes in `server/routes/tools.ts`.
- **Tool ID validation**: When creating/updating skills with `tool_ids`, validate that referenced tools exist in the tool registry.
- **Skill volume / store**: Verify the skills volume (`SkillsStoreImpl`) works correctly with user-created skills at runtime — ensure `resolveSkillSelection` properly loads persisted skills into the execution filesystem.
- **Feature flagging**: Gate all new skill CRUD routes behind the `AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID` UI setting via the existing `getHandlerWrapper` / `featureFlag` mechanism.
- **Reuse existing validation**: Leverage `validateSkillDefinition` for both built-in and user-created skills, applying the same constraints on name, description, and content fields.

## Capabilities

### New Capabilities
- `user-created-skills`: Backend support for persisted user-created skills — dual-provider service, Elasticsearch storage, CRUD APIs, tool validation, feature-flagged routes

### Modified Capabilities

## Impact

- **Server code**: `x-pack/platform/plugins/shared/agent_builder/server/services/skills/` — new persisted provider, composite registry, updated service wiring
- **Routes**: `x-pack/platform/plugins/shared/agent_builder/server/routes/skills.ts` — new CRUD endpoints
- **Storage**: New Elasticsearch index via `chatSystemIndex('skills')` for persisted skill documents
- **Runtime**: `server/services/runner/store/volumes/skills/` — verify compatibility with user-created skills
- **APIs**: New public HTTP API surface for skill management (versioned, `2023-10-31`)
- **Dependencies**: Skills service depends on tools service for tool ID validation at create/update time
