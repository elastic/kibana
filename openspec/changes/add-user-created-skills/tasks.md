## 1. Persisted Skill Storage

- [x] 1.1 Verify `persisted/client/storage.ts` index schema matches spec (id, name, space, description, content, tool_ids, referenced_content, created_at, updated_at)
- [x] 1.2 Verify `persisted/client/converters.ts` correctly maps between ES documents and `SkillPersistedDefinition` (fromEs, createAttributes, updateDocument)
- [x] 1.3 Verify `persisted/client/client.ts` CRUD operations are space-scoped via `createSpaceDslFilter`
- [x] 1.4 Verify `persisted/client/types.ts` defines `SkillPersistedDefinition` with all required fields

## 2. Skill Providers

- [x] 2.1 Verify `builtin_provider.ts` wraps `SkillRegistry` as `ReadonlySkillProvider` returning `SkillDefinition` objects
- [x] 2.2 Verify `persisted/provider.ts` implements `WritableSkillProvider` with `toPublicDefinition` mapping (readonly: false)
- [x] 2.3 Verify `skill_provider.ts` type definitions for `ReadonlySkillProvider` and `WritableSkillProvider` have `id` field and correct method signatures

## 3. Composite Skill Registry

- [x] 3.1 Verify `composite_skill_registry.ts` composes built-in + persisted providers with correct lookup order (built-in first)
- [x] 3.2 Verify `list()` returns both built-in (readonly: true) and persisted (readonly: false) skills
- [x] 3.3 Verify `create()` validates skill ID via `validateSkillId`, checks for duplicates via `has()`, and delegates to persisted provider
- [x] 3.4 Verify `update()` and `delete()` reject built-in skills with `createBadRequestError`
- [x] 3.5 Add max 5 tool IDs validation in `create()` and `update()` — return 400 if `tool_ids.length > 5`
- [x] 3.6 Verify `resolveSkillSelection()` correctly resolves persisted skills via `convertPersistedToSkillDefinition` with `getAllowedTools`

## 4. Skill Service Wiring

- [x] 4.1 Verify `skill_service.ts` `start()` creates both providers and wires them into `CompositeSkillRegistry` via `getRegistry()`
- [x] 4.2 Verify `getRegistry()` passes the tool registry to the composite registry for tool ID validation

## 5. CRUD HTTP Routes

- [x] 5.1 Verify `POST /api/agent_builder/skills` route accepts `id`, `name`, `description`, `content`, `tool_ids` and delegates to `registry.create()`
- [x] 5.2 Verify `GET /api/agent_builder/skills` route delegates to `registry.list()` and returns all skills
- [x] 5.3 Verify `GET /api/agent_builder/skills/{skillId}` route delegates to `registry.get()` and returns the skill
- [x] 5.4 Verify `PUT /api/agent_builder/skills/{skillId}` route accepts partial updates and delegates to `registry.update()`
- [x] 5.5 Verify `DELETE /api/agent_builder/skills/{skillId}` route delegates to `registry.delete()`
- [x] 5.6 Verify read routes require `readAgentBuilder` privilege and write routes require `manageAgentBuilder` privilege

## 6. Feature Flag Gating

- [x] 6.1 Add `featureFlag: AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID` to all skill route `wrapHandler` calls in `server/routes/skills.ts`
- [x] 6.2 Verify routes return 404 when `agentBuilder:experimentalFeatures` is `false`

## 7. Runtime Integration

- [x] 7.1 Update `create_store.ts` to use `getRegistry().resolveSkillSelection()` instead of `skillServiceStart.listSkills()` so user-created skills are loaded into the skills volume
- [x] 7.2 Verify `SkillsStoreImpl.add()` correctly mounts user-created skills (converted from `SkillPersistedDefinition` to `SkillDefinition`) into the `MemoryVolume`
- [x] 7.3 Verify wildcard `*` selection expands to built-in skills only, while explicit skill IDs resolve from both providers

## 8. Validation

- [x] 8.1 Verify `validateSkillDefinition` is applied to user-created skills on create/update for name, description, and content constraints
- [x] 8.2 Verify `validateSkillId` is applied on skill creation for ID format validation
- [x] 8.3 Add tool_ids length validation (max 5) with descriptive error message

## 9. Tests

- [x] 9.1 Add/verify unit tests for `CompositeSkillRegistry` — create, update, delete, list, tool ID validation, 5-tool limit
- [x] 9.2 Add/verify unit tests for persisted skill client — CRUD operations, space scoping, converters
- [x] 9.3 Add/verify unit tests for persisted skill provider — toPublicDefinition mapping
- [x] 9.4 Add/verify integration tests for CRUD routes — success and error cases
- [x] 9.5 Add/verify feature flag tests — routes return 404 when flag is disabled
- [x] 9.6 Add/verify runtime resolution tests — user-created skills loaded into skill store
