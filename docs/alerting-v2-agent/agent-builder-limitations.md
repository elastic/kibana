# Agent Builder — Known Limitations

Catalog of tasks that the agent builder handles poorly or cannot accomplish today. Each entry explains the gap, why it exists, and what would fix it.

---

## Episode timeline visualization

**Severity:** high — this is a core triage workflow

**What the user asks:**
"Show me a timeline for this episode" / "Visualize what happened during episode X" / "Create a chart of the episode lifecycle"

**What happens:**
The agent attempts to build a generic Lens or ES|QL visualization over the `.rule-events` data stream. The result is typically a time-series line or bar chart of event counts bucketed by time interval — not a state-transition timeline. Key problems:

| Problem | Detail |
|---------|--------|
| No episode-aware tool | The agent builder has no tool that understands episode structure (`episode.id`, `episode.status`, state transitions). It falls back to generic `create_visualization` / `visualization-creation` skill, which treats episode data like any other index. |
| Missing state mapping | Episodes follow a defined state machine (inactive → pending → active → recovering → inactive). The agent doesn't know this progression exists, so it can't render transitions as distinct labeled segments on a timeline. |
| Wrong chart type | The generic visualization skill guesses chart type from the data shape. For episode events it typically picks a metric or bar chart, not a heatmap or Gantt-style timeline. |
| No status coloring | The built-in `EpisodeLifecycleHeatmap` component in the alerting v2 UI maps statuses to colors (red/yellow/green). The agent's generic chart has no awareness of status semantics, so all segments look the same. |
| Timestamps vs. ordinal layout | Even the native `EpisodeLifecycleHeatmap` uses ordinal event indices (evenly spaced per event), not proportional time. The agent's generic chart either over-aggregates into time buckets or shows raw dots with no lifecycle context. |
| No thread/threading context | When asked in the context of Slack threading (e.g., "show me the episode timeline from that thread"), the agent has no access to `alerting-v2-slack-threads` index data or the stored episode metadata. |

**What would fix it:**

1. **Episode timeline tool** — A dedicated agent builder tool (`visualize_episode_timeline`) that:
   - Accepts an `episode.id` (or resolves it from context)
   - Queries `.rule-events` filtered to that episode, ordered by `@timestamp`
   - Maps each event to its `episode.status` with the known color scheme
   - Renders a horizontal segmented timeline (heatmap or annotation chart) with time-proportional segments
   - Labels transitions with timestamps and duration

2. **Episode context in the agent's system prompt** — Teach the agent about the alerting v2 state machine so it can reason about episode lifecycles even without a dedicated tool.

3. **Reuse the existing heatmap component** — The `EpisodeLifecycleHeatmap` already exists in `@kbn/alerting-v2-episodes-ui`. Expose it as a renderable attachment type that the agent can emit, similar to how `VisualizeLens` works for generic charts.

**Relevant code:**
- Generic viz skill: `x-pack/platform/plugins/shared/agent_builder_platform/server/skills/visualization_creation_skill.ts`
- Generic viz tool: `x-pack/platform/plugins/shared/agent_builder_platform/server/tools/create_visualization/create_visualization.ts`
- Episode state machine: `x-pack/platform/plugins/shared/alerting_v2/server/lib/director/strategies/basic_strategy.ts`
- Existing heatmap: `x-pack/platform/plugins/shared/alerting_v2/public/pages/episode_details_page/components/episode_lifecycle_heatmap.tsx`
- Episode events query: `x-pack/platform/packages/shared/response-ops/alerting-v2-episodes-ui/queries/episode_events_query.ts`

---

## Episode querying

**Severity:** high — the agent cannot answer basic questions about alerts

**What the user asks:**
"What episodes are active right now?" / "Show me episodes for the checkout service" / "How long has this episode been active?" / "What's the history for episode X?"

**What happens:**
The agent has zero awareness of alerting v2 data streams, fields, or query patterns. It doesn't know that `.rule-events` and `.alert-actions` exist, doesn't know the episode field schema, and doesn't know the ES|QL idioms required to aggregate events into episodes. When a user asks about episodes, the agent either:
- Searches for indices matching `*episode*` or `*alert*` via the generic index explorer and finds nothing recognizable
- Attempts a naive `FROM .rule-events` query without the required aggregation pattern, returning raw events instead of episode summaries
- Hallucinates field names or query syntax

