## Context

The streams agent currently has 17 tools (6 read, 7 write, 4 AI) that operate as individual commands. Each tool does one thing well: fetch schema, set retention, suggest partitions. The agent's system prompt provides formatting guidance, tool selection heuristics, and mutation safety protocols.

The gap is advisory capability. When users ask open-ended questions ("What do you recommend?", "How should I organize this stream?", "My data quality is bad"), the agent must currently make 4-5 sequential tool calls across multiple research loop iterations, then synthesize the results ad-hoc without domain expertise to guide its reasoning. This is slow (each tool call is a full LLM round-trip), inconsistent (the LLM may gather different data each time), and shallow (the LLM lacks heuristics for what "good" looks like).

Existing tool handlers follow a consistent pattern: Zod schema → `getScopedStreamsClients` → API calls via `streamsClient` / `esClient` → structured `ToolResultType.other` response. The agent builder supports up to 10 research loop cycles per conversation turn.

## Goals / Non-Goals

**Goals:**

- Enable the agent to handle open-ended advisory questions with a single tool call that gathers multi-dimensional data and returns structured, pre-analyzed results
- Embed domain expertise in the system prompt so the LLM can reason about assessment results and make concrete, contextual recommendations
- Reduce tool call round-trips for common advisory patterns from 4-5 to 1 (composite tool) + 1 (follow-up action)

**Non-Goals:**

- Building a workflow engine or planner abstraction in the agent builder — all work stays within the existing tool + prompt mechanisms
- Replacing individual read tools — the focused tools (`get_schema`, `get_data_quality`, etc.) remain available for specific questions; composite tools are for advisory patterns
- Real-time monitoring or alerting — the agent provides point-in-time assessments, not ongoing watches
- Exposing streams plugin endpoints that aren't currently available through agent tools (pipeline simulation, processor suggestions) — these are deferred to a separate change

## Decisions

### 1. Composite tools invoke existing tools via `toolProvider`, no logic duplication

**Decision:** Create new tool handlers that invoke existing registered tools through the `ToolProvider` API available on `ToolHandlerContext`. Each tool handler receives `context.toolProvider`, which exposes `get({ toolId, request })` returning an `ExecutableTool` with an `execute({ toolParams })` method. This calls through `runner.runTool(...)` to the existing tool's handler — the exact same code path as when the LLM calls a tool.

The composite tool handler pattern:

```typescript
handler: async (toolParams, context) => {
  const { name } = toolParams;
  const { toolProvider, request } = context;

  // Get existing tools via the official provider API
  const qualityTool = await toolProvider.get({ toolId: 'streams.get_data_quality', request });
  const schemaTool = await toolProvider.get({ toolId: 'streams.get_schema', request });
  const lifecycleTool = await toolProvider.get({ toolId: 'streams.get_lifecycle_stats', request });

  // Execute in parallel — same code path as LLM-driven invocation
  const [qualityResult, schemaTool, lifecycleResult] = await Promise.all([
    qualityTool.execute({ toolParams: { name } }),
    schemaTool.execute({ toolParams: { name } }),
    lifecycleTool.execute({ toolParams: { name } }),
  ]);

  // Analyze and score the gathered results...
}
```

**Why `toolProvider` over calling `streamsClient` / `esClient` directly?** Invoking through `toolProvider` means the composite tool delegates to the existing tool handlers exactly as they are. If an underlying tool is updated (e.g., `get_data_quality` adds a new metric), the composite tool automatically gets the improvement with zero changes. There's no duplicated API calls, no divergent logic to maintain, and no risk of the composite tool and individual tool returning different results for the same stream. It also preserves telemetry tracking and any confirmation/permission logic the agent builder applies to tool execution.

**Why not just improve the prompt?** The prompt alone can't guarantee which tools the LLM calls, can't parallelize API calls (the agent builder executes one tool per research cycle), and can't ensure consistent data gathering. By internalizing the gathering logic in a tool handler, we get deterministic, parallel execution in a single tool call.

**Why not add a new agent builder abstraction?** We considered a workflow/planner layer (separating intent classification from execution from synthesis). The agent builder's current architecture — a LangGraph state machine with research loop → answer phases — would require significant platform changes to support this. The composite tool approach achieves the same data-gathering efficiency with zero platform changes. The LLM already handles intent classification and synthesis well; it's the gathering step that needs optimization.

### 2. Three composite tools covering distinct advisory patterns

**Decision:** Create three new tools:

- **`streams.assess_stream_health`** — Single-stream holistic assessment. Gathers data quality, schema completeness, lifecycle/retention, processing pipeline state, and a small document sample. Returns a scored health report with categorized issues and recommendations.
- **`streams.diagnose_data_quality`** — Single-stream quality root-cause analysis. Gathers quality metrics, schema (mapped vs unmapped), sample documents (both normal and from failure store if enabled), and processor configuration. Returns identified root causes linked to specific fixes.
- **`streams.overview_streams`** — Cross-stream scan. Gathers quality and lifecycle stats for all streams (up to a configurable limit). Returns a prioritized list of streams needing attention, with the most impactful issues ranked first.

**Why these three?** They map to the three most common advisory intents: "How's this stream doing?" (health), "Something's wrong, help me fix it" (diagnosis), and "What should I focus on?" (overview). Each has a distinct data-gathering pattern and return shape.

**Why not a single "assess" tool with a mode parameter?** Separate tools with distinct descriptions give the LLM clearer routing signals. A combined tool with modes adds ambiguity about when to use which mode, and the tool description becomes diluted.

### 3. Structured scoring in tool results, not LLM-generated scores

**Decision:** Composite tools compute scores and classify issues in code using deterministic heuristics. The LLM receives pre-scored results and focuses on presenting them and reasoning about recommendations.

Health assessment scoring heuristics (computed in the tool handler):

| Signal | Healthy | Warning | Critical |
|---|---|---|---|
| Degraded docs % | ≤ 1% | 1–10% | > 10% |
| Failed docs % | ≤ 0.1% | 0.1–5% | > 5% |
| Unmapped field ratio | ≤ 20% | > 20% | — |
| Retention configured | Yes (any type, including inherited) | None set | — |
| Failure store | Enabled or inherited | — | Disabled with failed docs > 0 |
| Processing pipeline | Has processors, or no processors with low unmapped ratio | No processors and unmapped fields > 30% | — |

Overall health: the worst individual signal determines the overall grade. Issues are returned as an array of `{ category, severity, summary, recommendation }` objects.

**Why not let the LLM score?** LLMs produce inconsistent scores across conversations. Hardcoded thresholds ensure the same stream state always produces the same assessment, making the agent reliable and testable.

### 4. Domain knowledge organized by advisory pattern in the system prompt

**Decision:** Add new system prompt sections organized by the advisory workflows they support, not by topic. Each section includes: intent triggers (what user questions activate it), the recommended tool to call, and interpretation heuristics for reasoning about the results.

Prompt sections to add:

- **`<health_assessment>`** — Triggers: "how's my stream", "is this stream healthy", "check on", "stream status". Action: call `assess_stream_health`. Interpretation: prioritize critical issues, suggest fixes in order of impact, offer to execute the top fix.
- **`<quality_troubleshooting>`** — Triggers: "data quality is bad", "parsing errors", "degraded docs", "why are docs failing". Action: call `diagnose_data_quality`. Interpretation: explain each root cause in plain language, connect it to a specific fix (map fields, add processors, enable failure store), offer to apply fixes.
- **`<stream_overview>`** — Triggers: "what do you recommend", "which streams need attention", "overview", "give me a summary". Action: call `overview_streams`. Interpretation: present streams ranked by urgency, explain the top issues, offer to drill into the worst stream.
- **`<onboarding_guidance>`** — Triggers: "just set up", "new data source", "help me get started", "now what". Action: call `assess_stream_health` first, then guide through a sequence (understand → organize → optimize) using the assessment results to decide which steps are needed.
- **`<retention_best_practices>`** — Factual domain knowledge the LLM can reference when advising on retention: common retention periods by data type (security: 90–365d, application logs: 7–30d, debug logs: 1–7d, metrics: 30–90d), tiering strategies, cost implications of retention choices.

**Why by advisory pattern rather than by topic?** Topic-based knowledge (a section on "retention", a section on "quality") doesn't tell the LLM *when* to apply it. Pattern-based sections pair the trigger with the action and the interpretation, making the agent's behavior more predictable.

### 5. Cross-stream overview tool uses bounded parallel fetching via `toolProvider`

**Decision:** The `overview_streams` tool invokes `streams.list_streams` via `toolProvider` to get all streams, then invokes `streams.get_data_quality` and `streams.get_lifecycle_stats` via `toolProvider` for up to 50 streams in parallel. For environments with more than 50 streams, it processes the first 50 and indicates that results are truncated. All data gathering reuses existing tool handlers — no direct ES client calls.

