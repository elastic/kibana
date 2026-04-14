# Agent Builder Overview

Agent Builder is Kibana's framework for building and running LLM-powered agents. Agents interact with Kibana data through tools — querying Elasticsearch, executing ES|QL, creating visualizations, and calling external services.

---

## Repository Layout

```
x-pack/platform/plugins/shared/
├── agent_builder/                    # Core plugin — APIs, routes, service wiring
└── agent_builder_platform/           # Built-in platform tools and attachment types

x-pack/platform/packages/shared/agent-builder/
├── agent-builder-common/             # Shared types/utils (browser + server)
├── agent-builder-server/             # Server-side base classes for agents, tools, runners
├── agent-builder-browser/            # Browser-side types and React utilities
├── agent-builder-genai-utils/        # LLM/prompt utilities for tools (ES|QL, search, viz)
└── kbn-evals-suite-agent-builder/    # Evaluation test suite (Playwright + LLM-as-judge)

x-pack/solutions/observability/plugins/observability_agent_builder/  # Observability domain (other team)
x-pack/solutions/security/plugins/security_solution/server/agent_builder/  # Security domain (other team)
```

---

## Core Plugin: `agent_builder`

**Path:** `x-pack/platform/plugins/shared/agent_builder/`

The central plugin. Exposes HTTP APIs and wires together all services.

### Server services (`server/services/`)

| Directory | Purpose |
|-----------|---------|
| `agents/` | Agent registry — builtin and persisted agents; `modes/default/` contains the LangGraph execution loop |
| `runner/` | `RunnerManager` — creates scoped runners, wires context, dispatches `runAgent` / `runTool` |
| `tools/` | Tool registry — builtin, persisted, health tracking |
| `skills/` | Skill registration and lookup |
| `conversation/` | Multi-turn conversation state |
| `execution/` | Task persistence and status |
| `hooks/` | Lifecycle hook registration (`beforeAgent`, `beforeToolCall`, `afterToolCall`) |
| `sml/` | Semantic Memory Layer — knowledge base retrieval via `@`-mentions |
| `user_prompts/` | User-defined prompt overrides |
| `workflow/` | Integration with Kibana Workflows |
| `metering/` | Usage/cost tracking |
| `connector_lifecycle/` | LLM connector management |

### HTTP routes (`server/routes/`)

| File | Endpoint |
|------|---------|
| `chat.ts` | `POST /api/agent_builder/converse` — main conversation API |
| `tools.ts` | `POST /api/agent_builder/tools/_execute`, `GET/POST /api/agent_builder/tools` |
| `agents.ts` | `GET/POST /api/agent_builder/agents` |
| `skills.ts` | `GET /api/agent_builder/skills` |
| `mcp.ts` | `GET /api/agent_builder/mcp` — MCP server endpoint |
| `a2a.ts` | `GET/POST /api/agent_builder/a2a/{agentId}` — Agent-to-Agent protocol |
| `conversations.ts` | Conversation history management |
| `attachments.ts` | Context attachment management |

---

## Agent Execution Loop

**Path:** `server/services/agents/modes/default/`

The default agent mode is implemented as a **LangGraph** state machine with two separate LLM calls per turn: a **research agent** that calls tools, and an **answer agent** that writes the final response.

### Graph nodes (`graph.ts`)

```
START
  → init
  → researchAgent          ← calls LLM with tools bound; loops until handover or cycle limit
       ↓ tool_call
  → executeTool            ← runs the LangChain ToolNode
       ↓ tool_prompt        (interrupt: Human-in-the-Loop)
  → handleToolInterrupt    ← pauses execution, returns prompts to user
       ↓ (or researchAgent loops back)
  → prepareToAnswer        ← triggered when research agent sends handover or cycle limit hit
  → answerAgent            ← calls LLM without tools; produces final natural language response
  → finalize
END
```

Key behaviours:
- **Parallel tool calls**: the research agent issues multiple tool calls in one turn when inputs are independent.
- **Cycle limit**: `currentCycle > cycleLimit` forces `prepareToAnswer` even mid-research.
- **Error recovery**: up to `MAX_ERROR_COUNT = 2` recoverable LLM errors before the error is re-thrown.
- **Structured output**: if `structuredOutput=true`, `answerAgentStructured` is used instead of `answerAgent`, producing a typed JSON response.

### Prompts (`modes/default/prompts/`)

