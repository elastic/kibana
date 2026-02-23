# RFC: Workflow Execution History with Tiered State and History Architecture

## Summary

This RFC proposes a tiered storage architecture for workflow execution data, separating **execution state** (mutable, active executions) from **execution history** (append-only, completed executions). Active workflow executions live in a regular Elasticsearch index that supports mutable operations (`update`, `delete`, `mget`) -- capabilities that data streams restrict by design. Completed executions are migrated to Elasticsearch data streams suited for time-series history and long-term retention.

## TLDR

- **Before**: One index per entity (workflows, steps), mixing active and historical data. Unbounded growth, no lifecycle management, degrading query performance over time.
- **After**: Two-tier architecture. A single small execution state index handles all active execution reads/writes via fast `mget` lookups. Completed executions automatically migrate to append-only data streams with ILM-managed retention. Queries transparently span both tiers.
- **Result**: Execution state stays small and fast. Execution history scales with time-series optimizations and automatic lifecycle management. The execution engine gains a unified type model where workflows and steps are treated as the same concept. Migration and cleanup are automated, configurable, and idempotent.

## Motivation

The current implementation uses a single storage layer for both active and historical execution data. This creates several problems:

- **Unbounded index growth**: The execution state index grows indefinitely as completed executions accumulate alongside active ones.
- **Query performance degradation**: Queries for active executions (used in concurrency checks, cancellation polling, etc.) slow down as historical data accumulates.
- **No lifecycle management**: There is no mechanism to age out or manage old execution data independently from active state.
- **Conflicting access patterns**: Active executions require fast reads, updates, and deletes (mutable). Historical executions are write-once and primarily queried for reporting, debugging, and auditing (immutable).

## Why Not Data Streams Only or Event Sourcing?

Two alternative approaches were considered and rejected:

### Why not use data streams for everything (including active execution state)?

Data streams are append-only and do not support updates or deletes by document ID. The execution engine fundamentally requires mutable state during workflow execution:

- Steps change status multiple times during their lifecycle (pending, running, completed/failed). Orchestrating steps like `if`, `foreach`, and sub-workflows manage internal state that evolves as child steps execute. A `wait` step transitions through start, wait, and finish states. Future step types may need to emit even more status transitions. Each of these requires updating the same document, not appending new ones.
- Data streams do not support `mget` (multi-get by document ID). The execution engine relies on `mget` to load a workflow and all its step executions in a single O(1) call using known IDs. Without `mget`, every state load would require a search query, which is subject to the index refresh interval (typically 1 second). This would make the execution engine vulnerable to reading stale state during rapid step transitions -- a correctness issue, not just a performance one.

### Why not event sourcing?

Event sourcing (appending immutable events and reconstructing state by replaying them) was considered but rejected for several reasons:

- **Unbounded events per execution**: Simple run-and-complete steps emit two events (start, finish), which is manageable. But orchestrating steps (`if`, `foreach`, sub-workflows) coordinate child steps and can emit many state transitions. Wait steps emit start, wait, and finish events. Future step types may need arbitrary numbers of status changes. Event sourcing introduces a scaling concern where the number of events per execution is unpredictable and potentially large.
- **Consumers need objects, not event streams**: The UI, APIs, and internal consumers all expect materialized workflow and step execution objects (current status, timestamps, outputs). With event sourcing, every read requires replaying events to reconstruct the current state. This adds latency, complexity, and makes pagination and filtering significantly harder to implement.
- **Runtime state must be fast and bounded**: The execution loop reads and writes state on every step transition. Replaying an event log on each read is not viable at the frequency the execution engine operates. A mutable document that can be read and updated in-place is the natural fit.

### The chosen approach

This tiered architecture gives the execution engine what it needs from each tier: a mutable index with `mget` support for fast, consistent runtime state, and append-only data streams with ILM for scalable, managed history. The two tiers are connected by automated migration, and queries transparently span both when needed.

## Design

