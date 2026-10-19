# Simplifying the Eviction / Rehydration Mechanism

This document evaluates two alternative LRU-based approaches to replace the
current `StepIoService` eviction/rehydration system and compares them honestly
against the existing design. For a file-backed embedded-DB alternative see
[duckdb_payload_store.md](duckdb_payload_store.md).

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

## Approach 1a — Per-workflow LRU cache, fetch-on-miss, no static analysis

### The idea

Replace the eviction/rehydration orchestration with a time-bounded in-process
LRU cache scoped to each workflow execution. Before each node, fetch every
predecessor output that is absent from the cache (a simple `mget` for the
missing IDs). No static analysis, no pin lifecycle, no transient tracking.

```
before node runs:
  missing = predecessors whose IDs are not in LRU cache
  if missing.length > 0:
    mget(missing) → populate cache
  run node (all reads are synchronous LRU hits)

after node finishes:
  do nothing — LRU evicts by recency on its own

after execution completes:
  drop the LRU cache object (GC cleans up)
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
An LRU sized by bytes (e.g. 10 MB per execution) gives a hard bound on heap
contribution from step outputs. The current system gives a soft bound (size
threshold gate + eviction delay), which is why the bugs existed. A bytes-bounded
LRU is simpler and safer.

### Verdict

Substantial and achievable simplification. Resume works naturally — both the
current system and LRU load metadata only and fetch IO on demand; LRU just
caches the result so subsequent steps don't re-fetch the same output. The
TOCTOU class is eliminated by construction. The over-fetch on the hot path
(fetching predecessors the node won't use) is the only real cost, and it is
bounded by the LRU byte budget.

The main limitation of this variant: each execution's budget is fixed and
independent, so space unused by an idle workflow cannot be borrowed by a bursty
one. With 100 concurrent executions at 10 MB each, the worst-case footprint is
1 GB even if most workflows are barely active.

---

## Approach 1b — Node-wide shared LRU cache

### The idea

A single LRU cache instance lives at the plugin level, shared across all
workflow executions running on the same Kibana node. Each execution writes into
the shared pool and explicitly evicts its own entries on completion. A per-entry
TTL provides a safety-net eviction if explicit cleanup is skipped (e.g. on
crash).

Entries larger than a configurable fraction of the total budget (e.g. 5%) are
**never cached** — they are always fetched from ES via `mget`. This prevents a
single large output from dominating the LRU and causing churn for all other
executions.

```
plugin setup:
  cache = new NodeStepIoCache({ maxBytes: 100 MB, skipThresholdPct: 0.05, ttl: maxWorkflowTimeout })

before node runs:
  missing = predecessors whose IDs are not in shared cache
  mget(missing) → for each result:
    if size > cache.maxEntryBytes: skip (leave out of cache)
    else: cache.set(execId, stepId, type, value, bytes)
  run node

after execution completes:
  cache.evictWorkflow(execId)   // deletes all keys registered under this execId
```

The internal bookkeeping:

```ts
class NodeStepIoCache {
  private readonly lru: LRUCache<string, CacheEntry>;  // shared, byte-bounded
  private readonly keysByExecution = new Map<string, Set<string>>();
  readonly maxEntryBytes: number;                       // budget × skipThresholdPct

  set(execId, stepId, type, value, bytes): void {
    if (bytes > this.maxEntryBytes) return;            // skip large entries
    const key = `${type}_${stepId}`;
    this.lru.set(key, { value }, { size: bytes, ttl: this.ttl });
    this.keysByExecution.get(execId)?.add(key);
  }

