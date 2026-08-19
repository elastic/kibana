# Implementation Plan: LRU Cache Simplification of StepIoService

## Goals

- Replace the eviction/rehydration/pin machinery with a byte-bounded LRU cache.
- All IO reads and writes go through `StepIoService`; no caller touches state directly for IO.
- `StepIoService` calls `WorkflowExecutionState` (not the reverse — already the case today).
- Remove all step-type-specific handling: `data.set`, `waitForInput`, `foreach`, `while` are treated uniformly.
- Eliminate the TOCTOU bug class by making eviction synchronous-only (on insert, never async).

---

## Scope boundary

**In scope:** Replace the memory-management machinery (eviction, pins, transient tracking,
one-cycle deferral) with a byte-bounded LRU. The loop node impls lose their pin/evict calls.
`WorkflowExecutionState.load()` fetches step metadata only — the `output` field is excluded from
the ES query. `StepIoService` owns only step outputs (LRU cache + on-demand rehydration).
Step inputs are written via `write(id, 'input', value)` — routing to state only, no cache.
Step outputs are written via `write(id, 'output', value)` — routing to both state and the LRU.

**Out of scope:** Core static analysis logic (`extractReferencedStepIds`,
`extract_referenced_step_ids.ts`, `extractPropertyPathsFromKql`, `scanForTemplateVariables`).
These stay exactly as-is.

**Partially in scope — `computeRehydrationTargets`:** The foreach/while step-type-specific
branches (reading step input to extract referenced IDs from scope-stack entries) are removed.
No special handling for any step type — `computeRehydrationTargets` treats all scope-stack
entries uniformly. `prepareForRead` still uses static analysis to decide which IDs to fetch.

---

## What gets deleted

| File / Symbol | Why it can go |
|---|---|
| `step_io_pinned_types.ts` | `EVICTION_EXEMPT_STEP_TYPES`, `LOOP_STEP_TYPES` — no longer needed |
| `StepIoService.pinnedOutputIdsByScope` | Loop-lifetime pin — LRU recency covers it |
| `StepIoService.readPinnedOutputIdsByConsumer` + `releaseReadPins` | LRU evicts by recency; freshly-fetched entries are the last to be evicted |
| `StepIoService.transientlyRehydratedIds` + all release methods | LRU manages re-eviction automatically |
| `StepIoService.pendingOutputEvictionIds` + one-cycle deferral | Replaced by dirty-write protection (see Gap 1) |
| `StepIoService.evictedOutputIds` / `evictionMinBytes` / `isEvictionCandidate` / `isReleaseCandidate` | Replaced by LRU eviction policy |
| `StepIoService.evictedOutputSizes` / `outputSizes` / `totalRecordedBytes` / `setEvicted` / `clearEvicted` / `setOutputSize` / `clearOutputSize` | LRU tracks bytes internally |
| `StepIoService.pinLoopSource` / `pinForeachSource` / `unpinLoopScope` / `unpinForeachScope` | No callers once node impls are cleaned up |
| `StepIoService.dataSetOutputs` / `dataSetVariablesCache` / `recordDataSetOutput` / `getDataSetVariables()` | `data.set` aggregation is not IO service responsibility — moves to `WorkflowContextManager` |
| `StepIoService.evictStaleLoopOutputs` / `evictCompletedLoopsOnResume` | LRU evicts stale iteration outputs automatically |
| `StepIoService.markDeferredAfterLoad` | Resume path becomes: metadata-only load, then on-demand per step |
| `StepIoService.releaseTransientlyRehydratedOutputs` | No transient tracking |
| `StepIoService.hasEvictedOutputs` | No evicted set |
| `StepIoService.inputs` / `evictCompletedStepInputs` | No input cache — `write(id, 'input', v)` delegates to state; `read(id, 'input')` is a thin state proxy (no map) |
| `dropStaleStepIo` input cleanup | No input map to clean up |
| `StepIoService.flush` / `flushStepChanges` / `persistMergedStepChanges` / `runDeferredEvictionCycle` / `pendingIoChanges` | Flush moves to runtime manager; `StepIoService` never touches ES |
| `StepIoService.load` / `markDeferredAfterLoad` | `load()` moves back to `WorkflowExecutionState` where it lived before `StepIoService` was introduced |
| `StepIoStateAccessor` type | Leftover from the current machinery; `StepIoService` receives `WorkflowExecutionState` directly |
| `enter_foreach_node_impl.ts`: `pinForeachSource` + `unpinForeachScope` calls | |
| `exit_foreach_node_impl.ts`: `unpinForeachScope` + `evictStaleLoopOutputs` calls | |
| `enter_while_node_impl.ts`: `pinLoopSource` call | |
| `exit_while_node_impl.ts`: `unpinLoopScope` + `evictStaleLoopOutputs` + re-pin calls | |
| `loop_break_node_impl.ts`: `unpinForeachScope` + `evictStaleLoopOutputs` calls | |
| `loop_continue_node_impl.ts`: `evictStaleLoopOutputs` call | |
| `workflow_execution_runtime_manager.ts`: `evictCompletedLoopsOnResume` call | |
| `workflow_execution_loop.ts`: `releaseTransientlyRehydratedOutputs` call | |

