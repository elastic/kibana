# Migration plan: rollover aliases → data streams

Migrate workflow and step execution storage from **rollover aliases + index templates + Task Manager rollover/cleanup** to **hidden data streams + DLM + pinned backing-index updates**.

Primary reference implementation in this plugin: execution **logs** (`server/repositories/logs_repository/data_stream.ts`) and **trigger events** data streams.

---

## Goals

| Keep | Remove / replace |
|------|------------------|
| Encoded execution/step IDs with embedded routing | Rollover alias index templates (`setupRolloverIndex`) |
| O(1) get-by-id via decode + resolve | `registerExecutionIndexRolloverTask` |
| Updates/mget on pinned backing index | `registerExecutionIndexCleanupTask` |
| `executionsIndex` / `stepExecutionsIndex` on execution doc | `executionIndexRollover*` / `executionIndexCleanup*` config |
| Search across all generations via stream name | `resolveWriteIndex()` via `indices.getAlias` |
| | `lib/execution_indexes/rollover_execution_indexes.ts` |
| | `lib/execution_indexes/cleanup_execution_indexes.ts` |

**Lifecycle:** DLM handles rollover + `data_retention`. Retention duration is **user-configurable via `kibana.yml`** (`xpack.workflowsExecutionEngine.executionDataStreamRetention`). No app-side delete of backing indices.

**Encoding:** Backing index `.ds-{streamName}-{tail}` → encode only `{tail}`; resolve with known `streamName`.

Example:

```
Stream:     .workflows-executions
Backing:    .ds-.workflows-executions-2026.06.22-000001
Prefix:     .ds-.workflows-executions-
indexSuffix encoded in ID:  2026.06.22-000001
```

---

## Current state (branch)

- Bootstrap: `common/create_indexes.ts` → `setupRolloverIndex` (index template + alias + `-000001` write index).
- Constants: `WORKFLOWS_*_INDEX` = alias name; `WORKFLOWS_*_INDEX_PATTERN` = `.workflows-*-000001` style wildcard.
- Write path: create → alias/stream name; update → `resolveIndex(suffix, '*-pattern')` → `.workflows-executions-000001`.
- Pin at start: `resolveWriteIndex()` from `getAlias` + `is_write_index`.
- ID generation: `generateEncodedWorkflowExecutionId({ indexName, indexPattern })` strips wildcard prefix.
- Tasks: rollover + cleanup registered in `server/plugin.ts` `setup()`.

---

## Target state

**Deployment:** Hidden data streams on **all deployments** (stateful and serverless). No rollover-alias path, no deployment-specific branching (unlike alerting). Remove alias bootstrap, Task Manager rollover/cleanup, and `getAlias`-based write resolution entirely.

### Storage

Two hidden data streams (names can stay `.workflows-executions` and `.workflows-step-executions`):

| Stream | Replaces |
|--------|----------|
| `.workflows-executions` | alias `.workflows-executions` + `.workflows-executions-*` backing indices |
| `.workflows-step-executions` | alias `.workflows-step-executions` + `.workflows-step-executions-*` |

Registered via `@kbn/core-data-streams-server` (`core.dataStreams.registerDataStream`), same as logs.

### Document model

- Add **`@timestamp`** to both mappings (required for data streams). Set from `createdAt` on create and preserve on update.
- Keep existing business fields (`createdAt`, `startedAt`, etc.) unchanged.

### Write model

| Operation | Index target |
|-----------|--------------|
| Create execution / step | Pinned backing index (`executionsIndex` / `stepExecutionsIndex`) |
| Update execution / step upsert | Pinned backing index (`executionsIndex` / `stepExecutionsIndex`) |
| Get-by-id / mget | Decode ID → resolve backing index **or** use pinned index from execution doc |
| Search / list | Data stream name (fans out like alias) |

### Lifecycle

