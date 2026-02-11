## Context

The Streams plugin (`x-pack/platform/plugins/shared/streams/`) provides a comprehensive API surface (~60+ endpoints) for managing Elasticsearch data streams through a higher-level abstraction. It already includes substantial AI capabilities (partition suggestions, processing pipeline suggestions, grok/dissect generation, feature/system identification) implemented as LLM reasoning agents.

Agent Builder (`x-pack/platform/plugins/shared/agent_builder/`) is the standard framework for building AI agents in Kibana. It provides chat UI, conversation persistence, tool calling (with Zod schemas), streaming, and message history. Existing agents (Observability, Dashboard, Security) follow a pattern of: register agent definition with instructions → register tools with handlers → add to allow lists.

The Streams plugin's server-side is centered around `StreamsClient` (scoped per request via `StreamsService`), which provides methods for all stream operations. Tools will call `StreamsClient` methods directly rather than going through HTTP routes.

**Key dependency details (learned during implementation):**
- `StreamsPluginStart` was extended to expose `getScopedClients({ request })`, which returns `RouteHandlerScopedClients` — a bundle of `streamsClient`, `inferenceClient`, `scopedClusterClient`, `systemClient`, `uiSettingsClient`, and `logger`.
- `StreamsClient.upsertStream()` requires a **full** `UpsertRequest` (not partial). Write tools must read-modify-write: get the current definition, apply changes, then send the complete request. The `processing.updated_at` field must be stripped when constructing upsert requests.
- `FailureStore` is a union type (`{ inherit: {} } | { disabled: {} } | { lifecycle: { enabled: { data_retention?: string } } } | { lifecycle: { disabled: {} } }`), not `{ enabled: boolean }`.
- `FieldDefinitionType` is restricted to: `keyword`, `match_only_text`, `long`, `double`, `date`, `boolean`, `ip`, `geo_point`.
- `WiredStream.Definition` vs `ClassicStream.Definition` is a union requiring explicit type narrowing via `Streams.WiredStream.Definition.is()`.
- Agent Builder's `ToolHandlerContext` provides: `request`, `spaceId`, `esClient`, `savedObjectsClient`, `modelProvider`, `toolProvider`, `runner`, `resultStore`, `events`, `logger`, `prompts`. Notably, `modelProvider.getDefaultModel()` returns the connector already bound to the agent's execution.

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

### 7. Query documents tool: Let the agent see stream data

**Decision:** Provide a `streams.query_documents` tool that returns recent sample documents from a stream, sorted by `@timestamp` descending. The tool accepts an optional count (default 20) and optional time range, and returns the documents with their source fields.

**Rationale:** Users naturally want to ask "show me what's in this stream." Beyond serving that direct use case, the query tool makes the agent smarter across all workflows — it can inspect actual data before suggesting partitions, processors, or field mappings, grounding its recommendations in reality rather than metadata alone. It also solves a practical problem: the agent needs to know the time range of recent data when calling AI tools (partition suggestions, feature identification, etc.), and LLMs cannot reliably produce correct Unix timestamps for "now."

**Trade-offs:**
- Adds one more tool call to some workflows (e.g. query_documents → suggest_partitions), increasing latency slightly.
- Sample documents enter the context window. Mitigation: default to 20 documents and truncate long field values to keep payload manageable.

### 8. Query documents: Flatten + instruct for list presentation

**Decision:** The `streams.query_documents` tool flattens nested document structures into dot-notation key-value maps before returning them, and the agent's system instructions direct it to present results as a chronological list rather than a prose summary.

**Rationale:** Stream documents are often deeply nested (e.g. `body.text`, `resource.attributes.host.name`). Returning nested JSON causes two problems: (1) it uses more context window tokens, and (2) LLMs naturally summarize complex nested structures into prose, losing the per-document detail that makes time series data useful. Flattening to dot-notation (`{ "@timestamp": "...", "body.text": "...", "resource.attributes.host.name": "..." }`) reduces both nesting and token count. Combined with agent instructions to present results as a list, this ensures users see individual log entries rather than a summarized paragraph.

**Trade-offs:**
- Flattening is schema-agnostic — works for any stream without picking specific fields.
- Dot-notation keys are readable and match the field paths users see in Discover.
- The agent retains full data to reason about, but instructions guide presentation format.

### 9. AI tool time ranges: Optional with server-side defaults

