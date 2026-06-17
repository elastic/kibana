# Rollover Index Strategy for Execution State

## Problem

The execution state indexes (`.workflows-executions`, `.workflows-step-executions`) are hot indexes with frequent bulkUpsert operations. Completed executions are migrated to a data-stream, but cleanup via `delete_by_query` degrades the hot index performance due to inverted-index overhead and segment merge costs.

## Proposed Solution

Configure hourly rollover for execution state indexes. When a workflow starts, capture the current write index name and store it on the workflow execution document. All subsequent writes for that execution target the pinned index name. Old backing indexes where all executions are terminal (COMPLETED/FAILED/CANCELLED) are dropped entirely — O(1) cleanup with no `delete_by_query`.

## Current State

Two flat indexes with hardcoded names, no ILM, no rollover, no cleanup:

- `.workflows-executions` — workflow execution docs (updates via `esClient.update`)
- `.workflows-step-executions` — step execution docs (updates via `esClient.bulk` with `doc_as_upsert`)

All reads and writes target constant index names from `common/mappings.ts`. The data-stream (`.workflows-execution-data-stream-logs`) is only for event logs, not execution state.

## Viability: Confirmed

The approach is viable and well-suited to the problem.

### Why It Works

1. **Rollover aliases support updates.** Unlike data streams (append-only), rollover aliases allow `update` and `doc_as_upsert`, which the flush loop relies on. This is the correct mechanism for mutable hot state.

2. **Per-execution index pinning prevents cross-index splitting.** When a workflow starts and stores the resolved write index name (e.g., `.workflows-executions-000042`), all subsequent `bulkUpsert` and `update` calls for that execution target the same backing index — even if rollover creates `-000043` mid-execution. All docs for one execution live in one backing index.

3. **Whole-index deletion is O(1).** Instead of `delete_by_query` (which marks documents as deleted, triggering expensive segment merges), dropping an entire backing index is instant and reclaims resources immediately. No inverted-index overhead, no tombstone accumulation.

4. **Reads via alias are transparent.** GET-by-`_id` and search queries through the alias automatically fan out across all backing indexes. `_id`-based gets for hot-path operations (cancel polling, execution lookup) remain O(1) per backing index.

## Implementation Considerations

### 1. Two indexes need independent rollover

Both `.workflows-executions` and `.workflows-step-executions` need rollover. The workflow execution document should store both write index names:

```typescript
interface EsWorkflowExecution {
  // ... existing fields ...
  executionsWriteIndex?: string;     // e.g. ".workflows-executions-000042"
  stepExecutionsWriteIndex?: string; // e.g. ".workflows-step-executions-000042"
}
```

Alternatively, if they share the same rollover cadence, derive one from the other via naming convention (same suffix number), but explicit storage is safer.

### 2. Index name resolution at workflow start

After creating the initial workflow execution doc via the alias, the ES `index` response contains `_index` — the actual backing index used. Store that:

```typescript
// In createWorkflowExecution:
const response = await this.esClient.index({
  index: this.aliasName,  // writes to current write index
  id: workflowExecution.id,
  document: workflowExecution,
});
// response._index = ".workflows-executions-000042"
```

This is atomic — no race window between rollover and name capture.

### 3. Repository changes — write to pinned index, read from alias

The repositories need a dual-mode pattern:

- **Reads** (search, get): always use the **alias** (fans out across all backing indexes)
- **Writes** for a specific execution: use the **pinned index name** from the workflow execution doc
- **Writes** for new executions: use the **alias** (goes to current write index)

The `StepExecutionRepository.bulkUpsert` currently takes a hardcoded `this.indexName`. Accept an optional `targetIndex` parameter:

```typescript
public async bulkUpsert(
  stepExecutions: Array<Partial<EsWorkflowStepExecution>>,
  targetIndex?: string  // pinned write index for this execution
): Promise<void> {
  const bulkResponse = await this.esClient.bulk({
    index: targetIndex ?? this.aliasName,
    // ...
  });
}
```

### 4. Cleanup job — check-then-delete

A periodic background task should:

1. List all backing indexes for each alias (via `_cat/aliases` or `_alias` API)
2. Skip the current write index (`is_write_index: true`)
3. For each old backing index, run a count query: `status NOT IN [COMPLETED, FAILED, CANCELLED]`
4. If count is 0 (all terminal), delete the index

This is safe because:
- Active executions have their write index pinned, so they never target old indexes
- The write index is never deleted
- Terminal statuses are immutable

### 5. Long-running executions can hold old indexes open

A workflow with a 6-hour timeout or indefinite wait steps will prevent its backing index from being deleted. This is correct behavior (the data is still needed), but consider:
- Monitoring the number of backing indexes (a metric/log)
- A max-age safety net (e.g., force-close executions in indexes older than 24h)

### 6. ILM policy and index template setup

ILM policy:

```json
{
  "policy": {
    "phases": {
      "hot": {
        "actions": {
          "rollover": {
            "max_age": "1h"
          }
        }
      }
    }
  }
}
```

An index template with the rollover alias configuration is needed. The `createIndexes` function in `common/create_indexes.ts` would be replaced with template+ILM bootstrap logic, run once on plugin setup.

## Edge Cases

| Scenario | Risk | Mitigation |
|----------|------|------------|
| Rollover during workflow start | Doc lands in old index, stored name points to new | Use `_index` from the index response — it's always the actual index used |
| Resume after wait step | Execution loads from alias, writes to pinned index | Works correctly — alias read finds the doc, pinned write hits the right backing index |
| Concurrent rollover + cleanup | Cleanup deletes an index still being written to | Cleanup skips the write index and only deletes indexes where all docs are terminal |
| Mapping updates | `createOrUpdateIndex` currently puts mappings on a single index | Switch to index template — mappings apply automatically to new backing indexes |
| `mget` for step executions | Currently uses single index; multi-index mget needs index per doc or alias | Use alias for mget — works transparently since `_id` is unique across the alias |

## Implementation Checklist

1. Replace hardcoded index names with rollover aliases + ILM policy
2. Add `executionsWriteIndex` / `stepExecutionsWriteIndex` fields to `EsWorkflowExecution`
3. Capture write index name from the initial `index` response
4. Thread the pinned index name through `WorkflowExecutionState` to repositories for writes
5. Keep all read paths using the alias
6. Build a cleanup job that drops fully-terminal backing indexes

## Precedent

The pattern is well-established in Elasticsearch — alerting, APM, and security indexes in Kibana use similar rollover strategies. The biggest complexity is plumbing the pinned index name through the existing repository/state layer, but the architecture already has clean separation (`WorkflowExecutionState` -> repositories) that makes this feasible.
