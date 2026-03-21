## Context

The Threat Hunting Agent (`security.agent`) is one of four built-in agents in the Agent Builder (alongside `elastic-ai-agent`, `observability.agent`, `platform.dashboard.dashboard_agent`). All four use the identical runtime: a LangGraph state graph with research→answer phases, tool selection via `AgentConfiguration.tools`, and optional custom instructions injected as a `## CUSTOM INSTRUCTIONS` block in the research/answer system prompts.

The skill infrastructure exists on a feature branch, gated by `SKILLS_ENABLED = false` and `FILESTORE_ENABLED = false`. When enabled, skills are:
1. Registered via `agentBuilder.skill.registerSkill()` at plugin setup
2. Materialized as markdown files in a `VirtualFileSystem` → `MemoryVolume`
3. Listed in the research agent's system prompt under `## SKILLS` (name + description + path only — not the full content)
4. Lazily loaded when the agent calls the `read` filestore tool on a skill path
5. On read, `loadSkillTools()` dynamically adds the skill's `getAllowedTools()` + `getInlineTools()` to the `ToolManager`

Each skill is capped at 7 tools (`getAllowedTools` + `getInlineTools` combined). Tools are added to a `dynamicTools` Map — duplicate IDs silently overwrite, so shared tools across skills don't cause errors.

The security_solution plugin already calls `registerAgents()`, `registerTools()`, `registerAttachments()`, and `registerSkills()` (commented out) in its setup lifecycle.

## Goals / Non-Goals

**Goals:**
- Decompose the Threat Hunting Agent into 4 focused built-in skills (threat-hunting, alert-analysis, detection-engineering, entity-investigation)
- Gate skills behind `SKILLS_ENABLED` — skills are inactive when the flag is off
- Hide the Threat Hunting Agent when `SKILLS_ENABLED` is on — agent returns `unavailable`
- Each skill has focused content (methodology/workflow), scoped tools (≤7), and optional referenced content (query templates)
- Skills cross-reference each other through content, enabling the agent to chain workflows
- Establish the reference pattern for agent→skill migration that Observability and Dashboard can follow

**Non-Goals:**
- No changes to the skill infrastructure itself (VFS, MemoryVolume, SkillService, SkillRegistry) — consumed as-is
- No changes to the default Elastic AI Agent configuration — skills are discovered via the VFS, not assigned per-agent
- No user-created skills — only built-in skills registered at plugin setup
- No conversation migration during the flag period — existing `security.agent` conversations become inaccessible when the flag is on (acceptable for dev/feature-flag phase)
- No new security tools in this change — use existing registered tools only (new tools like `create_detection_rule` are separate work items)
- No removal of the Threat Hunting Agent code — only hidden via availability; code deletion is post-GA cleanup

## Decisions

### 1. Four skills, not one

**Decision**: Decompose into 4 focused skills aligned with distinct security workflows and the existing `SkillsDirectoryStructure`.

**Rationale**: The 7-tool limit per skill makes a single skill impossible (the agent currently uses 12 tools). Beyond the hard constraint, decomposition provides:
- **Lazy loading efficiency**: The agent typically loads 1–2 skills per conversation. A hunting query loads `threat-hunting`; an alert investigation loads `alert-analysis` + possibly `entity-investigation`. Content for unused workflows never enters context.
- **Independent evolution**: Detection engineering can gain new tools/content without touching threat hunting.
- **Composability**: Skills reference each other ("to operationalize this finding, read the detection-engineering skill"), allowing the agent to chain workflows naturally through the filesystem.

**Alternative considered**: A single `security-hunting` skill that covers all workflows. Rejected because it exceeds the 7-tool limit and would be a ~3000-token monolith always loaded in full.

### 2. Skill ↔ tool mapping

**Decision**: Map tools to skills based on workflow affinity, not tool ownership. Some tools appear in multiple skills' `getAllowedTools()`.

| Skill | `getAllowedTools()` | `getInlineTools()` | Total |
|---|---|---|---|
| `threat-hunting` | `platform.core.generate_esql`, `platform.core.execute_esql`, `platform.core.search`, `platform.core.list_indices`, `platform.core.get_index_mapping` | — | 5 |
| `alert-analysis` | `security.alerts`, `security.security_labs_search`, `security.entity_risk_score` | `get-related-alerts` | 4 |
| `detection-engineering` | `security.alerts`, `security.attack_discovery_search`, `security.create_detection_rule`, `security.manage_rule_exceptions` | — | 4 |
| `entity-investigation` | `security.entity_risk_score`, `platform.core.cases`, `platform.core.search` | — | 3 |