### Why episode queries are non-trivial

Episodes are not stored as dedicated documents. They are **derived at query time** from raw alert events in `.rule-events` using a specific ES|QL aggregation pattern. Every episode query in the system follows this core idiom:

```esql
FROM .rule-events
| WHERE type == "alert"
| INLINE STATS first_timestamp = MIN(@timestamp), last_timestamp = MAX(@timestamp) BY episode.id
| EVAL duration = DATE_DIFF("ms", first_timestamp, last_timestamp)
| WHERE @timestamp == last_timestamp
| SORT @timestamp DESC
```

This pattern collapses many per-cycle events into one row per episode by keeping only the row at `last_timestamp` per `episode.id`. Without it, a query returns hundreds of raw events instead of a concise episode list.

### What the agent doesn't know

| Gap | Detail |
|-----|--------|
| **Data streams** | `.rule-events` (alert events with episode state) and `.alert-actions` (ack/snooze/notify records). The agent's index explorer and search tools have no special knowledge of these. |
| **Episode field schema** | `episode.id` (keyword), `episode.status` (keyword: `inactive`, `pending`, `active`, `recovering`), `episode.status_count` (long), `group_hash` (keyword), `data` (flattened), `status` (keyword: `breached`, `recovered`, `no_data`), `type` (keyword: `signal`, `alert`), `rule.id`, `rule.version`. |
| **Aggregation idiom** | The `INLINE STATS ... BY episode.id` + `WHERE @timestamp == last_timestamp` pattern that collapses events into episodes. Without this, every query returns raw per-cycle rows. |
| **ES|QL view** | A registered view `$.alert-episodes` exists (`FROM .rule-events` with the aggregation baked in) but the agent doesn't know it's available or how to use it. |
| **Dispatcher query patterns** | The dispatcher joins `.rule-events` and `.alert-actions` with `METADATA _index, _source`, extracts `data_json` via `JSON_EXTRACT(_source, "$.data")`, and requires `TO_STRING(_index) LIKE ".ds-.rule-events-*"` (not plain `_index LIKE`) due to an ES|QL bug. The agent would never discover these workarounds. |
| **Action queries** | Ack/snooze/deactivate state lives in `.alert-actions` with its own field schema (`action_type`, `episode_id`, `episode_status`, `expiry`, `notification_group_id`). Answering "is this episode acknowledged?" requires a separate query the agent can't construct. |
| **State machine** | Episode statuses follow a defined transition graph (inactive → pending → active → recovering → inactive). The agent can't reason about valid transitions, predict next states, or explain why an episode is in a given state. |

### Existing query patterns the agent should know

**Episode list** (what the UI runs):
```esql
FROM .rule-events
| WHERE type == "alert"
| INLINE STATS first_timestamp = MIN(@timestamp), last_timestamp = MAX(@timestamp) BY episode.id
| EVAL duration = DATE_DIFF("ms", first_timestamp, last_timestamp)
| WHERE @timestamp == last_timestamp
| SORT @timestamp DESC
| KEEP @timestamp, episode.id, episode.status, rule.id, group_hash, first_timestamp, last_timestamp, duration
| LIMIT 100
```

**Episode detail** (events for a single episode):
```esql
FROM .rule-events
| WHERE type == "alert" AND episode.id == "<id>"
| SORT @timestamp ASC
| KEEP @timestamp, episode.id, episode.status, rule.id, group_hash
```

**Active episodes for a rule**:
```esql
FROM .rule-events
| WHERE type == "alert" AND rule.id == "<rule_id>"
| STATS last_episode_status = LAST(episode.status, @timestamp) BY group_hash
| WHERE last_episode_status IN ("pending", "active", "recovering")
| KEEP group_hash
```