  evictWorkflow(execId): void {
    for (const key of this.keysByExecution.get(execId) ?? []) {
      this.lru.delete(key);
    }
    this.keysByExecution.delete(execId);
  }
}
```

### What this adds over Approach 1a

- **Space reuse across executions.** An idle workflow's unused budget is
  available to a bursty one. With 100 MB shared across 100 executions, a
  workflow that needs 15 MB can use it if others are not actively writing —
  instead of being hard-capped at 10 MB and triggering more ES fetches.
- **Single node-level knob.** Total memory contribution of step-IO caching is
  one setting, not N × per-execution budget.
- **Large entries skip the cache entirely.** Outputs above the threshold (e.g.
  5 MB in a 100 MB cache) are always fetched from ES. They never evict smaller,
  frequently-accessed entries. The skip threshold also sets a natural ceiling on
  how much any single step output can contribute to heap pressure via this cache.

### Where it gets complicated

**1. Cross-execution LRU interference.**  
The LRU evicts by global recency, not by execution. A burst of writes from
execution A can silently evict hot entries from execution B, causing unexpected
`mget` rehydration for B. Per-execution latency becomes non-deterministic under
load. This is the primary trade-off vs Approach 1a.

**2. Cleanup bookkeeping.**  
Dropping the cache object (Approach 1a) is free. Here a `Map<execId, Set<key>>`
must stay in sync with the LRU. If the LRU evicts a key before `evictWorkflow`
runs (budget pressure), the key must be absent from `keysByExecution` or the
`delete` call must be a safe no-op — `lru-cache.delete` on a missing key is
fine, so this is manageable.

**3. TTL overhead.**  
`lru-cache` checks TTL on every `get`. The cost per call is low but non-zero on
the hot path. The TTL exists as a safety net for crash recovery, not as the
primary eviction mechanism; it should be set to the maximum allowed workflow
execution duration (e.g. 24 h), not a short window.

**4. Skip-threshold semantics change with budget.**  
5% of 10 MB = 500 KB. 5% of 100 MB = 5 MB. The right budget value is not
obvious and is worth testing empirically (100 MB, 50 MB, 20 MB, 10 MB). The
skip threshold should track the budget, not be a fixed byte value, so the
behaviour scales consistently.

**5. Frequently-accessed large outputs are always ES round-trips.**  
If a step output exceeds the skip threshold but is referenced in a tight loop
(e.g. a `base_payload` used by every foreach iteration), every reference pays
an ES `mget`. The `mget` is batched and reuses the ES connection pool, so the
cost is bounded, but it is higher than a cache hit.

### Verdict

A meaningful improvement in space utilisation when many executions run
concurrently with uneven IO patterns. The skip-threshold design prevents
large-entry cache churn without special-casing the hot path. The operational
cost — cleanup bookkeeping, cross-execution interference, TTL overhead — is
real but manageable.

The right budget value is an empirical question. Start with 100 MB and measure
actual cache hit rates and ES `mget` call frequency at 50 MB, 20 MB, and 10 MB.
The skip threshold (5% of budget by default) is a reasonable starting point but
should be tunable.

---

## Both approaches reduce memory, via different mechanisms

The two LRU approaches are complementary variants that attack the same problem
from different angles:

| | Per-workflow LRU (1a) | Node-wide shared LRU (1b) |
|---|---|---|
| **Primary goal** | Limit how many outputs are in V8 per execution | Reuse idle space across concurrent executions |
| **Mechanism** | Per-execution byte-bounded LRU, GC on completion | Single node-level LRU; explicit evict on completion, TTL fallback |
| **Static analysis** | Not needed | Not needed |
| **Heap bound** | Hard: per-execution budget | Hard: node-level budget |
| **Large-entry handling** | Evicted by LRU like any entry | Skipped entirely (always ES) |
| **Best for** | Simplicity; predictable per-execution footprint | Many concurrent executions with uneven IO patterns |
| **Cross-execution interference** | None (isolated) | Yes (global LRU eviction) |
| **Resume cold-start** | Metadata only; IO fetched on-demand per step | Metadata only; IO fetched on-demand per step |

Approach 1b is strictly more space-efficient than 1a but introduces
cross-execution interference. For the OOM class of issue (single execution with
multi-MB step outputs), see [duckdb_payload_store.md](duckdb_payload_store.md).

---

## Comparison with current system

| Dimension | Current system | Per-workflow LRU (1a) | Node-wide shared LRU (1b) |
|-----------|---------------|-----------|-----------|
| Static analysis role | Drive targeted rehydration | Not needed | Not needed |
| TOCTOU race | Possible (background eviction loop) | Eliminated | Eliminated |
| Pin/unpin lifecycle | Complex (loop + per-consumer) | Gone | Gone |
| Memory bound | Soft (size threshold + delay) | Hard (per-execution budget) | Hard (node-level budget) |
| Full payload in V8 | Yes (until evicted) | Yes (until LRU evicts) | Yes (until LRU evicts; large entries skipped) |
| Cross-execution isolation | N/A (per-execution) | Full | None (shared LRU) |
| Resume cold-start | Metadata only; IO fetched on-demand | Metadata only; cached in LRU | Metadata only; cached in shared LRU |
| External dependency | ES | ES | ES |
| Operational surface | None beyond ES | None | Cleanup bookkeeping (`execId → keys` map) |
| Code size estimate | ~1300 lines | ~200–300 lines | ~300–400 lines |

---

## Recommendation

**Simpler path:** Approach 1a, per-workflow LRU. Eliminates every pin,
transient, and orchestration mechanism. Removes the TOCTOU bug class by
construction. Resume is a non-issue. Predictable per-execution memory footprint
with no cross-execution side effects.

**Better space utilisation:** Approach 1b, node-wide shared LRU. Same
simplification gains as 1a, plus idle space is reused by bursty executions. The
right budget value (100 MB, 50 MB, 20 MB, 10 MB) is an empirical question —
worth testing at production concurrency levels. The 5% skip threshold prevents
large entries from polluting the cache and scales with the budget. The cost is
cross-execution LRU interference and cleanup bookkeeping.

The two are composable: build 1a first; migrate to 1b once concurrency numbers
are known and the budget can be tuned empirically.