This architecture follows the **CQRS (Command Query Responsibility Segregation)** pattern combined with **tiered storage** (sometimes called "hot/cold", though here both tiers reside on the same Elasticsearch cluster -- the separation is logical, not hardware-based). The execution state tier serves as the "command" side (fast mutable state for the execution engine), while the execution history tier serves as the "query" side (optimized for historical search, reporting, and auditing). Automated migration connects the two tiers, and queries transparently span both when needed.

### Tiered Storage Model

```
┌─────────────────────────────────────────────────────────────┐
│                   Execution State                           │
│              (Execution State Index)                        │
│                                                             │
│  - Active workflow & step executions                        │
│  - Mutable: supports updates, deletes, mget, upserts       │
│  - Used by: execution loop, concurrency manager,           │
│    cancellation polling, state flushes                      │
│  - Regular ES index with keyword/date mappings              │
└──────────────────────┬──────────────────────────────────────┘
                       │
            Scheduled migration task (daily)
            Copies terminal executions older
            than configured threshold
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  Execution History                          │
│         (Workflow & Step Execution Data Streams)            │
│                                                             │
│  - Completed workflow & step execution history              │
│  - Append-only: data streams with op_type: create           │
│  - Used by: execution history queries, search,              │
│    get-by-id (fallback), reporting                          │
│  - Managed via Kibana Data Streams API with versioned       │
│    mappings and index templates                             │
└─────────────────────────────────────────────────────────────┘
```

### Unified Execution State

A single **Execution State Repository** manages all mutable execution data in a regular Elasticsearch index (`.workflows-execution-state`). Both workflow and step execution documents are stored in the same index, distinguished by a `type` field (`'workflow'` or `'step'`).

This unified storage reflects the fact that workflow and step executions are fundamentally the same concept. A workflow execution is an orchestrator that coordinates step executions, but a step execution can itself be an orchestrator for other steps (e.g., `if` steps, `foreach` steps, sub-workflow steps). Both share the same lifecycle (pending, running, completed, failed, cancelled), the same state management patterns, and the same fields (id, status, timestamps, errors, outputs). The only difference is the `type` discriminator and a few type-specific fields.

A unified type model (`EsBaseExecution`) captures this by defining the shared fields, with `EsWorkflowExecution` and `EsWorkflowStepExecution` extending it with their specific additions.

Storing both types in the same index also enables a key performance optimization: **all execution state reads use `mget` exclusively**. All execution and step IDs are deterministic (generated upfront), and the workflow execution document maintains an ordered list of all its child step execution IDs (`stepExecutionIds`). This means:

- **During execution resume**: When the execution engine resumes a workflow (e.g., after a pause or task recovery), it restores the full execution state by loading the workflow and all its steps in a single O(1) `mget` call using known IDs. No search queries are needed, and `mget` is not subject to the index refresh interval -- it always returns the latest written version.
- **UI polling**: When the UI starts a workflow and polls for its status, it fetches the workflow execution by its known ID via `mget`, then uses the `stepExecutionIds` list from that document to `mget` all step executions in a single follow-up call. The entire execution tree (workflow + all steps) is loaded in at most two `mget` calls, regardless of how many steps exist.

#### Why a Single Execution State Index?

The alternative is to keep the current two-index structure (separate indices for workflow and step executions). With the tiered architecture, this would mean at least four storage locations: a workflow executions index (state), a step executions index (state), a workflow executions data stream (history), and a step executions data stream (history). That approach would work and would require fewer changes, but a single unified index is a better fit for several reasons:

1. **Workflows and steps are the same concept**: A workflow orchestrates steps, but a step can also orchestrate other steps (`foreach`, `retry`, `if`). Both share the same lifecycle, the same status transitions, and the same core fields (`id`, `spaceId`, `status`, `startedAt`, `finishedAt`, `duration`, `error`, `output`). The only differences are a few workflow-specific fields like `concurrencyGroupKey`. A single index with a `type` discriminator reflects this reality.

2. **Single repository, single bulk operation**: A unified `ExecutionStateRepository` replaces two separate repositories. During the execution loop, workflow and step state updates are flushed together in a single `bulkUpsert` call rather than requiring coordinated writes to two indices.

