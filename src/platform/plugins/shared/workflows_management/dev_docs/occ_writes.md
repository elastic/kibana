# OCC writes in workflows_management

Workflow documents live in a raw elasticsearch index (via `@kbn/storage-adapter`). Concurrent writers use optimistic concurrency control (OCC) so updates merge against fresh state instead of last-write-wins.

Platform primitives and bulk patterns: [`@kbn/occ` README](../../../../packages/shared/kbn-occ/README.md).

## Entry points

| Path | Mechanism | Default retries |
|------|-----------|-----------------|
| `WorkflowCrudService.updateWorkflow` → `writeWorkflowDocument` | `OccWriter` (`workflow_occ_writer.ts`) | `3` (`DEFAULT_MAX_RETRIES`) |
| `ManagedWorkflowsService.installManagedWorkflow` → `writeWorkflowDocument` | `OccWriter` with `maxRetries: 0` on **updates**; outer install loop retries | `0` on update; create uses `create: true` (no OCC retry) |
| `disableAllWorkflows` | `bulkIndexWithOccRetry` (`bulk_occ_index.ts`) | `3` |

## When to use `maxRetries: 0` vs default

**Use default (`maxRetries` omitted → 3)** when `mutate` is a **pure merge** over the document `OccWriter` just read. On conflict, `OccWriter` re-reads and runs `mutate` again — that is the correct retry semantics.

Example: `updateWorkflow` applies YAML/field patches inside `mutate` against `existingSource` from each fresh read.

**Use `maxRetries: 0`** when the caller already built a **full replacement document** outside `mutate` and passes `mutate: () => document`. An inner OCC retry would re-read but still apply the same stale snapshot, masking the conflict instead of reconciling.

Managed workflow **updates** do this: `installManagedWorkflowOnce` prepares the document from the managed definition + existing state, then writes with `maxRetries: 0`. On `409`, `installManagedWorkflow` catches the conflict and re-runs the whole install (re-read, re-prepare, write). See `managed_workflows_service.ts`.

Managed **creates** use `create: true`; `OccWriter` does not retry create conflicts regardless of `maxRetries`.

## Bulk writes and conflict refresh

Multi-document paths do not use `OccWriter` per id. `bulkIndexWithOccRetry` bulk-indexes with per-item `if_seq_no` / `if_primary_term`, then retries only `409` items.

Conflict refresh batches a single `search` with an `ids` query (not per-doc `get` / raw `mget`) so `@kbn/storage-adapter` routing and source migration stay correct:

```typescript
await client.search({
  query: { ids: { values: conflictIds } },
  seq_no_primary_term: true,
  size: conflictIds.length,
  track_total_hits: false,
});
```