**Decision:** The `startMs` and `endMs` parameters on AI orchestration tools (`suggest_partitions`, `generate_description`, `identify_features`, `identify_systems`) are optional. When omitted, the tool defaults to the last 24 hours using `Date.now()` server-side.

**Rationale:** LLMs cannot reliably produce correct Unix timestamps. During testing, the agent hallucinated timestamps from 2022 when the current year is 2026, causing AI tools to analyze an empty time range. Making the parameters optional with sensible server-side defaults provides a safety net — even if the agent skips a `query_documents` call and goes straight to an AI tool, it still gets a reasonable time range.

**Alternative considered:** Relying solely on the `query_documents` tool to establish time ranges. Rejected because the agent might not always think to call it first, and defense-in-depth is cheap here.

### 10. AI connector: Use Agent Builder's model provider, not tool parameters

**Decision:** AI orchestration tools obtain the LLM connector from the Agent Builder tool context (`context.modelProvider.getDefaultModel()`) rather than accepting a `connectorId` parameter.

**Rationale:** Agent Builder already binds a connector to the agent's execution context. Exposing `connectorId` as a tool parameter forced the LLM to either pass it (which it doesn't know) or omit it and fall back to UI settings resolution — which failed when no default was configured, even though the agent was already running on a perfectly valid connector. Using the context's model provider is simpler, always works, and removes an unnecessary parameter from the tool schemas.

### 11. Sequential mutations: One write at a time per stream

**Decision:** The agent's system instructions require that when multiple mutations target the same stream, they MUST be executed one at a time — call the first tool, wait for it to complete, then call the next. The agent must never issue multiple mutation tool calls for the same stream in a single reasoning step.

**Rationale:** The Streams API uses an exclusive lock when modifying a stream definition. During testing, the agent called `streams.fork_stream` three times in parallel to create three partitions on the same parent stream. The first call acquired the lock and succeeded; the other two failed with "Could not acquire lock for applying changes." This is inherent to the Streams API design — multiple concurrent writes to the same stream are not supported.

**Alternative considered:** Server-side queuing or retry logic in the tool handler. Rejected because it would add complexity, hide failures, and conflict with the preview-confirm-apply model (the user expects each mutation to be a distinct, confirmable step).

### 12. AI tool time ranges: Agent must pass accurate values

**Decision:** The agent's system instructions require it to always pass accurate `startMs`/`endMs` values to AI tools based on data it has already observed (from prior `query_documents` calls). If no documents have been queried yet, the agent must call `query_documents` first to discover the actual time range before invoking an AI tool.

**Rationale:** During testing, the agent queried documents from a stream and observed data from Feb 5th, but when subsequently calling `suggest_partitions` it passed no time range. The tool defaulted to the last 24 hours, found zero documents, and returned no suggestions. The server-side 24h default (Decision 9) is a safety net, not a substitute for accurate time ranges — data can easily be older than 24 hours. The agent instructions now make this a hard requirement rather than a soft suggestion.

### 13. Mutation safety: Prerequisite checklist, few-shot examples, and severity tiers

**Decision:** The agent's mutation protocol instructions are restructured using three prompt engineering techniques:
1. **Prerequisite framing with self-verification** — Instead of "follow this protocol," the instructions frame the preview-confirm steps as a gate: "BEFORE calling ANY write tool, verify ALL of the following: ✓ preview shown, ✓ user confirmed, ✓ single tool call." The agent must self-check before acting.
2. **Few-shot examples** — Concrete correct and incorrect examples show the agent what proper interactions look like for creating partitions and deleting streams.
3. **Severity tiers** — Destructive operations (`delete_stream`) get additional requirements: the agent must show child streams, document counts, and warn that deletion is irreversible. This uses `query_documents` and `get_stream` to gather context before presenting the preview.

**Rationale:** During testing, the agent skipped the preview-confirm-apply protocol entirely when asked "Delete all child streams of logs.android" — it immediately called `delete_stream` twice without any preview or confirmation. The previous instructions described the protocol abstractly but the LLM bypassed it. Research shows LLMs follow concrete examples far more reliably than abstract descriptions, and prerequisite framing ("you cannot do Y without first doing X") is harder to bypass than sequential protocols ("do X, then Y"). Severity tiers ensure the most dangerous operations get the strongest guardrails.