- Configure DLM on the composable index template (`data_stream.lifecycle.data_retention`) using the Kibana config value at registration time. Must exceed max workflow duration + safety margin (same constraint as today’s `executionIndexCleanupMinIndexAge`).
- Mapping bumps: extend `ensureWorkflowsDataStreamsRolledOver` to include execution + step streams (reuse `roll_data_stream_if_required.ts`).

---

## Phase 1 — `@kbn/workflows` encode/decode & resolve

### 1.1 Backing-index prefix helpers (new)

Add in `src/platform/packages/shared/kbn-workflows/server/utils/` (e.g. `resolve_backing_index/`):

```ts
// Strip known prefix from concrete backing index name
export function extractBackingIndexSuffix({
  backingIndexName,
  backingIndexPrefix,
}: {
  backingIndexName: string;
  backingIndexPrefix: string;
}): string;

// Reconstruct concrete backing index name
export function resolveBackingIndex({
  backingIndexPrefix,
  indexSuffix,
}: {
  backingIndexPrefix: string;
  indexSuffix: string;
}): string;
```

**Data stream prefix:** `` `.ds-${streamName}-` ``  
**Legacy alias prefix:** only for unmigrated docs without pinned indexes (read fallback / backfill), not for new writes.

### 1.2 Update ID generators

Files:

- `server/utils/generate_execution_id/generate_execution_id.ts`
- `server/utils/generate_step_execution_id/generate_step_execution_id.ts`

Change API from `indexPattern` (wildcard) to **`backingIndexPrefix`** + **`backingIndexName`**:

```ts
generateEncodedWorkflowExecutionId({
  backingIndexName: '.ds-.workflows-executions-2026.06.22-000001',
  backingIndexPrefix: '.ds-.workflows-executions-',
})
// → encodes suffix 2026.06.22-000001 + uuid
```

`decodeEncodedWorkflowExecutionId` / `decodeEncodedStepExecutionId`: **no change** (suffix is opaque).

### 1.3 Tests

- Update `generate_execution_id.test.ts` / `generate_step_execution_id.test.ts` for DS tail suffixes (`2026.06.22-000001`, edge cases with dots).
- Add roundtrip tests: `backingIndexName` → encode → decode → `resolveBackingIndex` → original name.
- Remove alias-era `indexPattern` tests; use DS backing index names only.

### 1.4 Export from `server/utils/index.ts`

Export new helpers alongside existing decode/generate functions.

---

## Phase 2 — Constants & mappings

### 2.0 Shared index constants (`@kbn/workflows`)

Add to `@kbn/workflows` (e.g. `common/execution_storage_constants.ts`, exported from package root):

| Constant | Value / derivation |
|----------|-------------------|
| `WORKFLOWS_EXECUTIONS_INDEX` | `.workflows-executions` (data stream name) |
| `WORKFLOWS_STEP_EXECUTIONS_INDEX` | `.workflows-step-executions` |
| `WORKFLOWS_EXECUTIONS_DATA_STREAM_BACKING_PREFIX` | `` `.ds-${WORKFLOWS_EXECUTIONS_INDEX}-` `` |
| `WORKFLOWS_STEP_EXECUTIONS_DATA_STREAM_BACKING_PREFIX` | `` `.ds-${WORKFLOWS_STEP_EXECUTIONS_INDEX}-` `` |

**Consumers:** `workflows_execution_engine`, `workflows_management`, and ID helpers in `@kbn/workflows/server` import from here — no third copy in management.

### 2.1 `common/workflow_executions_index.ts` / `step_executions_index.ts` (execution engine)

- Import stream names / backing prefixes from `@kbn/workflows`; remove local duplicates of `WORKFLOWS_*_INDEX` / `*_INDEX_PATTERN` / `*_INITIAL_INDEX`.
- Remove `WORKFLOWS_*_INDEX_PATTERN` (`-*`) and `WORKFLOWS_*_INITIAL_INDEX` (DS bootstraps on first write).
- Keep engine-owned: `WORKFLOWS_*_INDEX_MAPPINGS`, `WORKFLOWS_*_MANAGED_INDEX_MAPPINGS_VERSION`.
- Add `@timestamp` to mappings.

