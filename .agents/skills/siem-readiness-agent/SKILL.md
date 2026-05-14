---
name: siem-readiness-agent
description: Architecture guide for extending the SIEM Readiness agent — adding new data dimensions, enriching existing APIs, and wiring UI + agent together without creating unnecessary new tools or routes.
user-invocable: false
---

# SIEM Readiness Agent — Architecture Guide

## Core principle: enrich, don't multiply

**The most important rule in this codebase:** before creating a new tool, route, or attachment, ask whether the data belongs to an existing resource. If it does, add a field to that resource — don't create a parallel one.

**Why it matters:** a new field costs one type change and one render update. A new parallel flow costs a new route, a new tool the agent must choose between, a new attachment type, a duplicated ES query, and ongoing coordination between two surfaces that model the same thing.

**Signal that you're on the wrong path:** you're creating a new API endpoint, agent tool, or attachment type to answer questions that the existing tool almost answers — it just doesn't have the right fields yet.

### The mistake to avoid
When asked to add "data stream volume" information, the wrong instinct is:
- Create a new `/api/siem_readiness/get_data_stream_health` route
- Create a new `data_streams_tool` agent tool
- Create a new `siem_readiness_data_streams` attachment

This produces: two overlapping tools the agent must decide between, two separate API calls from the UI, two attachment types the agent must coordinate, and a duplicated ES query for data that's already scoped to pipelines.

### The right approach
Data stream volume belongs to pipelines — pipelines *are* the processing layer for data streams. So:
- Add a `volume` object to the existing `PipelineStats` type
- The existing continuity fetch/compile/route/tool/attachment automatically carries the new data
- The UI table gets a new column, not a new component
- The agent uses the same `get_continuity` tool call it already makes

**One API call. One tool. One attachment. New column in the table.**

---

## Architecture: the continuity pipeline

Data flows through five layers, each with a single responsibility:

```
ES aggregation
    ↓  fetch_pipelines.ts + fetch_index_volume.ts
PipelineStats[]   (raw per-pipeline data)
    ↓  compile_continuity.ts
CompiledContinuityData   (enriched, filtered, categorized)
    ↓  routes/get_continuity.ts   (HTTP GET /api/siem_readiness/get_pipelines)
JSON response
    ↓  agent tool  OR  React Query hook
consumer
```

### Layer responsibilities

**`fetch_index_volume.ts`** — One ES search, all pipeline indices, three sub-aggregations per index:
- `by_day`: 7-day date_histogram for volume trend
- `last_event`: max(@timestamp) for precise silence detection
- `latency_p95`: scripted percentile for ingestion latency

Returns `Record<pipelineName, PipelineVolumeStats>`. **Pure I/O — no business logic.**

**`compile_continuity.ts`** — Pure function (no I/O). Joins pipeline stats with category data, computes derived fields (latency status, SLA comparison, summary counts). This is where per-category thresholds are applied because `indexToCategoryMap` lives here.

**`routes/get_continuity.ts`** — Thin HTTP handler. Calls fetch → compile → serialize. No business logic.

**Agent tool** — Calls the HTTP route, returns camelCase. Agent uses this for natural-language answers.

**Attachment** — Receives tool output, renders a table. Server schema uses snake_case; client mirrors it.

---

## How to add a new data dimension

Follow this checklist when adding a new metric to pipeline health (e.g., a new kind of anomaly, a new latency percentile, a compliance flag):

1. **Add the type** to `PipelineVolumeStats` in `@kbn/siem-readiness-common/src/types.ts`. If it needs constants (thresholds, ratios), add them to `constants.ts` in the same package.

2. **Compute the value** in `fetch_index_volume.ts` → `computePipelineVolumeStats`. If it requires a new ES aggregation, add it to the single `fetchIndexDailyBuckets` search request — never add a second search.

3. **Derive enriched fields** in `compile_continuity.ts` if the field depends on category context (e.g., per-category SLA thresholds). Raw measurements belong in fetch; categorized verdicts belong in compile.

4. **Update the attachment schema** in `server/agent_builder/attachments/siem_readiness_continuity.ts`:
   - Add the field to `pipelineVolumeSchema` or `pipelineRowSchema`
   - Update `formatContinuityForAgent` to include it in the text representation
   - Update `getAgentDescription` to document it, including the camelCase→snake_case mapping

5. **Update the skill** in `server/agent_builder/skills/siem_readiness/siem_readiness_skill.ts`:
   - Add the field to the continuity tool's "Output includes" section
   - Add it to the continuity attachment's field mapping section
   - Add an example interaction if it enables a new kind of question

6. **Update the client renderer** in `public/agent_builder/attachment_types/siem_readiness_attachment.tsx`:
   - Add the field to `PipelineVolumeStats` or `PipelineRow` interface
   - Add a column or update an existing column render function

---

## When *is* a new tool/route/attachment justified?

Create something new only when the data is **structurally independent** — it has its own entity type, its own query scope, and the user would ask about it separately from pipelines.

| Scenario | Right answer |
|---|---|
| New metric for existing pipelines (volume, latency, a new failure type) | Add a field to `PipelineVolumeStats` |
| New pipeline-level verdict (e.g., "stale config") | Add a field to `pipelineRowSchema` |
| New category-level summary stat | Add to `CompiledContinuityData.summary` |
| Data about a completely different entity (e.g., Elastic Agent enrollment health) | New tool + route + attachment |
| Data that only the UI needs and the agent should never surface | New UI component only, no agent wiring |

---

## camelCase vs snake_case convention

The agent tool returns camelCase (TypeScript convention). The attachment schema uses snake_case (JSON/API convention). Always document the mapping explicitly in `getAgentDescription` and in the skill's attachment section.

| Tool output (camelCase) | Attachment field (snake_case) |
|---|---|
| `name` | `pipeline_name` |
| `failureRate` | `failure_rate` |
| `latencyStatus` | `latency_status` |
| `latencySlaMs` | `latency_sla_ms` |
| `volume.silenceDetected` | `volume.silenceDetected` (pass through) |
| `volume.dropSeverity` | `volume.dropSeverity` (pass through) |

Volume sub-fields are passed through as-is because they're already computed objects.

---

## Key files

| File | Purpose |
|---|---|
| `packages/siem-readiness-common/src/types.ts` | Shared types: `PipelineStats`, `PipelineVolumeStats`, `DropSeverity`, `LatencyStatus` |
| `packages/siem-readiness-common/src/constants.ts` | Thresholds: `DROP_WARNING_RATIO`, `DROP_CRITICAL_RATIO`, `LATENCY_SLA_MS` |
| `server/lib/siem_readiness/fetch_index_volume.ts` | ES aggregation for volume, silence, latency |
| `server/lib/siem_readiness/fetch_pipelines.ts` | Fetches node stats + calls fetch_index_volume, returns `PipelineStats[]` |
| `server/lib/siem_readiness/compile_continuity.ts` | Pure compile step; applies category-aware thresholds |
| `server/agent_builder/attachments/siem_readiness_continuity.ts` | Server: Zod schema, text format, agent description |
| `server/agent_builder/skills/siem_readiness/siem_readiness_skill.ts` | Skill content: tool descriptions, attachment field mappings, examples |
| `public/agent_builder/attachment_types/siem_readiness_attachment.tsx` | Client: React table renderer for all four attachment types |