**Techniques applied:**
- Few-shot learning (show correct and incorrect behavior)
- Self-verification checklist (validate preconditions before tool invocation)
- Progressive disclosure (normal mutations get standard protocol, destructive operations get extra requirements)
- Negative examples (explicitly show what WRONG behavior looks like)

### 14. Agent instructions: Holistic prompt engineering review

**Decision:** The agent system instructions are restructured and expanded based on a comprehensive prompt engineering review. The changes address eight identified issues:

1. **Instruction ordering** — The `<mutation_protocol>` section is moved to immediately after `<role>`, leveraging primacy effect. LLMs pay most attention to the beginning and end of instructions; safety-critical rules were previously buried in the middle.

2. **Response formatting guidance** — A new `<response_formatting>` section provides explicit formatting patterns for each tool output type (schema as field lists, data quality as concise metrics, lifecycle as summary lines, partitions as numbered lists). Without this, the LLM defaults to prose for everything, producing inconsistent and verbose responses.

3. **Error handling guidance** — A new `<error_handling>` section tells the agent to report errors clearly with the stream name and attempted operation, explain likely causes if known, and suggest next steps. Without this, the agent may silently retry, give generic errors, or guess at causes.

4. **Multi-step workflow examples** — A new `<workflows>` section provides a concrete few-shot example of a complete orchestration flow (query data → suggest partitions → create partitions with sequential execution). This gives the LLM a template for complex multi-tool interactions.

5. **Tool selection heuristics** — A new `<tool_selection>` section guides the agent on when to use `get_stream` (general overview) vs focused tools (`get_schema`, `get_data_quality`, `get_lifecycle_stats`), and when to use `query_documents` vs `list_streams`. Without this, the agent may over-call or under-call tools.

6. **Tone and conciseness** — The `<role>` section now includes a communication style directive: be direct, lead with data not filler, prefer structured formatting over prose. Operations teams value brevity.

7. **`list_streams` tool description fix** — The tool description claimed to return type, data quality status, and storage, but the handler only returns name and description. The description is corrected to match reality.

8. **Ambiguous stream name resolution** — The `<context_tracking>` section now includes guidance for handling partial stream names (e.g., "nginx" → try "logs.nginx", fall back to `list_streams` to find matches).

**Rationale:** Each issue was identified through testing or prompt engineering best practice analysis:
- Issues 1, 6 are structural improvements grounded in LLM attention patterns and user experience research.
- Issues 2, 4, 5 apply the "Show, Don't Tell" principle — examples and concrete heuristics outperform abstract instructions.
- Issue 3 fills a gap that causes poor error experiences.
- Issue 7 prevents the LLM from referencing data that doesn't exist in tool responses.
- Issue 8 improves the natural language experience by reducing unnecessary clarification prompts.

**Trade-off:** The expanded instructions add ~400–500 tokens to the system prompt. This is justified because the instructions are read once per conversation and the improvements affect every interaction. The token cost is amortized across all tool calls in the conversation.

## Risks / Trade-offs

- **[LLM accuracy for mutations]** The agent might misinterpret user intent and propose incorrect changes (e.g. wrong stream name, wrong retention value). → *Mitigation:* The preview-confirm-apply cycle ensures the user sees exactly what will change before it's applied. The agent instructions emphasize always confirming before acting.

- **[Tool count scalability]** With many focused tools, the agent's context window fills with tool descriptions. → *Mitigation:* Start with core tools (list, get, retention, partitions, processors, AI suggestions) and add more incrementally. Agent Builder supports dynamic tool selection, so tools could be filtered based on conversation context in the future.

- **[AI orchestration latency]** Wrapping AI features that are themselves LLM-based (partition suggestions, pipeline suggestions) means a single user request may trigger multiple LLM calls — one for the agent reasoning and another for the underlying AI feature. → *Mitigation:* This is acceptable since the underlying AI features already have their own SSE streaming. The agent can report progress ("Analyzing your data for partition suggestions...") while the underlying feature runs.

- **[StreamsClient scoping]** Each tool handler must create its own `StreamsClient` from the request in the tool context. → *Mitigation:* The `streams_agent` plugin holds a reference to `StreamsService` from the Streams plugin's start contract. Each tool handler calls `streamsService.createClient(request)` using the request provided in the Agent Builder tool context, ensuring proper per-user permission scoping.
