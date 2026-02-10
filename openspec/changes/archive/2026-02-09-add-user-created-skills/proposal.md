## Why

Skills are currently built-in only: registered at plugin setup time via `SkillService.setup().registerSkill()` and stored in an in-memory `SkillRegistry`. Users cannot create, edit, or manage skills through the UI. This limits the agent builder to pre-packaged functionality. By allowing user-created skills, users can extend agents with custom domain knowledge and tool orchestration without modifying plugin code. This mirrors the existing pattern where tools already support both built-in (readonly) and user-created (persisted) sources.

## What Changes

- **User-created skills**: Users can create, read, update, and delete custom skills via the UI and REST API. These skills are persisted in Elasticsearch (same approach as persisted tools).
- **Skill ↔ tool constraint**: User-created skills can only reference tools from the tool registry (both built-in and user-created tools). They cannot define inline tools (`getInlineTools`) or reference arbitrary built-in tool IDs (`getAllowedTools`) — only tool IDs that exist in the registry.
- **Skill assignment to agents**: `AgentConfiguration` gains a `skills` field (similar to the existing `tools` field) so agents can be assigned specific skills. The default built-in agent (`elastic-ai-agent`) is assigned all built-in skills (preserving current behavior). User-created agents default to no skills (soft-disabling the feature unless explicitly configured).
- **Dual-source skill service**: The `SkillService` is updated to support two sources — a `ReadonlySkillProvider` (built-in, in-memory registry) and a `WritableSkillProvider` (user-created, persisted in ES) — following the same provider pattern as `ToolRegistry`.
- **Scoped skill store / volume**: The runtime `SkillsStore` and its `MemoryVolume` only expose the skills an agent has access to (based on the agent's skill configuration), rather than all registered skills.
- **CRUD API routes**: New REST endpoints for managing user-created skills (create, get, list, update, delete).
- **UI for skill management**: A skills management section in the agent builder UI allowing users to create, view, edit, and delete custom skills, and assign skills when configuring agents.

## Capabilities

### New Capabilities
- `user-created-skills`: CRUD lifecycle for user-created skills persisted in Elasticsearch, including the `WritableSkillProvider`, saved object type, and API routes.
- `skill-assignment`: Mechanism for assigning skills (built-in and/or user-created) to agents via `AgentConfiguration.skills`, including scoped skill resolution at runtime.
- `skill-management-ui`: UI components for creating, editing, deleting skills and assigning them to agents in the agent builder interface.

### Modified Capabilities
<!-- No existing specs to modify -->

## Impact

- **Data model**: `AgentDefinition.configuration` gains a `skills: SkillSelection[]` field. A new saved object type is needed for persisted skills.
- **Packages affected**:
  - `@kbn/agent-builder-common` — agent definition types, skill selection types, validation
  - `@kbn/agent-builder-server` — skill definition types (relaxed for user-created skills, no `getAllowedTools`/`getInlineTools`, only tool IDs from registry)
  - `agent_builder` plugin server — `SkillService` rewrite with provider pattern, new persisted provider, new API routes, skill store scoping
  - `agent_builder` plugin public — UI for skill CRUD and agent skill assignment
- **Runtime behavior**: `createStore()` must filter skills per-agent. `loadSkillTools()` must handle user-created skills (tool IDs resolved from registry). `selectTools()` is unchanged — it already works with the skills service.
- **Migration**: Existing agents have no `skills` field. Migration adds default behavior: built-in agent gets all built-in skills; user agents get none. No breaking change for existing conversations.
- **APIs**: New REST routes under the agent builder API namespace for skill CRUD.
