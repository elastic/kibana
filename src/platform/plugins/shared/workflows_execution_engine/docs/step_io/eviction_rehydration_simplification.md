# Simplifying the Eviction / Rehydration Mechanism

This document evaluates two alternative approaches to replace the current
`StepIoService` eviction/rehydration system and compares them honestly against
the existing design.

---

## Why the current system is complex

The ~1300-line `StepIoService` exists almost entirely to answer one question with
minimum Elasticsearch round-trips:

> *Before this node runs, which predecessor outputs do I need to fetch back from
> ES — and which ones can I skip because they are already in memory or the node
> won't need them?*

Every mechanism in the service is a consequence of that goal:

| Mechanism | Why it exists |
|-----------|--------------|
| `extractReferencedStepIds` (KQL + Liquid static analysis) | Avoid fetching outputs the next step won't use |
| `pinnedOutputIdsByScope` (loop-lifetime pin) | Keep loop source resident across 500 ms eviction ticks |
| `readPinnedOutputIdsByConsumer` (per-node read-pin) | Prevent concurrent branches from clobbering each other's in-flight reads |
| `transientlyRehydratedIds` + deferred release | Re-evict outputs immediately after the one step that needed them, so the next step doesn't re-fetch |
| `pendingOutputEvictionIds` (one-cycle deferral) | Evict after the ES write lands, not before |
| `markDeferredAfterLoad` (resume path) | Resume loads step metadata only (no IO fields); mark everything evicted so `prepareForRead` re-fetches on demand |
| Conservative fallback to all predecessors | Guard against analysis gaps rather than silently corrupting IO |

The complexity is not incidental — it is the direct cost of the "minimize ES
round-trips" goal. Relax that goal and the system simplifies dramatically.

---

## Approach 1 — LRU cache, fetch-on-miss, no static analysis

### The idea

Replace the eviction/rehydration orchestration with a time-bounded in-process
LRU cache. Before each node, fetch every predecessor output that is absent from
the cache (a simple `mget` for the missing IDs). No static analysis, no pin
lifecycle, no transient tracking.

```
before node runs:
  missing = predecessors whose IDs are not in LRU cache
  if missing.length > 0:
    mget(missing) → populate cache
  run node (all reads are synchronous LRU hits)

after node finishes:
  do nothing — LRU evicts by recency on its own
```

### What this eliminates

- All of `computeRehydrationTargets` / `extractReferencedStepIds`
- `pinnedOutputIdsByScope` and `pinLoopSource` / `unpinLoopScope`
- `readPinnedOutputIdsByConsumer` and `releaseReadPins`
- `transientlyRehydratedIds`, `releaseTransientExcept`, `releaseTransientlyRehydratedOutputs`
- `pendingOutputEvictionIds` and the one-cycle deferral logic
- The conservative-fallback branch
- The `isPinned` union logic

The public API collapses to something like:

```ts
interface StepIoService {
  setStepOutput(id: string, output: JsonValue | null): void;
  getStepOutput(id: string): JsonValue | null | undefined;   // LRU hit or undefined
  prepareForRead(predecessorIds: string[]): Promise<void>;   // simple mget for missing IDs
  flush(): Promise<void>;
}
```

### Where it gets complicated

**1. Async context reads.**  
Context builds in `WorkflowContextManager` call `getStepOutput` synchronously
— the output must be resident *before* Liquid/KQL evaluation starts.
`prepareForRead` exists precisely to do the async work up front so the hot path
stays synchronous. An LRU cache preserves that contract cleanly: `prepareForRead`
fetches the cache misses, then context evaluation is all synchronous hits. This
part works.

**2. "Fetch all predecessors" fetches more than needed.**  
Static analysis exists to avoid fetching `step_A.output` when the next node only
needs `step_B.output`. Without analysis, every `prepareForRead` fetches all
missing predecessors regardless. In practice this is fine: resume loads step
metadata only (no IO fields), so there is nothing pre-loaded to over-fetch —
both the current system and LRU fetch on-demand as steps execute. The only real
over-fetch is on the hot path for a step with many predecessors where only one
is actually referenced. A single `mget` with 10 IDs is not materially more
expensive than one targeted `mget` with 2, and the LRU means each predecessor
is fetched at most once per execution.