| File | Role |
|------|------|
| `research_agent.ts` | System prompt for the research agent — tool-first rules, tool selection precedence, SML `@`-mention handling, reflection/loop-detection instructions |
| `answer_agent.ts` | System prompt for the answer agent — synthesis rules, no tool access, formatting guidelines |
| `prompt_factory.ts` | Assembles the full message array: system prompt + prior conversation rounds + current action history |
| `utils/actions.ts` | Formats the in-progress action history (tool calls + results) into LangChain messages |
| `utils/attachments.ts` | Renders attachment context into the prompt |
| `utils/custom_instructions.ts` | Injects agent-level custom instructions and structured output description |
| `utils/visualizations.ts` | Adds visualization-rendering guidance when viz capability is enabled |
| `utils/helpers.ts` | Date formatting and other prompt utilities |

**Research agent system prompt** (key rules):
- "You do not interact with the user directly" — research only, hands off to answering agent
- Tool selection precedence: explicit user preference → specialized tool → search over schema inspection → follow-up before asking
- SML: calls `sml_attach` for any `sml://CHUNK_ID` links in the current user message before other tools
- Reflection: detects stuck/loop/dead-end states and changes strategy or hands over

**Answer agent system prompt** (key rules):
- No tool access
- Synthesizes from research history; no hedging if information is complete
- Does not mention research process, tool names, or internal reasoning

### Hook lifecycle

```
User message
  → beforeAgent            (mutate: nextInput, attachments)
  → [research agent loops]
      → beforeToolCall     (mutate: toolParams)
      → tool executes
      → afterToolCall      (mutate: toolReturn — LIFO order)
  → answer agent
  → response
```

Hooks are registered in plugin `setup` via `agentBuilder.hooks.register(...)`.

### Conversation compaction (`modes/utils/conversation_compactor.ts`)

Long conversations are compacted: old rounds are summarized by an LLM call and stored as a `compactionSummary`. The prompt includes the summary in place of raw history, keeping token usage bounded.

---

## Platform Plugin: `agent_builder_platform`

**Path:** `x-pack/platform/plugins/shared/agent_builder_platform/`

Registers built-in platform tools, attachment types, and SML types that are available to all agents.

### Tools (`server/tools/`)

| File/Dir | What it does |
|----------|-------------|
| `execute_esql.ts` | Runs an ES|QL query; returns rows and column metadata |
| `generate_esql.ts` | Natural-language → ES|QL via `@kbn/agent-builder-genai-utils`; includes index schema context |
| `search.ts` | Semantic/full-text search across indices using the `@kbn/agent-builder-genai-utils` search graph |
| `list_indices.ts` | Lists available Elasticsearch indices |
| `get_index_mapping.ts` | Returns field mappings and schema for an index |
| `get_document_by_id.ts` | Fetches a document by `_id` |
| `index_explorer.ts` | Explores an index: schema + sample documents for grounding |
| `product_documentation.ts` | Searches Elastic product documentation (SML-backed) |
| `integration_knowledge.ts` | Searches integration-specific knowledge (SML-backed) |
| `resume_workflow_execution.ts` | Resumes a paused Kibana workflow (HITL) |
| `get_workflow_execution_status.ts` | Gets current status of a workflow execution |
| `create_visualization/` | Creates a Kibana Lens visualization from ES|QL + chart type |
| `cases/` | Creates and manages Kibana Cases |

---

## `@kbn/agent-builder-genai-utils`

**Path:** `x-pack/platform/packages/shared/agent-builder/agent-builder-genai-utils/`

LLM-specific utilities consumed by `agent_builder_platform` tools and other packages. Contains the actual prompts and sub-graphs for complex tool operations.

### Structure

```
langchain/           # LangChain message helpers, graph event converters, tool ID utils
prompts/             # Shared prompt cleanup utility (cleanPrompt)
tools/
  generate_esql/     # NL→ES|QL sub-graph
  search/            # Multi-step search sub-graph
  visualization/     # Lens config generation
  steps/             # Shared search steps (list_indices, get_documents, extract_snippets, …)
  utils/
    esql/            # ES|QL execution, interpolation, validation
    mappings/        # Index mapping cleanup and flattening
    sampling/        # Document sampling and field statistics
    resources/       # Index resource resolution with sampling stats
    formatting/      # XML output formatting
    workflows/       # Workflow state/output utilities
```

### `generate_esql/` — NL → ES|QL sub-graph

**Files:** `graph.ts`, `nl_to_esql.ts`, `prompts.ts`, `prompts/instructions_template.ts`

A LangGraph sub-graph that converts a natural language query to an ES|QL query:

1. Resolves the target index resource, fetches field mappings and sample stats.
2. Calls the LLM with a detailed prompt including ES|QL syntax rules, field list, and safety-LIMIT instructions.
3. Validates and post-processes the generated query.

Key prompt rules (`instructions_template.ts`):
- Only use functions/commands present in ES|QL docs — no guessing from other query languages.
- Only use fields explicitly provided in the mapping context.
- Every multi-row query must end with a `LIMIT` (default 100, max 250 for "all" requests).
- No tech-preview features unless requested.