**Ack state for episodes**:
```esql
FROM .alert-actions
| WHERE episode_id IN ("<id1>", "<id2>") AND action_type IN ("ack", "unack")
| STATS last_ack_action = LAST(action_type, @timestamp) BY episode_id, rule_id, group_hash
```

**What would fix it:**

1. **Alerting v2 knowledge in the system prompt** — Add the episode field schema, data stream names, the core aggregation idiom, and the state machine to the agent's system prompt or a dedicated skill. This alone would let the generic ES|QL tool produce correct queries.

2. **Pre-built episode query tool** — A dedicated `query_episodes` tool that wraps the same query builders used by `@kbn/alerting-v2-episodes-ui`. Accepts filters (status, rule ID, time range, group values) and returns structured episode rows. Removes the need for the agent to construct the aggregation pattern from scratch.

3. **Register `$.alert-episodes` as a known source** — The ES|QL view already exists. If the agent's index explorer / search tools were aware of registered ES|QL views, the agent could `FROM $.alert-episodes` directly without needing the aggregation idiom.

4. **Episode context tool** — A read-only tool that, given an `episode.id`, returns a structured summary: current status, duration, transition history, rule name, group values, ack/snooze state, related episodes. This would answer most triage questions without the agent needing to construct any ES|QL.

**Relevant code:**
- Episode aggregation view: `x-pack/platform/plugins/shared/alerting_v2/server/resources/esql_views/alert_episodes.ts`
- Alert events schema: `x-pack/platform/plugins/shared/alerting_v2/server/resources/datastreams/alert_events.ts`
- Alert actions schema: `x-pack/platform/plugins/shared/alerting_v2/server/resources/datastreams/alert_actions.ts`
- UI episode list query: `x-pack/platform/packages/shared/response-ops/alerting-v2-episodes-ui/queries/episodes_query.ts`
- UI episode events query: `x-pack/platform/packages/shared/response-ops/alerting-v2-episodes-ui/queries/episode_events_query.ts`
- UI episode actions query: `x-pack/platform/packages/shared/response-ops/alerting-v2-episodes-ui/queries/episode_actions_query.ts`
- Dispatcher queries: `x-pack/platform/plugins/shared/alerting_v2/server/lib/dispatcher/queries.ts`
- Director queries: `x-pack/platform/plugins/shared/alerting_v2/server/lib/director/queries.ts`
- Rule executor queries: `x-pack/platform/plugins/shared/alerting_v2/server/lib/rule_executor/queries.ts`
- Agent generic ES|QL tool: `x-pack/platform/packages/shared/agent-builder/agent-builder-genai-utils/tools/generate_esql/`
- Agent index explorer: `x-pack/platform/packages/shared/agent-builder/agent-builder-genai-utils/tools/index_explorer.d.ts`

---

## Cross-solution context leakage

**Severity:** medium — confusing and erodes trust, especially during demos

**What the user sees:**
Using the Observability agent, the user asks about alerts or infrastructure and gets responses referencing Security concepts (threat hunting, SIEM rules, detection engine) or vice versa. The agent doesn't consistently know which solution it's operating in.

**Why it happens:**

The agent builder has no first-class "active solution" concept on the server. Solution scoping is entirely agent-centric — determined by which `agent_id` is selected and what that agent's configuration contains. The architecture has several gaps that allow cross-solution bleed:

| Layer | How it works | Where it leaks |
|-------|-------------|----------------|
| **Agent selection** | Each solution registers its own agent (`OBSERVABILITY_AGENT_ID`, threat hunting agent, search agent). The UI passes `agentId` when opening the sidebar. | Correct agent must be selected; `sessionTag` is client-only metadata and is not sent to the server as solution context. |
| **System prompt** | Generic "Elastic enterprise AI assistant" base template shared across all agents. Solution-specific text is injected via `configuration.instructions` (e.g., SRE instructions for Observability, analyst instructions for Security). | The base prompt contains no "you are in the Observability solution" framing. The model's pre-training and product documentation can surface Security or Search concepts regardless of the injected instructions. |
| **Built-in skills** | All built-in agents default to `enable_elastic_capabilities: true`, which loads **all** built-in skills (`skills.list({ type: 'built-in' })`) — not filtered by solution. | The Observability agent's research prompt includes platform skills (data exploration, visualization, graph creation) that are solution-agnostic. If Security-specific skills were registered as built-in, they'd appear in the Observability agent too. |
| **Platform tools** | `enable_elastic_capabilities: true` also adds `defaultAgentToolIds` — a shared set of platform tools (search, ES|QL, indices, cases, product docs, connectors, workflows). | The `cases` tool can return cases from any owner (Observability, Security) if the user has access. Product documentation tool can return docs from any solution. |
| **Solution-specific tools** | Each solution registers its own tools (Observability: SLO, APM, infra; Security: threat hunting, detection). These are only added to that solution's agent via explicit tool ID lists. | This boundary works correctly — Security tools don't appear in the Observability agent's tool list. But tool absence doesn't prevent the model from *talking about* Security concepts using general knowledge. |
| **Product documentation** | The product docs tool searches across all Elastic documentation, not scoped to the active solution. | A query about "alert rules" can return Security detection rule docs alongside Observability alerting docs, and the model may synthesize both into a single answer. |
| **Graph execution** | `runAgent` calls `runDefaultAgentMode` for every agent — there is no distinct observability graph or security graph. The same research → answer flow runs regardless of solution. | No solution-aware routing, prioritization, or filtering at the graph level. |

### Concrete examples

1. **Observability agent suggests Security detections** — User asks "how do I set up an alert for high CPU?" and the agent references Security detection rules or SIEM rule types alongside or instead of Observability threshold rules.

2. **Product docs cross-contamination** — User asks about "episodes" in the Observability agent and gets results mixing alerting v2 episodes with Security timeline/case concepts.

3. **Cases tool returns mixed results** — User asks "show me open cases" and sees both Observability and Security cases because the cases tool doesn't filter by owner unless explicitly told to.

**What would fix it:**

1. **Solution preamble in the system prompt** — Add an explicit "You are operating in the {solution} solution. Scope all responses, suggestions, and tool usage to {solution} unless the user explicitly asks about another area." line to the base prompt, populated from the agent's configuration.

2. **Solution-scoped product documentation** — Filter product doc search results by solution. When the Observability agent queries docs, only return Observability-relevant results (or heavily weight them).

3. **Solution-aware skill filtering** — Instead of loading all built-in skills for every agent, tag skills by solution and only load skills matching the agent's solution context.

4. **Tool parameter defaults by solution** — Pre-populate solution-specific defaults on shared tools. For example, set `cases.owner = 'observability'` when running in the Observability agent, or scope index patterns to Observability data streams.

5. **Negative instructions** — Add explicit "do not reference" guidance to each solution agent. For example, the Observability agent's instructions could include: "Do not suggest Security detection rules, SIEM features, or threat hunting workflows unless the user explicitly asks about Security."

**Relevant code:**
- Agent run path (single mode): `x-pack/platform/plugins/shared/agent_builder/server/services/agents/modes/run_agent.ts`
- Configuration resolution: `x-pack/platform/plugins/shared/agent_builder/server/services/agents/modes/utils/configuration.ts`
- Skill selection: `x-pack/platform/plugins/shared/agent_builder/server/services/agents/modes/utils/select_skills.ts`
- Tool selection: `x-pack/platform/plugins/shared/agent_builder/server/services/agents/modes/utils/select_tools.ts`
- Built-in agent defaults: `x-pack/platform/plugins/shared/agent_builder/server/services/agents/builtin/provider.ts`
- Base prompts: `x-pack/platform/plugins/shared/agent_builder/server/services/agents/modes/default/prompts/`
- Observability agent registration: `x-pack/solutions/observability/plugins/observability_agent_builder/server/agent/register_observability_agent.ts`
- Security agent registration: `x-pack/solutions/security/plugins/security_solution/server/agent_builder/agents/threat_hunting_agent.ts`
- Search agent registration: `x-pack/solutions/search/plugins/search_getting_started/server/agent/register_search_agent.ts`
- Session tag (client-only): `x-pack/platform/plugins/shared/agent_builder/public/embeddable/types.ts`
