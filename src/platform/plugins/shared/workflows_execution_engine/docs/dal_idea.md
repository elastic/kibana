# Data Access Layer (DAL) for Workflow & Step Executions

**Status:** Draft / design proposal  
**Authors:** Workflows Engine Team  
**Date:** 2026-07-08

---

## Summary

Introduce a single **`data_access_layer`** directory under `@kbn/workflows/server` that owns everything related to **where** workflow and step execution documents live in Elasticsearch: index names, mappings, initialization, read/search access, and document upserts.

The layer is intentionally storage-backend agnostic. A **`source`** parameter selects the backing store (system index today; ILM-managed index or data stream later). Callers receive narrow interfaces and never hard-code index names or ES API details.

This document describes the target design and a phased migration from today's split ownership (execution engine plugin + duplicated management queries + shared step read helpers).

---

## Problem

Execution storage concerns are scattered today:

| Concern | Current location | Issue |
|---------|------------------|-------|
| Index names | `workflows_execution_engine/common/mappings.ts`, duplicated in `workflows_management/common` | Drift risk |
| Mappings | `workflows_execution_engine/common/mappings.ts` | Not co-located with other execution storage code in `@kbn/workflows` |
| Index init | `workflows_execution_engine/common/create_indexes.ts` | Plugin-owned lifecycle for shared indices |
| Step reads (shared) | `@kbn/workflows/server/repositories/step_execution_repository.ts` | Functional helpers, index name passed in by caller |
| Step/execution writes | `workflows_execution_engine/server/repositories/*` | Concrete classes, no storage abstraction |
| UI/API reads | `workflows_management/server/api/lib/*` | Reimplements search/get against the same indices |

We need one place that answers: *"Given a storage source, how do I init, search, fetch, and upsert execution documents?"*

---

## Goals

### Phase 1 (this proposal)

- Add `@kbn/workflows/server/data_access_layer/` with:
  - Index name constants and mappings for `.workflows-executions` and `.workflows-step-executions`
  - Index initialization (`indices.exists` → `indices.create` / `indices.putMapping`)
  - **`WorkflowExecutionsDataAccess`** interface: `init`, `search`, `getById`, `bulkUpsert`
  - **`StepExecutionsDataAccess`** interface: `init`, `search`, `getByIds`, `bulkUpsert`
  - Factory functions that take `{ source, esClient, dataStreamClient?, logger? }`
- Implement **`source: 'system_index'`** only (current behavior).
- Wire execution engine plugin startup: each DAL instance calls its own **`init()`** (no combined `initExecutionStorage` helper).
- **`bulkUpsert`** request/response types mirror Elasticsearch bulk semantics but accept **one or many** documents in the same shape; each implementation chooses the underlying API (`update`, `index`, `bulk`, data stream `create`, …).

### Future (out of scope for phase 1)

- Feature flag / config to choose read and write backends independently, e.g.:
  - read from system index, write to data stream (dual-write migration)
  - ILM-managed indices with rollover policies
- Extend interfaces with specialized write operations (CAS scripts, `deleteByQuery`, etc.) behind the same `source` abstraction.
- Retire duplicated index constants and direct ES calls in `workflows_management`.
- Refactor engine repositories to delegate all persistence to DAL (today they keep domain-specific queries locally).

---

## Non-goals (phase 1)

- Moving workflow **definition** storage (`.workflows-workflows`) — stays in `WorkflowRepository`.
- Logs / trigger event **data streams** (`.workflows-execution-data-stream-logs`, `.workflows-events`) — separate repositories; may follow the same pattern later.
- Changing document shapes (`EsWorkflowExecution`, `EsWorkflowStepExecution` in `@kbn/workflows/types`).

---

## Proposed directory layout