### `search/` — multi-step search sub-graph

**Files:** `graph.ts`, `prompts.ts`, `inner_tools.ts`, `run_search_tool.ts`

A LangGraph sub-graph that routes a natural language search query to one of two inner tools:

| Inner tool | When used |
|-----------|----------|
| `relevance_search` | Full-text / topic / concept search — uses ES relevance scoring |
| `natural_language_analytic` | Structured queries, aggregations, counts, filters — routed to ES|QL |

A dispatcher LLM call selects the right tool and parameters. The sub-graph is invoked by the `search.ts` platform tool.

### `visualization/` — Lens chart generation

**Files:** `graph_lens.ts`, `prompts.ts`, `chart_type_guidance.ts`, `chart_type_registry.ts`, `guess_chart_type.ts`, `build_visualization_config.ts`

Given an ES|QL query and a natural language request:
1. Guesses the best chart type (bar, line, pie, metric, …).
2. Calls the LLM with a chart-type-specific schema and guidance to produce a valid Kibana Lens configuration.
3. The prompt includes the existing config when editing.

### Shared utilities

| Path | Purpose |
|------|---------|
| `tools/utils/esql/` | Execute ES|QL, interpolate named params (`?_tstart`, `?_tend`), validate queries |
| `tools/utils/mappings/` | Flatten and clean Elasticsearch mappings for LLM context (removes noise) |
| `tools/utils/sampling/` | Sample documents from an index, compute per-field statistics (cardinality, min/max, examples) |
| `tools/utils/resources/` | Resolve an index pattern to a concrete index; attach sampling stats for ES|QL grounding |
| `tools/utils/formatting/xml.ts` | Format tool results as XML blocks for inclusion in prompts |
| `tools/utils/token_count.ts` | Estimate token usage before sending to LLM |

---

## Shared Packages (summary)

### `@kbn/agent-builder-common`

**Path:** `x-pack/platform/packages/shared/agent-builder/agent-builder-common/`

Types shared between browser and server: tool definitions, agent types, attachment schemas, hook interfaces, telemetry events, error classes (`AgentBuilderError`, `isToolNotFoundError`, etc.).

### `@kbn/agent-builder-server`

**Path:** `x-pack/platform/packages/shared/agent-builder/agent-builder-server/`

Server-side base classes: `Runner`, `ScopedRunner`, `ToolHandlerContext`, `AgentHandlerContext`, `AttachmentStateManager`, `ToolManager`, `PromptManager`, `ConversationStateManager`. Plugin authors extend these when registering new tools or agents.

### `@kbn/agent-builder-browser`

**Path:** `x-pack/platform/packages/shared/agent-builder/agent-builder-browser/`

Browser-side types, React hooks, event types, and the `workflow_combo_box` component.

---

## Solution Plugins (other teams — brief overview)

**Observability** (`x-pack/solutions/observability/plugins/observability_agent_builder/`): adds observability-specific tools (anomaly detection, change point detection, APM correlations, log/metric/trace retrieval) and one-click AI Insights (prefetched-context LLM summaries, no tool loop).

**Security** (`x-pack/solutions/security/plugins/security_solution/server/agent_builder/`): adds security skills (alert analysis, threat hunting, entity analytics, ML jobs) and tools (alerts, attack discovery, detection rule creation).

---

## Instrumentation

Agent Builder has two complementary instrumentation layers: **EBT events** (structured analytics for product usage) and **OpenTelemetry traces** (per-request spans for latency and debugging).

### EBT Events (`server/telemetry/`)

EBT (Event-Based Telemetry) is Kibana's product analytics pipeline. Agent Builder emits structured events via `AnalyticsService` (`analytics_service.ts`) and coarse usage counters via `TrackingService` (`tracking_service.ts`).

#### Event types (`@kbn/agent-builder-common/telemetry/agent_builder_events.ts`)

| Event | When fired | Key fields |
|-------|-----------|-----------|
| `agent_builder_agent_created` | User creates an agent | `agent_id`, `tool_ids` |
| `agent_builder_agent_updated` | User updates an agent | `agent_id`, `tool_ids` |
| `agent_builder_tool_created` | User creates a tool | `tool_id`, `tool_type` |
| `agent_builder_skill_created/updated/deleted` | Skill lifecycle | `skill_id` |
| `agent_builder_round_complete` | A conversation turn finishes successfully | `agent_id`, `round_number`, `llm_calls`, `tool_calls`, `tool_call_errors`, `input_tokens`, `output_tokens`, `time_to_first_token`, `time_to_last_token`, `tools_invoked[]`, `model`, `model_provider` |
| `agent_builder_round_error` | A turn ends in an unrecoverable error | `agent_id`, `error_type`, `error_message`, `model_provider` |
| `agent_builder_tool_call_success` | A tool call completes | `tool_id`, `source`, `duration_ms`, `result_types[]` |
| `agent_builder_tool_call_error` | A tool call fails | `tool_id`, `source`, `duration_ms`, `error_type`, `error_message` |
| `agent_builder_opt_in/opt_out` | User opts in or out | — |
| `agent_builder_add_to_chat_clicked` | UI interaction | — |

