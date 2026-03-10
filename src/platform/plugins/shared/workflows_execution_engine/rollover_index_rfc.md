# RFC: Workflow Execution State with Rollover Index Strategy

## Summary

This RFC proposes replacing the current flat Elasticsearch indexes for workflow execution state with **ILM-managed rollover aliases**. Each execution pins the backing index active at its creation time, ensuring all documents for that execution live in the same index regardless of subsequent rollovers. Completed executions are cleaned up by dropping entire backing indexes once all their executions reach terminal status -- an O(1) operation that avoids the performance cost of `delete_by_query`. **Encoded execution IDs** carry index routing information, enabling direct O(1) document lookups without alias fan-out.

## TLDR

- **Before**: Two flat indexes (`.workflows-executions`, `.workflows-step-executions`) with hardcoded names. No lifecycle management, unbounded growth, and `delete_by_query` as the only cleanup mechanism -- which degrades hot index performance through inverted-index overhead and segment merge costs.
- **After**: ILM-managed rollover aliases where each workflow execution pins the backing index it was created in. Writes target the pinned index; reads by ID decode the index from the execution ID itself. Old backing indexes where every execution is terminal are dropped whole.
- **Result**: Execution state indexes stay bounded and fast. Cleanup is O(1) (whole-index deletion, no `delete_by_query`). Mutability (`update`, `mget`, `doc_as_upsert`) is fully preserved -- unlike data streams. The architecture remains single-tier with no migration tasks or cross-tier query complexity.

## Motivation

The current implementation uses two flat Elasticsearch indexes with hardcoded names for all workflow execution data, both active and historical. This creates several problems:

- **Unbounded index growth**: The execution indexes grow indefinitely as completed executions accumulate alongside active ones. There is no mechanism to remove historical data without affecting the active execution path.
- **Expensive cleanup via `delete_by_query`**: The only way to remove completed executions is `delete_by_query`, which marks documents as deleted in Lucene segments rather than physically removing them. This creates tombstones that degrade search performance and triggers expensive segment merges as Elasticsearch consolidates the sparse segments.
- **No lifecycle management**: There is no ILM policy, no rollover, and no automatic aging of execution data. The indexes must be managed entirely through application-level cleanup logic.
- **Degrading query performance**: Queries for active executions (concurrency checks, cancellation polling, execution state loading) slow down as historical data accumulates in the same index, because every search must scan past completed execution documents.

## Why Not Data Streams (CQRS) or Event Sourcing?

Two alternative approaches were considered and rejected:

### Why not data streams with tiered storage (the CQRS approach)?

A prior RFC proposed separating execution data into two tiers: a mutable execution state index for active executions and append-only data streams for completed execution history, connected by a scheduled migration task. This approach is technically sound but introduces significant complexity:

- **Two-tier query complexity**: Every read operation must query both tiers and deduplicate results. Get-by-id uses a waterfall pattern (check state index first, fall back to history). Search queries span both tiers with field collapsing for dedup. Pagination totals can be inflated during the overlap window between migration and cleanup.
- **Scheduled migration task**: A Task Manager task must periodically reindex terminal executions from the state index to data streams, then clean up the state index after a safety gap. This adds a background process that must be monitored, configured, and debugged.
- **Additional infrastructure**: Two data streams, a scheduled task, and a separate state index add operational surface area. The migration/cleanup thresholds must be tuned to balance state index size against migration frequency.
- **Data streams lack mutability**: Data streams are append-only and do not support `update`, `delete`, or `mget` by document ID. The execution engine fundamentally requires mutable state during workflow execution, which is why the CQRS approach still needs a regular index for active state -- the data streams only serve historical queries.

### Why not event sourcing?

Event sourcing (appending immutable events and reconstructing state by replaying them) was considered but rejected for the same reasons as the prior RFC:

- **Unbounded events per execution**: Orchestrating steps (`if`, `foreach`, sub-workflows) can emit many state transitions per execution. The number of events is unpredictable and potentially large.
- **Consumers need objects, not event streams**: The UI, APIs, and internal consumers all expect materialized execution objects. Replaying events on every read adds latency and makes pagination and filtering significantly harder.
- **Runtime state must be fast and bounded**: The execution loop reads and writes state on every step transition. Replaying an event log on each read is not viable at the frequency the execution engine operates.

### The chosen approach

