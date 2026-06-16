# @kbn/occ

Optimistic concurrency control (OCC) for Elasticsearch index documents.

Domains that store entities in normal ES indices inject `get` and `index` functions. `OccWriter` performs read → `mutate` → write with `if_seq_no` / `if_primary_term`, retrying on `409` conflicts.

## When to use

Use `@kbn/occ` when you store data in a **raw ES index**, perform **read–modify–write on one `_id`**, and **concurrent writers** could cause lost updates if you index blindly.

### Example: user update races with a background sync

A user saves a workflow while a managed-template install updates the same document. Without OCC, whichever write lands last silently drops the other change.

```typescript
import { OccWriter } from '@kbn/occ';

const writer = new OccWriter<WorkflowProperties>({
  get: async (id) => {
    const hit = await storageClient.search({
      query: { term: { _id: id } },
      seq_no_primary_term: true,
      size: 1,
    });
    const doc = hit.hits.hits[0];
    if (!doc?._source) return null;
    return {
      id,
      source: doc._source as WorkflowProperties,
      occ: { seqNo: doc._seq_no!, primaryTerm: doc._primary_term! },
    };
  },
  index: ({ id, document, ifSeqNo, ifPrimaryTerm }) =>
    storageClient.index({
      id,
      document,
      if_seq_no: ifSeqNo,
      if_primary_term: ifPrimaryTerm,
      refresh: true,
    }),
});

// Merge runs inside mutate so retries re-read fresh state.
await writer.write({
  id: workflowId,
  mutate: (existing) => ({
    ...existing!,
    yaml: requestBody.yaml,
    lastUpdatedBy: user,
    updated_at: new Date().toISOString(),
  }),
});
```

### Example: thin factory over your storage service

Keep ES details in one place; call sites stay domain-focused (see `workflow_occ_writer.ts`).

```typescript
export const createWorkflowOccWriter = ({ crudService, spaceId, logger }) =>
  new OccWriter<WorkflowProperties>({
    get: async (id) => {
      const doc = await crudService.getWorkflowDocumentWithVersion(id, spaceId);
      return doc ? { id, source: doc.source, occ: { seqNo: doc.seqNo, primaryTerm: doc.primaryTerm } } : null;
    },
    index: ({ id, document, create, ifSeqNo, ifPrimaryTerm }) =>
      crudService.indexWorkflowDocument(id, document, { create, ifSeqNo, ifPrimaryTerm }),
    logger,
  });

await createWorkflowOccWriter({ crudService, spaceId, logger }).write({
  id,
  mutate: (existing) => mergeWorkflowUpdate(existing!, patch),
});
```

## When not to use

### Saved Objects — OCC is built in

Dashboards, rules, and other SO-backed types should use the SO client, not `@kbn/occ`.

```typescript
// ✅ Saved Objects
await savedObjectsClient.update('dashboard', id, { title: 'New title' }, {
  version: existing.version,       // optimistic concurrency
  retryOnConflict: 3,
});

// ❌ Don't wrap SO storage in OccWriter
```

### Append-only records — no prior state to protect

Execution logs, audit events, and metrics are written once; there is nothing to merge.

```typescript
// ✅ Append-only: direct index, no read
await executionStorageClient.index({
  id: executionId,
  document: { workflowId, status: 'completed', finishedAt: now },
});

// ❌ OccWriter adds a pointless read before every append
```

### Last-write-wins is acceptable

Ephemeral status snapshots do not need merge semantics.

```typescript
// ✅ Overwrite the whole doc — fine for heartbeats / poller state
await statusClient.index({
  id: nodeId,
  document: { lastSeenAt: Date.now(), healthy: true },
});
```

### Bulk or multi-document writes

`OccWriter.write()` handles **one `_id`**. For bulk you still need OCC per document — choose based on batch size and how much merge logic you have.

#### Option A — loop `OccWriter` (simplest)

Best for **small/medium** batches or when you already have a factory wired. Each id gets the full read → mutate → index → retry loop.

```typescript
// ✅ Correct OCC; one ES round-trip per id (plus retries on conflict)
await pMap(workflowIds, async (id) =>
  writer.write({
    id,
    mutate: (existing) => ({
      ...existing!,
      enabled: false,
      yaml: updateWorkflowYamlFields(existing!.yaml, { enabled: false }),
    }),
  }),
  { concurrency: 10 }
);

// ❌ Bulk without if_seq_no — fast but last-write-wins per doc
```