`round_complete` is the richest event — it captures the full shape of a turn: how many LLM calls and tool calls were made, which tools were invoked, token counts, and both time-to-first-token and time-to-last-token latencies.

#### Usage counters (`tracking_service.ts`, `usage_counters.ts`)

Coarser counts stored via Kibana's `UsageCounter` (domain `agent_builder`). Not individually queryable like EBT, but aggregated for telemetry collection:

| Counter pattern | What it measures |
|----------------|-----------------|
| `agent_builder_tool_call_{source}` | Tool calls by source (`default_agent`, `custom_agent`, `mcp`, `api`, `a2a`) |
| `agent_builder_llm_provider_{provider}` | LLM provider usage |
| `agent_builder_llm_model_{model}` | Model usage |
| `agent_builder_rounds_{bucket}` | Conversation depth bucketed: `1-5`, `6-10`, `11-20`, `21-50`, `51+` |
| `agent_builder_query_to_result_time_{bucket}` | End-to-end latency bucketed: `<1s`, `1-5s`, `5-10s`, `10-30s`, `30s+` |
| `agent_builder_error_total` | Total errors surfaced to users |
| `agent_builder_error_by_type_{type}` | Errors broken down by error type |
| `agent_builder_error_conversations_with_errors` | Distinct conversations that had at least one error |

### OpenTelemetry Traces (`server/tracing/`)

Agent execution is wrapped in OpenTelemetry spans using `@kbn/inference-tracing`. Two span wrappers exist:

**`withConverseSpan`** (`with_converse_span.ts`) — wraps the entire `POST /converse` request:
- Span name: `Converse`
- Kind: `CHAIN`
- Attributes: `agent_id`, `conversation_id`
- Records `output.value` (the `RoundCompleteEvent` payload) when the stream ends

**`withAgentSpan`** (`with_agent_span.ts`) — wraps a single `runAgent` call:
- Span name: `ExecuteAgent`
- Kind: `AGENT`
- Attributes: `agent_id`, `agent_config` (full configuration JSON)
- Records `output.value` (the agent's return) on completion

These nest inside the inference plugin's own spans (one per LLM call), so a complete trace shows: `Converse` → `ExecuteAgent` → `ChatCompletion` (per LLM call) → tool spans.

Traces are exported to **Arize Phoenix** (for interactive exploration) and optionally to an **EDOT Collector** (stores in Elasticsearch for team-wide querying). Both exporters are configured in `kibana.dev.yml` under `telemetry.tracing.exporters`.

> Note: Elastic APM and OpenTelemetry tracing cannot run simultaneously — set `elastic.apm.active: false` when enabling tracing.

---

## Evaluation Suite

**Path:** `x-pack/platform/packages/shared/agent-builder/kbn-evals-suite-agent-builder/`

Playwright-based framework for evaluating agent response quality:
- **LLM-as-judge** — secondary LLM scores factuality, relevance, groundedness
- **RAG metrics** — Precision@K, Recall@K, F1@K
- **Phoenix tracing** — OpenTelemetry traces to Arize Phoenix for token usage and latency
- **EDOT Collector** — stores traces in Elasticsearch for team querying

---

## Tracing

Agent execution emits OpenTelemetry traces. Local setup with Phoenix:

```yaml
# kibana.dev.yml
elastic.apm.active: false
elastic.apm.contextPropagationOnly: false
telemetry.enabled: true
telemetry.tracing.enabled: true
telemetry.tracing.exporters.phoenix.base_url: 'http://localhost:6006/'
telemetry.tracing.exporters.phoenix.public_url: 'http://localhost:6006/'
telemetry.tracing.exporters.phoenix.project_name: 'my-project'
```

```bash
docker run -p 6006:6006 -p 4317:4317 -i -t arizephoenix/phoenix:latest
```

---

## Further Reading

| File | Contents |
|------|---------|
| `x-pack/platform/plugins/shared/agent_builder/README.md` | Framework overview: tools, agents, hooks, MCP, A2A |
| `x-pack/platform/plugins/shared/agent_builder/CONTRIBUTOR_GUIDE.md` | How to register tools, agents, and hooks |
| `x-pack/platform/packages/shared/agent-builder/kbn-evals-suite-agent-builder/README.md` | Eval suite setup and usage |
