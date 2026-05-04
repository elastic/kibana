# SIEM Readiness M2 — Architecture Review: Agent Skill Options

**Status:** In review  
**Context:** Following M1 (UI dashboard with 4 tabs: Coverage, Quality, Continuity, Retention),
M2 introduces an agent skill capability. This document reviews the architectural options,
their tradeoffs, and a recommended path forward.

---

## Problem Statement

M1 delivers SIEM readiness insights through a dedicated UI. M2 needs to extend those insights
to conversational agents — both an internal Kibana agent (via Agent Builder) and potentially
external agents (e.g. Claude, other LLMs). The core design question is:

> **What data layer should the agent skill use, and should it be shared across the UI,
> internal agent, and external agent?**

Three options are on the table:

1. **Internal APIs** — each consumer (UI, internal agent, external agent) calls the same
   Kibana and Elasticsearch internal APIs the UI already uses
2. **ES|QL only** — rewrite all data fetching as ES|QL queries, giving all consumers a
   shared, portable query language
3. **Pre-computed snapshot index** — a background process computes readiness state
   periodically and stores it in a dedicated index; all consumers read from that

---

## What the data actually requires (from the M1 research)

Before evaluating options, it is important to be precise about what can and cannot be expressed
in ES|QL, because this directly constrains Option 2.

### What ES|QL can cover

| Tab | Section |
|---|---|
| Coverage | Which event categories are actively flowing in (from `logs-*,metrics-*` documents) |
| Coverage | Which concrete indices belong to each category |
| Quality | Reading stored ECS compatibility results from `.kibana-data-quality-dashboard-results*` |
| Continuity | Doc count per index per category (time-windowed proxy for pipeline throughput) |
| Retention | Actual data age span per index (sanity-check proxy only) |

### What ES|QL cannot cover

| Tab | Section | Actual source |
|---|---|---|
| Coverage | Detection rule coverage, missing integrations | Kibana Detection Engine API + Fleet API |
| Coverage | MITRE ATT&CK rule mapping | Same detection engine API, filtered by `threat.tactic` |
| Quality | Triggering the ECS compatibility check | Client-side computation against ECS spec; no single server endpoint exists |
| Continuity | Pipeline failure rate | In-memory node counters (`GET /_nodes/stats/ingest`) |
| Continuity | Pipeline-to-index mapping | Index settings API (`GET /<indices>/_settings`) |
| Retention | Configured retention (ILM / DSL) | `GET /_data_stream/*` + `GET /_ilm/policy` |

The ES|QL gap is significant: two of the four tabs have their primary data (failure rate,
retention config) entirely outside what ES|QL can reach, and the Coverage tab's most
actionable section (rule coverage + integration status) also requires non-ES|QL APIs.

---

## Option 1: Internal APIs (per-consumer)

Each consumer — UI, internal agent, external agent — calls the same Kibana and Elasticsearch
APIs the M1 UI already uses.

### How it works

- The internal Kibana agent uses `kibanaClient` / `esClient` directly, with access to all
  internal endpoints (`access: 'internal'`).
- An external agent would need to call public Kibana APIs. Several of the M1 routes are already
  `access: 'public'` (`/api/siem_readiness/*`). The internal ECS data quality and nodes.stats
  routes would require either a proxy, a new public wrapper, or accepted degradation.

### Pros

- **Full parity with M1 UI** — results are computed from exactly the same data sources, so
  the agent and UI will never diverge. No risk of mapping drift (e.g. if the pipelines page
  changes what it shows, the agent changes automatically too).
- **No duplication of logic** — the existing route handlers already aggregate and compute
  everything (failure rate, retention period extraction, ILM preference logic). The agent
  re-uses that work.
- **Richer, more accurate data** — failure rates, configured retention periods, and rule
  coverage are available with full precision.
- **Simplest internal agent path** — a Kibana agent running inside the platform has native
  access to all internal APIs.

### Cons

