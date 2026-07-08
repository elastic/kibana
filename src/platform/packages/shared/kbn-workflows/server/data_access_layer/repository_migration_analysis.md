# Migration Analysis: Execution Engine Repositories → DAL

**Status:** Analysis — DAL migration readiness complete (2026-07-08)  
**Date:** 2026-07-08  
**Scope:** `workflows_execution_engine/server/repositories/*` → `@kbn/workflows/server/data_access_layer`

Related design doc: `workflows_execution_engine/docs/dal_idea.md`

---

## DAL readiness (completed)

The following DAL gaps are **closed** and unblock engine/management migration PRs:

| Item | Status |
|------|--------|
| `bulkUpsert({ documents, refresh?, … })` with ES option passthrough | Done — `BulkUpsertRequest` / `BulkUpsertRequestOptions` in `types.ts`; wired through `executeIndexBulkUpsert` |
| `getStepExecutionsByWorkflowExecution` domain helper | Done — moved via `git mv` to `data_access_layer/lib/get_step_executions_by_workflow_execution.ts`; uses `StepExecutionsDataAccess` (`getByIds` + `search`) |
| Legacy `getStepExecutionsByIds(esClient, index, …)` | Removed from `@kbn/workflows/server` exports |
| Mappings/constants parity with engine | Verified — index names identical; mapping `properties` structurally equivalent (DAL extracts `TOKEN_USAGE_MAPPING` to shared file; engine inline comments differ only) |

**Still repo-layer (not DAL):** CAS script update, optional `count` via raw `esClient`, `getById` + `spaceId` wrapper, bulk-create per-item error semantics for plugin bulk schedule.

**Follow-up PRs:** engine/management repository wiring, plugin `createIndexes` → `dal.init()`.

---

## Verdict

**Yes — a partial migration is feasible and aligns with the original design.** The DAL covers the **storage primitives** both repositories repeat today (`search`, `mget`, bulk upsert). The repositories should **not disappear**; they should become **thin domain facades** over `WorkflowExecutionsDataAccess` / `StepExecutionsDataAccess`, keeping engine-specific query shapes, tenancy guards, and operations the DAL deliberately does not expose.

```
┌─────────────────────────────────────────────────────────────┐
│                    Execution Engine                          │
│  WorkflowExecutionRepository    StepExecutionRepository     │
│  plugin.ts / concurrency / task recovery                     │
└───────────────┬─────────────────────────┬───────────────────┘
                │ search, bulkUpsert,     │
                │ getByIds                │
                ▼                         ▼
┌───────────────────────────┐  ┌──────────────────────────────┐
│ WorkflowExecutionsDataAccess│  │ StepExecutionsDataAccess     │
└───────────────┬─────────────┘  └──────────────┬───────────────┘
                │                               │
                └───────────┬───────────────────┘
                            ▼
              PlainIndexExecutionsDataAccess<T>
                            │
                            ▼
                      Elasticsearch
```

Some workflow operations (CAS script update, optional raw `count`) may remain on `esClient` inside the repository facade.

---

## What the DAL Provides Today

`ExecutionsDataAccess<T>` (`data_access_layer/types.ts`):

| Method | ES primitive | Notes |
|--------|--------------|-------|
| `init()` | create/update index | Replaces engine `createIndexes()` per index |
| `search(request)` | `search` | Full ES search body; index injected by implementation |
| `getByIds(ids, options?)` | `mget` | Step path includes `output → null` normalization via `normalizeStepExecutionOnGet` |
| `bulkUpsert(request)` | `update` + `doc_as_upsert` | Always throws on failure; `refresh` defaults to `false`, overridable via `BulkUpsertRequestOptions` |

Factories: `createWorkflowExecutionsDataAccess`, `createStepExecutionsDataAccess`  
Plain-index implementation: `PlainIndexExecutionsDataAccess<T>` (shared by workflow and step indices).

---

## StepExecutionRepository — Method-by-Method

Source: `workflows_execution_engine/server/repositories/step_execution_repository.ts`