3. **Single cleanup scope**: Migration and cleanup operate on one index with one `deleteByQuery`. With two indices, cleanup must coordinate across both: a workflow document can only be deleted after all its step documents are also terminal, requiring cross-index verification or two-phase deletion.

4. **One set of mappings**: A shared index with `dynamic: false` avoids duplicating the common field mappings across two index definitions.

5. **No query downside**: All reads from the execution state index use `mget` with known document IDs, so mixed document schemas do not affect search performance. The `type` field is only used in migration queries, which run infrequently.

6. **Naming clarity**: `.workflows-execution-state` (or `.workflows-execution-runtime-state`) explicitly declares its purpose as mutable runtime state, distinct from the history data streams.

Note that ES `mget` supports the `_index` parameter per document, so separate indices would still allow loading workflows and steps in a single `mget` call. The benefits above are operational and conceptual, not about `mget` capabilities.

The deterministic ID scheme means no component ever needs to search for execution documents -- they always know exactly which IDs to fetch.

This repository handles:
- Creating and updating workflow/step executions during the execution loop
- Loading full execution trees via `mget` (workflow + all steps in one call)
- Querying for active (non-terminal) executions for concurrency checks
- Cancellation status polling
- Bulk upserts for state flushes from the in-memory execution state

#### Deterministic ID Scheme

The `mget`-based access pattern depends on all execution IDs being known upfront. The ID scheme works as follows:

- **Workflow execution ID**: A UUID v4 generated when the execution is created. This is also the value of `workflowRunId`. It is returned from the creation API and persisted in the Task Manager task state, so all callers (UI, execution engine, migration task) know it without searching.

- **Step execution ID**: A SHA-256 hash of `{executionId}_{scopePath}_{stepId}`, where `scopePath` is derived from the step's stack frames (step IDs and nested scope IDs, joined by `_`). The scope path combines both the step's structural position in the workflow graph and runtime context -- for example, a `foreach` loop contributes the current iteration index, a retry block contributes the attempt number, and a sub-workflow contributes its invocation scope. This means two executions of the same `stepId` inside different `foreach` iterations (or different retry attempts) produce different execution IDs. Given the same execution ID and the same runtime path, the same step always produces the same execution ID, regardless of when or how many times it is computed.

  For example, a step `send-email` inside a `foreach` loop at iteration `item-2` in execution `a1b2c3d4-...` produces:
  ```
  input:  "a1b2c3d4-..._foreach_item-2_send-email"
  output: SHA-256 hex digest, e.g. "7f8a9b2c3d4e..."
  ```

  See `build_step_execution_id.ts` for the implementation.

- **`stepExecutionIds` array**: Maintained on the workflow execution document in chronological order. Acts as a manifest: the workflow document is the single source of truth for which step execution IDs belong to this run. This enables loading all step executions via a single `mget` call using only the workflow document's data, without searching.

### Execution History Data Streams

Two separate Elasticsearch data streams store completed execution history:

- **Workflow Execution Data Stream** (`.workflows-execution-data-stream-executions`): Stores completed workflow execution records.
- **Step Execution Data Stream** (`.workflows-execution-data-stream-step-executions`): Stores completed step execution records.

Data streams are registered during plugin setup via the Kibana Data Streams API, which manages index templates, component templates, and versioned mappings. Each data stream has:
- Explicit field mappings with `dynamic: false` (only mapped fields are indexed)
- A `@timestamp` field (required by data streams), populated from `createdAt` or `startedAt` during migration
- Typed data stream clients initialized via factory functions

The history repositories are append-only and support:
- Creating new execution records (used when writing directly to history)
- Searching execution history by various fields
- Reindexing from execution state (used by the migration task)

### Querying Across Both Tiers

Functions that need to return execution data regardless of whether it's active or completed query both tiers. The three cross-tier query patterns are:

**Get workflow execution by ID** (waterfall):