**Why 50?** Each stream requires two tool invocations (quality + lifecycle), each of which makes ~2 ES API calls internally. At 50 streams, that's ~200 parallel ES requests — acceptable for a point-in-time assessment but shouldn't grow unbounded. The LLM can suggest narrowing scope if results are truncated.

**Why parallel rather than sequential?** Sequential fetching for 50 streams would take 5+ seconds. Parallel `Promise.all` on the `execute` calls reduces this to roughly the latency of a single tool invocation.

### 6. Composite tools live alongside existing tools, not replacing them

**Decision:** Add the three composite tools to a new `STREAMS_ADVISORY_TOOL_IDS` category in `register_tools.ts`, alongside the existing `READ`, `WRITE`, and `AI` categories. All tools are registered and available to the agent simultaneously.

The system prompt's tool selection guidance (existing `<tool_selection>` section) is updated to include advisory tools, with clear routing:

- **Advisory question** → composite tool (health, diagnosis, overview)
- **Specific question** → focused tool (get_schema, get_lifecycle_stats)
- **General overview** → `get_stream` (existing)
- **Action request** → write tool (existing)

**Why not replace individual tools?** Composite tools are optimized for advisory patterns. For specific questions ("what's the retention on logs.nginx?"), the focused tool is faster, cheaper, and returns exactly what's needed. Both patterns should coexist.

### 7. Composite tool result shape designed for LLM consumption

**Decision:** Composite tools return a structured JSON result with these top-level fields:

```typescript
{
  stream: string;
  overallHealth: 'healthy' | 'warning' | 'critical';
  issues: Array<{
    category: 'quality' | 'schema' | 'retention' | 'processing' | 'failure_store';
    severity: 'info' | 'warning' | 'critical';
    summary: string;       // Human-readable one-liner
    recommendation: string; // What to do about it
    details: Record<string, unknown>; // Raw data for the LLM to reference
  }>;
  metrics: {
    quality: { degradedPct: number; failedPct: number; score: string };
    schema: { mappedCount: number; unmappedCount: number; inheritedCount: number };
    lifecycle: { type: string; storageSizeBytes: number; documentCount: number };
  };
}
```

**Why pre-computed summaries and recommendations?** The LLM receives both the raw metrics (for precise answers) and pre-computed analysis (for consistent advisory responses). The `issues` array is already prioritized by severity, so the LLM can present them in order without needing to reason about relative importance.

## Risks / Trade-offs

**[Prompt length growth] → Mitigation: structured sections with clear boundaries**
Adding domain knowledge sections will significantly increase the system prompt length. This consumes context window and may degrade the LLM's ability to follow all instructions. Mitigation: each section is clearly delimited with XML tags and intent triggers, so the LLM can selectively attend to relevant sections. Monitor prompt token count and consider moving low-frequency knowledge (like retention best practices tables) to tool descriptions rather than the system prompt if the prompt exceeds ~3000 tokens.

**[Stale heuristics] → Mitigation: conservative thresholds and explicit documentation**
The health scoring thresholds (e.g., "degraded > 10% = critical") are heuristics, not absolute truths. Different environments may have different baselines. Mitigation: start with conservative thresholds that flag only clearly problematic states, document the heuristics in code comments, and surface the raw metrics alongside scores so users can apply their own judgment.

**[Cross-stream tool latency] → Mitigation: parallel execution and bounded scope**
The overview tool could be slow for environments with many streams. At 50 streams with parallel fetching, latency should stay under 2-3 seconds. For larger environments, the 50-stream cap means some streams won't be scanned. Mitigation: sort streams by most recent activity or largest storage before capping, so the most relevant streams are included. Log truncation clearly in the result.

**[LLM may still ignore composite tools] → Mitigation: strong prompt routing + good descriptions**
Despite prompt guidance, the LLM might still fall back to individual tool calls for advisory questions. Mitigation: the tool descriptions explicitly state when to use them ("Use this when the user asks for recommendations, health checks, or wants to know if anything needs attention"), and the prompt's advisory sections reinforce routing. If this remains a problem, the individual read tools' descriptions could be updated to suggest the composite alternative for advisory questions.

**[Overlap with existing multi-step workflow guidance] → Mitigation: clear delineation**
The existing `ai-orchestration` spec already describes multi-step workflows (inspect → analyze → present → apply). The new advisory patterns overlap in spirit but differ in mechanism (single composite tool call vs multi-tool orchestration). The prompt sections should clearly distinguish: advisory questions → composite tool first; action-oriented multi-step requests (like "help me set up partitions") → existing workflow pattern.