```
src/platform/packages/shared/kbn-workflows/server/data_access_layer/
├── index.ts                              # public exports
├── types.ts                              # shared DAL types, ExecutionStorageSource
├── constants/
│   └── execution_indexes.ts              # WORKFLOWS_EXECUTIONS_INDEX, WORKFLOWS_STEP_EXECUTIONS_INDEX
├── mappings/
│   ├── workflow_executions_mappings.ts   # moved from execution_engine/common/mappings.ts
│   └── step_executions_mappings.ts
├── init/
│   └── create_or_update_index.ts         # shared low-level helper for system_index backends
├── workflow_executions/
│   ├── workflow_executions_data_access.ts           # interface (+ init owns workflow storage)
│   ├── system_index_workflow_executions_data_access.ts
│   └── create_workflow_executions_data_access.ts    # factory
└── step_executions/
    ├── step_executions_data_access.ts                 # interface (+ init owns step storage)
    ├── system_index_step_executions_data_access.ts
    └── create_step_executions_data_access.ts
```

Each concrete implementation owns **`init()`** for its backing store. There is **no** `initExecutionStorage()` that inits both indices — that would assume a shared storage backend.

**Design doc location:** this file (`workflows_execution_engine/docs/dal_idea.md`) — alongside other engine RFCs. Implementation lives in `@kbn/workflows` so both `workflows_execution_engine` and `workflows_management` can depend on it without circular plugin deps.

---

## Storage source

```typescript
/** Backing store for execution documents. Phase 1 implements only `system_index`. */
export type ExecutionStorageSource =
  | 'system_index'           // .workflows-executions / .workflows-step-executions (today)
  | 'ilm_managed_index'      // future: index template + ILM policy
  | 'data_stream';           // future: append-only data stream
```

Factories validate that required clients are present for the chosen source:

| `source` | `esClient` | `dataStreamClient` |
|----------|------------|--------------------|
| `system_index` | required | unused |
| `ilm_managed_index` | required | unused |
| `data_stream` | optional (admin ops) | required for read/write |

Phase 1 factories throw if `source !== 'system_index'`.

---

## Initialization (decided)

**Each DAL interface exposes its own `init()`** — there is no combined initializer.

Rationale: workflow executions and step executions are **independently configured** via separate factories (`createWorkflowExecutionsDataAccess` / `createStepExecutionsDataAccess`), each with its own `source`. They may point at different storage types in the future, for example:

- workflow executions → `system_index` (`.workflows-executions`)
- step executions → `data_stream` (append-only step docs)

or the reverse. A single `initExecutionStorage()` would incorrectly couple lifecycle and hide that these are two storage decisions.

**Plugin startup** creates both DAL instances (possibly with different `source` values once feature flags exist) and calls **`init()` on each**:

```typescript
await Promise.all([
  workflowExecutionsDal.init(),  // e.g. creates/updates .workflows-executions
  stepExecutionsDal.init(),     // e.g. registers data stream + component template
]);
```

`init()` is idempotent and scoped to **that** DAL's backing store only. Shared utilities (e.g. `create_or_update_index` for system indices) are implementation details — not a public combined entry point.

---

## Interfaces

### Shared search request shape

Search methods mirror the Elasticsearch **Search API** body: callers pass everything except `index` (and optionally except `type`), and the implementation injects the correct target index or data stream name.

```typescript
import type { estypes } from '@elastic/elasticsearch';
import type { EsWorkflowExecution, EsWorkflowStepExecution } from '@kbn/workflows';

/** Search body without index — DAL resolves the target. */
export type WorkflowExecutionsSearchRequest = Omit<
  estypes.SearchRequest,
  'index'
>;

export type StepExecutionsSearchRequest = Omit<
  estypes.SearchRequest,
  'index'
>;
```

This replaces ad-hoc `(query: Record<string, unknown>, size?: number)` helpers and aligns with how `workflows_management` already builds full search bodies (sort, `_source`, pagination, `track_total_hits`, etc.).

### Shared `bulkUpsert` request/response shape

Upsert is the primary **write** primitive on both interfaces. The contract is modeled after Elasticsearch **`bulk`** request/response, but callers pass **documents** — not raw `operations` arrays — and may pass **one document or many** using the same type.

Design goals:

