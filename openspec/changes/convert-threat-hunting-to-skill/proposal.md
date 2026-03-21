## Why

The Security solution currently registers a dedicated **Threat Hunting Agent** (`security.agent`) as a built-in agent in the Agent Builder. This agent uses the identical execution flow (same LangGraph, same research→answer phases, same model) as every other agent — the only difference is a one-line instruction string and a tool selection of 12 tool IDs (8 platform + 4 security). Meanwhile, the strategic direction is to consolidate into a **single default Elastic AI Agent with modular skills**, where security capabilities are skills that users can enable/disable.

The skill infrastructure (`SkillService`, `VirtualFileSystem`, `MemoryVolume`, lazy tool loading) exists on a feature branch, gated behind `SKILLS_ENABLED = false`. Rather than a single monolithic skill, the architecture enforces a **7-tool limit per skill** and provides a directory-based filesystem that the agent navigates — both of which reward decomposition into multiple focused skills.

## What Changes

### Multi-skill decomposition

Instead of one "threat hunting" mega-skill, decompose into focused skills aligned with the existing `SkillsDirectoryStructure` and distinct security workflows:

| Skill | `basePath` | Purpose | Tools |
|---|---|---|---|
| **threat-hunting** | `skills/security` | Hypothesis-driven data exploration: iterative ES\|QL hunting, anomaly identification, IOC search, baseline comparison | `generate_esql`, `execute_esql`, `search`, `list_indices`, `get_index_mapping` (5) |
| **alert-analysis** | `skills/security/alerts` | Alert triage and investigation: fetch alerts, find related alerts by entity, correlate with threat intel, assess severity | `security.alerts`, `security.security_labs_search`, `security.entity_risk_score`, inline: `get-related-alerts` (4) |
| **detection-engineering** | `skills/security/alerts/rules` | Convert hunt findings to detection rules: rule creation, coverage gap analysis, exception management | `security.alerts`, `security.attack_discovery_search`, `security.create_detection_rule`, `security.manage_rule_exceptions` (4) |
| **entity-investigation** | `skills/security/entities` | Entity-centric investigation: user/host profiling, risk score analysis, lateral movement tracking | `security.entity_risk_score`, `platform.core.cases`, `search` (3) |

Each skill has:
- **Focused content** (markdown): methodology, best practices, and step-by-step workflows for that specific task
- **Referenced content**: Query templates (e.g., common ES|QL patterns for that workflow domain)
- **Scoped tools**: Only the tools relevant to that workflow, staying under the 7-tool cap
- **Cross-references**: Content can reference sibling skills ("to operationalize this finding as a rule, read the detection-engineering skill"), enabling the agent to chain workflows by reading additional skill files

The agent discovers skills via the filesystem hierarchy:
```
skills/security/
  threat-hunting/SKILL.md              ← main hunting entry point
  alerts/
    alert-analysis/SKILL.md            ← alert triage workflow
    rules/
      detection-engineering/SKILL.md   ← rule creation and tuning
  entities/
    entity-investigation/SKILL.md      ← entity-centric investigation
```

### Feature flag gating

Both the skills and the agent coexist in code, but at runtime only one path is active:

- **When `SKILLS_ENABLED = false`** (current state):
  - The Threat Hunting Agent (`security.agent`) is available — its availability handler returns `available`
  - Skills are registered but the `SkillsStoreImpl` skips mounting them to the VFS (existing behavior of the store constructor)
  - Users see and interact with the dedicated Threat Hunting Agent as they do today

- **When `SKILLS_ENABLED = true`** (after skill infrastructure ships):
  - The Threat Hunting Agent's availability handler returns `unavailable` — it is hidden from the agent list and throws `BadRequestError` if accessed directly
  - Skills are mounted to the VFS and appear in the `## SKILLS` section of the research agent's system prompt
  - Users interact with the default Elastic AI Agent, which discovers and loads security skills on demand

Implementation: the `createThreatHuntingAgent` availability handler adds a `SKILLS_ENABLED` check:
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

This gives us:
- **Zero-downtime migration**: Flip the flag and the UX transitions seamlessly
- **Easy rollback**: Set flag back to `false` if issues arise
- **No conversation breakage**: Existing `security.agent` conversations continue working until the agent is fully removed in a later release

### Cleanup (post-GA of skills)

Once skills are stable and the feature flag is removed:
- Delete the Threat Hunting Agent definition and remove `THREAT_HUNTING_AGENT_ID` from the allow list
- Remove the `SKILLS_ENABLED` check from the availability handler
- Handle legacy conversations tied to `security.agent` (migration or graceful deprecation)

## Capabilities

### New Capabilities
- `threat-hunting-skill`: The threat hunting skill definition — content covering hypothesis-driven hunting methodology, iterative ES|QL patterns, IOC enrichment; tools for ES|QL generation/execution, search, and index exploration
- `alert-analysis-skill`: The alert analysis skill definition — content for alert triage, related alert correlation, threat assessment; tools for alerts, security labs, entity risk scores, and a custom related-alerts inline tool
- `detection-engineering-skill`: The detection engineering skill definition — content for rule creation, coverage gap analysis, exception management; tools for alerts, attack discovery, and custom rule management inline tools
- `entity-investigation-skill`: The entity investigation skill definition — content for user/host profiling, risk score analysis, case creation; tools for entity risk scores, cases, and search

### Modified Capabilities
<!-- None — the dedicated agent is hidden via availability, not modified -->

## Impact

- **Packages affected**:
  - `security_solution` server — new skills directory (`server/agent_builder/skills/`) with 4 skill definitions, modified availability handler in `threat_hunting_agent.ts`
  - `@kbn/agent-builder-server` — may need `SkillsDirectoryStructure` additions if new directories are needed (current structure already covers `security`, `security/alerts`, `security/alerts/rules`, `security/entities`)
  - `@kbn/agent-builder-common` — no changes needed (skills don't affect the default agent's tool configuration)
- **Runtime behavior**:
  - Flag off: Identical to today — Threat Hunting Agent works as-is
  - Flag on: Agent hidden, 4 skills available in the VFS. The default Elastic AI Agent's research phase sees the skill index in `## SKILLS`, reads relevant skills on demand, tools are dynamically added
- **Breaking changes**: None while flag is off. When flag is on, `security.agent` returns `unavailable` — direct API consumers will get a `400 Bad Request`. This is intentional and reversible.
- **Dependencies**: Skills registration API (`agentBuilder.skill.registerSkill()`) must be available. On the feature branch it exists but is marked `@deprecated("not ready yet")`. Skills will only be active once `SKILLS_ENABLED` is flipped to `true` by the agent builder team.
- **Token efficiency**: With skills, content is lazy-loaded (only when the agent reads a skill file). The 4-skill decomposition means the agent typically loads 1-2 skills per conversation, not all 4. This is significantly more token-efficient than the current always-in-prompt agent instructions.
- **Tool limits**: Each skill stays under the 7-tool cap. Tools shared across skills (e.g., `security.alerts` used by both alert-analysis and detection-engineering) are deduplicated by the tool manager at runtime.
- **Cross-cutting**: This establishes the **reference pattern** for agent→skill migration. Observability (`observability.agent`) and Dashboard (`platform.dashboard.dashboard_agent`) can follow the same approach: keep agent available while flag is off, hide when flag is on, register skills in parallel.