#### Option B — bulk with per-item OCC + retry conflicts (larger batches)

Best for **paginated bulk** (e.g. disable-all). ES supports `if_seq_no` / `if_primary_term` on each bulk action line. Orchestrate retries at the domain layer (see alerting `resolveAlertConflicts`).

```typescript
// 1. Read a page with OCC metadata
const hits = await client.search({
  query: { term: { enabled: true } },
  seq_no_primary_term: true,
  size: 1000,
});

// 2. Mutate in memory, bulk index with per-item OCC
const operations = hits.hits.hits.map((hit) => ({
  index: {
    _id: hit._id!,
    if_seq_no: hit._seq_no,
    if_primary_term: hit._primary_term,
    document: {
      ...(hit._source as WorkflowProperties),
      enabled: false,
      yaml: patchYaml(hit._source!.yaml, { enabled: false }),
    },
  },
}));

let bulkResponse = await client.bulk({ operations, refresh: true });

// 3. Retry only 409 items: mget fresh seq_no (raw ES), re-mutate, bulk again
const conflictIds = bulkResponse.items
  .filter((item) => item.index?.status === 409)
  .map((item) => item.index!._id!);

if (conflictIds.length > 0) {
  const fresh = await client.mget({ ids: conflictIds, seq_no_primary_term: true });
  // rebuild operations from fresh docs + same mutate, bulk retry (cap attempts)
}
```

**Storage-adapter consumers:** batch conflict refreshes via `search({ query: { ids: { values: conflictIds } }, seq_no_primary_term: true, size: conflictIds.length })` instead of `mget` — see `bulk_occ_index.ts` in workflows_management.

**Rule of thumb:** reuse `OccWriter` when the set is small or conflicts are rare; use **bulk + conflict subset retry** when you process hundreds/thousands per request. `@kbn/occ` does not ship a bulk helper yet — both patterns compose the same primitives (`get` with `seq_no_primary_term`, `index` with `if_seq_no` / `if_primary_term`).

```typescript
// ❌ Bulk update without OCC — only when lost updates are acceptable
await esClient.bulk({
  operations: workflowIds.flatMap((id) => [
    { update: { _id: id } },
    { doc: { enabled: false } },
  ]),
});
```

### Create races — `create: true` does not retry on 409

Use `op_type: create` for “must not exist”, but handle TOCTOU separately (e.g. resolve a new id and retry).

```typescript
// create path: single attempt; 409 means id already exists (not if_seq_no OCC)
await writer.write({
  id: candidateId,
  create: true,
  mutate: () => buildNewWorkflowDocument(),
});

// For id-collision races, catch OccConflictError at the call site — not retried inside OccWriter
```

### Scripted partial updates — no full-document merge in app code

When you only increment a counter or set one field, ES `update` may be simpler.

```typescript
await esClient.update({
  id: taskId,
  script: {
    source: 'ctx._source.runCount += 1',
  },
});
```

## Design notes

- On conflict, the **entire** `mutate` runs again against a fresh read — keep `mutate` pure with respect to the passed `existing` source.
- After retries are exhausted, `OccConflictError` (409) is thrown; map it to your domain error at the call site if needed.
- Use `isOccConflictError` after `OccWriter` (strict `instanceof`). Use `isElasticsearchWriteConflict` for raw ES/client errors before wrapping.
- Domain logic (validation, version counters, history logging) stays outside this package.

## Usage

```typescript
import { OccWriter } from '@kbn/occ';

const writer = new OccWriter<MyDocument>({
  get: async (id) => {
    const hit = await client.get({ id, seq_no_primary_term: true });
    if (!hit._source) return null;
    return {
      id,
      source: hit._source,
      occ: { seqNo: hit._seq_no!, primaryTerm: hit._primary_term! },
    };
  },
  index: async ({ id, document, create, ifSeqNo, ifPrimaryTerm }) => {
    const response = await client.index({
      id,
      document,
      ...(create ? { op_type: 'create' } : {}),
      ...(ifSeqNo != null && ifPrimaryTerm != null
        ? { if_seq_no: ifSeqNo, if_primary_term: ifPrimaryTerm }
        : {}),
    });
    return { seqNo: response._seq_no, primaryTerm: response._primary_term };
  },
});

await writer.write({
  id: 'my-id',
  mutate: (existing) => ({
    ...existing!,
    updated_at: new Date().toISOString(),
  }),
});
```
