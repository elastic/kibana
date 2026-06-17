# OCC writes in workflows_management

Workflow documents live in a raw elasticsearch index (via `@kbn/storage-adapter`). Concurrent writers use optimistic concurrency control (OCC) so updates merge against fresh state instead of last-write-wins.

Platform primitives and bulk patterns: [`@kbn/occ` README](../../../../packages/shared/kbn-occ/README.md).

## Entry points

| Path | `OccWriter` method | Reads before write? | Retries |
|------|------------------|---------------------|---------|
| `WorkflowCrudService.updateWorkflow` → `writeWorkflowDocument` (`readModifyWrite`) | `readModifyWrite` | Yes — inside helper, per attempt | `3` (`DEFAULT_MAX_RETRIES`) |
| `ManagedWorkflowsService.installManagedWorkflow` **create** | `create` | No | Outer install loop on id collision |
| `ManagedWorkflowsService.installManagedWorkflow` **update** | `write` (optimistic OCC) | No — install pre-read supplies `(ifSeqNo, ifPrimaryTerm)` | Outer install loop on 409 |
| `disableAllWorkflows` | `bulkIndexWithOccRetry` | Per-page search only | `3` |

## `writeWorkflowDocument` params (discriminated)

```typescript
// Create (op_type: create)
{ document }

// Optimistic OCC — caller already read version metadata
{ document, ifSeqNo, ifPrimaryTerm }

// Read-modify-write — merge inside mutate
{ mutate: (existing) => merged, maxRetries?, getOptions? }
```

## When to use which path

**`readModifyWrite` (default for user updates)** when `mutate` is a **pure merge** over the document the helper just read. On conflict, `OccWriter` re-reads and runs `mutate` again.

**`write` (optimistic)** when the caller already has the document to index and version metadata from a prior read. Managed workflow **updates** use this: `installManagedWorkflowOnce` reads once, prepares the document, then writes with the pre-read version metadata. On `409`, the outer `installManagedWorkflow` loop re-reads and re-prepares.

**`create`** for managed **creates** (`op_type: create`). No retry on create conflicts inside `OccWriter`.

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