```
getWorkflowExecution(id, spaceId):
    // O(1) mget -- always returns latest version, not subject to refresh interval
    doc = executionState.mget([id], spaceId)
    if doc exists:
        return doc

    // Fallback: execution already migrated to history
    return workflowHistory.searchById(id, spaceId)
```

**Get step executions for a workflow** (waterfall with mget fan-out):

```
getStepExecutions(executionId, spaceId):
    // Load the workflow to get its step manifest
    workflow = executionState.mget([executionId], spaceId)
    if workflow exists:
        // Fan-out: load all steps in one mget using the manifest
        return executionState.mget(workflow.stepExecutionIds, spaceId)

    // Fallback: workflow already in history, search step history
    return stepHistory.searchByWorkflowRunId(executionId, spaceId)
```

**Search workflow executions** (parallel multi-index with dedup):

```
searchWorkflowExecutions(query, spaceId, sort, size, from):
    // Single ES search spanning both tiers
    return es.search(
        index: [executionStateIndex, workflowHistoryDataStream],
        query: query AND { term: { spaceId } } AND { term: { type: 'workflow' } },
        collapse: { field: 'id' },  // dedup: same doc may exist in both during overlap
        sort, size, from,
        track_total_hits: true       // NOTE: reflects pre-collapse count (see below)
    )
```

Between migration and cleanup, the same execution may temporarily exist in both tiers. This overlap window is handled by design: search queries use field collapsing (`collapse: { field: 'id' }`) to return only one result per execution, and get-by-id queries use a waterfall pattern (check execution state first, fall back to execution history) that naturally returns the most up-to-date version. Count-based queries (e.g., for pagination totals) may reflect slightly inflated numbers during the overlap, but this is transient and resolves after cleanup runs.

#### Query Latency and Pagination

**Get-by-id latency**: The waterfall pattern adds zero overhead when the document is in execution state (the common case for active and recently-completed executions). It adds one additional ES round-trip only when the document has already been cleaned up from execution state and exists only in execution history. This is the minority path -- most UI interactions deal with recent executions that are still in execution state.

**Search latency**: Multi-index search (`[executionStateIndex, workflowHistoryDataStream]`) is a native ES operation. Response time is bounded by the slowest shard, which in large deployments will be the execution history data stream. However, this is equivalent to the latency of the current single-index approach as execution volume grows -- the architectural improvement is that execution-state-only queries (concurrency checks, cancellation polling, state loading) are unaffected by history volume because they only target the small execution state index.

**Pagination with `collapse`**: ES `collapse` deduplicates results, but `track_total_hits` reflects pre-collapse document counts. During the overlap window (between migration and cleanup), paginated UIs may show slightly inflated totals. This is transient and only affects the overlap period, not steady-state operation. If precise totals are required, a `cardinality` aggregation on the `id` field can be used as a fallback, though at higher query cost.

### Automated Migration

A single scheduled Task Manager task handles both migration and cleanup from execution state to execution history. Both thresholds are derived from a single configurable lifecycle interval (default: `1d`):

- **Frequency**: Runs on the configured `lifecycleInterval` (default: daily).
- **Migration step**: Reindexes terminal (completed, failed, cancelled, skipped) workflow and step executions older than `1 × lifecycleInterval` from the execution state index to the respective data streams. Uses ES `reindex` API with `op_type: 'create'` and `conflicts: 'proceed'` for idempotency.
- **Cleanup step**: Deletes terminal executions older than `2 × lifecycleInterval` from the execution state index. Only deletes executions belonging to workflow runs where ALL documents (workflow + steps) are in terminal status, preventing partial deletion of still-active workflow runs.

The 2x multiplier guarantees that data has at least one full migration window before cleanup considers it for deletion. Both thresholds are derived from the single `lifecycleInterval` setting to prevent misconfiguration (e.g., cleanup running before migration).

### Failure Recovery

The migration process is designed to be safe against partial failures at any point:

