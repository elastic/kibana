## Context

The agent builder plugin currently supports two entity types with dual-source (built-in + user-created) patterns: **tools** and **agents**. Skills, however, are built-in only — registered at plugin setup via `SkillService.setup().registerSkill()` and stored in an in-memory `SkillRegistry`.

Current skill architecture:
- `SkillDefinition` (in `@kbn/agent-builder-server`) defines skills with `getAllowedTools()` and `getInlineTools()` methods
- `SkillRegistry` is a simple in-memory `Map<string, SkillDefinition>`
- `SkillService` wraps the registry with setup/start lifecycle
- At runtime, `createStore()` creates a `SkillsStore` with **all** registered skills, regardless of agent
- `loadSkillTools()` resolves a skill's tools when the agent reads it from the filesystem
- Skills are exposed to agents via a `MemoryVolume` mounted on a `VirtualFileSystem`

The tool system already solves the dual-source problem with `ReadonlyToolProvider` (built-in) + `WritableToolProvider` (persisted in ES) composed in `ToolRegistryImpl`. We mirror this pattern for skills.

## Goals / Non-Goals

**Goals:**
- Users can CRUD skills via API and UI
- User-created skills can reference tools from the tool registry only (no inline tools, no hardcoded built-in tool IDs)
- Agents can be assigned specific skills (built-in and/or user-created)
- Default agent gets all built-in skills automatically; user agents get none by default
- Runtime skill store only exposes skills the agent has access to
- Follow existing patterns (provider pattern, saved objects, API routes)

**Non-Goals:**
- User-created skills cannot define `getInlineTools()` or `getAllowedTools()` — only `toolIds: string[]` resolved from the tool registry
- No skill versioning or draft/publish workflow (create/update is immediate)
- No skill sharing across spaces (skills are space-scoped, like tools)
- No skill marketplace or import/export
- No changes to how built-in skills are registered (plugin setup flow unchanged)

## Decisions

### 1. Persisted skill storage: Saved Objects

**Decision**: Store user-created skills as Elasticsearch saved objects (same as persisted tools).

**Rationale**: Saved objects provide space-scoping, RBAC integration, audit logging, and migration support out of the box. This is the established Kibana pattern for user-created entities and matches how persisted tools work.

**Alternative considered**: A dedicated ES index. Rejected because it would bypass Kibana's built-in space isolation, RBAC, and migration infrastructure.

### 2. Provider pattern for skill service

**Decision**: Refactor `SkillService` to use `ReadonlySkillProvider` + `WritableSkillProvider`, mirroring `ToolRegistry`'s provider pattern.

**Rationale**: This is the proven pattern in the codebase. The `ToolRegistryImpl` demonstrates how to compose multiple providers with ordered lookup (built-in first, then persisted) and readonly guards. Reusing this pattern means less cognitive overhead and consistent behavior.

The skill service will compose providers similarly:
```
orderedProviders: [builtinProvider (readonly), persistedProvider (writable)]
```

### 3. User-created skill definition shape

**Decision**: User-created skills use a simplified definition without `getAllowedTools()` / `getInlineTools()` methods. Instead, they declare `tool_ids: string[]` — a list of tool IDs from the tool registry.

**Rationale**: User-created skills cannot safely define inline tool handlers (arbitrary code execution). Restricting to registry tool IDs means:
- All referenced tools are validated to exist in the registry at create/update time
- Tools go through the standard availability checks at runtime
- No arbitrary code injection vector

The persisted definition shape:
```typescript
interface PersistedSkillDefinition {
  id: string;
  name: string;
  description: string;
  content: string;                    // Skill instructions (markdown)
  referenced_content?: ReferencedContent[];
  tool_ids: string[];                 // Tool IDs from the registry
}
```

At runtime, the persisted provider converts `tool_ids` to the internal `SkillDefinition` format by implementing `getAllowedTools()` to return the tool IDs.

### 4. Skill assignment on agents

**Decision**: Add a `skills` field to `AgentConfiguration` with `SkillSelection[]` type, parallel to the existing `tools: ToolSelection[]`.

```typescript
interface SkillSelection {
  skill_ids: string[];
}

interface AgentConfiguration {
  // ... existing fields
  skills?: SkillSelection[];
}
```

**Rationale**: This mirrors the tool selection pattern. When `skills` is undefined or empty, no skills are exposed. The built-in agent's definition will be updated to include all built-in skill IDs.

**Default behavior**:
- Built-in agent (`elastic-ai-agent`): `skills: [{ skill_ids: ['*'] }]` — a wildcard meaning "all built-in skills" (matches current behavior)
- User-created agents: `skills` defaults to `[]` (no skills)

### 5. Scoped skill store at runtime

**Decision**: `createStore()` receives the agent's skill selection and filters skills accordingly, instead of loading all skills.

**Rationale**: Currently `createStore()` calls `skillServiceStart.listSkills()` and loads everything. With skill assignment, it must:
1. Resolve the agent's `SkillSelection[]` to concrete skill IDs
2. Filter the combined skill list (built-in + persisted) to only assigned skills
3. Pass filtered skills to `createSkillsStore()`

This ensures the agent's filesystem volume only contains skills it should see.

### 6. API route structure

**Decision**: New CRUD routes under the existing agent builder API namespace:

- `POST /api/agent_builder/skills` — create
- `GET /api/agent_builder/skills` — list
- `GET /api/agent_builder/skills/{id}` — get
- `PUT /api/agent_builder/skills/{id}` — update
- `DELETE /api/agent_builder/skills/{id}` — delete

**Rationale**: Follows the same convention as tool CRUD routes in the agent builder plugin.

## Risks / Trade-offs

**[Risk] Tool ID references become stale** — A user-created skill references a tool that is later deleted.
→ **Mitigation**: Validate tool existence at skill creation/update time. At runtime, if a referenced tool is missing, log a warning and skip it (graceful degradation). Consider a future "referential integrity" check.

**[Risk] Wildcard skill selection for built-in agent** — Using `*` for "all built-in skills" means new built-in skills are automatically available to the default agent.
→ **Mitigation**: This matches current behavior (all skills are exposed). If granular control is needed later, the selection mechanism already supports explicit IDs.

**[Risk] Performance with many user-created skills** — Listing all skills requires querying both registry and ES.
→ **Mitigation**: Skills are space-scoped and expected to be in the low hundreds at most. The saved objects API is designed for this scale. Caching can be added later if needed.

**[Trade-off] No inline tools for user-created skills** — This limits expressiveness compared to built-in skills.
→ **Accepted**: This is a security boundary. Users can create custom tools in the tool registry and reference them from skills. The composition of tool + skill achieves the same result without arbitrary code execution.