### 2.2 Data stream registration modules (new)

Mirror `logs_repository/data_stream.ts`:

```
server/repositories/workflow_executions_data_stream.ts
server/repositories/step_executions_data_stream.ts
```

Each exports:

- `initializeWorkflowExecutionsDataStream(coreDataStreams)` — registration only via `core.dataStreams.registerDataStream`
- `WORKFLOWS_EXECUTIONS_MANAGED_INDEX_MAPPINGS_VERSION`

Repositories and write paths use raw **`ElasticsearchClient`** (`esClient.indices.getDataStream`, stream-name index, backing-index update) — no `IDataStreamClient` wrapper (unlike logs).

Register in `plugin.ts` `setup()` next to logs/trigger events.

---

## Phase 3 — Bootstrap: replace index templates

### 3.1 Delete / stop using

- `common/create_indexes.ts` — `setupRolloverIndex` flow for executions.
- `common/create_index.ts` — `ensureIndexTemplate` + `bootstrapWriteIndex` for executions (keep `createIndexWithMappings` only if still needed elsewhere).
- `plugin.ts` `createIndexes({ esClient })` initialization for execution indexes.

### 3.2 Replace with

- `core.dataStreams.registerDataStream` for both streams (template: hidden, mappings, DLM `data_retention` from `executionDataStreamRetention` config).
- First document create instantiates the stream (no manual `-000001` bootstrap).

### 3.3 Mapping rollover on upgrade

Extend `server/lib/data_streams/ensure_data_streams_rolled_over.ts`:

```ts
{ dataStreamName: WORKFLOWS_EXECUTIONS_INDEX, targetManagedIndexMappingsVersion: ... },
{ dataStreamName: WORKFLOWS_STEP_EXECUTIONS_INDEX, targetManagedIndexMappingsVersion: ... },
```

---

## Phase 4 — Repositories & plugin write path

### 4.1 `resolveWriteIndex()` → `resolveWriteBackingIndex()`

`workflow_execution_repository.ts` / `step_execution_repository.ts`:

Replace `indices.getAlias` with:

```ts
const { data_streams } = await esClient.indices.getDataStream({ name: streamName });
const writeIndex = data_streams[0].indices.at(-1)?.index_name;
```

Return full backing index name (e.g. `.ds-.workflows-executions-2026.06.22-000001`).

### 4.2 Create paths

- `createWorkflowExecution` / bulk create: index = **stream name**; use `op_type: 'create'` (or bulk `create`) with explicit `_id`.
- Capture `_index` from response when pinning (or call `resolveWriteBackingIndex` before create — both should agree for new docs).
- Set `@timestamp` on document body.

`step_execution_repository.bulkUpsert`: first write for a step can use stream name + create; subsequent writes use **pinned** `targetIndex` with `update` + `doc_as_upsert` on backing index (already supported).

### 4.3 Update / get paths

**Routing priority:** Use pinned `executionsIndex` / `stepExecutionsIndex` from the execution document when present (existing encoded-index executions — no migration). Use decode + `resolveBackingIndex` only when the pin is absent (unmigrated legacy).

Replace alias-era resolve in decode-only paths with:

```ts
resolveIndex({ indexSuffix, indexPattern: WORKFLOWS_EXECUTIONS_INDEX_PATTERN })
```

With:

```ts
resolveBackingIndex({
  backingIndexPrefix: WORKFLOWS_EXECUTIONS_DATA_STREAM_BACKING_PREFIX,
  indexSuffix,
})
```

Files to touch:

- `server/repositories/workflow_execution_repository.ts` (get, update, bulk update)
- `server/repositories/step_execution_repository.ts` (mget default index when no pin — prefer pin from execution doc)
- `server/plugin.ts` (all `generateEncodedWorkflowExecutionId` call sites — pass `backingIndexPrefix` + resolved backing name)
- `server/workflow_context_manager/step_execution_runtime_factory.ts`
- `server/workflow_context_manager/workflow_context_manager.ts`
- `server/workflow_execution_loop/cancel_workflow_if_requested.ts`

