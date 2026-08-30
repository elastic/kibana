# Implementation Plan: Conditional `updater` callback in `bulk()`

## Goal

Extend `BulkItem` with an optional `updater` callback so callers can express
conditional read-modify-write logic inside a single `bulk` call, without Painless
scripts. The existing conflict-retry loop handles retries; the callback is
re-invoked on each attempt with the freshest document source.

---

## 1. Type changes — `types.ts`

### 1a. Split `BulkItem` into a discriminated union

Replace the single interface with two members joined by a union. The discriminant
is the presence/absence of `updater` (enforced via `never` on the plain branch).

```ts
// Plain create/update/upsert — no conditional logic.
export interface BulkPlainItem<TDocument extends { id: string }> {
  operation: 'create' | 'update' | 'upsert';
  document: Partial<TDocument> & { id: string };
  seqNo?: number;
  primaryTerm?: number;
  retryOnConflict?: number;
  sourceFields?: never;
  updater?: never;
}

// Conditional update — both sourceFields and updater must be present.
// K is inferred from the sourceFields literal, giving current: Pick<TDocument, K>.
export interface BulkUpdaterItem<
  TDocument extends { id: string },
  K extends keyof TDocument & string = keyof TDocument & string
> {
  operation: 'update';
  document: { id: string };
  retryOnConflict?: number;
  sourceFields: readonly K[];
  updater: (current: Pick<TDocument, K>) => Partial<TDocument> | 'noop';
}

export type BulkItem<TDocument extends { id: string }> =
  | BulkPlainItem<TDocument>
  | BulkUpdaterItem<TDocument>;
```

**Discriminated union guarantee**: because `BulkPlainItem` marks `sourceFields`
and `updater` as `never`, TypeScript rejects any object that provides one without
the other. Narrowing at call sites uses `'updater' in item`.

**`Pick<TDocument, K>` inference**: `K` is inferred from the `sourceFields` array
literal. Use `as const` to produce a tuple type and get the tightest inference:

```ts
{
  sourceFields: ['status', 'spaceId'] as const,
  //            ↑ infers K = 'status' | 'spaceId'
  updater: (current) => {
    // current: Pick<EsWorkflowExecution, 'status' | 'spaceId'>
    if (current.status !== ExecutionStatus.QUEUED) return 'noop';
    return { status: ExecutionStatus.PENDING };
  },
}
```

When `sourceFields` is assigned as a mutable array (`string[]`) or at the
`BulkItem<TDocument>` union level (where `K` is already widened to
`keyof TDocument & string`), `current` falls back to the full document type — still
correct, just not as narrow. A helper factory function can preserve inference at
array boundaries:

```ts
const updaterItem = <TDocument extends { id: string }, K extends keyof TDocument & string>(
  item: BulkUpdaterItem<TDocument, K>
): BulkUpdaterItem<TDocument, K> => item;

// Usage:
const item = updaterItem<EsWorkflowExecution, 'status' | 'spaceId'>({
  operation: 'update',
  document: { id: workflowExecutionId },
  sourceFields: ['status', 'spaceId'],
  retryOnConflict: 3,
  updater: (current) => { ... },
});
```

- `sourceFields` limits the mget projection; avoids fetching the whole document.
- `updater` receives a `Pick` of the current document and returns a patch or `'noop'`.
- `'noop'` resolves the item immediately with `result: 'noop'` — not an error.

### 1b. Extend `BulkItemResponse`

Add a `result` field so callers can distinguish noop from a successful write:

```ts
export type BulkItemResult = 'created' | 'updated' | 'noop';

export interface BulkItemResponse extends DocumentVersionFields {
  id: string;
  error?: estypes.ErrorCause;
  result?: BulkItemResult;
}
```

`BulkItemResult` is a sibling of `ScriptUpdateResult` — both live in `types.ts`.
Note: `index` is already on `DocumentVersionFields`, so it is not redeclared here
(matching the existing `BulkItemResponse` shape).

---

## 2. `lib/shared_bulk.ts`

No new behavior needed. Surface `result` from the ES response item alongside
the existing `seqNo`/`primaryTerm` fields:

```diff
 items.push({
   id: result._id,
   error: result.error,
   index: result._index,
   seqNo: result._seq_no,
   primaryTerm: result._primary_term,
+  result: result.result as BulkItemResult | undefined,
 });
```

`result.result` is `estypes.Result` (`'created' | 'updated' | 'deleted' | 'not_found' | 'noop'`);
the cast narrows it to the subset meaningful to callers.

`SharedBulkItem` now extends `BulkPlainItem` instead of `BulkItem`:

```ts
export interface SharedBulkItem<TExecution extends { id: string }>
  extends BulkPlainItem<TExecution> {
  index?: string;
}
```

Updater items are fully resolved into plain `update` items before reaching
`sharedBulk`, so the function stays unaware of callbacks.

---

## 3. `implementations/data_stream/document_version_manager.ts`

**No changes.** Updater items bypass the version manager entirely (see section 4).

---

## 4. `lib/execute_updater_bulk.ts` (new shared helper)

Shared retry loop used by both `DataStreamDataClient` and `PlainIndexDataClient`.
Lives in `lib/` alongside `shared_bulk.ts`.

```ts
export interface UpdaterQueueItem<TExecution extends { id: string }> {
  item: BulkUpdaterItem<TExecution>;
  originalIndex: number;
  remainingRetries: number;
}

export interface ExecuteUpdaterBulkResult {
  results: Array<{ originalIndex: number; response: BulkItemResponse }>;
  hasErrors: boolean;
}

export const executeUpdaterBulk = async <TExecution extends { id: string }>(
  updaterItems: Array<UpdaterQueueItem<TExecution>>,
  deps: {
    esClient: ElasticsearchClient;
    logger: Logger;
    refresh?: boolean | 'wait_for';
    getByIds: (
      ids: string[],
      options?: GetExecutionsByIdsOptions<TExecution>
    ) => Promise<GetExecutionsByIdsResponse<TExecution>>;
    onVersionWritten?: (
      id: string,
      version: { index: string; seqNo: number; primaryTerm: number }
    ) => void;
  }
): Promise<ExecuteUpdaterBulkResult>
```

- `getByIds` is passed in — each client supplies its own bound method.
- `onVersionWritten` is optional — data stream passes `versionManager.setVersion`,
  plain index omits it.
- Returns indexed results; caller merges them into its `result[]` by `originalIndex`.

### 4a. Loop body

```ts
const pending = [...updaterItems];

while (pending.length > 0) {
  const batch = pending.splice(0);
  const ids = batch.map((ri) => ri.item.document.id);

  // Union all sourceFields across the batch — items can request different fields.
  // Always include 'id' so foundById can be keyed by document.id from _source.
  const allSourceFields = [
    'id',
    ...new Set(batch.flatMap((ri) => ri.item.sourceFields)),
  ] as Array<Extract<keyof TExecution, string>>;

  const { items: found } = await deps.getByIds(ids, { sourceIncludes: allSourceFields });

  const foundById = new Map(found.map((f) => [f.document.id, f]));

  const sendable: Array<SharedBulkItem<TExecution>> = [];
  const sendableIndex: number[] = [];

  for (let i = 0; i < batch.length; i++) {
    const ri = batch[i];
    const { id } = ri.item.document;
    const fetched = foundById.get(id);

    if (!fetched || fetched.seqNo === undefined || fetched.primaryTerm === undefined) {
      results.push({ originalIndex: ri.originalIndex, response: { id, index: '', error: { ... } } });
      hasErrors = true;
    } else {
      const { updater } = ri.item;
      const patch = updater(fetched.document as Pick<TExecution, keyof TExecution & string>);

      if (patch === 'noop') {
        results.push({ originalIndex: ri.originalIndex, response: { id, index: fetched.index, result: 'noop' } });
      } else {
        sendable.push({
          operation: 'update',
          document: { ...(patch as Partial<TExecution>), id },
          index: fetched.index,
          seqNo: fetched.seqNo,
          primaryTerm: fetched.primaryTerm,
        });
        sendableIndex.push(i);
      }
    }
  }

  if (sendable.length > 0) {
    const esResponse = await sharedBulk(deps.esClient, { refresh: deps.refresh, items: sendable }, deps.logger);

    esResponse.items.forEach((responseItem, idx) => {
      const ri = batch[sendableIndex[idx]];
      const isConflict = responseItem.error?.type === 'version_conflict_engine_exception';

      if (isConflict && ri.remainingRetries > 0) {
        pending.push({ ...ri, remainingRetries: ri.remainingRetries - 1 });
      } else {
        if (responseItem.seqNo !== undefined && responseItem.primaryTerm !== undefined && deps.onVersionWritten) {
          deps.onVersionWritten(responseItem.id, { index: responseItem.index, seqNo: responseItem.seqNo, primaryTerm: responseItem.primaryTerm });
        }
        results.push({ originalIndex: ri.originalIndex, response: responseItem });
        hasErrors = hasErrors || !!responseItem.error;
      }
    });
  }
}
```