1. **Caller simplicity:** `documents` is `Doc | Doc[]`; no separate `upsert` vs `bulkUpsert` methods.
2. **Response stability:** the response is **always bulk-shaped** (`errors`, `items[]`, `took`) with **one item per input document**, even when the implementation uses a single-doc API under the hood.
3. **Implementation freedom:** `system_index` may route 1 doc to `update` + `doc_as_upsert`, N docs to `bulk`; a future `data_stream` backend may call `dataStreamClient.create` once or in batch — callers do not branch on cardinality.
4. **ES option passthrough:** bulk-level options (`refresh`, `pipeline`, …) are forwarded when the underlying API supports them; unsupported options are ignored or rejected per implementation (documented per source).

```typescript
import type { estypes } from '@elastic/elasticsearch';
import type { EsWorkflowExecution, EsWorkflowStepExecution } from '@kbn/workflows';

/** Partial document with required id — same for single- and multi-document upserts. */
export type UpsertDocument<TDoc extends { id: string }> = Partial<TDoc> & { id: string };

/** Bulk-level options from ES Bulk API (index/operations omitted — DAL builds those). */
export type BulkUpsertRequestOptions = Pick<
  estypes.BulkRequest,
  'refresh' | 'pipeline' | 'require_alias' | 'wait_for_active_shards'
>;

/** Unified upsert request: one or many documents, same contract. */
export type BulkUpsertRequest<TDoc extends { id: string }> = BulkUpsertRequestOptions & {
  documents: UpsertDocument<TDoc> | UpsertDocument<TDoc>[];
};

/** Per-document outcome aligned with ES bulk item fields (update/index/create). */
export type BulkUpsertItemResponse = {
  id: string;
  status: number;
  result?: estypes.Result;
  error?: estypes.ErrorCause;
  _shards?: estypes.ShardStatistics;
  _seq_no?: number;
  _primary_term?: number;
  _version?: estypes.VersionNumber;
};

/** Always bulk-shaped: `items.length ===` normalized document count, input order preserved. */
export type BulkUpsertResponse = Pick<
  estypes.BulkResponse,
  'took' | 'errors' | 'ingest_took'
> & {
  items: BulkUpsertItemResponse[];
};

export type WorkflowExecutionsBulkUpsertRequest = BulkUpsertRequest<EsWorkflowExecution>;
export type StepExecutionsBulkUpsertRequest = BulkUpsertRequest<EsWorkflowStepExecution>;
```

**Validation and error handling (all implementations):**

- Normalize `documents` to a non-empty array internally; **empty array → no-op** with `{ took: 0, errors: false, items: [] }`.
- Every document must include `id`; missing id → throw **before** calling storage (fail fast, no partial calls).
- **On storage failure, `bulkUpsert` always throws** (decided for phase 1). If any document fails (`errors: true` or per-item `error`), throw an `Error` that includes failed item ids and ES error causes — same behavior as `StepExecutionRepository.bulkUpsert` and `WorkflowExecutionRepository.bulkUpdateWorkflowExecutions` today. No `throwOnError` flag; callers never receive a success response with `errors: true`.
- On full success, return `BulkUpsertResponse` with `errors: false`.

**Mapping from today's repositories:**

| Today | DAL `bulkUpsert` |
|-------|------------------|
| `StepExecutionRepository.bulkUpsert(steps[])` | `bulkUpsert({ documents: steps })` — same ES semantics (`update` + `doc_as_upsert`) |
| `WorkflowExecutionRepository.createWorkflowExecution` / `updateWorkflowExecution` | `bulkUpsert({ documents: doc })` |
| `WorkflowExecutionRepository.bulkCreateWorkflowExecutions` / `bulkUpdateWorkflowExecutions` | `bulkUpsert({ documents: docs, refresh })` |

**Workflow upsert semantics (decided):** workflow executions use the same **`bulkUpsert` + `doc_as_upsert`** path as steps for `system_index` — no separate create (`index` / bulk `create`) vs update APIs in the DAL. This means a duplicate create with the same id **merges** into the existing document instead of failing with a version conflict. **Accepted** for phase 1: all engine call sites already pass **idempotent partial documents** (full doc on first write, field-level patches on subsequent flushes). Callers must not depend on create-only failure semantics; if strict create-if-absent is ever needed, it belongs in a domain-layer guard above the DAL, not in storage.