---

## New StepIoService API

```ts
type StepIoType = 'input' | 'output';

// Reader — injected into WorkflowContextManager (no mutation surface)
interface StepIoReader {
  read(stepExecutionId: string, type: StepIoType): JsonValue | null | undefined;
  // getStepError / getLatestStepIO read from WorkflowExecutionState directly
  // getDataSetVariables() removed — moved to WorkflowContextManager
}

// Writer — injected into StepExecutionRuntime (no lifecycle surface)
interface StepIoWriter extends StepIoReader {
  write(stepExecutionId: string, type: StepIoType, value: JsonValue | null, sizeBytes?: number): void;
}

// Lifecycle — used by the execution loop and runtime manager only
interface StepIoLifecycle {
  prepareForRead(args: PrepareForReadArgs): Promise<void>;
  // releaseReadPins removed — no pins; LRU evicts by recency
  // flush() / flushStepChanges() removed — flush is the runtime manager's responsibility
  // load() removed — loading step execution metadata is WorkflowExecutionState's responsibility
  //   (it lived there before StepIoService was introduced; runtime manager calls state.load())
  getOutputSizeStats(): OutputSizeStats;
}
```

Routing is internal to `StepIoService`:
- `write(id, 'output', v)` → updates state **and** inserts into the LRU under key `output_<id>`
- `write(id, 'input', v)` → updates state only (no LRU entry for now; easy to add later)
- `read(id, 'output')` → LRU hit or state fallback
- `read(id, 'input')` → state only (no LRU key exists)

The LRU key scheme `${type}_${stepExecutionId}` (e.g. `output_abc123`, `input_abc123`) prevents
collision between input and output for the same execution ID, and leaves room to cache inputs
later without changing the API.

The `StepIoReader` / `StepIoWriter` / `StepIoLifecycle` split is retained so node
implementations cannot accidentally call `flush()` or drive eviction. The public surface
shrinks significantly — `getDataSetVariables`, all pin methods, all eviction methods, and
`releaseReadPins` are gone.

---

## Step-by-step implementation

### Step 1 — Introduce `ByteLruCache` and `StepIoCache`

Two new classes with distinct responsibilities:

**`ByteLruCache<K, V>`** — generic, domain-agnostic LRU bounded by byte size (not entry count).
Add or pick an existing in-tree implementation (check `src/platform/packages`).

```ts
// Rough sketch — default budget: 10 MB per execution
class ByteLruCache<K, V> {
  constructor(private readonly maxBytes: number) {}
  get(key: K): V | undefined { ... }
  has(key: K): boolean { ... }
  set(key: K, value: V, bytes: number): void { ... }  // inserts, then evicts LRU entries until under budget
  delete(key: K): void { ... }
  get totalBytes(): number { ... }
}
```