### 4.4 Search paths

No change in behavior: `index: WORKFLOWS_EXECUTIONS_INDEX` (stream name) replaces alias for cross-generation queries.

### 4.5 `@timestamp` on writes

- Execution create: `@timestamp: createdAt ?? now`
- Step upsert: `@timestamp: startedAt ?? now` (only on create branch of upsert; updates may omit or keep original — prefer set once at first write)

---

## Phase 5 — `workflows_management` plugin (API endpoints)

**Not covered in earlier phases.** Management reads/writes the same execution indexes via `WORKFLOWS_EXECUTIONS_INDEX` / `WORKFLOWS_STEP_EXECUTIONS_INDEX` (today: rollover aliases; after migration: **data stream names**). Most list/search/delete paths already use those constants and need **no logic change** once streams exist. A few get-by-id paths still use alias-era `resolveIndex` + `-*` pattern and **must** switch to DS backing-index resolution.

### 5.1 Constants — consume from `@kbn/workflows`

Remove from `workflows_management/common/index.ts`:

- `WORKFLOWS_EXECUTIONS_INDEX`
- `WORKFLOWS_EXECUTIONS_INDEX_PATTERN`
- `WORKFLOWS_STEP_EXECUTIONS_INDEX`

Replace with imports from `@kbn/workflows`:

```ts
import {
  WORKFLOWS_EXECUTIONS_INDEX,
  WORKFLOWS_EXECUTIONS_DATA_STREAM_BACKING_PREFIX,
  WORKFLOWS_STEP_EXECUTIONS_INDEX,
} from '@kbn/workflows';
```

Re-export from `common/index.ts` only if needed to avoid churn in existing `../../common` import paths; prefer direct `@kbn/workflows` imports in new/changed files.

Keep `WORKFLOWS_INDEX` (workflow definitions) in management — not execution storage.

### 5.2 Must change — O(1) get by encoded ID

| File | Change |
|------|--------|
| `server/api/lib/get_workflow_execution.ts` | `resolveBackingIndex` for decode-only path; executions with pinned `executionsIndex` already routable via that field after load (no ID re-encoding). Add backfill/search fallback only for docs **without** pinned indexes. |
| `server/api/lib/get_workflow_execution.test.ts` | `TEST_BACKING_INDEX` → `.ds-.workflows-executions-2026.06.22-000001` for new DS creates; keep pinned-alias fixture case for no-migration path |

`getStepExecutionsByWorkflowExecution` already receives pinned `doc.stepExecutionsIndex` + stream name — no migration for executions that have it.

### 5.3 Optional / verify — child execution fetch

| File | Notes |
|------|-------|
| `server/api/lib/get_child_workflow_executions.ts` | Parent `get` and child `mget` use **stream name** (`workflowExecutionIndex`). ES allows read/mget against a data stream name (fan-out across backing indices). **Works without change** for correctness. For parity with engine O(1) routing, optionally decode each `childExecutionId` and set `_index` via `resolveBackingIndex` per doc. |
| `get_child_workflow_executions.test.ts` | Update pinned `stepExecutionsIndex` fixtures to `.ds-...` backing names if present. |

### 5.4 No change expected (stream name = former alias name)

| File | ES operation | Why OK |
|------|--------------|--------|
| `server/services/workflow_execution_query_service.ts` | `search`, aggregations on `WORKFLOWS_*_INDEX` | Stream name replaces alias for cross-generation queries |
| `server/services/workflow_search_service.ts` | `search` on executions stream | Same |
| `server/api/lib/workflow_deletion.ts` | `deleteByQuery` on both streams | Supported on data streams |
| `server/services/workflow_execution_query_service.ts` | `getStepExecutionsByWorkflowExecution` with alias + optional pinned index | Already matches engine pattern |

### 5.5 Tests & mocks