### `WorkflowExecutionsDataAccess`

```typescript
export interface WorkflowExecutionsDataAccess {
  /** Ensure this DAL's backing store exists and is configured. Idempotent. Scoped to workflow execution storage only. */
  init(): Promise<void>;

  /**
   * Search workflow executions. Mirrors ES search API; `index` is injected by the implementation.
   * Returns the raw ES search response so callers can project to DTOs or use hits directly.
   */
  search(
    request: WorkflowExecutionsSearchRequest
  ): Promise<estypes.SearchResponse<EsWorkflowExecution>>;

  /**
   * O(1) get by document id. Returns null when missing or when `spaceId` does not match
   * (multi-tenancy guard — same behavior as WorkflowExecutionRepository today).
   */
  getById(
    workflowExecutionId: string,
    spaceId: string
  ): Promise<EsWorkflowExecution | null>;

  /**
   * Create or update one or more workflow execution documents.
   * Request/response follow BulkUpsertRequest/Response; implementation picks
   * `update`/`index`/`bulk`/data-stream API based on document count and `source`.
   * @throws on any upsert failure (see validation rules above).
   */
  bulkUpsert(
    request: WorkflowExecutionsBulkUpsertRequest
  ): Promise<BulkUpsertResponse>;
}
```

### `StepExecutionsDataAccess`

```typescript
export interface StepExecutionsDataAccess {
  /** Ensure this DAL's backing store exists and is configured. Idempotent. Scoped to step execution storage only. */
  init(): Promise<void>;

  search(
    request: StepExecutionsSearchRequest
  ): Promise<estypes.SearchResponse<EsWorkflowStepExecution>>;

  /**
   * Get step executions by id(s) via mget. Accepts one or many ids in a single call
   * (`getByIds([id])` for a single document). Returns only found documents; order follows
   * mget response, not necessarily input order. Empty `ids` → `[]`.
   * Optional `_source` includes/excludes; when `output` is explicitly included and missing
   * on the document, normalize to `null` (FAILED vs evicted distinction — see existing
   * StepExecutionRepository.getStepExecutionsByIds).
   */
  getByIds(
    stepExecutionIds: string[],
    options?: {
      sourceIncludes?: Array<keyof EsWorkflowStepExecution>;
      sourceExcludes?: Array<keyof EsWorkflowStepExecution>;
    }
  ): Promise<EsWorkflowStepExecution[]>;

  /**
   * Create or update one or more step execution documents.
   * Same BulkUpsertRequest/Response contract as workflow executions.
   * @throws on any upsert failure (see validation rules above).
   */
  bulkUpsert(
    request: StepExecutionsBulkUpsertRequest
  ): Promise<BulkUpsertResponse>;
}
```

**Note:** `getStepExecutionsByWorkflowExecution(workflowRunId, stepExecutionIds?)` (mget vs search fallback) is a **domain helper** built on top of `search` / `getByIds`, not part of the minimal interface. It can live in the same module as a standalone function used by engine and management, or be added to the interface in a follow-up if we want it first-class.

**Usage examples (single vs many — same API):**

```typescript
// Single step flush (StepIoService hot path)
await stepExecutionsDal.bulkUpsert({ documents: stepDoc, refresh: false });

// Batch persistence loop
await stepExecutionsDal.bulkUpsert({ documents: stepDocs, refresh: false });

// Workflow state flush
await workflowExecutionsDal.bulkUpsert({
  documents: { id: executionId, status, finishedAt },
  refresh: false,
});
```

---

## Factory functions

```typescript
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { IDataStreamClient } from '@kbn/data-streams';

export interface CreateWorkflowExecutionsDataAccessDeps {
  source: ExecutionStorageSource;
  esClient: ElasticsearchClient;
  /** Required when source is `data_stream`; ignored for `system_index`. */
  dataStreamClient?: IDataStreamClient;
  logger?: Logger;
}

export interface CreateStepExecutionsDataAccessDeps {
  source: ExecutionStorageSource;
  esClient: ElasticsearchClient;
  dataStreamClient?: IDataStreamClient;
  logger?: Logger;
}

export const createWorkflowExecutionsDataAccess = (
  deps: CreateWorkflowExecutionsDataAccessDeps
): WorkflowExecutionsDataAccess;

export const createStepExecutionsDataAccess = (
  deps: CreateStepExecutionsDataAccessDeps
): StepExecutionsDataAccess;
```

