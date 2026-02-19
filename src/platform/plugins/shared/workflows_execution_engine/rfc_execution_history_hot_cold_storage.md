# RFC: Workflow Execution History with Hot/Cold Storage Architecture

## Summary

This RFC proposes a tiered storage architecture for workflow execution data, separating **hot storage** (mutable execution state) from **cold storage** (append-only execution history). Active workflow executions live in a regular Elasticsearch index optimized for reads and updates, while completed executions are migrated to Elasticsearch data streams optimized for time-series history and long-term retention.

## TLDR

- **Before**: One index per entity (workflows, steps), mixing active and historical data. Unbounded growth, no lifecycle management, degrading query performance over time.
- **After**: Two-tier architecture. A single small execution state index handles all active execution reads/writes via fast `mget` lookups. Completed executions automatically migrate to append-only data streams with ILM-managed retention. Queries transparently span both tiers.
- **Result**: Hot storage stays small and fast. Cold storage scales with time-series optimizations and automatic lifecycle management. The execution engine gains a unified type model where workflows and steps are treated as the same concept. Migration and cleanup are automated, configurable, and idempotent.

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

The hot/cold architecture gives the execution engine what it needs from each tier: a mutable index with `mget` support for fast, consistent runtime state, and append-only data streams with ILM for scalable, managed history. The two tiers are connected by automated migration, and queries transparently span both when needed.

## Design

This architecture follows the **CQRS (Command Query Responsibility Segregation)** pattern combined with **hot/cold tiered storage** -- both well-established patterns in distributed systems. Hot storage serves as the "command" side (fast mutable state for the execution engine), while cold storage serves as the "query" side (optimized for historical search, reporting, and auditing). Automated migration connects the two tiers, and queries transparently span both when needed.

### Tiered Storage Model