Rollover aliases give the execution engine what it needs from a single tier: full mutability (`update`, `mget`, `doc_as_upsert`) for the execution loop, ILM-managed lifecycle for automatic rollover, and O(1) cleanup via whole-index deletion when a backing index contains only terminal executions. Unlike the CQRS approach, there is no second tier, no migration task, no cross-tier queries, and no deduplication logic.

## Design

This architecture follows the **rollover alias** pattern -- a well-established Elasticsearch mechanism used by alerting, APM, and security indexes in Kibana. An alias points to a series of numbered backing indexes (e.g., `-000001`, `-000002`). ILM automatically rolls over to a new backing index based on configurable thresholds. Reads via the alias fan out across all backing indexes; writes target either the current write index (for new executions) or a pinned backing index (for existing non-terminal executions).

### Rollover Alias Architecture

```
┌─────────────────────────────────────────────────────────────┐
│           Alias: .workflows-executions                      │
│                                                             │
│  ┌──────────────────────┐  ┌──────────────────────┐        │
│  │ -000001 (old)        │  │ -000002 (old)        │  ...   │
│  │ All execs terminal   │  │ Mixed: some active   │        │
│  │ → eligible for drop  │  │ → kept               │        │
│  └──────────────────────┘  └──────────────────────┘        │
│                                                             │
│  ┌──────────────────────┐                                   │
│  │ -000003 (write index)│ ← new executions land here       │
│  │ Active + recent      │                                   │
│  └──────────────────────┘                                   │
│                                                             │
│  ILM: rollover on max_age (default: 1d)                    │
│  Cleanup: drop backing indexes where all execs are terminal │
└─────────────────────────────────────────────────────────────┘
```

On plugin startup, the system ensures three Elasticsearch resources exist for each execution index (workflow executions and step executions):

1. **ILM policy**: A lifecycle policy with a single `hot` phase that rolls over based on `max_age` (configurable, default `1d`).
2. **Index template**: Matches the index pattern (e.g., `.workflows-executions-*`), applies the ILM policy and rollover alias, and defines field mappings.
3. **Bootstrap write index**: The initial backing index (e.g., `.workflows-executions-000001`) with the alias configured as `is_write_index: true`.

See `setupRolloverIndex()` in `common/create_index.ts` for the implementation.

### Per-Execution Index Pinning

When a workflow execution starts, the plugin resolves the current write index for both the workflow executions alias and the step executions alias via the `indices.getAlias` API. These concrete backing index names are stored on the workflow execution document:

```typescript
interface EsWorkflowExecution {
  // ... existing fields ...
  stepExecutionsIndex?: string;  // e.g., ".workflows-step-executions-000003"
  executionsIndex?: string;      // e.g., ".workflows-executions-000003"
}
```

This pinning ensures that:

- **All documents for one execution live in the same backing index.** Even if ILM rolls over mid-execution (creating `-000004`), all subsequent updates and step document upserts for the pinned execution continue targeting `-000003`. There is no cross-index splitting.
- **The pinning is race-free.** The write index name is resolved from the `indices.getAlias` response, which always reflects the current state of the alias. If ILM rolls over between the alias resolution and the first write, the document simply lands in the new write index -- and that new index name is what gets stored on the execution document via the ES `index` response.

The resolution happens once per execution at creation time. All downstream writes (state flushes from `WorkflowExecutionState`, step upserts, status updates) use the pinned index names rather than the alias:

```
Workflow starts:
    resolvedExecutionsIndex = workflowExecutionRepository.resolveWriteIndex()
    resolvedStepExecutionsIndex = stepExecutionRepository.resolveWriteIndex()

    workflowExecution = {
        id: generateEncodedWorkflowExecutionId(resolvedExecutionsIndex, pattern),
        executionsIndex: resolvedExecutionsIndex,
        stepExecutionsIndex: resolvedStepExecutionsIndex,
        ...
    }

    workflowExecutionRepository.createWorkflowExecution(workflowExecution)

Subsequent state flushes:
    // Workflow updates target the pinned index
    workflowExecutionRepository.updateWorkflowExecution(changes, execution.executionsIndex)

    // Step upserts target the pinned index
    stepExecutionRepository.bulkUpsert(stepChanges, execution.stepExecutionsIndex)
```

### Encoded Execution IDs

Execution IDs encode the backing index suffix so that any caller holding an ID can resolve the backing index without querying the alias. This enables direct O(1) document lookups without alias fan-out.