**3. LRU TTL does not map to workflow semantics.**  
A `waitForInput` step can pause a workflow for hours. If step A ran 2 hours ago
and step B (after the human-input) references `steps.A.output`, the LRU will
have evicted A. The "fetch all predecessor cache misses" strategy handles this
transparently — A is simply not in the cache, so `prepareForRead` fetches it.
No special-casing needed. `data.set` and `waitForInput` still need to be
eagerly loaded on resume (their outputs are read globally, not just by
immediate successors), but that is one small carve-out, not a pervasive concern.

**4. TOCTOU race is gone.**  
The 500 ms background eviction loop is replaced by LRU eviction, which only
fires when the cache is full and always evicts the *least recently used* entry.
In single-threaded Node.js, an LRU eviction during a synchronous context read
is impossible — LRU eviction only happens when you insert a new entry, which
happens in `setStepOutput` (outside the read path). The whole class of TOCTOU
races documented in `eviction_rehydration_bugs.md` disappears structurally.

**5. Memory bound.**  
An LRU sized by bytes (e.g. 50 MB) gives a hard bound on heap contribution from
step outputs. The current system gives a soft bound (size threshold gate + eviction
delay), which is why the bugs existed. A bytes-bounded LRU is simpler and safer.

### Verdict

Substantial and achievable simplification. Resume works naturally — both the
current system and LRU load metadata only and fetch IO on demand; LRU just
caches the result so subsequent steps don't re-fetch the same output. The
TOCTOU class is eliminated by construction. The over-fetch on the hot path
(fetching predecessors the node won't use) is the only real cost, and it is
bounded by the LRU byte budget.

---

## Approach 2 — DuckDB (or SQLite) as per-execution payload store

### The idea

Instead of storing step outputs in the V8 heap and shuttling them to/from ES,
store them in an embedded analytical database local to the Kibana process. The
engine queries for only the specific JSON fields each template needs, so V8 never
holds the full 50 MB object — it only receives the projected slice.

```
step writes output:
  INSERT INTO steps(id, output) VALUES (?, json(?))

context read:
  SELECT json_extract(output, '$.aggregations.by_rule.buckets')
  FROM steps WHERE id = ?
```

### What this eliminates

Everything in Approach 1, plus V8 heap pressure entirely. The V8 heap holds only
the extracted slice, not the full payload tree. No eviction needed at all because
the database manages its own buffer pool.

### Where it gets complicated

**1. Async context reads.**  
DB reads are async. The same constraint as Approach 1 applies: context evaluation
must be synchronous, so reads must be pre-warmed before evaluation starts. The
`prepareForRead` pattern is still needed, just targeting DuckDB instead of ES.
Static analysis already exists (`extractReferencedStepIds`) and gives the exact
JSON paths needed — those paths feed directly into the projection query, so no
new analysis layer is required.

**2. Durability and resume.**  
DuckDB's file is process-local. On Kibana restart or task boundary (workflow
suspend/resume), the file is gone. Step outputs must still be persisted to ES for
durability. The persistence path to ES therefore remains — DuckDB is a
read-optimised local store, not a replacement for ES. Writes go to both: DuckDB
for the current execution's hot reads, ES for durable storage.

Resume works the same as with LRU: metadata is loaded, IO fields are not. As
steps execute, outputs are fetched from ES on demand and inserted into DuckDB.
Subsequent references to the same output are DuckDB hits with projection, never
ES round-trips.

**3. Concurrency model.**  
DuckDB supports multiple concurrent readers but a single writer per connection.
Parallel step branches write outputs concurrently. A write queue or connection-
per-writer strategy is needed. The existing `pendingIoChanges` + periodic
`flush()` pattern in `StepIoService` already serialises writes and could be
adapted — DuckDB accepts batched inserts, so the flush loop maps naturally.

**4. File I/O per execution.**  
Each workflow execution gets its own DuckDB file (or a shared file with
execution-scoped tables). Files must be created on execution start and cleaned up
on completion/resume-handoff. This is manageable but adds operational surface
(disk space tracking, cleanup on crash recovery).