**`StepIoCache`** — domain wrapper around `ByteLruCache`. Owns the key scheme
(`${type}_${stepExecutionId}`) and `StepIoType` routing. `StepIoService` uses this;
raw key strings never appear outside this class.

```ts
class StepIoCache {
  constructor(private readonly lru: ByteLruCache<string, JsonValue | null>) {}

  get(id: string, type: StepIoType): JsonValue | null | undefined {
    return this.lru.get(`${type}_${id}`);
  }
  set(id: string, type: StepIoType, value: JsonValue | null, bytes: number): void {
    this.lru.set(`${type}_${id}`, value, bytes);
  }
  has(id: string, type: StepIoType): boolean {
    return this.lru.has(`${type}_${id}`);
  }
  get totalBytes(): number { return this.lru.totalBytes; }
}
```

Replace `StepIoService.outputs` (a plain `Map`) with a `StepIoCache` instance.
`StepIoService` has no `inputs` map — inputs are owned by `WorkflowExecutionState` with no cache.

**Config change:** Add `eviction.maxCacheSize` (default `10mb`) to drive the LRU budget.
`eviction.minPayloadSize` stays in the schema but becomes a no-op — the LRU does not use it.
`StepIoService` constructor changes from `{ evictionMinBytes?: number }` to `{ maxBytes?: number }`.
Pass `config.get('eviction.maxCacheSize')` when constructing the service.

---

### Step 2 — Implement unified `write` / `read`

`StepIoService.write` routes to two independent systems based on type:

1. **`ExecutionState`** — canonical write-and-persist owner. Holds the IO pending for the
   next flush, persists it to ES, then clears it from memory after the flush is confirmed.
   This is the only source of truth for ES durability.
2. **LRU** — independent read cache for outputs. Gets a copy for fast synchronous context
   reads. Manages its own eviction with no coordination with the flush cycle.

```ts
write(stepExecutionId, type, value, sizeBytes?) {
  // Always update state (both input and output go here for persistence).
  this.state.setStepIo(stepExecutionId, { [type]: value });

  // Only outputs go into the cache (inputs are served from state directly).
  if (type === 'output') {
    const bytes = sizeBytes ?? safeOutputSize(value) ?? 0;
    this.cache.set(stepExecutionId, 'output', value, bytes);
  }
}

read(stepExecutionId, type) {
  const cached = this.cache.get(stepExecutionId, type);
  if (cached !== undefined) return cached;
  return this.state.getStepIo(stepExecutionId, type);
}
```

No step-type checks. All step types are handled identically.

No dirty-write protection needed. The two systems are fully decoupled: LRU evicts freely,
`ExecutionState` persists independently. If the LRU evicts a freshly-written output before
the next `prepareForRead` runs, `prepareForRead` fetches it from ES — which has it because
`ExecutionState` flushed it (or will have by the time the next step actually runs).

**Change to `ExecutionState`:** Add `setStepIo(id, { input?, output? })` (called by `write`)
and `getStepIo(id, type)` (called by `read` for inputs and for output cache misses).
Add a post-flush cleanup: after `bulkUpsert` confirms the write, call
`ExecutionState.clearFlushedIo(ids)` to drop the IO fields from the in-memory step docs.
This frees the state's memory — the LRU still holds a copy for outputs; ES holds the durable copy.

---

### Step 3 — Simplify `prepareForRead`

Static analysis (`computeRehydrationTargets`) still runs and determines `neededIds` — that
logic is unchanged. What changes is everything that happens after `neededIds` is computed:
replace the evicted-set check, transient release, and pin orchestration with LRU operations.