| Method | Migrate? | Mapping |
|--------|----------|---------|
| `bulkUpsert` | **Direct** | 1:1 with `stepExecutionsDal.bulkUpsert(docs)` — same ES semantics |
| `getStepExecutionsByIds` | **Direct** | `stepExecutionsDal.getByIds(ids, { sourceIncludes, sourceExcludes })` — normalization already in DAL |
| `getStepExecutionsByWorkflowExecution` | **Domain helper** | Keep as standalone function composing `getByIds` + `search` — see [Domain helper](#domain-helper-getstepexecutionsbyworkflowexecution) |
| `searchStepExecutionsByExecutionId` | **Via DAL** | `stepExecutionsDal.search({ query: { match: { workflowRunId } }, sort, size })` |
| `markNonTerminalStepsFailed` | **Stay in repo** | Domain orchestration: search → filter by status → bulkUpsert |

**Step migration difficulty: Low.** ~70% of ES surface area maps cleanly. The repo shrinks to domain helpers plus a delegate layer.

---

## Domain helper: `getStepExecutionsByWorkflowExecution`

**Decision:** Keep this as a **standalone domain helper** — not part of `ExecutionsDataAccess`. It composes DAL primitives (`getByIds` + `search`) and encodes the mget-vs-search fallback for older executions that lack `stepExecutionIds` on the workflow doc.

Today: `data_access_layer/lib/get_step_executions_by_workflow_execution.ts` takes `stepExecutionsDal: StepExecutionsDataAccess`.  
Target: accept `StepExecutionsDataAccess` only (index name stays inside the DAL).

### Proposed API

```typescript
interface GetStepExecutionsByWorkflowExecutionParams {
  stepExecutionsDal: StepExecutionsDataAccess;
  workflowExecutionId: string;
  stepExecutionIds?: string[];
  sourceExcludes?: Array<keyof EsWorkflowStepExecution>;
}

export const getStepExecutionsByWorkflowExecution = async ({
  stepExecutionsDal,
  workflowExecutionId,
  stepExecutionIds,
  sourceExcludes,
}: GetStepExecutionsByWorkflowExecutionParams): Promise<EsWorkflowStepExecution[]> => {
  if (stepExecutionIds?.length) {
    return stepExecutionsDal.getByIds(stepExecutionIds, { sourceExcludes });
  }

  const response = await stepExecutionsDal.search({
    query: { match: { workflowRunId: workflowExecutionId } },
    ...(sourceExcludes?.length ? { _source: { excludes: sourceExcludes } } : {}),
    sort: 'startedAt:desc',
    size: 10000,
  });

  return response.hits.hits.map((hit) => hit._source as EsWorkflowStepExecution);
};
```

### Behavior (unchanged)

| Path | Today | With DAL |
|------|-------|----------|
| `stepExecutionIds` present | `mget` via `getStepExecutionsByIds` | `stepExecutionsDal.getByIds` (includes step `output → null` normalization when `output` is in `sourceIncludes`) |
| No IDs (legacy runs) | `search` on `workflowRunId` | `stepExecutionsDal.search` with same query, sort, and size |

### Location & exports

- **File:** `data_access_layer/lib/get_step_executions_by_workflow_execution.ts` (relocated via `git mv` from `server/repositories/step_execution_repository.ts`)
- **Export:** `@kbn/workflows/server` (same public surface as today)
- **Remove / fold:** `getStepExecutionsByIds(esClient, index, …)` — callers use `dal.getByIds` directly, or the workflow helper above

### Call-site changes

| Caller | Change |
|--------|--------|
| **Engine `StepExecutionRepository`** | Inject `StepExecutionsDataAccess`; `getStepExecutionsByWorkflowExecution` delegates to helper with `stepExecutionsDal` |
| **Management** (`get_workflow_execution.ts`, `get_child_workflow_executions.ts`) | Replace `esClient` + `stepsExecutionIndex` with `createStepExecutionsDataAccess({ source: 'system_index', esClient })` (or receive DAL from plugin setup). Management no longer passes index names for steps. |

### Optional migration bridge

During transition, a deprecated overload can wrap `createStepExecutionsDataAccess` internally from `(esClient, stepsExecutionIndex)` — target state is DAL-only to avoid duplicating index resolution.

---

## WorkflowExecutionRepository — Method-by-Method

Source: `workflows_execution_engine/server/repositories/workflow_execution_repository.ts`

| Method | Migrate? | Mapping / gap |
|--------|----------|---------------|
| `searchWorkflowExecutions` | **Via DAL** | `workflowExecutionsDal.search({ query, size })` |
| `hasRunningExecution` | **Via DAL** | `search` with `size: 0`, `terminate_after: 1`, `_source: false` |
| `getRunningExecutionsByWorkflowId` | **Via DAL** | Same filter clauses via `search` |
| `getRunningExecutionsByConcurrencyGroup` | **Via DAL** | `search` with projection + sort |
| `getOldestQueuedExecutionIdByConcurrencyGroup` | **Via DAL** | `search` with `size: 1` |
| `findNonTerminalExecutionIdsByWorkflowIdPage` | **Via DAL** | `search` with `search_after` |
| `updateWorkflowExecution` | **Mostly** | `bulkUpsert([doc])` — see refresh gap below |
| `bulkUpdateWorkflowExecutions` | **Mostly** | `bulkUpsert(docs)` — repo uses `refresh: true`, DAL uses `refresh: false` |
| `createWorkflowExecution` | **Mostly** | `bulkUpsert([doc])` — see create vs upsert + refresh gaps |
| `getWorkflowExecutionById` | **Partial** | DAL has `getByIds`, not `get`. Repo adds **spaceId guard** and **404 → null**. Single-id `mget` vs `get` is acceptable |
| `bulkCreateWorkflowExecutions` | **Gap** | See semantic differences below |
| `countExecutionsByConcurrencyGroupAndStatuses` | **Gap** | Uses `esClient.count` — **not in DAL** |
| `tryCasPromoteQueuedWorkflowExecutionToPending` | **Gap** | Painless **script update** + `refresh: 'wait_for'` — **not in DAL** |

**Workflow migration difficulty: Medium.** Search-heavy concurrency paths fit well. Write paths and two specialized ops need decisions.

---

## Semantic Gaps (Must Resolve Before Full Migration)

### 1. `refresh` control

| Call site | Today | DAL |
|-----------|-------|-----|
| `createWorkflowExecution` / bulk schedule | `refresh: 'wait_for'` optional | Fixed `refresh: false` |
| `bulkUpdateWorkflowExecutions` | `refresh: true` | `refresh: false` |
| CAS promote | `refresh: 'wait_for'` | N/A |

**Impact:** Bulk schedule (`plugin.ts`) relies on `wait_for` so concurrency checks see freshly written docs. CAS promote needs near-real-time visibility before the next drain loop.

**Options:**

- Extend `bulkUpsert` with optional `refresh?: boolean | 'wait_for'` (design doc originally had this on request)
- Keep raw `esClient` only for CAS promote
- Accept eventual consistency for bulk updates (likely **not** acceptable for concurrency)

### 2. `bulkCreateWorkflowExecutions` error model

Today:

- ES bulk **`create`** op (version conflict on duplicate id)
- Returns **per-item** `{ id } | { id, error }` — bulk schedule maps partial failures without throwing

DAL:

- **`doc_as_upsert`** (merge on duplicate — design accepted this for phase 1)
- **Throws** on any failure

**Impact:** `plugin.bulk_schedule` path depends on per-item error reporting. Migrating naively would change bulk-alert behavior.

**Options:**

- Adapt plugin to try/catch + parse DAL error (loses per-doc granularity unless DAL exposes item errors before throw)
- Add a domain-layer `bulkCreateIfAbsent` above DAL for this one path
- Accept upsert semantics (design doc says engine writes are idempotent — **likely OK** except duplicate-id detection)

### 3. Create vs upsert for workflows

Repository uses `index` / bulk `create`; DAL unified on `doc_as_upsert`. Design doc explicitly accepted this for phase 1 because engine writes are idempotent partial docs. **Low risk** for normal execution paths; **medium risk** for bulk schedule if duplicate IDs should hard-fail.

### 4. `count` API

`ConcurrencyManager` uses `countExecutionsByConcurrencyGroupAndStatuses`. Could be:

- `search` with `size: 0` + `track_total_hits: true` via DAL (works, slightly different API)
- Add `count()` to DAL later
- Leave this one method on raw `esClient` inside the repo (smallest change)

### 5. Script-based CAS update

`tryCasPromoteQueuedWorkflowExecutionToPending` is a conditional atomic update — correctly **out of generic DAL scope**. Keep in `WorkflowExecutionRepository` with injected `esClient` or add a narrow `compareAndSwapUpdate` extension later.

### 6. Index bootstrap duplication

| Today | Target |
|-------|--------|
| Engine `common/create_indexes.ts` inits both indices | Plugin calls `workflowExecutionsDal.init()` + `stepExecutionsDal.init()` |
| Engine `common/mappings.ts` | DAL `mappings/` + `constants/` (already duplicated) |

Migration should **delete engine copies** and import from `@kbn/workflows`.

### 7. `getById` + spaceId (workflow)

Design doc originally had `getById(id, spaceId)` on workflow DAL; **current DAL only has `getByIds`**. The repo can wrap:

```typescript
const [doc] = await dal.getByIds([id]);
return doc?.spaceId === spaceId ? doc : null;
```

404 handling moves from ES exception to “not in results” — behavior equivalent.

---

## Coverage Summary

| Repository | Total methods | Direct DAL | Via DAL `search` | Stay raw / domain |
|------------|---------------|------------|------------------|-------------------|
| **Step** | 6 | 2 | 2 | 2 |
| **Workflow** | 14 | 4 | 6 | 2 (`count` optional via search) |

Roughly **~65%** of ES calls can delegate immediately; **~25%** delegate with minor wrapper logic; **~10%** stay engine-specific or need DAL extensions.

---

## Recommended Migration Shape

Repositories retain **public API** (no churn across ~30 engine call sites) while internals delegate:

```typescript
// Plugin startup
const workflowExecutionsDal = createWorkflowExecutionsDataAccess({
  source: 'system_index',
  esClient: internalEsClient,
  logger,
});
const stepExecutionsDal = createStepExecutionsDataAccess({ ... });

await Promise.all([workflowExecutionsDal.init(), stepExecutionsDal.init()]);

const workflowExecutionRepository = new WorkflowExecutionRepository(workflowExecutionsDal);
const stepExecutionRepository = new StepExecutionRepository(stepExecutionsDal);
```

```typescript
// StepExecutionRepository — delegate examples
async bulkUpsert(docs) {
  await this.dal.bulkUpsert(docs);
}

async getStepExecutionsByIds(ids, includes?, excludes?) {
  return this.dal.getByIds(ids, { sourceIncludes: includes, sourceExcludes: excludes });
}

async getStepExecutionsByWorkflowExecution(workflowExecutionId, stepExecutionIds?) {
  return getStepExecutionsByWorkflowExecution({
    stepExecutionsDal: this.dal,
    workflowExecutionId,
    stepExecutionIds,
  });
}
```

```typescript
// WorkflowExecutionRepository — getById wrapper
async getWorkflowExecutionById(id, spaceId) {
  const [doc] = await this.dal.getByIds([id]);
  if (!doc || doc.spaceId !== spaceId) {
    return null;
  }
  return doc;
}
```

---

## Suggested Phases

| Phase | Scope | Risk |
|-------|-------|------|
| **1** | Plugin init: DAL factories + `init()`; dedupe mappings/constants from engine `common/` | Low |
| **2a** | Add `getStepExecutionsByWorkflowExecution` helper in `data_access_layer/lib/` using `StepExecutionsDataAccess` (`getByIds` + `search`); export from `@kbn/workflows/server`; migrate tests from `server/repositories/step_execution_repository.test.ts` | Low |
| **2b** | Step repo: `bulkUpsert`, `getStepExecutionsByIds` delegate to DAL; `getStepExecutionsByWorkflowExecution` delegates to helper; remove `getStepExecutionsByIds(esClient, index, …)` | Low |
| **2c** | Management: pass `StepExecutionsDataAccess` into API lib call sites (drop `stepsExecutionIndex` param) | Low |
| **3** | Workflow repo: all `search`-based concurrency/query methods | Low |
| **4** | Workflow writes: `update*` / `create*` → `bulkUpsert`; add `refresh` to DAL if needed | Medium |
| **5** | Bulk schedule: reconcile create vs upsert + per-item errors | Medium |
| **6** | Leave CAS script + optionally `count` on raw client, or extend DAL | Low–medium |

---

## Test Impact

- `kbn-workflows/server/repositories/step_execution_repository.test.ts` — move to `data_access_layer/lib/get_step_executions_by_workflow_execution.test.ts`; mock `StepExecutionsDataAccess` instead of `esClient`
- `step_execution_repository.test.ts` (engine) — mostly becomes DAL integration tests or thin-wrapper tests; bulkUpsert/getByIds tests should move to `@kbn/workflows` DAL tests (currently **missing** — add before/at migration)
- `workflow_execution_repository.test.ts` — large (~1100 lines); search methods stay valid; write/CAS tests need refresh/upsert adjustments.
- Plugin tests mock repositories directly — **unchanged** if repo public API is preserved.
- `plugin.bulk_schedule.test.ts` — sensitive to `bulkCreateWorkflowExecutions` semantics.

---

## Conclusion

**Migration is worthwhile and low-risk if done incrementally with repositories kept as facades.**

- **Step repo:** almost ready now — highest ROI, lowest risk. Shared `getStepExecutionsByWorkflowExecution` stays as a domain helper over `getByIds` + `search`, not on the DAL interface.
- **Workflow repo:** search/concurrency paths fit DAL well; write paths need **`refresh`** and **bulk-create error semantics** resolved first.
- **Do not** push CAS scripts or complex concurrency orchestration into the DAL — those belong in the engine layer.
- **Prerequisite:** add DAL unit tests and consolidate duplicated index constants/mappings before wiring the plugin.

The intended end state is not “repositories go away” but “repositories stop owning index names, bulk boilerplate, and mget normalization — DAL does.”