**Rationale**: `security.alerts` appears in both `alert-analysis` and `detection-engineering` because both workflows need alert data. `platform.core.search` appears in `threat-hunting` and `entity-investigation` because both need raw data access. The `ToolManager.addTools()` uses a `Map<name, tool>`, so duplicate additions silently overwrite — no error, no performance impact.

**Alternative considered**: Strict tool partitioning (each tool in exactly one skill). Rejected because it would force unnatural workflow boundaries — you can't do detection engineering without reading alerts.

### 3. Registry tools for detection engineering (not inline)

**Decision**: `create-detection-rule` and `manage-rule-exceptions` are **registry tools** (`getAllowedTools`), not inline tools (`getInlineTools`).

**Rationale**: Inline tools only receive `ToolHandlerContext` which provides `esClient`, `request`, `spaceId`, `modelProvider`, and `logger`. They do **not** have access to:
- `RulesClient` (from alerting plugin — needed to create rules)
- `ExceptionListClient` (from lists plugin — needed to manage exceptions)
- `DetectionRulesClient` (from security solution context)
- `inference` plugin services

Both `create-detection-rule` and `manage-rule-exceptions` require plugin start services obtained via `core.getStartServices()`. This is only available in registry tools that receive `CoreSetup` at registration time.

The `security.create_detection_rule` registry tool already exists on the feature branch (behind `aiRuleCreationEnabled` experimental flag). The `security.manage_rule_exceptions` tool needs to be created as a new registry tool following the same pattern.

**Tool: `security.manage_rule_exceptions` (new)**
- Input schema: `rule_id` (string), `items` (array of exception entries with name, description, field conditions, tags, OS types, comments)
- Handler: Uses `core.getStartServices()` → `alerting.getRulesClientWithRequest()` to find the rule, `lists.getExceptionListClient()` to create exception items
- Creates a default exception list for the rule if one doesn't exist, then creates exception items
- Availability: Gated by security space check (same as other security tools)

**Alternative considered**: Implementing these as inline tools with direct ES queries to the rules/exceptions indices. Rejected because it would bypass Kibana's built-in RBAC, validation, and audit logging provided by `RulesClient` and `ExceptionListClient`.

### 4. Feature flag gating via availability handler

**Decision**: Use the Threat Hunting Agent's existing `availability.handler` to check `SKILLS_ENABLED` and return `unavailable` when skills are active.

```typescript
availability: {
  cacheMode: 'space',
  handler: async ({ request }) => {
    if (SKILLS_ENABLED) {
      return { status: 'unavailable', reason: 'Replaced by security skills' };
    }
    return getAgentBuilderResourceAvailability({ core, request, logger });
  },
},
```

**Rationale**: The `AgentRegistryImpl.list()` method (line 109–119 of `agent_registry.ts`) filters out agents where `isAvailable` returns `unavailable`. The `get()` method throws `BadRequestError` for unavailable agents. This is the existing, tested mechanism for hiding agents — no new infrastructure needed.

Skills are gated on the other side by the `SkillsStoreImpl` constructor, which skips mounting skills to the VFS when `SKILLS_ENABLED = false`. And the research agent prompt conditionally includes the `## SKILLS` section only when `SKILLS_ENABLED` is true (line 195 of `research_agent.ts`). So both sides of the toggle are already handled by the framework.

**Alternative considered**: A separate feature flag for security skills specifically. Rejected because the `SKILLS_ENABLED` flag already gates the entire skill infrastructure (store, prompts, filestore). Adding a second flag would create a confusing matrix of states. When the agent builder team enables skills globally, security skills should activate.

### 5. Skill content structure

**Decision**: Each skill's `content` field follows a structured markdown pattern:
1. **Purpose** — one-line description of when to use this skill
2. **Workflow steps** — numbered step-by-step methodology
3. **Tool usage guidance** — which tools to call and in what order, with example parameters
4. **Cross-references** — links to sibling skills for adjacent workflows
5. **Best practices** — domain-specific tips and common pitfalls

Referenced content (`referencedContent[]`) provides reusable query templates stored as separate files:
- `threat-hunting` → `./queries/lateral-movement.md`, `./queries/c2-beaconing.md`, etc.
- `alert-analysis` → `./queries/related-by-entities.md` (already exists in the sample skill)
- `detection-engineering` → `./templates/kql-rule.md`, `./templates/eql-sequence.md`