| File | Change |
|------|--------|
| `server/api/routes/tests/route_privilege_consistency.test.ts` | `getAlias` mocks → `getDataStream` if registration checks move to DS API (only if management starts calling stream APIs directly; today mocks are for index-exists checks) |
| `server/services/workflow_execution_query_service.test.ts` | Expect stream names unchanged; update any hard-coded `.workflows-*-000001` backing indices |
| `server/api/workflows_management_service.test.ts` | Same `getAlias` → `getDataStream` if applicable |

### 5.6 PR placement

Fold into **PR 3** (repositories + consumers) or a small **PR 3b** dedicated to management so UI get-execution / child-execution routes work before removing alias setup.

---

## Phase 6 — Remove Task Manager lifecycle tasks

### 6.1 Delete

| File | Action |
|------|--------|
| `server/tasks/register_execution_index_rollover_task.ts` | Delete |
| `server/tasks/register_execution_index_cleanup_task.ts` | Delete |
| `server/lib/execution_indexes/rollover_execution_indexes.ts` | Delete |
| `server/lib/execution_indexes/cleanup_execution_indexes.ts` | Delete |
| Associated `*.test.ts` | Delete |

### 6.2 `server/tasks/index.ts` & `server/plugin.ts`

- Remove imports, `registerExecutionIndexRolloverTask`, `registerExecutionIndexCleanupTask`, and `schedule*` calls.

### 6.3 Config (`server/config.ts`)

Remove:

- `executionIndexRolloverTaskInterval`
- `executionIndexRolloverMaxAge`
- `executionIndexRolloverMaxPrimaryShardSize`
- `executionIndexCleanupTaskInterval`
- `executionIndexCleanupMinIndexAge`

Add (replaces cleanup min age):

- `executionDataStreamRetention` — Elasticsearch duration (e.g. `30d`). Written into the composable index template as `data_stream.lifecycle.data_retention` when streams are registered. Default: same semantic as former `executionIndexCleanupMinIndexAge` (`20d` today). Document in README / `kibana.yml` under `xpack.workflowsExecutionEngine`.

**Note:** Changing retention in `kibana.yml` after streams exist may require a template update / stream rollover path — document whether registration is idempotent and updates the template on restart (mirror logs DS registration behavior).

Update `README.md`, `execution_functions_test_utils.ts`, `plugin.*.test.ts` defaults.

---

## Phase 7 — Observability & docs

### 7.1 `workflows_generator.yaml`

Replace alias-based `get_backing_indexes_count` ( `_alias` API ) with `_data_stream` API:

```http
GET _data_stream/.workflows-executions
GET _data_stream/.workflows-step-executions
```

Metric: `indices.length` per stream (rename metric optional: `backing_generations_count`).

### 7.2 Documentation

- Update / supersede `rollover_index_rfc.md` with DS + DLM design (or add pointer to this plan).
- Archive `tiered_ilm_analysis.md` as not applicable to DS path.

---

## Phase 8 — Tests & fixtures

| Area | Changes |
|------|---------|
| `common/create_indexes.test.ts` | Replace with data stream registration tests |
| `common/create_index.test.ts` | Remove rollover-specific cases |
| Repository tests | Mock `getDataStream` instead of `getAlias`; use `.ds-...` backing names |
| Integration fixtures | `executionsIndex` / `stepExecutionsIndex` → `.ds-.workflows-executions-...` |
| `kbn-workflows` step_execution_repository tests | `stepsExecutionIndexAlias` → stream name (unchanged value) |
| Jest / integration | Run full workflows_execution_engine + kbn-workflows test suites |

---

## Phase 9 — Cluster / data migration

### Greenfield (local dev)

1. Delete old alias indexes and templates if present:
   ```http
   DELETE .workflows-executions-*
   DELETE _index_template/.workflows-executions
   DELETE .workflows-step-executions-*
   DELETE _index_template/.workflows-step-executions
   ```
2. Restart Kibana → data streams register → new executions use DS.

### Existing data