- **Workflow execution ID**: Base64url encoding of `{indexSuffix}_{uuidHex}`, where `indexSuffix` is the portion of the backing index name after the alias prefix (e.g., `000003`) and `uuidHex` is a UUID v4 with dashes removed.

  For example, an execution created in backing index `.workflows-executions-000003`:
  ```
  indexSuffix: "000003"
  uuid:        "a1b2c3d4e5f6..."  (32 hex chars)
  decoded:     "000003_a1b2c3d4e5f6..."
  encoded:     base64url("000003_a1b2c3d4e5f6...")  →  "MDAwMDAzX2ExYjJjM2Q0ZTVmNi4uLg"
  ```

  See `generateEncodedWorkflowExecutionId()` in `kbn-workflows/server/utils/generate_execution_id/generate_execution_id.ts`.

- **Step execution ID**: Base64url encoding of `{indexSuffix}_{sha256Hash}`, where the SHA-256 hash is computed from `{executionId}_{scopePath}_{stepId}` (the same deterministic scheme from the prior RFC). The index suffix comes from the step executions backing index pinned on the workflow execution.

  See `generateEncodedStepExecutionId()` in `kbn-workflows/server/utils/generate_step_execution_id/generate_step_execution_id.ts`.

- **Index resolution**: Given an encoded ID, `decodeEncodedWorkflowExecutionId()` extracts the `indexSuffix`, and `resolveIndex({ indexSuffix, indexPattern })` reconstructs the full backing index name by replacing the `*` in the pattern with the suffix.

  See `resolveIndex()` in `kbn-workflows/server/utils/resolve_index/resolve_index.ts`.

### Dual-Mode Read/Write Pattern

The repositories use two modes depending on the operation:

**Writes** follow a pinned-index pattern:
- **New executions**: Write to the alias (routes to the current write index). The alias handles write-index routing automatically.
- **Existing executions**: Write to the pinned backing index stored on the workflow execution document. This ensures updates never cross index boundaries.

**Reads** follow two patterns depending on whether the caller has an ID:

**Get execution by ID** (O(1) direct GET):

```
getWorkflowExecution(encodedId, spaceId):
    { indexSuffix } = decodeEncodedWorkflowExecutionId(encodedId)
    backingIndex = resolveIndex(indexSuffix, WORKFLOWS_EXECUTIONS_INDEX_PATTERN)

    doc = esClient.get(index: backingIndex, id: encodedId)
    if doc.spaceId !== spaceId:
        return null
    return doc
```

**Get step executions for a workflow** (mget on pinned index):

```
getStepExecutions(workflowExecution):
    if workflowExecution.stepExecutionIds AND workflowExecution.stepExecutionsIndex:
        // O(1) mget — real-time, not subject to refresh interval
        return esClient.mget(
            index: workflowExecution.stepExecutionsIndex,
            ids: workflowExecution.stepExecutionIds
        )

    // Fallback for backward compatibility with pre-rollover executions
    return esClient.search(
        index: stepsExecutionAlias,
        query: { match: { workflowRunId: executionId } }
    )
```

**Search executions** (alias fan-out):

```
searchWorkflowExecutions(query, spaceId, sort, size):
    return esClient.search(
        index: WORKFLOWS_EXECUTIONS_INDEX,  // alias — fans out to all backing indexes
        query: query AND { term: { spaceId } },
        sort, size
    )
```

#### Read Performance Characteristics

**Get-by-id**: O(1) direct GET on a specific backing index. No alias fan-out, no search query, not subject to the index refresh interval. This is the hot path for cancel polling, execution status checks, and UI polling.

**Step execution loading**: O(1) `mget` on a single backing index using the `stepExecutionIds` manifest from the workflow execution document. All step documents for one execution live in the same backing index due to index pinning, so the mget targets a single shard set.

**Search queries**: Fan out across all backing indexes via the alias. Performance is proportional to the total number of backing indexes, but in practice the cleanup task keeps this bounded to a small number (typically the current write index plus a few old indexes with long-running executions).

### Automated Cleanup (TOBEDEFINED)

The cleanup mechanism for dropping fully-terminal backing indexes is not yet implemented. The design intent is:

- A periodic background task lists all backing indexes for each alias.
- The current write index is always skipped.
- For each old backing index, the task counts non-terminal documents. If zero, the entire index is dropped -- an O(1) operation with no `delete_by_query`, no tombstones, and no segment merge overhead.
- The cleanup is safe because active executions have their write index pinned (they never reference old indexes) and terminal statuses are immutable.

The exact implementation (Task Manager task vs. system workflow, frequency, error handling, observability) is to be defined.