**Plugin wiring (execution engine, phase 1):**

```typescript
const workflowExecutionsDal = createWorkflowExecutionsDataAccess({
  source: 'system_index',
  esClient: coreStart.elasticsearch.client.asInternalUser,
  logger,
});

const stepExecutionsDal = createStepExecutionsDataAccess({
  source: 'system_index', // future: may differ, e.g. 'data_stream'
  esClient: coreStart.elasticsearch.client.asInternalUser,
  // dataStreamClient: ... when source is 'data_stream'
  logger,
});

await Promise.all([
  workflowExecutionsDal.init(),
  stepExecutionsDal.init(),
]);
```

Each `init()` prepares **only** the storage for that factory's `source`. Phase 1 both use `system_index` and call `create_or_update_index` with their respective mappings; a future data-stream backend's `init()` would register templates / ensure the data stream instead.

---

## `system_index` implementation sketch

### Initialization (`system_index` backend)

Move low-level logic from `workflows_execution_engine/common/create_index.ts`. Each **`system_index_*_data_access`** class implements `init()` for **its** index only:

| DAL | `init()` ensures |
|-----|------------------|
| `SystemIndexWorkflowExecutionsDataAccess` | `.workflows-executions` exists + mappings |
| `SystemIndexStepExecutionsDataAccess` | `.workflows-step-executions` exists + mappings |

