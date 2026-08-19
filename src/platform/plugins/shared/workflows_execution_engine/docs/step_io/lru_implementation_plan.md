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
Step inputs are written directly to state via `setStepInput` — `StepIoService` does not cache them.

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
| `StepIoService.inputs` / `evictCompletedStepInputs` | No input cache — `setStepInput` delegates to state; `getStepInput` stays on the service as a thin state proxy (no map) |
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
// Reader — injected into WorkflowContextManager (no mutation surface)
interface StepIoReader {
  getStepOutput(stepExecutionId: string): JsonValue | null | undefined;
  getStepInput(stepExecutionId: string): JsonValue | undefined;  // thin proxy to state, no cache
  // getStepError / getLatestStepIO read from WorkflowExecutionState directly
  // getDataSetVariables() removed — moved to WorkflowContextManager
}

// Writer — injected into StepExecutionRuntime (no lifecycle surface)
interface StepIoWriter extends StepIoReader {
  setStepInput(stepExecutionId: string, input: JsonValue): void;  // delegates to state, no cache
  setStepOutput(stepExecutionId: string, output: JsonValue | null, sizeBytes?: number): void;
}

// Lifecycle — used by the execution loop and runtime manager only
interface StepIoLifecycle {
  prepareForRead(args: PrepareForReadArgs): Promise<void>;
  // releaseReadPins removed — no pins; LRU evicts by recency
  // flush() / flushStepChanges() removed — flush is the runtime manager's responsibility
  // load() removed — loading step execution metadata is WorkflowExecutionState's responsibility
  //   (it lived there before StepIoService was introduced; runtime manager calls state.load())
  getOutputSizeStats(): OutputSizeStats;  // see Gap 1
}
```

The `StepIoReader` / `StepIoWriter` / `StepIoLifecycle` split is retained so node
implementations cannot accidentally call `flush()` or drive eviction. The public surface
shrinks significantly — `getDataSetVariables`, all pin methods, all eviction methods, and
`releaseReadPins` are gone.

---

## Step-by-step implementation

### Step 1 — Introduce a byte-bounded LRU

Add or pick an existing in-tree LRU implementation (check `src/platform/packages`).
The LRU maps `stepExecutionId → JsonValue | null` and is keyed by byte size, not count.

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

Replace `StepIoService.outputs` (a plain `Map`) with this LRU.
`StepIoService` has no `inputs` map — inputs are owned by `WorkflowExecutionState` with no cache.

**Config change:** Add `eviction.maxCacheSize` (default `10mb`) to drive the LRU budget.
`eviction.minPayloadSize` stays in the schema but becomes a no-op — the LRU does not use it.
`StepIoService` constructor changes from `{ evictionMinBytes?: number }` to `{ maxBytes?: number }`.
Pass `config.get('eviction.maxCacheSize')` when constructing the service.

---

### Step 2 — Rewrite `setStepOutput`

`StepIoService` writes to two independent systems:

1. **`ExecutionState`** — canonical write-and-persist owner. Holds the IO pending for the
   next flush, persists it to ES, then clears it from memory after the flush is confirmed.
   This is the only source of truth for ES durability.
2. **LRU** — independent read cache. Gets a copy of the output for fast synchronous context
   reads. Manages its own eviction with no coordination with the flush cycle.

```ts
setStepOutput(stepExecutionId, output, sizeBytes?) {
  // 1. Hand off to ExecutionState for persistence (moves pendingIoChanges there).
  this.state.setStepIo(stepExecutionId, { output });

  // 2. Populate LRU read cache independently.
  const bytes = sizeBytes ?? safeOutputSize(output) ?? 0;
  this.lru.set(stepExecutionId, output, bytes);
}
```

No step-type checks. All step types are handled identically.

No dirty-write protection needed. The two systems are fully decoupled: LRU evicts freely,
`ExecutionState` persists independently. If the LRU evicts a freshly-written output before
the next `prepareForRead` runs, `prepareForRead` fetches it from ES — which has it because
`ExecutionState` flushed it (or will have by the time the next step actually runs).

**Change to `ExecutionState`:** Add `setStepIo(id, { input?, output? })` and a post-flush
cleanup: after `bulkUpsert` confirms the write, call `ExecutionState.clearFlushedIo(ids)`
to drop the IO fields from the in-memory step docs. This frees the state's memory — the LRU
still holds a copy for reads, and ES holds it for durability.

---

### Step 3 — Simplify `prepareForRead`

Static analysis (`computeRehydrationTargets`) still runs and determines `neededIds` — that
logic is unchanged. What changes is everything that happens after `neededIds` is computed:
replace the evicted-set check, transient release, and pin orchestration with LRU operations.

```ts
async prepareForRead({ node, predecessorsResolver }) {
  if (this.lru.maxBytes === Infinity) return;  // eviction disabled

  // Static analysis determines which IDs this node needs.
  // Scope-stack entries included, but no step-type-specific foreach/while input reads.
  const neededIds = this.computeRehydrationTargets(node, predecessorsResolver);

  // Fetch cache misses from ES. No pins — LRU evicts by recency only.
  const missing = [...neededIds].filter(id => !this.lru.has(id));
  if (missing.length > 0) {
    const docs = await this.stepRepository.getStepExecutionsByIds(missing, ['id', 'output']);
    for (const doc of docs) {
      const bytes = safeOutputSize(doc.output) ?? 0;
      this.lru.set(doc.id, doc.output ?? null, bytes);
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
- The `hasEvictedOutputs()` early-return guard — LRU `has()` is an O(1) check instead

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
1. Drains pending lifecycle partials + pending IO partials (written by `StepIoService.setStepOutput`
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
- Add `setStepInput(id, input)` and `getStepInput(id)` methods.
- Add `setStepIo(id, { output? })`, `clearFlushedIo(ids)`, `flushStepChanges()` for Step 4.

---

### Step 6 — Move `getDataSetVariables()` to `WorkflowContextManager`

`StepIoService` no longer knows about `data.set`. `WorkflowContextManager` builds the
`variables` context by iterating all `data.set` step executions from state and reading each
output through the normal `getStepOutput` path (LRU hit or ES fetch via `prepareForRead`).

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
- `WorkflowExecutionState` gets `setStepInput(id, input)` and `getStepInput(id)` methods.
- `evictCompletedStepInputs` and `dropStaleStepIo`'s input cleanup are removed from `StepIoService`;
  if input memory needs bounding, state handles it.
- `getStepInput` stays on `StepIoReader` as a thin proxy to state (resolved by Gap 4).

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

**Decision:** Add `getStepInput` back to `StepIoReader`, but it reads from state — no cache.
`StepIoService.getStepInput(id)` is a thin proxy: `return this.state.getStepInput(id)`.

API section updated accordingly.

---

### ~~Gap 5 — `StepExecutionRuntime.getCurrentStepResult` calls `getStepInput`~~ ✅ Resolved

Resolved by Gap 4: `getStepInput` is back on `StepIoReader` as a state proxy. No change needed
in `getCurrentStepResult` or its callers.

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