### Failure Recovery

- **ILM rollover is atomic**: Elasticsearch handles rollover internally. If the Kibana node restarts during a rollover, ILM completes or retries the operation independently. There is no application-level state to recover.
- **Index pinning is race-free**: The backing index name is resolved from the alias metadata and stored on the execution document atomically during creation. If ILM rolls over between resolution and the first write, the document lands in whichever index ES routes it to, and that index name is what gets persisted. Subsequent writes use the persisted name.
- **No transactional coupling**: Rollover and cleanup are independent operations. ILM manages rollover; the cleanup mechanism (TOBEDEFINED) manages deletion. Neither depends on the other's success. The system is always in a consistent state -- at worst, old backing indexes accumulate until the next successful cleanup run.

### Multi-Node Safety

ILM rollover is managed by Elasticsearch itself, not by any Kibana node. It executes exactly once regardless of how many Kibana instances are running. The cleanup task is registered via Kibana Task Manager, which guarantees single-node execution across a multi-node deployment. There is no risk of duplicate rollover or conflicting cleanup operations.

### Space Isolation

All execution documents carry a `spaceId` field, and all queries filter by `spaceId`. Index pinning does not affect space isolation because all executions in a backing index are separated by their `spaceId` at query time. The cleanup task operates on index-level metadata (terminal status counts) and does not need to be space-aware -- it drops an entire backing index only when every document in it is terminal, regardless of which space the documents belong to.

### Configuration

A single configuration knob controls the rollover behavior in `kibana.yml`:

- `workflowsExecutionEngine.rolloverMaxAge` (default: `'1d'`): The ILM `max_age` threshold for rollover. Controls how frequently new backing indexes are created. Lower values (e.g., `'1h'`) create more backing indexes but enable more granular cleanup. Higher values (e.g., `'7d'`) create fewer indexes but delay cleanup of completed executions. Changes take effect on the next Kibana restart.

## Key Changes

### New Components

- **`setupRolloverIndex()`**: Orchestrates ILM policy creation, index template setup, and write index bootstrapping. Replaces the flat `createOrUpdateIndex` calls.
- **Encoded execution ID utilities**: `generateEncodedWorkflowExecutionId()`, `decodeEncodedWorkflowExecutionId()`, `generateEncodedStepExecutionId()`, `decodeEncodedStepExecutionId()` -- encode/decode index routing information in execution IDs.
- **`resolveIndex()`**: Reconstructs a backing index name from an index suffix and pattern.
- **`resolveWriteIndex()`**: Resolves the current write index for an alias via `indices.getAlias`. Added to both `WorkflowExecutionRepository` and `StepExecutionRepository`.
- **Index pinning fields**: `executionsIndex` and `stepExecutionsIndex` on `EsWorkflowExecution`, storing the pinned backing index names.
- **`getStepExecutionsByIds()`**: Enables `mget`-based step execution loading when the backing index and step IDs are known.
- **Index definition modules**: `workflow_executions_index.ts` and `step_executions_index.ts` centralize alias names, ILM policy names, index patterns, initial index names, and mappings.

### Removed Components

- Flat index creation via `createOrUpdateIndex()` with hardcoded index names (replaced by `setupRolloverIndex()` with alias-based infrastructure).
- Plain UUID execution IDs (replaced by encoded IDs carrying index routing).
- `buildStepExecutionId()` as the direct step ID generator (replaced by `generateEncodedStepExecutionId()` which wraps it with index encoding).

## Upgrade Path for Existing Deployments (TOBEDEFINED)

Existing deployments have two flat indexes with hardcoded names (`.workflows-executions`, `.workflows-step-executions`) that share the same names as the rollover aliases. The upgrade must convert these flat indexes into aliased rollover indexes without data loss, and handle backward compatibility for pre-encoded execution IDs (plain UUIDs).

The exact migration mechanism (rename-and-alias on startup, one-time migration task, or other approach), backward compatibility strategy for pre-encoded IDs, rollback safety, and upgrade process steps are to be defined.

## Observability (TODO)

The cleanup task should provide visibility into its health and effectiveness:

- Logging the number of backing indexes checked and deleted per run, along with task duration.
- Monitoring the total number of backing indexes per alias as a health metric. An increasing count may indicate long-running executions preventing cleanup.
- Alerting operators when the cleanup task has not run successfully within a configurable window.

## Benefits and Trade-offs

### Benefits

