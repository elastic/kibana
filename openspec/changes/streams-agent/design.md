## Context

The Streams plugin (`x-pack/platform/plugins/shared/streams/`) provides a comprehensive API surface (~60+ endpoints) for managing Elasticsearch data streams through a higher-level abstraction. It already includes substantial AI capabilities (partition suggestions, processing pipeline suggestions, grok/dissect generation, feature/system identification) implemented as LLM reasoning agents.

Agent Builder (`x-pack/platform/plugins/shared/agent_builder/`) is the standard framework for building AI agents in Kibana. It provides chat UI, conversation persistence, tool calling (with Zod schemas), streaming, and message history. Existing agents (Observability, Dashboard, Security) follow a pattern of: register agent definition with instructions → register tools with handlers → add to allow lists.

The Streams plugin's server-side is centered around `StreamsClient` (scoped per request via `StreamsService`), which provides methods for all stream operations. Tools will call `StreamsClient` methods directly rather than going through HTTP routes.

## Goals / Non-Goals

**Goals:**
- Register a Streams Agent in Agent Builder that can answer questions about streams and carry out management operations.
- Implement read tools that let the agent query stream state (list, detail, hierarchy, retention, schema, data quality, processors, partitions).
- Implement write tools that let the agent modify streams (retention, partitions, processors, field mappings, failure stores) with a preview-confirm-apply cycle.
- Implement AI orchestration tools that wrap existing Streams AI endpoints (partition suggestions, processing pipeline suggestions, grok/dissect pattern generation, feature/system identification) and expose them as agent tools.
- Agent instructions should enforce conversational context tracking — the agent should understand follow-up questions about a previously mentioned stream.

**Non-Goals:**
- Building a custom chat UI — Agent Builder's existing UI is used as-is.
- Reimplementing AI features that already exist — the agent delegates to existing endpoints.
- Significant events functionality — excluded from initial scope.
- Log search or querying document content — the agent manages streams, it doesn't replace Discover.
- Implementing conversation context tracking infrastructure — Agent Builder's built-in message history handles this; it's a behavioral requirement in agent instructions only.

## Decisions

### 1. Tool granularity: Focused tools over monolithic ones

**Decision:** Define many focused tools (one per operation) rather than a few large tools that accept action parameters.

**Rationale:** Focused tools give the LLM clearer intent signals. `streams.get_stream` with a `name` parameter is unambiguous. A monolithic `streams.manage` tool with an `action` enum would force the LLM to reason about which action to pick and what parameters apply. Focused tools also produce better tool-calling traces for debugging.

**Examples:**
- `streams.list_streams` — list all streams with summary stats
- `streams.get_stream` — get full detail for one stream
- `streams.get_data_quality` — get degraded/failed doc counts
- `streams.set_retention` — change retention policy
- `streams.fork_stream` — create a child stream with routing condition
- `streams.update_processors` — add/edit/remove processing steps
- `streams.suggest_partitions` — invoke AI partition suggestions
- `streams.suggest_processing_pipeline` — invoke AI pipeline suggestions

### 2. Tool implementation: Call StreamsClient directly, not HTTP routes

**Decision:** Tools run server-side and call `StreamsClient` methods directly, rather than making HTTP calls to Streams API routes. Each tool handler creates its own `StreamsClient` instance using the `request` from the Agent Builder tool context and `StreamsService` from the Streams plugin's start contract.

**Rationale:** Agent Builder tool handlers receive the user's `request` in their context argument. Since `StreamsService.createClient()` takes a request to produce a scoped `StreamsClient`, each tool call creates a fresh client scoped to the current user's permissions. This avoids HTTP overhead, serialization round-trips, and the complexity of authenticating internal HTTP calls. This is the same pattern used by the Observability agent, which calls service-layer methods directly rather than going through REST APIs.

**Alternative considered:** HTTP calls to Streams routes. Rejected because it adds unnecessary latency and requires constructing authenticated internal requests.

### 3. Preview-confirm-apply: Use tool confirmation for mutations

**Decision:** Write tools use Agent Builder's built-in tool confirmation mechanism (`prompt_request` / `awaiting_prompt` round state) for the preview-confirm-apply cycle.

**Rationale:** Agent Builder already supports human-in-the-loop confirmation. When a write tool is invoked, the agent can first describe what the change will do (the preview), and Agent Builder's confirmation flow handles the user approval step before the tool executes the mutation. This avoids building custom confirmation UI.

