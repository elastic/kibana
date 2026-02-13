## Requirements

### Requirement: Assess stream health tool
The agent SHALL provide a tool `streams.assess_stream_health` that accepts a stream name and returns a holistic health assessment. The tool SHALL invoke the existing `streams.get_data_quality`, `streams.get_schema`, `streams.get_lifecycle_stats`, and `streams.get_stream` tools via the `ToolProvider` API in parallel, then analyze the combined results using deterministic scoring heuristics. The tool SHALL NOT duplicate the logic of existing tools — it SHALL delegate to them through `context.toolProvider.get()` and `execute()`.

The tool SHALL return a structured result containing:
- `stream`: the stream name
- `overallHealth`: one of `healthy`, `warning`, or `critical` (determined by the worst individual signal)
- `issues`: an array of identified issues, each with `category` (quality, schema, retention, processing, failure_store), `severity` (warning, critical), `summary` (human-readable one-liner), `recommendation` (what to do about it), and `details` (raw data for reference)
- `metrics`: the raw metrics from each sub-tool (quality scores, schema counts, lifecycle details)

#### Scenario: User asks how a stream is doing
- **WHEN** the user asks "how is logs.nginx doing?" or "check on logs.nginx"
- **THEN** the agent calls `streams.assess_stream_health` with name `logs.nginx` and presents the health grade, any identified issues ranked by severity, and offers to fix the top issue

#### Scenario: Healthy stream with no issues
- **WHEN** `assess_stream_health` is called on a stream with good data quality (≤ 1% degraded, 0% failed), low unmapped field ratio (≤ 20%), configured retention, and enabled failure store
- **THEN** the tool returns `overallHealth: "healthy"` with an empty issues array

#### Scenario: Stream with critical quality issues
- **WHEN** `assess_stream_health` is called on a stream with > 10% degraded documents
- **THEN** the tool returns `overallHealth: "critical"` with an issue of category `quality`, severity `critical`, and a recommendation to investigate parsing or field mapping

#### Scenario: Stream with no retention configured
- **WHEN** `assess_stream_health` is called on a stream that has no retention policy set (not inherited, not direct)
- **THEN** the tool returns an issue of category `retention`, severity `warning`, with a recommendation to configure retention

#### Scenario: Underlying tool fails gracefully
- **WHEN** one of the sub-tool invocations fails (e.g., `get_schema` returns an error)
- **THEN** the composite tool SHALL still return results from the successful sub-tools, include a note about the failed dimension in the response, and NOT fail the entire assessment

### Requirement: Health assessment scoring heuristics
The `assess_stream_health` tool SHALL compute health scores using the following deterministic heuristics:

| Signal | Healthy | Warning | Critical |
|---|---|---|---|
| Degraded docs % | ≤ 1% | 1–10% | > 10% |
| Failed docs % | ≤ 0.1% | 0.1–5% | > 5% |
| Unmapped field ratio | ≤ 20% | > 20% | — |
| Retention configured | Yes (any type, including inherited) | None set | — |
| Failure store | Enabled or inherited | — | Disabled with failed docs > 0 |
| Processing pipeline | Has processors, or no processors with low unmapped ratio | No processors and unmapped fields > 30% | — |

The overall health SHALL be determined by the worst individual signal: if any signal is critical, overall health is critical; if any signal is warning (and none critical), overall health is warning; otherwise healthy.

Issues SHALL be sorted by severity (critical first, then warning).

#### Scenario: Multiple warning signals produce warning grade
- **WHEN** a stream has 5% degraded docs (warning) and 35% unmapped fields (warning) but no critical signals
- **THEN** the tool returns `overallHealth: "warning"` with two warning-level issues

#### Scenario: One critical signal overrides warnings
- **WHEN** a stream has 0.5% degraded docs (healthy) but the failure store is disabled and 100 documents have failed (critical)
- **THEN** the tool returns `overallHealth: "critical"` due to active data loss, even though quality is healthy

### Requirement: Diagnose data quality tool
The agent SHALL provide a tool `streams.diagnose_data_quality` that accepts a stream name and returns a root-cause analysis of data quality problems. The tool SHALL invoke the existing `streams.get_data_quality`, `streams.get_schema`, and `streams.get_stream` tools via the `ToolProvider` API in parallel, then correlate the results to identify specific root causes.

The tool SHALL return a structured result containing:
- `stream`: the stream name
- `qualityScore`: the overall quality grade (Good, Degraded, Poor)
- `rootCauses`: an array of identified root causes, each with `cause` (human-readable description), `evidence` (specific data points that support the diagnosis), `fix` (recommended action), and `fixTool` (the tool ID that would apply the fix, e.g., `streams.map_fields`, `streams.update_processors`, `streams.enable_failure_store`)
- `metrics`: raw quality metrics for reference