On conflict retry, `getByIds` is called again — the cache still has the correct
index, so mget goes to the right backing index and returns fresh seqNo + source.
`updater` is re-invoked with the new source. The loop is fully self-contained;
no `fetchFreshVersions` flag needed.

### 4b. Sequential loop ordering

The updater loop runs to completion before the plain-item loop starts. If a
request mixes both kinds, plain items wait for all updater retries to settle.
This is acceptable — callers are expected to send one or the other, not both.
The `result[]` array is keyed by `originalIndex` so the final `BulkResponse`
preserves the caller's item order regardless.

---

## 5. `implementations/data_stream/data_stream_data_client.ts`

### 5a. Split queue in `bulk()`

```ts
const updaterQueue: Array<UpdaterQueueItem<TExecution>> = [];
const queue: RetryableItem[] = [];

for (let i = 0; i < itemsWithTimestamp.length; i++) {
  const item = itemsWithTimestamp[i];
  if ('updater' in item && item.updater) {
    updaterQueue.push({
      item: item as BulkUpdaterItem<TExecution>,
      originalIndex: i,
      remainingRetries: item.retryOnConflict ?? 0,
    });
  } else {
    queue.push({
      item: item as SharedBulkItem<TExecution>,
      originalIndex: i,
      remainingRetries: item.retryOnConflict ?? 0,
    });
  }
}
```

### 5b. Run updater loop first

```ts
if (updaterQueue.length > 0) {
  const { results: updaterResults, hasErrors: updaterHasErrors } = await executeUpdaterBulk(
    updaterQueue,
    {
      esClient: this.deps.esClient,
      logger: this.deps.logger,
      refresh: request.refresh,
      getByIds: this.getByIds.bind(this),
      onVersionWritten: (id, version) => this.deps.versionManager.setVersion(id, version),
    }
  );
  updaterResults.forEach(({ originalIndex, response }) => {
    result[originalIndex] = response;
  });
  hasErrors = hasErrors || updaterHasErrors;
}
```

### 5c. Skip `getMeta()` when there are no plain items

```ts
const writeIndex =
  queue.length > 0
    ? (await this.deps.versionManager.getMeta()).backingIndexes.at(-1)
    : undefined;
```

### 5d. `assignTimestampToItems` — skip updater items

```ts
return items.map((item) => {
  // Updater items carry only { id } in document — no date field to derive from.
  if ('updater' in item) {
    return item;
  }
  const timestampValue = item.document[this.deps.dateField];
  // ...
});
```

### 5e. `resolveBulkItemVersions` — narrow to `BulkPlainItem[]`

Change signature from `BulkItem<TExecution>[]` to `BulkPlainItem<TExecution>[]`.
Only plain items reach this method after the split. No logic changes inside.

---

## 6. `implementations/plain_index/plain_index_data_client.ts`

Same split pattern, no `onVersionWritten`:

```ts
if (updaterQueue.length > 0) {
  const { results: updaterResults, hasErrors: updaterHasErrors } = await executeUpdaterBulk(
    updaterQueue,
    {
      esClient: this.deps.esClient,
      logger: this.deps.logger,
      refresh: request.refresh,
      getByIds: this.getByIds.bind(this),
    }
  );
  updaterResults.forEach(({ originalIndex, response }) => {
    result[originalIndex] = response;
  });
  hasErrors = hasErrors || updaterHasErrors;
}

if (plainItems.length > 0) {
  const plainResponse = await sharedBulk(
    this.deps.esClient,
    { ...request, items: plainItems.map(({ item }) => ({ ...item, index: this.deps.indexName })) },
    this.deps.logger
  );
  plainItems.forEach(({ originalIndex }, idx) => {
    result[originalIndex] = plainResponse.items[idx];
  });
  hasErrors = hasErrors || plainResponse.errors;
}
```

`scriptUpdate` is **kept** — it remains available for callers that genuinely need
Painless (arithmetic, array ops).

---

## 7. Implementation order

| Step | File | What changes |
|------|------|--------------|
| 1 | `types.ts` | Split `BulkItem` into discriminated union; add `BulkItemResult`; add `result` to `BulkItemResponse` |
| 2 | `lib/shared_bulk.ts` | `SharedBulkItem` extends `BulkPlainItem`; surface `result` from ES response |
| 3 | `lib/execute_updater_bulk.ts` | New shared retry loop |
| 4 | `data_stream_data_client.ts` | Split queue; call `executeUpdaterBulk`; guard `getMeta()`; fix `assignTimestampToItems` and `resolveBulkItemVersions` |
| 5 | `plain_index_data_client.ts` | Split items; call `executeUpdaterBulk` for updater items; `sharedBulk` for plain items |