- **Bounded execution indexes**: ILM automatically creates new backing indexes on a configurable cadence. Old backing indexes are dropped whole once all their executions are terminal. The total volume of data that search queries must scan is bounded by the number of active backing indexes, not the total number of historical executions.
- **O(1) cleanup**: Deleting an entire backing index is instantaneous and reclaims all resources immediately. There are no tombstones, no segment merges, and no lingering deleted documents. This is a fundamental improvement over `delete_by_query`, which creates per-document deletion markers that degrade performance until segment merges complete.
- **Preserved mutability**: Unlike data streams, rollover aliases fully support `update`, `doc_as_upsert`, `mget`, and `delete` operations. The execution engine's flush loop, which updates workflow and step documents on every step transition, works without any changes to the write pattern.
- **Single-tier simplicity**: There is no second storage tier, no migration task, no cross-tier queries, and no deduplication logic. All execution data lives in the same set of backing indexes behind the alias. Reads and writes use the same index infrastructure.
- **O(1) document lookups via encoded IDs**: Encoded execution IDs carry the backing index suffix, enabling direct GET operations on a specific backing index. This avoids alias fan-out for by-ID lookups, which is the hot path for cancel polling, execution status checks, and UI polling.
- **Transparent search via alias**: Search queries use the alias, which fans out across all backing indexes automatically. No application-level coordination is needed to search across the full execution history.

### Trade-offs

- **Encoded ID complexity**: Execution IDs are no longer human-readable UUIDs. They are base64url-encoded strings that require decoding to extract the index suffix. This adds complexity to debugging (IDs must be decoded to understand which backing index they reference) and to any external system that stores or parses execution IDs.
- **Long-running executions hold old indexes open**: A workflow with a multi-hour timeout or indefinite wait steps prevents its backing index from being deleted, even if all other executions in that index are terminal. In extreme cases, this could lead to index accumulation. Monitoring the backing index count and setting maximum execution timeouts mitigates this risk.
- **ILM dependency**: The architecture depends on ILM being enabled and functioning correctly in the Elasticsearch cluster. If ILM is disabled or misconfigured, rollover will not occur and the index will behave like a flat index (growing unboundedly). This is mitigated by the fact that ILM is a core Elasticsearch feature that is enabled by default and widely used.
- **Separate indexes for workflows and steps**: Unlike the unified execution state index proposed in the prior RFC, this approach retains two separate indexes (one for workflow executions, one for step executions). This means two ILM policies, two rollover aliases, and two sets of backing indexes. The operational surface area is doubled compared to a unified index. However, this matches the existing index structure and avoids the migration complexity of merging two index schemas.
- **No built-in history tier**: All execution data (active and historical) lives in the same alias. There is no separate history layer optimized for long-term retention, time-series queries, or different storage tiers. If long-term execution history with different retention policies is needed in the future, a history tier (data streams or similar) can be added as an extension to this architecture.

## Risks and Open Questions

- **Cleanup mechanism not yet implemented (TOBEDEFINED)**: The POC validates the rollover, pinning, and encoded ID mechanics, but the cleanup mechanism that drops fully-terminal backing indexes is not yet built. The design, implementation approach, and operational model are to be defined.
- **Upgrade migration not yet implemented (TOBEDEFINED)**: The migration from existing flat indexes to rollover-based aliases, including backward compatibility for pre-encoded execution IDs, is to be defined. Key concerns include the flat-index-name / alias-name collision (Elasticsearch does not allow both to share the same name) and the fallback strategy for legacy plain-UUID execution IDs.
- **Tuning rollover frequency**: The `rolloverMaxAge` default of `1d` is a starting point. Too aggressive (e.g., `1h`) creates many backing indexes, increasing the number of shards and the cost of alias fan-out for search queries. Too conservative (e.g., `7d`) delays cleanup and lets the active index grow larger. Optimal values depend on execution volume and cluster size.
- **Index count under high concurrency**: If many long-running executions span multiple rollover periods, the number of backing indexes held open can grow. Each backing index consumes cluster resources (shard memory, file handles). Monitoring and a max-age safety net (force-close executions in indexes older than a configurable threshold) should be considered.
- **Mapping evolution**: Index templates apply mappings to new backing indexes automatically, but existing backing indexes are not updated when the template changes. If a new field is added to the mappings, only new backing indexes will have it indexed. Old backing indexes will store the field in `_source` (because `dynamic: false`) but it will not be searchable. This is the same constraint as data streams and requires explicit reindexing for retroactive mapping changes.
