# Workflow RAM Consumption — Step IO Strategy

## Goal

Reduce per-execution RAM consumption driven by step IO (inputs and outputs stored in memory
during workflow execution).

## Phases

### Phase 1 — LRU Cache Simplification

Replace the eviction/rehydration/pin machinery in `StepIoService` with a byte-bounded LRU
cache. The LRU enforces a per-execution memory budget (default 10 MB) and evicts
least-recently-used outputs on insert, eliminating the complex pin lifecycle.

**Expected outcome:** Reduced per-execution heap footprint; simpler, more predictable memory
behaviour; elimination of a class of TOCTOU bugs.

Implementation plan: [lru_implementation_plan.md](./lru_implementation_plan.md)

### Phase 2 — DuckDB-backed Step IO Service

Replace the in-process LRU with a DuckDB-backed store on the local filesystem. Step outputs
are persisted to DuckDB and read back on demand — only the columns needed for the current step
are fetched (projection pushdown). The in-process cache is eliminated entirely; memory pressure
shifts to disk I/O.

**Expected outcome:** Near-zero per-execution heap use for step IO. Selective column reads mean
only the keys a step actually references are deserialised, which is particularly effective for
wide outputs and long-running executions that accumulate many step results.

Implementation plan: TBD