```
┌─────────────────────────────────────────────────────────────┐
│                     Hot Storage                             │
│              (Execution State Index)                        │
│                                                             │
│  - Active workflow & step executions                        │
│  - Mutable: supports updates, deletes, upserts             │
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
│                     Cold Storage                            │
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

### Unified Execution State (Hot Storage)

A single **Execution State Repository** manages all mutable execution data in a regular Elasticsearch index (`.workflows-execution-state`). Both workflow and step execution documents are stored in the same index, distinguished by a `type` field (`'workflow'` or `'step'`).

This unified storage reflects the fact that workflow and step executions are fundamentally the same concept. A workflow execution is an orchestrator that coordinates step executions, but a step execution can itself be an orchestrator for other steps (e.g., `if` steps, `foreach` steps, sub-workflow steps). Both share the same lifecycle (pending, running, completed, failed, cancelled), the same state management patterns, and the same fields (id, status, timestamps, errors, outputs). The only difference is the `type` discriminator and a few type-specific fields.

A unified type model (`EsBaseExecution`) captures this by defining the shared fields, with `EsWorkflowExecution` and `EsWorkflowStepExecution` extending it with their specific additions.

Storing both types in the same index also enables a key performance optimization: **loading full execution state in a single `mget` call**. Since workflow executions track the IDs of all their child step executions (via `stepExecutionIds`), the execution engine can fetch a workflow and all its steps in one O(1) multi-get request using known document IDs. This avoids costly search queries during the execution loop, which is critical because execution state is loaded and flushed frequently as workflows progress through steps. A single-index design makes this possible without cross-index joins.

This repository handles:
- Creating and updating workflow/step executions during the execution loop
- Loading full execution trees via `mget` (workflow + all steps in one call)
- Querying for active (non-terminal) executions for concurrency checks
- Cancellation status polling
- Bulk upserts for state flushes from the in-memory execution state

### Execution History Data Streams (Cold Storage)

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
- Reindexing from hot storage (used by the migration task)

### Querying Across Both Tiers

Functions that need to return execution data regardless of whether it's active or completed query both tiers:

- **Search workflow executions**: Queries both the execution state index and the workflow execution data stream simultaneously, using field collapsing on `id` to deduplicate results that may exist in both.
- **Get workflow execution by ID**: First checks the execution state repository (for active executions), then falls back to the workflow execution data stream (for historical executions).
- **Get step executions**: Same pattern — checks execution state first, falls back to the step execution data stream.

Between migration and cleanup, the same execution may temporarily exist in both tiers. This overlap window is handled by design: search queries use field collapsing (`collapse: { field: 'id' }`) to return only one result per execution, and get-by-id queries use a waterfall pattern (check hot first, fall back to cold) that naturally returns the most up-to-date version. Count-based queries (e.g., for pagination totals) may reflect slightly inflated numbers during the overlap, but this is transient and resolves after cleanup runs.

### Automated Migration

A scheduled Task Manager task handles migration from hot to cold storage:

- **Frequency**: Runs daily (configurable via Task Manager scheduling).
- **Migration step**: Reindexes terminal (completed, failed, cancelled, skipped) workflow and step executions older than a configurable threshold (default: 1 day) from the execution state index to the respective data streams. Uses ES `reindex` API with `op_type: 'create'` and `conflicts: 'proceed'` for idempotency.
- **Cleanup step**: Deletes terminal executions older than a separate configurable threshold (default: 3 days) from the execution state index. Only deletes executions belonging to workflow runs where ALL documents (workflow + steps) are in terminal status, preventing partial deletion of still-active workflow runs.

The gap between migration threshold (1 day) and cleanup threshold (3 days) provides a safety buffer — data has multiple migration windows before cleanup considers it for deletion.

### Failure Recovery

The migration process is designed to be safe against partial failures at any point:

- **Reindex is idempotent**: The `conflicts: 'proceed'` option means re-running migration for already-migrated documents is a no-op. If the task is interrupted and retried, it simply skips documents that already exist in cold storage.
- **Cleanup is independent and conservative**: Cleanup only deletes documents older than the cleanup threshold (default: 3 days), which is significantly larger than the migration threshold (default: 1 day). Even if migration fails for an entire day, cleanup will not delete un-migrated data because those documents haven't aged past the cleanup threshold yet.
- **No transactional coupling**: Migration and cleanup are separate operations within the same task. If reindex succeeds but cleanup fails (or vice versa), the system remains in a consistent state — at worst, data exists in both tiers temporarily, which is handled by deduplication in queries.

### Multi-Node Safety

The migration task is registered and scheduled via Kibana Task Manager, which guarantees that only one Kibana instance executes the task at any given time across a multi-node deployment. There is no risk of duplicate migrations or conflicting cleanup operations running in parallel.

### Space Isolation

All execution documents carry a `spaceId` field, and all queries — both in hot and cold storage — filter by `spaceId`. The migration process preserves space isolation because it copies documents as-is (including their `spaceId`) via ES reindex, and the cleanup uses `deleteByQuery` which operates on the documents' own fields. Cross-tier query functions (search, get-by-id) always include `spaceId` in their filters, ensuring tenants never see each other's execution data regardless of which storage tier the data resides in.

### Configuration

Two configurable duration thresholds are exposed in `kibana.yml`:

- `workflowsExecutionEngine.executionHistory.migration.olderThan` (default: `1d`): Age threshold for migrating terminal executions to history data streams.
- `workflowsExecutionEngine.executionHistory.cleanup.olderThan` (default: `3d`): Age threshold for deleting terminal executions from hot storage.

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

The execution history data streams must ship with a **default ILM policy** to prevent unbounded growth of cold storage. This policy will define sensible defaults for retention and rollover (e.g., delete execution history older than 30 days, rollover based on index size), ensuring that historical data is automatically managed without any user intervention.

**TODO**: Provide users with the ability to configure ILM policies through a UI in the Workflow Execution Manager. Different deployments have different retention needs -- compliance-heavy environments may require months or years of history, while resource-constrained environments may prefer aggressive cleanup. A UI setting would allow users to adjust retention periods and lifecycle phases without directly editing ILM policies in Elasticsearch.

## Upgrade Path for Existing Deployments

Existing deployments store execution history in two legacy indices that predate the hot/cold architecture:

- `.workflows-executions` -- workflow execution documents
- `.workflows-step-executions` -- step execution documents

These documents are already completed (terminal) and should migrate directly to the cold storage data streams, bypassing hot storage entirely. Routing them through the execution state index would temporarily bloat it with potentially large volumes of historical data, degrading performance for active execution queries.

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
3. After successful reindex, delete the legacy indices.
4. This runs once on upgrade and is a no-op on subsequent startups (legacy indices no longer exist).

## Observability (TODO)

The migration task should provide visibility into its health and effectiveness. This includes:

- Logging the number of documents migrated and cleaned up per run, along with task duration.
- Surfacing migration task status (last run time, success/failure) in the Workflow Execution Manager UI or a health endpoint.
- Alerting operators when the migration task has not run successfully within a configurable window, indicating potential issues with Task Manager or Elasticsearch availability.

## Benefits and Trade-offs

### Benefits

- **Bounded hot storage**: The execution state index only contains active and recently-completed executions. It stays small regardless of how many workflows have been executed historically, keeping all active-execution queries (concurrency, cancellation, state loading) consistently fast.
- **O(1) state loading**: Storing workflows and steps in a single index with known IDs enables `mget`-based lookups, eliminating search queries from the critical execution loop path.
- **Automatic lifecycle management**: Data streams support ILM policies natively. Historical execution data can be automatically rolled over, moved to cheaper storage tiers, and eventually deleted -- without custom cleanup logic.
- **Unified type model**: Treating workflows and steps as the same base concept (both are executions, both can orchestrate children) simplifies the data model, reduces code duplication, and makes the system easier to extend with new execution types.
- **Idempotent and safe migration**: The migration process can fail, be retried, or run multiple times without data loss or corruption. The gap between migration and cleanup thresholds guarantees data is safely in cold storage before it's removed from hot.
- **Configurable retention**: Operators can tune migration/cleanup thresholds and ILM policies to match their deployment's volume, compliance, and resource constraints.

### Trade-offs

- **Increased query complexity**: Reading execution data now requires querying two tiers (hot + cold) with deduplication logic. This adds complexity to search and get-by-id functions compared to the previous single-index approach.
- **Eventual consistency for history**: There is a configurable delay (default: 1 day) before completed executions appear in cold storage. During this window, completed executions are served from hot storage, which works correctly but means cold storage is not immediately up to date.
- **Additional infrastructure**: Two data streams, a scheduled task, and a separate execution state index add operational surface area compared to the original two plain indices.
- **Mapping discipline required**: Data streams use `dynamic: false`, so any new field that needs to be searchable must be explicitly added to the mappings and the data stream version bumped. Forgetting this results in fields that are stored but silently unsearchable.
- **Step metadata duplication**: Step execution documents carry `input`, `output`, and `error` fields that can be large. These are stored in both the execution state index and the history data streams after migration, effectively doubling storage for this data. A potential mitigation is introducing a dedicated **step metadata data stream** that stores only input/output/error, while the execution state index and the workflow/step execution data streams store only lightweight step data (status, timestamps, IDs). This would reduce document size in both tiers at the cost of an additional data stream and a join at query time when full step details are needed.

## Risks and Open Questions

- **Data stream mapping evolution**: Adding or changing mapped fields requires bumping the data stream version. Fields not explicitly mapped are stored in `_source` but not indexed (not searchable).
- **Tuning migration and cleanup thresholds**: The migration age threshold, cleanup age threshold, and task schedule frequency need to be balanced for production workloads. Too aggressive migration/cleanup could impact hot storage performance during reindex; too conservative could let the execution state index grow unnecessarily. The current defaults (migrate after 1 day, clean up after 3 days, run daily) are a starting point, but optimal values will depend on execution volume, cluster size, and observability requirements. All thresholds are configurable.
