## 1. Common Types & Shared Package Changes

- [x] 1.1 Add `SkillSelection` type to `@kbn/agent-builder-common` (mirrors `ToolSelection`)
- [x] 1.2 Add `skills?: SkillSelection[]` field to `AgentConfiguration` interface in `@kbn/agent-builder-common`
- [x] 1.3 Add `readonly` field to the public skill definition type (to distinguish built-in vs user-created in API responses)
- [x] 1.4 Add persisted skill definition type to `@kbn/agent-builder-common` (id, name, description, content, referenced_content, tool_ids)
- [x] 1.5 Add Zod validation schemas for persisted skill create/update request bodies
- [x] 1.6 Add skill selection validation utility (resolve IDs, handle wildcard `"*"`)

## 2. Server Skill Provider Pattern

- [x] 2.1 Define `ReadonlySkillProvider` and `WritableSkillProvider` interfaces in the agent_builder plugin server (mirroring tool provider pattern)
- [x] 2.2 Wrap existing `SkillRegistry` as a `ReadonlySkillProvider` implementation
- [x] 2.3 Define saved object type for persisted skills (schema, mappings, migrations)
- [x] 2.4 Implement `WritableSkillProvider` backed by saved objects (create, get, list, update, delete, has)
- [x] 2.5 Implement conversion from persisted skill shape to internal `SkillDefinition` (map `tool_ids` to `getAllowedTools()`)
- [x] 2.6 Implement composite skill registry that composes readonly + writable providers with ordered lookup
- [x] 2.7 Add tool ID validation on skill create/update (verify all tool_ids exist in tool registry)

## 3. Skill Service Refactor

- [x] 3.1 Refactor `SkillService` to accept both providers and expose composite registry
- [x] 3.2 Update `SkillServiceSetup` to keep `registerSkill()` for built-in skills (unchanged)
- [x] 3.3 Update `SkillServiceStart` to expose composite registry methods (list, get, create, update, delete)
- [x] 3.4 Update plugin setup/start to wire up the new skill service with both providers
- [x] 3.5 Ensure `SkillServiceStart` is scoped per request/space (writable provider needs request context)

## 4. Skill CRUD API Routes

- [x] 4.1 Implement `POST /api/agent_builder/skills` route (create)
- [x] 4.2 Implement `GET /api/agent_builder/skills` route (list all)
- [x] 4.3 Implement `GET /api/agent_builder/skills/{id}` route (get by ID)
- [x] 4.4 Implement `PUT /api/agent_builder/skills/{id}` route (update)
- [x] 4.5 Implement `DELETE /api/agent_builder/skills/{id}` route (delete)
- [x] 4.6 Register routes in the plugin's route registration

## 5. Skill Assignment to Agents

- [x] 5.1 Update agent saved object schema to include `skills` field
- [x] 5.2 Update agent create/update validation to validate `skill_ids` against composite skill registry
- [x] 5.3 Update default built-in agent definition to include `skills: [{ skill_ids: ["*"] }]`
- [x] 5.4 Add migration for existing agents: default agent gets wildcard, user agents get empty array
- [x] 5.5 Update agent API response serialization to include `skills` field

## 6. Runtime Skill Store Scoping

- [x] 6.1 Update `createStore()` to accept agent's `SkillSelection[]` and filter skills accordingly
- [x] 6.2 Implement skill selection resolution logic (expand wildcard `"*"` to all built-in skill IDs, resolve explicit IDs from both providers)
- [x] 6.3 Pass filtered skill list to `createSkillsStore()` instead of all skills
- [x] 6.4 Update `loadSkillTools()` to handle user-created skills (resolve `tool_ids` from registry, skip missing with warning)
- [x] 6.5 Update runner dependencies to thread agent skill selection through to store creation

## 7. UI - Skills List & CRUD

- [ ] 7.1 Add skills section/tab in the agent builder UI navigation
- [ ] 7.2 Implement skills list view (table with name, description, type badge, tool count)
- [ ] 7.3 Implement empty state for no user-created skills
- [ ] 7.4 Implement create skill form (name, description, content editor, tool multi-select)
- [ ] 7.5 Implement edit skill form (pre-populated, same layout as create)
- [ ] 7.6 Implement delete skill confirmation dialog
- [ ] 7.7 Wire up skill CRUD forms to API client

## 8. UI - Skill Assignment on Agent Config

- [ ] 8.1 Add skill selection control to agent configuration form
- [ ] 8.2 Implement skill multi-select picker (list built-in + user-created, with type badges)
- [ ] 8.3 Display currently assigned skills with remove capability
- [ ] 8.4 Wire up skill selection to agent create/update API
- [ ] 8.5 Handle default agent's wildcard display (show "All built-in skills" indicator)

## 9. Tests

- [ ] 9.1 Unit tests for `WritableSkillProvider` (CRUD operations, conversion to SkillDefinition)
- [ ] 9.2 Unit tests for composite skill registry (ordered lookup, readonly guards, list merging)
- [ ] 9.3 Unit tests for tool ID validation on skill create/update
- [ ] 9.4 Unit tests for skill selection resolution (wildcard expansion, explicit IDs, mixed)
- [ ] 9.5 Unit tests for scoped skill store creation (filtering, empty selection, wildcard)
- [ ] 9.6 Integration tests for skill CRUD API routes
- [ ] 9.7 Integration tests for agent skill assignment (create agent with skills, verify runtime behavior)