```ts
async prepareForRead({ node, predecessorsResolver }) {
  if (this.cache.totalBytes === Infinity) return;  // eviction disabled

  // Static analysis determines which IDs this node needs.
  // Scope-stack entries included, but no step-type-specific foreach/while input reads.
  const neededIds = this.computeRehydrationTargets(node, predecessorsResolver);

  // Fetch cache misses from ES. No pins — LRU evicts by recency only.
  const missing = [...neededIds].filter(id => !this.cache.has(id, 'output'));
  if (missing.length > 0) {
    const docs = await this.stepRepository.getStepExecutionsByIds(missing, ['id', 'output']);
    for (const doc of docs) {
      const bytes = safeOutputSize(doc.output) ?? 0;
      this.cache.set(doc.id, 'output', doc.output ?? null, bytes);
    }
  }
}
```

`computeRehydrationTargets` is simplified: remove `pinLatestExecutionIdsForScope` calls
(loop re-pinning on resume no longer needed — LRU covers it). The static analysis itself
and the conservative fallback logic stay exactly as-is.

`run_node.ts` call site is unchanged — `consumerId` param can be dropped since there are no pins.

**What is deleted inside `prepareForRead`:**
- `this.releaseTransientExcept(neededIds)` — no transient tracking
- `this.readPinnedOutputIdsByConsumer.set(...)` — no pins
- The `noPriorTransients` early-return guard — no longer needed
- The `hasEvictedOutputs()` early-return guard — `StepIoCache.has()` is an O(1) check instead

---

### Step 4 — Move flush responsibility to the runtime manager

`flush()` and `flushStepChanges()` are removed from `StepIoService` entirely. Flush ownership
returns to where it was before `StepIoService` was introduced: the runtime manager drives all
persistence. `StepIoService` only writes to the LRU; it never touches ES directly.

`WorkflowExecutionRuntimeManager` (or the persistence loop caller) calls flush explicitly:

```ts
// In the persistence loop — no longer goes through StepIoService
await Promise.all([
  this.executionState.flushWorkflowDoc(),
  this.executionState.flushStepChanges(),
]);
```

`ExecutionState.flushStepChanges()`:
1. Drains pending lifecycle partials + pending IO partials (written by `StepIoService.write`
   via `state.setStepIo`).
2. Runs `stepRepository.bulkUpsert(merged)`.
3. After confirmed write, calls `clearFlushedIo(flushedIds)` — drops IO from the in-memory
   step docs. The LRU still holds a copy; ES holds the durable copy. State memory is freed.

The LRU is not touched during flush at all. No `pendingOutputEvictionIds`. No deferred eviction
cycle. No `runDeferredEvictionCycle`. The LRU evicts on its own schedule (when capacity is
exceeded on insert).

**What gets removed from `StepIoService`:** `flush()`, `flushStepChanges()`,
`persistMergedStepChanges()`, `runDeferredEvictionCycle()`, `pendingIoChanges`.

**Call sites to update (same pass):**
- `persistence_loop.ts:26` — replace `stepIoService.flush()` with state flush calls
- `workflow_execution_loop.ts:103` — same; also remove `releaseTransientlyRehydratedOutputs()` call at line 110
- `workflow_execution_runtime_manager.ts:420` — same
- `WorkflowExecutionLoopParams` in `types.ts` — remove `stepIoService: StepIoService` or narrow to `StepIoLifecycle`

`WorkflowExecutionRuntimeManager` retains a `StepIoLifecycle` reference solely for
`getOutputSizeStats()` in `reportTelemetryIfTerminal`.

---

### Step 5 — Move `load` back to `WorkflowExecutionState` (resume path)

`load()` is removed from `StepIoService`. Loading step execution metadata is
`WorkflowExecutionState`'s responsibility — that is where it lived before `StepIoService` was
introduced. The runtime manager calls `this.executionState.load()` directly, exactly as before.

`WorkflowExecutionState.load()` fetches step metadata only (no IO fields — `sourceExclude: ['output']`).
With LRU, `StepIoService` starts with an empty cache; outputs are fetched on demand by
`prepareForRead` as each step executes. No `markDeferredAfterLoad`, no eager mget, no step-type
carve-outs.