### Why DuckDB over SQLite here

SQLite is the obvious embedded DB and was proposed in
[security-team#17743](https://github.com/elastic/security-team/issues/17743).
SQLite's JSON functions (`json_extract`) exist but are less capable than DuckDB's
— DuckDB has first-class `STRUCT`, `LIST`, and JSON path extraction that aligns
well with nested workflow output shapes. For read-mostly, analytical-style path
projections on semi-structured data, DuckDB's query planner is a better fit.
SQLite is better for frequent small key-value reads where projection is not the
goal.

### Verdict

Strongly compelling for memory reduction when step outputs are large (MB-scale
connector responses, large ES query results). The key claim — static analysis
already extracts the needed paths, DuckDB on-disk stores the full payload, V8
only receives the projected slice — holds up. Full outputs never enter the V8
heap. No eviction mechanism needed. The TOCTOU class is eliminated.

The cost is operational: DuckDB file lifecycle, write serialisation, and the
persistence path to ES remains for durability.

---

## Both approaches reduce memory, via different mechanisms

The two approaches are complementary, not competing. They attack memory pressure
from different angles:

| | LRU cache | DuckDB file-backed |
|---|---|---|
| **Primary goal** | Limit *how many* outputs are in V8 at once | Prevent *any* full output from entering V8 heap |
| **Mechanism** | Evict least-recently-used from in-process map | Store full payloads on-disk; load only projected slices |
| **Static analysis** | Not needed (fetch all missing predecessors) | Already exists; paths feed projection queries |
| **Heap bound** | Soft: LRU byte budget | Hard: only projected slices enter V8 |
| **Best for** | Many small-to-medium outputs | Few very large outputs (MB-scale) |
| **Resume cold-start** | Metadata only; IO fetched on-demand per step | Metadata only; IO fetched on-demand per step |

For the current problem (1k concurrent executions, moderate payload sizes), LRU
is the simpler fix. For the OOM class of issue (single execution with multi-MB
step outputs), DuckDB projection is the structural solution.

---

## Comparison with current system

| Dimension | Current system | LRU cache | DuckDB file-backed |
|-----------|---------------|-----------|-----------------|
| Static analysis role | Drive targeted rehydration | Not needed | Drive JSON projection |
| TOCTOU race | Possible (background eviction loop) | Eliminated | Eliminated |
| Pin/unpin lifecycle | Complex (loop + per-consumer) | Gone | Gone |
| Memory bound | Soft (size threshold + delay) | Hard (LRU byte budget) | Hard (projection only) |
| Full payload in V8 | Yes (until evicted) | Yes (until LRU evicts) | Never |
| Resume cold-start | Metadata only; IO fetched on-demand per step | Metadata only; IO fetched on-demand, cached in LRU | Metadata only; IO fetched on-demand, inserted into DuckDB |
| External dependency | ES | ES | ES + DuckDB npm |
| Operational surface | None beyond ES | None | DuckDB file per execution |
| Code size estimate | ~1300 lines | ~200–300 lines | ~400–500 lines |

---

## Recommendation

**Near-term (concurrency / memory bloat):** LRU cache. Eliminates every pin,
transient, and orchestration mechanism. Removes the TOCTOU bug class by
construction. Resume is a non-issue — both the current system and LRU load
metadata only and fetch IO on demand; LRU just caches the result. The only
trade-off is fetching all missing predecessors per step rather than
statically-targeted ones, which matters only on the hot path for steps with
many predecessors, and is bounded by the LRU byte budget.

**Longer-term (large-payload / OOM prevention):** DuckDB with file-backed storage
and JSON path projection. Full payloads never enter V8. The existing static
analysis feeds the projection query directly. This is the right architectural
response to the OOM-class incidents and scales better as workflows operate on
larger data sources (bulk ES responses, large AI agent outputs).

The two are composable: build the LRU simplification first; add DuckDB projection
as a drop-in replacement for the fetch-from-ES path when large-payload pressure
demands it.