- **Reindex is idempotent**: The `conflicts: 'proceed'` option means re-running migration for already-migrated documents is a no-op. If the task is interrupted and retried, it simply skips documents that already exist in execution history.
- **Cleanup is independent and conservative**: Cleanup only deletes documents older than `2 × lifecycleInterval`, which is always larger than the migration threshold (`1 × lifecycleInterval`). Even if migration fails for one cycle, cleanup will not delete un-migrated data because those documents haven't aged past the cleanup threshold yet.
- **No transactional coupling**: Migration and cleanup are separate operations within the same task. If reindex succeeds but cleanup fails (or vice versa), the system remains in a consistent state — at worst, data exists in both tiers temporarily, which is handled by deduplication in queries.

### Multi-Node Safety

The migration task is registered and scheduled via Kibana Task Manager, which guarantees that only one Kibana instance executes the task at any given time across a multi-node deployment. There is no risk of duplicate migrations or conflicting cleanup operations running in parallel.

### Space Isolation

All execution documents carry a `spaceId` field, and all queries — in both execution state and execution history — filter by `spaceId`. The migration process preserves space isolation because it copies documents as-is (including their `spaceId`) via ES reindex, and the cleanup uses `deleteByQuery` which operates on the documents' own fields. Cross-tier query functions (search, get-by-id) always include `spaceId` in their filters, ensuring tenants never see each other's execution data regardless of which tier the data resides in.

### Configuration

A single configurable interval controls the entire execution history lifecycle in `kibana.yml`:

- `workflowsExecutionEngine.executionHistory.lifecycleInterval` (default: `1d`): Controls how often the lifecycle task runs, and derives both the migration threshold (`1 × interval`) and the cleanup threshold (`2 × interval`). For example, with the default `1d`: the task runs daily, migrates terminal executions older than 1 day, and cleans up terminal executions older than 2 days.

This single-knob design eliminates the risk of misconfiguration (e.g., setting cleanup to run before migration) while keeping the operational model simple. The 2x multiplier between migration and cleanup is hardcoded as a safety invariant.

## Key Changes

### New Components

- **Execution State Repository**: Centralized repository for all mutable execution state, replacing direct usage of separate workflow/step execution repositories for state management.
- **Workflow Execution Data Stream**: Data stream registration, mappings, typed client, and factory function for workflow execution history.
- **Step Execution Data Stream**: Same structure for step execution history.
- **Migration Task**: Scheduled Task Manager task that handles reindex + cleanup.
- **Execution query functions**: `getWorkflowExecutionFn`, `getStepExecutionsFn`, `searchWorkflowExecutionsFn` that query across both tiers.

### Removed Components

- Direct ES index operations from workflow/step execution repositories (replaced by data stream clients).
- Mutation methods from history repositories (updates, bulk updates, running execution queries) — these are now exclusively handled by the Execution State Repository.
- Old index constants and mappings for workflow/step execution indices (replaced by data stream definitions).

## Index Lifecycle Management

The execution history data streams must ship with a **default ILM policy** to prevent unbounded growth of execution history. This policy will define sensible defaults for retention and rollover (e.g., delete execution history older than 30 days, rollover based on index size), ensuring that historical data is automatically managed without any user intervention.

**TODO**: Provide users with the ability to configure ILM policies through a UI in the Workflow Execution Manager. Different deployments have different retention needs -- compliance-heavy environments may require months or years of history, while resource-constrained environments may prefer aggressive cleanup. A UI setting would allow users to adjust retention periods and lifecycle phases without directly editing ILM policies in Elasticsearch.

## Upgrade Path for Existing Deployments

Existing deployments store execution history in two legacy indices that predate the tiered architecture:

- `.workflows-executions` -- workflow execution documents
- `.workflows-step-executions` -- step execution documents

These documents are already completed (terminal) and should migrate directly to the execution history data streams, bypassing execution state entirely. Routing them through the execution state index would temporarily bloat it with potentially large volumes of historical data, degrading performance for active execution queries.

### One-Time Upgrade Migration

On startup, the plugin checks whether the legacy indices exist. If they do, it runs a one-time reindex to move the data directly into the corresponding data streams, then deletes the legacy indices.