`StepIoService` has no involvement in the load path. Inputs are owned by `WorkflowExecutionState`
and loaded as part of step metadata — callers read them from state directly.

**Changes to `WorkflowExecutionState`:**
- Restore `StepExecutionRepository` as a constructor dependency (it was there before the current
  machinery was introduced).
- Extend `StepExecutionMetadata` to carry `input` (currently `Omit<EsWorkflowStepExecution, 'input' | 'output'>`).
- Extend `StepExecutionMetadata` to carry `input` so state can store and serve inputs.
- Add `setStepIo(id, { input?, output? })` and `getStepIo(id, type)` — called by `StepIoService.write`/`read`.
- Add `clearFlushedIo(ids)` and `flushStepChanges()` for Step 4.

---

### Step 6 — Move `getDataSetVariables()` to `WorkflowContextManager`

`StepIoService` no longer knows about `data.set`. `WorkflowContextManager` builds the
`variables` context by iterating all `data.set` step executions from state and reading each
output through `stepIoService.read(id, 'output')` (LRU hit or state fallback after `prepareForRead`).

`prepareForRead` / `computeRehydrationTargets` must include all `data.set` step execution IDs
in `neededIds` so their outputs are pre-warmed in the LRU before the synchronous context build.
Since `{{ variables.x }}` references cannot be statically traced to a specific step ID,
`computeRehydrationTargets` adds all `data.set` IDs unconditionally — a narrow rule scoped
to the static analysis layer, not the IO service.

**Note:** Improving static analysis is out of scope for this refactor. This rule is the
minimal addition required to make the `variables` context work correctly after the move.

**Note on performance:** Building the `variables` context is O(N) over all `data.set` step
executions (one `getStepOutput` call per entry). This is acceptable — the `variables`
implementation has a known design issue but fixing it is out of scope here.

---

### Step 7 — Remove all loop node impl changes

Delete pin/unpin/evict calls from:
- `enter_foreach_node_impl.ts`
- `exit_foreach_node_impl.ts`
- `enter_while_node_impl.ts`
- `exit_while_node_impl.ts`
- `loop_break_node_impl.ts`
- `loop_continue_node_impl.ts`

No replacement needed. The LRU evicts stale loop iteration outputs automatically as newer
outputs push them out.

Also remove `releaseReadPins()` calls from the parallel step's branch runtimes (all call sites
in `parallel_node_impl.ts` or equivalent). No pins exist; the calls are dead code.

Also remove the `StepIoService` constructor parameter from all six loop node impls and update the
corresponding call sites in `nodes_factory.ts`.

---

## Identified gaps for review

### ~~Gap 1 — Plan contradicts itself on whether `inputs` stays in `StepIoService`~~ ✅ Resolved

**Decision:** No input caching. `StepIoService` has no `inputs` map. Step 1 updated to reflect this.

Consequences:
- `StepExecutionMetadata` (currently `Omit<EsWorkflowStepExecution, 'input' | 'output'>`) must be
  extended to carry `input` so state can store and serve it.
- `WorkflowExecutionState` gets `setStepIo(id, { input?, output? })` and `getStepIo(id, type)`.
- `evictCompletedStepInputs` and `dropStaleStepIo`'s input cleanup are removed from `StepIoService`;
  if input memory needs bounding, state handles it.
- `read(id, 'input')` on `StepIoReader` proxies to state (resolved by Gap 4).

---

### ~~Gap 2 — `releaseReadPins` removed but Step 3 still adds per-consumer LRU pins~~ ✅ Resolved

**Decision:** No pins at all. Step 3 updated — `lru.pin` removed from `prepareForRead`.
`releaseReadPins` is gone from both `StepIoLifecycle` and `WorkflowContextManager`.
`consumerId` param on `prepareForRead` can be dropped.

The parallel step's `branchRuntime.contextManager.releaseReadPins()` calls are also removed.

---