For operations that support simulation (e.g. processing pipeline changes), the tool can call the simulation endpoint first, include the simulation results in the preview, and only execute the actual mutation after confirmation.

**Alternative considered:** Split every write operation into two tools (e.g. `streams.preview_retention` + `streams.apply_retention`). Rejected because it doubles the tool count unnecessarily when Agent Builder already has confirmation built in.

### 4. AI orchestration tools: Thin wrappers over existing endpoints

**Decision:** AI orchestration tools (partition suggestions, pipeline suggestions, grok/dissect suggestions, feature identification) are thin wrappers that call existing Streams internal API functions and return the results to the agent.

**Rationale:** The existing AI features in `@kbn/streams-ai` are already well-implemented reasoning agents with tool-calling loops, prompt engineering, and validation. Reimplementing any of this inside the Streams Agent would be wasteful and error-prone. Instead, the Streams Agent orchestrates when to call these features and how to present the results conversationally.

For example, when a user says "help me organize my logs," the agent:
1. Calls `streams.get_stream` to understand current state
2. Calls `streams.suggest_partitions` to get AI suggestions
3. Presents the suggestions conversationally
4. After user approval, calls `streams.fork_stream` for each accepted partition

The agent's LLM handles the conversational reasoning; the existing AI handles the domain-specific analysis.

### 5. Agent registration: Dedicated streams_agent plugin

**Decision:** The agent is implemented as its own plugin at `x-pack/platform/plugins/shared/streams_agent/`, separate from both `streams/` (server-side APIs) and `streams_app/` (UI). The agent definition and all tool registrations happen in this plugin's `setup()` method, using the Agent Builder plugin contract.

**Rationale:** Separating the agent into its own plugin follows the existing Streams architecture where `streams/` handles server-side logic and `streams_app/` handles the UI. The agent is a distinct concern — it depends on both the Streams plugin (for `StreamsService`/`StreamsClient`) and the Agent Builder plugin (for agent/tool registration), but neither of those should know about the agent. A dedicated plugin keeps the dependency graph clean and allows the agent to be developed, tested, and enabled independently.

A new `streams` namespace is added to Agent Builder's namespace list, and the agent ID (`streams.agent`) and tool IDs (`streams.*`) are added to the allow lists.

### 6. Agent instructions: Encode behavioral requirements

**Decision:** The agent's system instructions explicitly describe:
- Its role as a Streams management specialist
- How to interpret implicit context (follow-up questions about a previously mentioned stream)
- The preview-confirm-apply protocol for mutations
- When to suggest next steps after completing an operation
- What it should not do (search logs, replace Discover, modify ES components outside Streams)

**Rationale:** Agent Builder's `configuration.instructions` field is the primary mechanism for shaping agent behavior. Well-crafted instructions are more effective than trying to encode behavior in tool schemas. The conversation history (provided by Agent Builder) gives the LLM the context it needs to track which stream is being discussed.

## Risks / Trade-offs

- **[LLM accuracy for mutations]** The agent might misinterpret user intent and propose incorrect changes (e.g. wrong stream name, wrong retention value). → *Mitigation:* The preview-confirm-apply cycle ensures the user sees exactly what will change before it's applied. The agent instructions emphasize always confirming before acting.

- **[Tool count scalability]** With many focused tools, the agent's context window fills with tool descriptions. → *Mitigation:* Start with core tools (list, get, retention, partitions, processors, AI suggestions) and add more incrementally. Agent Builder supports dynamic tool selection, so tools could be filtered based on conversation context in the future.

- **[AI orchestration latency]** Wrapping AI features that are themselves LLM-based (partition suggestions, pipeline suggestions) means a single user request may trigger multiple LLM calls — one for the agent reasoning and another for the underlying AI feature. → *Mitigation:* This is acceptable since the underlying AI features already have their own SSE streaming. The agent can report progress ("Analyzing your data for partition suggestions...") while the underlying feature runs.

- **[StreamsClient scoping]** Each tool handler must create its own `StreamsClient` from the request in the tool context. → *Mitigation:* The `streams_agent` plugin holds a reference to `StreamsService` from the Streams plugin's start contract. Each tool handler calls `streamsService.createClient(request)` using the request provided in the Agent Builder tool context, ensuring proper per-user permission scoping.
