## Context

The Agent Builder plugin supports built-in skills registered by solutions at setup time via `SkillRegistry`. These skills are read-only and bundled with the platform. The tools service already implements a dual-provider pattern (built-in + persisted) with a composite registry, and the same architecture should be applied to skills.

The skills service currently has a `SkillServiceImpl` that exposes `getSkillDefinition` and `listSkills` (built-in only) and a `getRegistry()` method that already returns a `CompositeSkillRegistry`. The persisted provider, composite registry, CRUD routes, and ES storage are already scaffolded but need to be verified against the issue requirements and feature-flagged.

**Current state**: The service already has the dual-provider architecture wired up. The key gaps are:
1. Routes are not gated behind the experimental features flag
2. The runner's `create_store.ts` uses `skillServiceStart.listSkills()` (built-in only) rather than `getRegistry().resolveSkillSelection()`, so user-created skills are not loaded into the execution filesystem
3. Tool ID validation needs the 5-tool limit enforced
4. No `referencedContent` handling for now (already excluded from the persisted path)

## Goals / Non-Goals

**Goals:**
- Support user-created skills persisted to Elasticsearch alongside built-in skills
- Provide CRUD HTTP APIs for skill management (create, read, update, delete)
- Validate tool IDs referenced by skills exist and enforce a limit of 5 tools per skill
- Gate all CRUD routes behind `AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID`
- Ensure user-created skills are loaded into the runner's skill volume at execution time

**Non-Goals:**
- `referencedContent` support for user-created skills (deferred)
- Frontend UI for skill management (separate change)
- Skill assignment on agent configuration (separate capability)
- Changes to the built-in skill registration API

## Decisions

### 1. Follow the tools dual-provider pattern exactly

**Decision**: Mirror the tools service architecture — `ReadonlySkillProvider` (built-in) + `WritableSkillProvider` (persisted) composed via `CompositeSkillRegistry`.

**Rationale**: The tools service has a proven, tested pattern. Reusing the same architecture reduces cognitive overhead and ensures consistency. The skill provider interfaces (`ReadonlySkillProvider`, `WritableSkillProvider`) already match this pattern in `skill_provider.ts`.

**Alternatives considered**:
- Single provider with a `readonly` flag per skill — rejected because it conflates built-in and persisted concerns, complicating the storage layer.

### 2. Elasticsearch storage via `StorageIndexAdapter`

**Decision**: Use `@kbn/storage-adapter`'s `StorageIndexAdapter` with `chatSystemIndex('skills')` for the persisted skills index, matching the tools storage pattern.

**Rationale**: Already implemented in `persisted/client/storage.ts`. The `StorageIndexAdapter` provides a thin, space-scoped abstraction over raw ES operations. The index schema stores: `id`, `name`, `space`, `description`, `content`, `tool_ids`, `referenced_content` (object, dynamic: false), `created_at`, `updated_at`.

**Space scoping**: All queries use `createSpaceDslFilter(space)` to scope data per Kibana space, same as tools.

### 3. Feature-flag all CRUD routes

**Decision**: Pass `featureFlag: AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID` to the `wrapHandler` function for all skill CRUD routes (create, update, delete). Read routes (list, get) should also be feature-flagged since user-created skills are an experimental feature.

**Rationale**: The issue explicitly requires gating behind the experimental features setting. The `getHandlerWrapper` mechanism already supports this — when the UI setting is `false`, routes return `404 Not Found`. This is the same pattern available for all agent builder routes.

**Implementation**: In `server/routes/skills.ts`, change `wrapHandler(handler)` to `wrapHandler(handler, { featureFlag: AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID })` for each route registration.

### 4. Tool ID validation with 5-tool limit

**Decision**: Validate `tool_ids` in the `CompositeSkillRegistry.create()` and `update()` methods — check each tool ID exists in the tool registry and enforce `tool_ids.length <= 5`.

**Rationale**: The issue specifies a limit of 5 tools per skill. The composite registry already has access to the `ToolRegistry` for validation. Validation at the registry level (not the route level) ensures consistency regardless of how skills are created.

**Implementation**: Already partially implemented in `composite_skill_registry.ts` via `validateToolIds`. Add the max-5 check.

### 5. Runner integration via `resolveSkillSelection`

**Decision**: Update `create_store.ts` to use `getRegistry().resolveSkillSelection()` instead of `skillServiceStart.listSkills()` so that user-created skills are included in the runner's skills volume.

**Rationale**: Currently `create_store.ts` calls `skillServiceStart.listSkills()` which only returns built-in skills. The `CompositeSkillRegistry.resolveSkillSelection()` method already handles expanding `*` wildcards and resolving explicit skill IDs from both providers, converting persisted skills to `SkillDefinition` format suitable for the skills store.

**Risk**: Needs the request context to create the composite registry. Verify `create_store.ts` has access to the request or receives a pre-built registry.

### 6. Reuse `validateSkillDefinition` for both sources

**Decision**: Apply the same validation rules (name length, content constraints, description) to both built-in and user-created skills via the existing `validateSkillDefinition` function.

**Rationale**: The issue explicitly says to reuse existing validation. Additional validation for persisted skills (e.g., the 5-tool limit) is layered on top.

## Risks / Trade-offs

**[Risk] Runner store doesn't receive request context** → The `create_store.ts` path may not have a `KibanaRequest` available to create the composite registry. Mitigation: pass the registry or a pre-resolved skill list into the store factory.

**[Risk] Index not created before first write** → `StorageIndexAdapter` lazily creates indices. First skill creation may have slight latency. Mitigation: This is acceptable and consistent with how tools storage works.

**[Trade-off] Feature-flagging read routes** → Gating list/get behind the experimental flag means the skills list API returns 404 when disabled, which could break clients expecting it. Mitigation: Only gate write routes if read routes need to remain stable; the issue says to gate the feature, so gating all routes is the safer approach for experimental status.

**[Trade-off] No `referencedContent` for user skills** → Users cannot attach referenced content to their skills. This is an explicit non-goal per the issue ("No referencedContent handling for now"). The field exists in the schema as `object { dynamic: false }` for future use.