- **External agent access is limited** — internal endpoints are not callable from outside
  Kibana. Surfacing full fidelity to an external agent requires either adding public wrappers
  for each internal route or accepting a capability gap for external agents.
- **Agent cannot trigger the quality check** — the ECS field compatibility check has no
  server-side trigger endpoint; it is computed client-side. The internal agent would need to
  either replicate that computation or call a new endpoint that needs to be built.
- **API surface coupling** — the agent skill is coupled to the specific internal API contract.
  If those APIs change, the skill must update. (Though this is the same maintenance burden as
  the UI itself.)

---

## Option 2: ES|QL only

Replace all data fetching with ES|QL queries. All three UX options (UI, internal agent,
external agent) execute the same ES|QL queries and therefore share the same results by
construction.

### How it works

- Each tab's data is re-expressed as ES|QL. The coverage gap sections (failure rate, retention
  config, rule coverage) are either dropped, approximated, or accepted as not available.
- The UI would need to be refactored to call `POST /_query` instead of its current mix of
  internal routes.
- External agents can issue ES|QL queries via the public Elasticsearch API.

### Pros

- **Portable, shared language** — UI, internal agent, and external agent all express and
  execute the same queries. Changes to one automatically propagate to the others.
- **No internal API dependency for external agents** — any agent that can reach Elasticsearch
  can run the queries without Kibana credential or routing complexity.
- **Simpler long-term maintenance** — one query to maintain per metric, not separate UI + API +
  agent logic.

### Cons

- **Significant coverage gaps** — the most actionable sections of the UI cannot be replicated
  in ES|QL at all:
  - Pipeline failure rate (in-memory node stat)
  - Configured retention (ILM/DSL management API)
  - Detection rule coverage and integration status (Kibana saved objects + Fleet)
  - ECS quality checks require triggering a separate compute pipeline