**Decision:** Migration tooling is only required for **legacy executions that lack pinned backing indexes** (`executionsIndex` / `stepExecutionsIndex` on the execution document). Executions that already store those fields need **no** ID re-encoding or reindex for the DS switch — reads/updates use the pinned concrete index name on the doc; encoded `_id` suffix remains opaque.

| Execution doc | Action |
|---------------|--------|
| Has `executionsIndex` + `stepExecutionsIndex` | No migration. Pinned names may still point at alias-era backing indices until DLM retires them; new runs get `.ds-...` pins. |
| Missing pinned indexes (pre–encoded-index era) | Migrate or backfill: resolve backing index from stored `_index` / search, set `executionsIndex` / `stepExecutionsIndex`, or document acceptable data loss in dev. |

Greenfield / dev: delete old alias indexes and templates (see above), restart Kibana — no legacy backfill needed.

**Not in scope:** Re-encoding existing encoded IDs for DS tail suffix shape (`000001` → `2026.06.22-000001`). New executions pick up the new suffix at create time only.

---

## Implementation order (suggested PR sequence)

1. **PR 1 — kbn-workflows:** execution storage constants, `extractBackingIndexSuffix` / `resolveBackingIndex`, update generators + tests (DS suffix); keep decode unchanged.
2. **PR 2 — DS registration:** mappings + `@timestamp`, register streams, remove `createIndexes` for executions.
3. **PR 3 — Repositories + plugin + management:** `resolveWriteBackingIndex`, prefix-based resolve, `@timestamp` on create; `get_workflow_execution` + management constants/tests (Phase 5).
4. **PR 4 — Remove tasks + config:** delete rollover/cleanup code and settings.
5. **PR 5 — Observability + docs:** generator workflow, README, RFC update.

---

## Verification checklist

- [ ] DevTools: create doc on stream → update on returned `_index` → get succeeds (manual snippet from design discussion).
- [ ] Workflow run: execution doc has `executionsIndex` / `stepExecutionsIndex` as `.ds-...` backing names.
- [ ] Encoded ID decodes to tail; `resolveBackingIndex` matches pinned index.
- [ ] Mid-run step upserts hit pinned backing index after DLM rollover (rollover does not break in-flight execution).
- [ ] Search/list across stream name returns executions from all generations.
- [ ] DLM deletes old generations after `executionDataStreamRetention`; no Task Manager cleanup task runs.
- [ ] Mapping version bump triggers lazy rollover via `ensureWorkflowsDataStreamsRolledOver`.
- [ ] Management API: GET execution by encoded ID resolves `.ds-...` backing index; list/search/delete on stream name.
- [ ] Legacy execution without `executionsIndex`: migration/backfill path documented or implemented; pinned-index executions work unchanged.
- [ ] Unit + integration tests pass (`workflows_execution_engine` + `workflows_management` + `kbn-workflows`).

---

## Decisions

1. **Data streams everywhere:** Executions and step executions use hidden data streams on **stateful and serverless**. No alias/ILM fallback path.
2. **DLM retention:** Set by the **user via Kibana config** (`executionDataStreamRetention` → template `data_stream.lifecycle.data_retention`). Not cluster-default-only. Must be ≫ max workflow timeout (same rule as former `executionIndexCleanupMinIndexAge`).
3. **Data migration scope:** Only legacy executions **without** pinned `executionsIndex` / `stepExecutionsIndex` need migration or backfill. Executions that already have those fields are unchanged; no re-encoding of encoded IDs for DS suffix shape.
4. **ES client:** Use raw `ElasticsearchClient` for execution/step DS reads and writes. `core.dataStreams.registerDataStream` for bootstrap only — no `IDataStreamClient` in repositories.
5. **Shared constants:** **Define** stream names and backing prefixes in `@kbn/workflows`; **define** mappings + managed mapping versions in `workflows_execution_engine`. **`workflows_management` consumes** execution storage constants from `@kbn/workflows` only (no local duplicates).