**Rationale**: This mirrors the existing `alertAnalysisSampleSkill` pattern. The agent sees the skill content when it reads the SKILL.md file, and can read referenced content files for specific query templates. Content is loaded lazily via the `read` filestore tool with a 10,000-token safeguard truncation.

### 6. Directory structure — no changes needed

**Decision**: Use the existing `SkillsDirectoryStructure` paths as-is.

| Skill | `basePath` | Full path |
|---|---|---|
| `threat-hunting` | `skills/security` | `skills/security/threat-hunting/SKILL.md` |
| `alert-analysis` | `skills/security/alerts` | `skills/security/alerts/alert-analysis/SKILL.md` |
| `detection-engineering` | `skills/security/alerts/rules` | `skills/security/alerts/rules/detection-engineering/SKILL.md` |
| `entity-investigation` | `skills/security/entities` | `skills/security/entities/entity-investigation/SKILL.md` |

**Rationale**: The type-level directory structure already defines `security`, `security/alerts`, `security/alerts/rules`, and `security/entities` as valid `FileDirectory` paths. No modification to `SkillsDirectoryStructure` is needed.

## Risks / Trade-offs

**[Risk] Agent reads wrong skill or no skill** — The agent decides which skill to read based on the skill index (name + description). If descriptions are ambiguous, the agent may pick the wrong skill or skip skills entirely.
→ **Mitigation**: Write distinct, non-overlapping descriptions. Test with representative queries across all 4 skill domains in evals. The agent can also `ls skills/security/` to browse the hierarchy and read multiple skills.

**[Risk] Tool duplication across skills** — Tools like `security.alerts` appear in multiple skills. If the agent reads both `alert-analysis` and `detection-engineering`, `loadSkillTools()` adds `security.alerts` twice.
→ **Mitigation**: The `ToolManager.dynamicTools` is a `Map<name, tool>`. Duplicate `set()` calls silently overwrite. No error, no double-execution. The TODO comment in `tool_manager.ts` suggests proper dedup may be added later — our approach is forward-compatible.

**[Risk] Inline tools not in allow list** — Inline tools (`getInlineTools()`) are defined within the skill, not in the `AGENT_BUILDER_BUILTIN_TOOLS` allow list. If a future validation pass checks all tool IDs against the allow list, inline tools would fail.
→ **Mitigation**: Inline tools bypass the allow list by design (they're not registered via `agentBuilder.tools.register()`). They go through `skillsService.convertSkillTool()` → `ToolManager.addTools()` with `dynamic: true`. Monitor for allow-list changes.

**[Risk] Skill content becomes stale** — Hunting methodologies, query patterns, and tool schemas evolve. Skill content can drift from actual tool behavior.
→ **Mitigation**: Referenced content (query templates) is separated from methodology content. Templates can be updated independently. Include skill content in the detection engineering team's review cycle. Add eval coverage that validates skill workflows end-to-end.

**[Trade-off] No conversation migration during flag period** — When `SKILLS_ENABLED` is flipped on, existing conversations on `security.agent` become inaccessible (agent returns `unavailable`).
→ **Accepted**: This is a development flag, not a user-facing toggle. When the flag is removed for GA, a proper migration path will be implemented (redirect to default agent or mark as legacy). During the flag period, this only affects internal testing.

**[Trade-off] Skills not scoped to agents** — All registered skills appear in the VFS for all agents (the store loads all skills). There's no `SkillSelection` mechanism yet to assign skills per-agent.
→ **Accepted**: This is by design for the current skill infrastructure. The `add-user-created-skills` OpenSpec plans agent-scoped skill assignment. For now, security skills are visible to all agents when the flag is on, which is fine — they provide domain knowledge that any agent can use.

## Open Questions

1. **`get-related-alerts` query strategy** — The inline tool queries `.alerts-security.alerts-*` by entity values. Should it use ES|QL (via `esClient.asCurrentUser`) or the detection engine's alert search API? Direct ES|QL is simpler and only needs `esClient` (available in `ToolHandlerContext`), but bypasses any alert-specific access controls.

2. **Observability and Dashboard migration timeline** — Should this change include a generic "agent-to-skill migration" utility or pattern documentation that other teams can follow? Or is the code itself (4 skills + availability toggle + 1 new tool) sufficient as a reference?

3. **Eval coverage** — What eval scenarios should validate the multi-skill decomposition? At minimum: (a) hunting query activates threat-hunting skill, (b) alert investigation activates alert-analysis, (c) multi-step workflow chains two skills, (d) non-security query does not activate security skills.