The tool SHALL identify root causes by correlating signals:
- High unmapped field count + degraded docs → unmapped fields causing degradation
- Failed docs > 0 + failure store disabled → documents failing without a safety net
- No processors + high unmapped count → raw data without field extraction
- Type conflicts in mapped fields + degraded docs → field type mismatches (**known gap**: not yet implemented — requires parsing mapped field types and cross-referencing with document values, which is not available from current sub-tool data)

#### Scenario: User reports bad data quality
- **WHEN** the user asks "my data quality is bad on logs.payments, help me fix it"
- **THEN** the agent calls `streams.diagnose_data_quality` with name `logs.payments` and presents the root causes with specific fixes, offering to apply each fix

#### Scenario: Diagnosis identifies unmapped fields as root cause
- **WHEN** `diagnose_data_quality` finds > 50% unmapped fields and degraded document percentage > 5%
- **THEN** the tool returns a root cause linking unmapped fields to degradation, with `fixTool: "streams.map_fields"` and a recommendation listing the most common unmapped field names

#### Scenario: Diagnosis identifies missing failure store
- **WHEN** `diagnose_data_quality` finds failed documents > 0 and the failure store is disabled
- **THEN** the tool returns a root cause noting that failed documents are being lost, with `fixTool: "streams.enable_failure_store"`

#### Scenario: Stream has good quality
- **WHEN** `diagnose_data_quality` is called on a stream with Good quality score and no significant issues
- **THEN** the tool returns an empty `rootCauses` array and confirms the stream is healthy

### Requirement: Cross-stream overview tool
The agent SHALL provide a tool `streams.overview_streams` that accepts no required parameters and returns a prioritized overview of all streams the user has access to. The tool SHALL invoke `streams.list_streams` via the `ToolProvider` API to discover streams, then invoke `streams.get_data_quality` and `streams.get_lifecycle_stats` for each stream in parallel (up to a maximum of 50 streams).

The tool SHALL return a structured result containing:
- `totalStreams`: total number of streams discovered
- `assessedStreams`: number of streams that were assessed (may be less than total if capped)
- `truncated`: boolean indicating if results were capped
- `streams`: array of per-stream summaries, each with `name`, `qualityScore`, `degradedPct`, `failedPct`, `storageSizeBytes`, `retentionType`, and `issues` (array of issue summaries)
- `topIssues`: the most impactful issues across all streams, ranked by severity and scale (e.g., a critical quality issue on a high-volume stream ranks higher than a warning on a low-volume stream)

#### Scenario: User asks what needs attention
- **WHEN** the user asks "what do you recommend?" or "which streams need attention?"
- **THEN** the agent calls `streams.overview_streams` and presents the top issues ranked by impact, offering to drill into the worst stream

#### Scenario: Environment with fewer than 50 streams
- **WHEN** the user has 15 streams
- **THEN** the tool assesses all 15 and returns `truncated: false`

#### Scenario: Environment with more than 50 streams
- **WHEN** the user has 120 streams
- **THEN** the tool assesses the first 50 streams and returns `truncated: true` with `totalStreams: 120` and `assessedStreams: 50`

#### Scenario: All streams are healthy
- **WHEN** all assessed streams have good quality and configured retention
- **THEN** the tool returns an empty `topIssues` array and the agent reports that everything looks healthy

### Requirement: Composite tools use ToolProvider for sub-tool invocation
All composite assessment tools (`assess_stream_health`, `diagnose_data_quality`, `overview_streams`) SHALL invoke existing registered tools through the `ToolProvider` API available on `ToolHandlerContext`. They SHALL call `context.toolProvider.get({ toolId, request })` to obtain an `ExecutableTool`, then call `execute({ toolParams })` to run it. They SHALL NOT directly call `streamsClient`, `esClient`, or any other low-level API for data that an existing tool already provides.

Sub-tool invocations SHALL be parallelized via `Promise.all` wherever the calls are independent.

#### Scenario: Composite tool delegates to existing tool
- **WHEN** `assess_stream_health` needs data quality metrics
- **THEN** it invokes `streams.get_data_quality` via `toolProvider.get({ toolId: 'streams.get_data_quality', request }).execute({ toolParams: { name } })` rather than querying Elasticsearch directly

#### Scenario: Parallel execution of sub-tools
- **WHEN** `assess_stream_health` gathers quality, schema, and lifecycle data
- **THEN** it executes all three sub-tool calls in parallel via `Promise.all`, not sequentially

### Requirement: Composite tools registered and available to agent
The three composite tools SHALL be registered in `register_tools.ts` and included in `STREAMS_AGENT_TOOL_IDS` so they are available to the agent. They SHALL also be added to the agent builder allow list.

#### Scenario: Advisory tools appear in agent's available tools
- **WHEN** the streams agent is initialized
- **THEN** the agent has access to `streams.assess_stream_health`, `streams.diagnose_data_quality`, and `streams.overview_streams` alongside all existing tools