### ~~Gap 3 — `computeRehydrationTargets` calls `getStepInput` for foreach/while scope analysis~~ ✅ Resolved

**Decision:** Remove the foreach/while step-type-specific branches from `computeRehydrationTargets`
entirely. No special input reads for scope-stack entries. The "out of scope" boundary for static
analysis is updated: `computeRehydrationTargets` loses its step-type awareness for foreach/while.

Move this to **In scope** in the scope boundary section.

---

### ~~Gap 4 — `WorkflowContextManager.buildForeachContext` calls `stepIoService.getStepInput`~~ ✅ Resolved

**Decision:** `read(id, 'input')` is the access point; routing to state (no cache) is internal
to `StepIoService`. No dedicated `getStepInput` method — callers use the unified `read` API.

---

### ~~Gap 5 — `StepExecutionRuntime.getCurrentStepResult` calls `getStepInput`~~ ✅ Resolved

Resolved by Gap 4: callers use `read(id, 'input')` which proxies to state. No change needed
in `getCurrentStepResult` or its callers beyond switching to the unified `read` call.

---

### ~~Gap 6 — `WorkflowExecutionState` has no `StepExecutionRepository` dependency today~~ ✅ Resolved

**Decision:** `StepExecutionRepository` belongs in `WorkflowExecutionState` — it was there before
the current machinery was introduced. Restore it as a constructor dependency. The class-level
comment's dependency note must be updated accordingly.

---

### ~~Gap 7 — `StepIoStateAccessor` type needs reworking; new state methods not listed~~ ✅ Resolved

**Decision:** `StepIoStateAccessor` is a leftover from the current machinery and must be deleted.
`StepIoService` receives `WorkflowExecutionState` directly. Add to the deletion table.

---

### ~~Gap 8 — Three `flush()` call sites not listed in the plan~~ ✅ Resolved

Add to Step 4: update all three call sites to call state directly, and update
`WorkflowExecutionLoopParams` in `types.ts`:
- `persistence_loop.ts:26`
- `workflow_execution_loop.ts:103`
- `workflow_execution_runtime_manager.ts:420`

---

### ~~Gap 9 — `workflow_execution_loop.ts` flush and release calls must be updated together~~ ✅ Resolved

`releaseTransientlyRehydratedOutputs` is gone — the LRU handles rehydration internally with no
transient tracking. Both calls in `workflow_execution_loop.ts` (flush line 103, release line 110)
are removed in the same pass as Step 4. Covered by Gap 8.

---

### ~~Gap 10 — `WorkflowExecutionRuntimeManager` still depends on `getOutputSizeStats()`~~ ✅ Resolved

**Decision:** `WorkflowExecutionRuntimeManager` retains a `StepIoLifecycle` reference solely for
`getOutputSizeStats()` in `reportTelemetryIfTerminal`. No change to where this stat lives for now.

---

### ~~Gap 11 — Config migration not described~~ ✅ Resolved

**Decision:** `eviction.minPayloadSize` remains in the config schema for now but becomes a no-op —
the LRU does not use it. A new `eviction.maxCacheSize` key (default `10mb`) drives the LRU budget.
`StepIoService` constructor changes from `{ evictionMinBytes?: number }` to `{ maxBytes?: number }`.

---

### ~~Gap 12 — `data.set` variable aggregation becomes O(N) without the dedicated map~~ ✅ Resolved

**Decision:** O(N) iteration is acceptable for now. The `variables` implementation is a known
design issue but is out of scope for this refactor.

---

### ~~Gap 13 — `waitForInput` eviction rationale not documented~~ ✅ Resolved

**Decision:** Auditability concern removed. `waitForInput` is treated uniformly like all other steps.

---

### ~~Gap 14 — Loop node impls need constructor parameter removal; `nodes_factory.ts` needs updating~~ ✅ Resolved

Already addressed in Step 7: remove the `StepIoService` constructor parameter from all six loop
node impls and update the corresponding `nodes_factory.ts` call sites.
