# Step IO — LRU Cache Approach

Each workflow execution owns a byte-bounded LRU cache (`StepIoCache`) that holds
step outputs in the V8 heap. The cache is the single source for synchronous context
reads; Elasticsearch is the durable backing store. The two are kept in sync through
a deliberate pre-warm / write-through / flush contract.

## Per-step cycle

**Before the step runs** — `WorkflowContextManager.ensureContextReady()` resolves
which predecessor outputs will be needed (via static template analysis or, when
ambiguous, all predecessors). It then calls `StepIoService.rehydrate(ids)`, which
identifies any IDs missing from the LRU and fetches them from ES in a single `mget`
call. By the time the step starts, every output it could read is resident in the
cache.

**During the step** — `getContext()` is called synchronously. All reads go to the
LRU; there is no async IO on the hot path. The pre-warmed entries cannot be
evicted between `ensureContextReady()` and `getContext()` — JavaScript is
single-threaded and LRU eviction only fires on `set()`, so nothing can displace
them in that window. `StepIoService.read()` still has a `WorkflowExecutionState`
fallback as defence-in-depth: it covers outputs written by the current execution
(mirrored to state on every `write()`) that were later evicted by a subsequent
step and then re-referenced — a case `ensureContextReady()` also handles, but
the state fallback guards against any gap.

**After the step writes output** — `StepIoService.write()` fans the value out to two
places: the LRU cache (for immediate re-use by subsequent steps) and
`WorkflowExecutionState` (durable, in-memory state for the execution).
`WorkflowExecutionState` flushes pending outputs to Elasticsearch asynchronously,
making them available for rehydration after eviction or across process restarts.

## Issues this approach fixes

The previous `StepIoService` (~1300 lines) maintained a background eviction loop,
a pin/unpin lifecycle, and a static-analysis planner to minimise ES round-trips.
That combination produced four distinct bug classes, all documented in
[eviction_rehydration_bugs.md](eviction_rehydration_bugs.md).

**TOCTOU race — eviction fired after the plan ran, before the read**
([#17766](https://github.com/elastic/security-team/issues/17766),
[#17768](https://github.com/elastic/security-team/issues/17768),
[kibana#277820](https://github.com/elastic/kibana/issues/277820))  
A 500 ms background macrotask could evict an output in the window between
`prepareForRead()` returning and the synchronous context read that followed it.
LRU eliminates the background loop entirely. Eviction only fires on `set()` —
a synchronous call that happens during `write()`, outside the read path — so the
race window does not exist.

**Static-analysis blind spots — planner missed KQL references**
([#17494](https://github.com/elastic/security-team/issues/17494),
[#17768](https://github.com/elastic/security-team/issues/17768))  
`extractReferencedStepIds` only scanned Liquid `{{ }}` expressions. Bare-KQL
conditions and fields outside `node.configuration` were invisible, causing the
planner to skip rehydrating outputs the step would actually read.
The LRU approach removes static analysis from the critical path: `rehydrate()`
simply fetches every predecessor that is absent from the cache — there is nothing
to mis-analyse.

**Loop pin was Liquid-only — bare-KQL `while` conditions were never pinned**
([#17768](https://github.com/elastic/security-team/issues/17768))  
`pinLoopSource` resolved to an empty set for `while` loops whose conditions were
bare KQL, leaving the source output unprotected for the loop's lifetime.
Pin and unpin machinery is gone. The LRU pre-warms on every iteration via
`ensureContextReady()`; if an output was evicted since the previous iteration,
`rehydrate()` fetches it again without any pin state to get wrong.

**Stale resume rehydration — ES fetch overwrote fresh in-memory data**
([#17554](https://github.com/elastic/security-team/issues/17554))  
On task resume, `markDeferredAfterLoad()` marked everything as evicted. If a step
wrote its output before the next `prepareForRead()` ran, the planner still fetched
the old ES document — which could predate the flush — overwriting the fresh value.
`rehydrate()` skips any ID already present in the LRU. A freshly-written output is
in the cache by construction (written via `write()` → `cache.set()`), so
`rehydrate()` never fetches it from ES, and the stale-overwrite path does not exist.

**No step-type-specific eviction or rehydration logic**  
Three of the four bug classes above were rooted in step-type-specific handling:
`foreach` pins, `while` condition pins, `switch` case scanning. The LRU approach
has none of that. `ensureContextReady()` and `rehydrate()` are called identically
before every step, regardless of type. The cache does not know or care whether the
caller is a `foreach`, a `while`, a connector, or a `data.set` — it stores and
evicts outputs by recency and byte size, and rehydration fills in whatever is
missing. Adding a new step type requires zero changes to the IO layer.

---

## Memory management

The LRU evicts the least-recently-used entry automatically when the byte budget is
exceeded — no background timer, no manual pin/unpin lifecycle. Because eviction only
fires on insert (a synchronous operation outside the read path), there is no
time-of-check/time-of-use race between eviction and a concurrent read. An evicted
entry is transparently rehydrated from ES the next time `ensureContextReady` runs
for a step that needs it.