**Workflow executions** (`.workflows-executions` → workflow execution data stream):

The legacy documents are missing `type` and `workflowRunId` (which equals the execution's own `id` for workflows). The reindex script adds these fields along with the required `@timestamp`:

| Legacy field | Data stream field | Transformation |
|---|---|---|
| `id` | `id` | As-is |
| `spaceId` | `spaceId` | As-is |
| `workflowId` | `workflowId` | As-is |
| `status` | `status` | As-is |
| `createdAt` | `createdAt` | As-is |
| `startedAt` | `startedAt` | As-is |
| `finishedAt` | `finishedAt` | As-is |
| `duration` | `duration` | As-is |
| `createdBy` | `createdBy` | As-is |
| `executedBy` | `executedBy` | As-is |
| `triggeredBy` | `triggeredBy` | As-is |
| `concurrencyGroupKey` | `concurrencyGroupKey` | As-is |
| `isTestRun` | `isTestRun` | As-is |
| `workflowDefinition` | `workflowDefinition` | As-is |
| _(missing)_ | `type` | Set to `'workflow'` |
| _(missing)_ | `workflowRunId` | Set to value of `id` |
| _(missing)_ | `@timestamp` | Set to value of `createdAt` |

**Step executions** (`.workflows-step-executions` → step execution data stream):

The legacy step documents are missing `type`. The `workflowRunId` field already exists. The reindex script adds the missing fields:

| Legacy field | Data stream field | Transformation |
|---|---|---|
| `id` | `id` | As-is |
| `spaceId` | `spaceId` | As-is |
| `stepId` | `stepId` | As-is |
| `workflowRunId` | `workflowRunId` | As-is |
| `workflowId` | `workflowId` | As-is |
| `status` | `status` | As-is |
| `startedAt` | `startedAt` | As-is |
| `finishedAt` | `finishedAt` | As-is |
| `duration` | `duration` | As-is |
| _(missing)_ | `type` | Set to `'step'` |
| _(missing)_ | `@timestamp` | Set to value of `startedAt` |

### Upgrade Process

1. Check if `.workflows-executions` and/or `.workflows-step-executions` indices exist.
2. If yes, reindex each to its respective data stream using `op_type: 'create'` and `conflicts: 'proceed'` (idempotent if retried).
3. After successful reindex, verify document counts match between source and destination. If counts diverge, log an error and skip deletion.
4. Rename legacy indices with a `-legacy` suffix (e.g., `.workflows-executions-legacy`) rather than deleting immediately.
5. This runs once on upgrade and is a no-op on subsequent startups (original index names no longer exist).

### Rollback and Safety

Legacy indices are not deleted during the upgrade -- they are renamed. This provides a safe rollback window:

- **Deferred deletion**: The renamed `-legacy` indices are deleted in the next release (version N+1). This gives a full release cycle to verify the new architecture works correctly in production.
- **Rollback path**: If a code rollback to the pre-migration version is needed, the renamed legacy indices can be restored to their original names. The data streams created during the upgrade are unused by the old code and can be cleaned up manually.
- **Idempotent startup**: The migration check uses `indices.exists` on the original index names. After renaming, the originals no longer exist, so the migration is a no-op on subsequent startups.

## Observability (TODO)

The migration task should provide visibility into its health and effectiveness. This includes:

- Logging the number of documents migrated and cleaned up per run, along with task duration.
- Surfacing migration task status (last run time, success/failure) in the Workflow Execution Manager UI or a health endpoint.
- Alerting operators when the migration task has not run successfully within a configurable window, indicating potential issues with Task Manager or Elasticsearch availability.

> **Note**: Once the System Workflows feature is delivered, the migration task could be replaced with a system workflow (e.g., `execution_history_migration_workflow`). This would give the migration process the same orchestration, observability, debugging, and retry capabilities that user-facing workflows have -- out of the box, with no custom task management code.

## Benefits and Trade-offs

### Benefits

- **Bounded execution state**: The execution state index only contains active and recently-completed executions. It stays small regardless of how many workflows have been executed historically, keeping all active-execution queries (concurrency, cancellation, state loading) consistently fast.
- **O(1) state loading**: Storing workflows and steps in a single index with known IDs enables `mget`-based lookups, eliminating search queries from the critical execution loop path.
- **Automatic lifecycle management**: Data streams support ILM policies natively. Historical execution data can be automatically rolled over, moved to cheaper storage tiers, and eventually deleted -- without custom cleanup logic.
- **Unified type model**: Treating workflows and steps as the same base concept (both are executions, both can orchestrate children) simplifies the data model, reduces code duplication, and makes the system easier to extend with new execution types.
- **Idempotent and safe migration**: The migration process can fail, be retried, or run multiple times without data loss or corruption. The gap between migration and cleanup thresholds guarantees data is safely in execution history before it's removed from execution state.
- **Configurable retention**: Operators can tune migration/cleanup thresholds and ILM policies to match their deployment's volume, compliance, and resource constraints.

### Trade-offs

- **Increased query complexity**: Reading execution data now requires querying two tiers (execution state + execution history) with deduplication logic. This adds complexity to search and get-by-id functions compared to the previous single-index approach.
- **Eventual consistency for history**: There is a configurable delay (default: 1 day) before completed executions appear in execution history. During this window, completed executions are served from execution state, which works correctly but means execution history is not immediately up to date.
- **Additional infrastructure**: Two data streams, a scheduled task, and a separate execution state index add operational surface area compared to the original two plain indices.
- **Mapping discipline required**: Data streams use `dynamic: false`, so any new field that needs to be searchable must be explicitly added to the mappings and the data stream version bumped. Forgetting this results in fields that are stored but silently unsearchable.
- **Step metadata duplication**: Step execution documents carry `input`, `output`, and `error` fields that can be large. After migration, these exist in both execution state (until cleanup) and execution history, temporarily doubling storage. This is a pre-existing data model concern -- the fields are already large in the current single-index design. The tiered architecture does not make the problem worse; it just surfaces it more visibly. A potential future mitigation is storing large fields by reference in a dedicated data stream.

## Risks and Open Questions

- **Data stream mapping evolution**: Adding or changing mapped fields requires bumping the data stream version. Fields not explicitly mapped are stored in `_source` but not indexed (not searchable).
- **Tuning the lifecycle interval**: The `lifecycleInterval` controls both how often the task runs and how long data stays in execution state. Too aggressive (e.g., `1h`) could cause frequent reindex operations impacting cluster performance; too conservative (e.g., `7d`) could let the execution state index grow unnecessarily. The default (`1d`) is a starting point, but optimal values will depend on execution volume and cluster size.
- **Catch-up reindex after extended downtime**: If the migration task has not run for an extended period (e.g., Task Manager was down for a week), the catch-up reindex may cover a large volume of documents. Using `slices: 'auto'` and `requests_per_second` throttling can limit cluster impact. The system remains correct during the catch-up (execution state index continues to serve reads), but query performance for the execution state index may be degraded until cleanup runs.
- **Large step output/input/error fields**: Step execution documents can carry large `input`, `output`, and `error` fields. This is a pre-existing data model concern -- not introduced by the tiered architecture. These fields are stored in `_source` but not indexed (`dynamic: false`), so they do not affect search performance. An application-layer size limit or storage-by-reference scheme may be warranted in the future, but is out of scope for this RFC.
- **Generalization**: The "mutable state index + append-only data stream + scheduled migration" pattern appears generic, but workflow executions are the only Kibana entity that requires all four properties simultaneously: mutable state, long-running/yielding execution, high volume, and persistent history. Other plugins avoid this combination -- Task Manager deletes completed tasks (no history), Event Log and Alerting write to data streams from birth (no mutability). The closest external analogies are workflow orchestrators like Temporal.io and AWS Step Functions, which use a similar tiered separation of active execution state from execution history. Extraction into a shared utility is a potential future improvement, but out out of scope for this RFC.