Steps (per index, inside that DAL's `init()`):

1. `indices.exists`
2. If missing → `indices.create` with mappings from `data_access_layer/mappings/*`
3. If present → best-effort `indices.putMapping` for additive mapping updates

Replaces today's `createIndexes()` which inits both indices in one call — plugin now calls two separate `init()` methods instead.

Index names (unchanged):

| Constant | Value |
|----------|-------|
| `WORKFLOWS_EXECUTIONS_INDEX` | `.workflows-executions` |
| `WORKFLOWS_STEP_EXECUTIONS_INDEX` | `.workflows-step-executions` |

Mappings move verbatim from `workflows_execution_engine/common/mappings.ts` (including shared `TOKEN_USAGE_MAPPING`, `dynamic: false`, nested `stepUsage`, HITL fields on steps, etc.).

**Document shape vs mappings (decided):** large runtime payload fields are **not indexed** on either workflow or step execution documents. With `dynamic: false`, only explicitly mapped fields are queryable; everything else is stored in **`_source` only** and loaded via `get` / `mget` / search `_source` projection — never used in ES query clauses.

| Stored in `_source` only (examples) | Explicitly mapped (queryable) |
|-------------------------------------|-------------------------------|
| **Workflow:** `context`, `scopeStack`, `yaml`, `error`, `stepExecutionIds`, `metadata`, … | `spaceId`, `workflowId`, `status`, timestamps, `triggeredBy`, `usage`, `stepUsage`, … |
| **Step:** `input`, `output`, `scopeStack`, `state`, `error`, … | `spaceId`, `workflowRunId`, `stepId`, `stepType`, `status`, timestamps, `hitl.*`, `usage`, … |

`workflowDefinition` is a special case: present in `_source` but mapped with `enabled: false` so it is stored yet not indexed.

This is intentional today and **unchanged** under ILM or data-stream backends — payload fields stay `_source`-only; migration RFCs focus on storage lifecycle (rollover, append-only writes, dual-write), not on indexing `input` / `output` / `scopeStack`.

### Search

```typescript
// system_index_workflow_executions_data_access.ts
async search(request: WorkflowExecutionsSearchRequest) {
  return this.esClient.search<EsWorkflowExecution>({
    index: WORKFLOWS_EXECUTIONS_INDEX,
    ...request,
  });
}
```

Callers own query construction, sort, pagination, and `_source` projection — same as today in management lib functions.

### Get by id(s)

- **Workflow:** `getById` → `esClient.get` + `spaceId` check (see `WorkflowExecutionRepository.getWorkflowExecutionById`).
- **Step:** `getByIds` → `esClient.mget` + output normalization when applicable. Single-id lookups use `getByIds([id])`; callers check the result array.

### `bulkUpsert` (system_index)

Implementations normalize `documents` to an array, then choose the storage API:

| Document count | Preferred API | Notes |
|----------------|---------------|-------|
| 0 | no-op | Return empty bulk-shaped response |
| 1 | `esClient.update` with `doc_as_upsert: true` | Avoid bulk overhead on hot single-doc flushes |
| 2+ | `esClient.bulk` with `update` + `doc_as_upsert: true` per doc | Same as `StepExecutionRepository.bulkUpsert` today |

Map ES single-doc `UpdateResponse` / bulk item into `BulkUpsertItemResponse`. If any item failed, **throw** before returning; otherwise return `BulkUpsertResponse` with `errors: false`.

```typescript
// system_index_step_executions_data_access.ts (conceptual)
async bulkUpsert(request: StepExecutionsBulkUpsertRequest): Promise<BulkUpsertResponse> {
  const documents = normalizeDocuments(request.documents);
  if (documents.length === 0) {
    return { took: 0, errors: false, items: [] };
  }

  let response: BulkUpsertResponse;

  if (documents.length === 1) {
    // ... esClient.update with doc_as_upsert
    response = toBulkUpsertResponseFromUpdate(/* ... */, documents[0].id);
  } else {
    // ... esClient.bulk
    response = toBulkUpsertResponseFromBulk(/* ... */, documents);
  }

  if (response.errors) {
    throwBulkUpsertError(response); // includes failed ids + ES error causes
  }
  return response;
}
```

**Future `data_stream` implementation:** may ignore `doc_as_upsert` semantics and append new events via `dataStreamClient.create({ documents })` for both single- and multi-document requests; still returns `BulkUpsertResponse` on success and **throws** on any partial failure. Large payload fields remain `_source`-only (same as today); backend choice affects write/read mechanics, not whether `input` / `output` / `scopeStack` are indexed.

---

## Relationship to existing code

### Keep in execution engine (phase 1)

`WorkflowExecutionRepository` and `StepExecutionRepository` remain **facades** for engine-specific operations (`hasRunningExecution`, CAS promote, concurrency queries, etc.). Simple persistence delegates to DAL:

- `StepExecutionRepository.bulkUpsert` → `await stepExecutionsDal.bulkUpsert({ documents })` (DAL throws on failure)
- `WorkflowExecutionRepository.updateWorkflowExecution` / `bulkUpdateWorkflowExecutions` / creates → `await workflowExecutionsDal.bulkUpsert(...)` (same)

Domain queries that embed Painless scripts or specialized search shapes stay on the repository until a later extraction.

### Replace / consolidate

| Current | Action |
|---------|--------|
| `execution_engine/common/mappings.ts` (execution indices) | Re-export from DAL; deprecate local definitions |
| `execution_engine/common/create_indexes.ts` | Remove; plugin calls each DAL's `init()` |
| `@kbn/workflows/server/repositories/step_execution_repository.ts` | Reimplement using `StepExecutionsDataAccess`; keep exported function signatures for backward compatibility during migration |
| `workflows_management/common` execution index constants | Import from DAL |
| `workflows_management/server/api/lib/get_workflow_execution.ts`, `search_*` | Eventually call DAL instead of raw `esClient` + local index strings |

### Unchanged

- `WorkflowRepository` (definitions index)
- Logs / trigger events data stream repos
- Document types in `@kbn/workflows/types/v1.ts`

---

## Future: feature flag for read/write routing

When we add alternate backends, split configuration conceptually:

```typescript
interface ExecutionStorageConfig {
  /** Where new documents are written */
  writeSource: ExecutionStorageSource;
  /** Where reads are served (may differ during migration) */
  readSource: ExecutionStorageSource;
}
```

Possible migration patterns:

1. **Dual write:** `writeSource` writes to both system index and data stream; `readSource` stays on system index until backfill completes.
2. **ILM rollover:** `writeSource: 'ilm_managed_index'` with alias; reads follow the alias.
3. **Read fallback:** search/get tries `readSource` first, falls back to legacy index if flag enabled.

Factories would evolve to:

```typescript
createWorkflowExecutionsDataAccess({
  source: config.readSource,  // or split read/write factories
  esClient,
  dataStreamClient,
});
```

Phase 1 only needs the `source` parameter on the factory; config wiring comes later.

---

## Public exports

Add to `@kbn/workflows/server/index.ts` (and optionally a dedicated `@kbn/workflows/server/data_access_layer` subpath if we want narrower imports):

```typescript
export {
  WORKFLOWS_EXECUTIONS_INDEX,
  WORKFLOWS_STEP_EXECUTIONS_INDEX,
} from './data_access_layer/constants/execution_indexes';

export type {
  ExecutionStorageSource,
  WorkflowExecutionsDataAccess,
  StepExecutionsDataAccess,
  WorkflowExecutionsSearchRequest,
  StepExecutionsSearchRequest,
  BulkUpsertRequest,
  BulkUpsertResponse,
  BulkUpsertItemResponse,
  UpsertDocument,
  WorkflowExecutionsBulkUpsertRequest,
  StepExecutionsBulkUpsertRequest,
} from './data_access_layer/types';

export { createWorkflowExecutionsDataAccess } from './data_access_layer/workflow_executions/create_workflow_executions_data_access';
export { createStepExecutionsDataAccess } from './data_access_layer/step_executions/create_step_executions_data_access';
```

Mappings are exported for tests and tooling that assert mapping shape; not required for typical plugin consumers.

---

## Migration plan

| Step | Work | Risk |
|------|------|------|
| 1 | Add DAL module with `system_index` impl; move mappings + init helpers | Low — additive |
| 2 | Execution engine plugin: separate `workflowExecutionsDal.init()` + `stepExecutionsDal.init()` at startup | Low — same ES calls, decoupled lifecycle |
| 3 | Implement `bulkUpsert` (single-doc `update` vs multi-doc `bulk` routing) | Medium — parity tests with existing repo tests |
| 4 | Engine repos: delegate upserts/reads to DAL | Medium |
| 5 | Re-export index constants from DAL; thin re-exports in execution_engine `common` | Low — compat shims |
| 6 | Management: import index names from DAL; query lib → DAL `search` / `getById` / `getByIds` | Medium |
| 7 | Alternate storage backends + read/write feature flag | High — needs rollout design |

Each step should be an independently reviewable PR.

---

## Testing

- **Unit:** mock `ElasticsearchClient`; assert correct index name, mapping payload on `init`, search body passthrough, `spaceId` guard on workflow get.
- **`bulkUpsert` routing:** 0 / 1 / N documents call the expected ES API (`bulk` not invoked for single-doc path unless configured otherwise); success response is bulk-shaped with ordered `items`.
- **`bulkUpsert` errors:** assert DAL throws when ES returns item errors; assert successful path returns `errors: false`.
- **Integration:** reuse execution engine integration test harness; verify init is idempotent and search/get/upsert match current repository behavior.
- **Mapping parity:** snapshot or structural test that DAL mappings match previous `mappings.ts` exports (avoid accidental drops of **queryable** mapped fields; `_source`-only payload fields are not in mappings by design).

---

## References

- Current mappings: `workflows_execution_engine/common/mappings.ts`
- Current init: `workflows_execution_engine/common/create_indexes.ts`
- Write repos: `workflows_execution_engine/server/repositories/workflow_execution_repository.ts`, `step_execution_repository.ts`
- Shared step reads: `@kbn/workflows/server/repositories/step_execution_repository.ts`
- Management reads: `workflows_management/server/api/lib/search_workflow_executions.ts`, `search_step_executions.ts`, `get_workflow_execution.ts`