- **Parity risk with linked pages** — the Coverage tab links to the Detection Rules page, the
  Continuity tab links to Ingest Pipelines, and the Retention tab links to ILM. If M1's value
  comes partly from being the entry point to those pages, then computing the same metrics
  differently (ES|QL approximation vs. the page's own API) creates a risk of subtle divergence.
  Every time those pages update their logic, the ES|QL queries need manual review.
- **UI refactor cost** — the current UI uses the `siem_readiness` server routes which do
  server-side aggregation, caching, and serverless-mode branching. Replacing these with
  client-side ES|QL calls would require rewriting the data layer and re-implementing
  serverless handling.
- **Approximations erode trust** — showing a "docs ingested" count from ES|QL while the
  pipeline page shows cumulative node-stats counts means users will see different numbers
  depending on which page they look at. This is worse than a gap — it is a silent
  inconsistency.

---

## Option 3: Pre-computed snapshot index

A background task (cron, scheduled task, or on-demand trigger) computes the full readiness
state — using internal APIs and ES|QL where appropriate — and stores the result in a
dedicated Elasticsearch index. All consumers (UI, agents) read from that index.

### How it works

- A server-side task runs periodically (e.g. every 15–60 minutes) or on demand.
- It calls all the same APIs the M1 UI calls today, aggregates results, and writes a structured
  snapshot document per category or per index to a readiness results index.
- The UI, internal agent, and external agent all read from this index using ES|QL or a simple
  `GET` call — no runtime API fan-out.

### Pros

- **Shared results across all consumers** — by definition, the UI and all agents read the same
  pre-computed state. Parity is enforced structurally, not by coordination.
- **External agent friendly** — a simple index read is easy for any agent to perform.
- **Cheap reads** — no fan-out to multiple APIs at read time; single index query regardless
  of how many tabs or categories are requested.
- **Enables historical trending** — storing snapshots over time allows the agent to answer
  "has failure rate been improving?" which real-time APIs cannot.

### Cons

- **Stale data** — the snapshot is always behind real time. A pipeline that started failing
  at 14:03 won't show in the readiness view until the next snapshot cycle. This is
  particularly problematic for the Continuity tab, where failure rate is the primary signal.
- **Poor fit for deep-dive research** — if M2's value is letting users ask follow-up questions
  like "which specific fields are incompatible in this index?" or "show me the last 7 days of
  ingestion for this pipeline", the snapshot must be rich enough to answer those questions.
  Either the snapshot balloons in size (storing field-level detail per index per cycle) or the
  agent hits a dead end and must fall back to live APIs anyway.
- **Snapshot freshness UX problem** — the agent needs to surface "as of X minutes ago" clearly
  in its responses; if users don't notice this, they may act on stale information.
- **Additional infrastructure** — requires designing a snapshot schema, a scheduled task,
  index lifecycle management for the results index, and a backfill strategy for first run.

### Hybrid variant: snapshot as default, live APIs on demand for the internal agent

The stale-data problem can be partially addressed without abandoning the snapshot's alignment
benefits. Because the internal Kibana agent runs inside the platform and has access to the
same internal APIs as the UI, it can hold two modes:

1. **Default mode** — reads from the snapshot index. Fast, consistent across all consumers,
   works for external agents too. The agent surfaces the snapshot timestamp in every response
   ("as of 23 minutes ago").

2. **Live refresh mode** — when the user explicitly needs current data ("what is the pipeline
   failure rate right now?" or "re-check this index"), the internal agent calls the live
   internal APIs directly and optionally writes a fresh snapshot entry. The external agent
   cannot do this and the agent's response can say so explicitly.

This makes the snapshot the stable shared foundation while preserving the internal agent's
ability to cut through staleness when it matters. It also gives the snapshot approach a
natural upgrade path: start with live-only internal API calls in Phase 1, then layer in
snapshot persistence for consistency and historical trending in Phase 2, with the internal
agent retaining live-API fallback throughout.

---

## Consistency Alignment by Option

Each architectural option produces a different set of consumers that see the same data.
"Aligned" means the numbers a user sees in one place will match what they see in another.
"Divergence risk" means the values may differ because the two consumers compute the same
metric from different sources.

The four consumers are:
- **SIEM Readiness UI** — the M1 dashboard (baseline reference)
- **Internal agent** — Kibana Agent Builder skill running inside the platform
- **External agent** — Claude or other LLM running outside Kibana
- **Linked features** — the separate Kibana features SIEM Readiness links to: Ingest Pipelines,
  ILM Policies, Data Quality Dashboard, Detection Rules. A user who sees a number in SIEM
  Readiness and clicks through to the linked feature expects the numbers to agree.

| Option | SIEM Readiness UI | Internal agent | External agent | Linked features |
|---|---|---|---|---|
| 1. Internal APIs | Reference | Aligned | No access | Aligned |
| 2. ES\|QL | Reference | Aligned | Aligned | Divergence risk |
| 3. Snapshot | Reference | Aligned | Aligned | Aligned when fresh |

**Reading the table:** "Aligned" means the consumer will show the same numbers as the SIEM
Readiness UI. "No access" means the consumer cannot reach the required data source at all.
"Divergence risk" means values may differ because the two consumers compute the same metric
from different sources. "Aligned when fresh" means alignment holds at the moment the snapshot
was written but drifts as time passes.

### Why the "Linked features" column matters

The Continuity tab links to the Ingest Pipelines page. The Retention tab links to ILM Policies
and Index Management. The Coverage tab links to Detection Rules. When a user sees a 3.2%
failure rate in SIEM Readiness and clicks through to Ingest Pipelines, they expect to see the
same 3.2%. Under Option 1 this holds — both use `GET /_nodes/stats/ingest`. Under Option 2 it
breaks — SIEM Readiness shows an ES|QL doc-count proxy while Ingest Pipelines shows the real
node-stats figure, and they will silently disagree.

This makes Option 2 particularly risky for Continuity and Retention, which are the tabs where
users are most likely to click through to investigate. Under Option 3 the alignment holds at
snapshot time but drifts afterward — the divergence is temporal rather than structural, which
is at least honest and surfaceable ("data from 23 minutes ago").

---

## Recommendation

### Phase 1: Internal Kibana agent using internal APIs

Build the M2 agent skill as a Kibana agent (Agent Builder) that calls the same internal APIs
the M1 UI uses. This is the right starting point because:

- The internal agent has native access to all internal Kibana and Elasticsearch APIs — no
  new endpoints or wrappers required.
- Full parity with M1 is guaranteed from day one. The agent uses the same aggregation and
  business logic (failure rate formula, ILM preference algorithm, etc.) as the UI.
- The only new work required is the agent skill layer itself (prompt, tool definitions,
  response formatting) — not rebuilding the data pipeline.
- The ECS quality check is the one exception: since it has no server-side trigger, Phase 1
  can either read existing cached results (acceptable if the UI has been opened recently)
  or a new lightweight server-side check endpoint should be added alongside the skill.

**What to build for Phase 1:**
- Agent skill tools that wrap each `GET /api/siem_readiness/*` route
- A tool for the detection engine rules endpoint (coverage)
- A tool for Fleet integrations (coverage)
- For quality: read from the results data stream; document that results require a prior check
  run (either manual or triggered separately); evaluate building a server-side check trigger
- Accept that external agent access to failure rate and retention is deferred

### Phase 2: External agent (best-effort ES|QL + public API wrappers)

Once the internal agent is validated and the query patterns are understood:

- Identify which internal routes genuinely need public wrappers (candidates: a public
  `/api/siem_readiness/quality_check_trigger` that runs the ECS check server-side, and a
  public read endpoint for quality results)
- For failure rate and retention: evaluate whether public wrappers around
  `/_nodes/stats/ingest` and `/_data_stream/*` are appropriate, or whether the
  `/api/siem_readiness/get_pipelines` and `/api/siem_readiness/get_retention` routes
  (already `access: 'public'`) are sufficient
- Where data is genuinely inaccessible to external agents, provide an honest capability
  disclosure in the skill description rather than an approximation

### Phase 3: Snapshot layer for consistency and historical trending

Once the internal agent is established and the data shape is well-understood, introduce the
snapshot index as an additive layer:

- A scheduled background task calls the same internal APIs and writes a structured readiness
  state to a dedicated index, timestamped.
- The UI, internal agent, and external agent all read from this index by default, achieving
  full consistency alignment across all consumers including linked Kibana pages (at snapshot
  time).
- The internal agent retains the ability to call live internal APIs on demand (hybrid mode
  described in Option 3 above) so users can request a fresh read when the snapshot is stale.
- Storing snapshots over time unlocks historical trending — a capability no other option
  provides ("has Endpoint pipeline failure rate been improving this week?").

This phase should not be rushed. The snapshot schema needs to be designed after Phase 1
reveals which data fields the agent actually needs for its responses.

---

## Open questions for the team

1. **Quality check trigger:** Should we build a new `POST /internal/siem_readiness/trigger_quality_check`
   server-side endpoint that runs the ECS field mapping computation server-side? This would
   unblock both the internal agent and any future external agent. The current client-side
   approach is a historical artifact of the dashboard's origins.

2. **External agent scope in M2:** Is external agent support (Claude, etc.) in scope for M2
   or is it a M3 concern? This significantly affects whether we need to invest in public API
   wrappers now.

3. **Staleness tolerance:** What is the acceptable staleness window for the agent's answers?
   If "within the last hour" is acceptable for all tabs, the snapshot approach becomes much
   more viable. If users expect real-time pipeline failure rates, it is not.

4. **ES|QL in the UI:** Should the UI eventually migrate to ES|QL for the sections that ES|QL
   can cover (data coverage, doc counts)? If yes, doing this in parallel with M2 reduces
   long-term divergence. If no, the UI and agent will always use different data layers for
   those sections — which is fine as long as results are numerically consistent.
