# RFC: Workflow Execution State with Rollover Index Strategy

## Summary

This RFC proposes replacing the current flat Elasticsearch indexes for workflow execution state with **ILM-managed rollover aliases**. Each execution pins the backing index active at its creation time, ensuring all documents for that execution live in the same index regardless of subsequent rollovers. Backing indexes are advanced through ILM lifecycle phases once all their executions reach terminal status, keeping active indexes small and enabling cost-optimized long-term retention. **Encoded execution IDs** carry index routing information, enabling direct O(1) document lookups without alias fan-out.

## TLDR

- **Before**: Two flat indexes (`.workflows-executions`, `.workflows-step-executions`) with hardcoded names. No lifecycle management, unbounded growth, and `delete_by_query` as the only cleanup mechanism -- which degrades hot index performance through inverted-index overhead and segment merge costs.
- **After**: ILM-managed rollover aliases where each workflow execution pins the backing index it was created in. Writes target the pinned index; reads by ID decode the index from the execution ID itself. Old backing indexes where every execution is terminal are advanced through ILM lifecycle phases for long-term retention and eventual deletion.
- **Result**: Active execution indexes stay bounded and fast. No `delete_by_query` is needed. Mutability (`update`, `mget`, `doc_as_upsert`) is fully preserved -- unlike data streams. Fully-terminal backing indexes are managed by ILM lifecycle phases, enabling cost-optimized storage and eventual automatic deletion. Unlike the CQRS approach, there is no migration task and no deduplication logic.

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

Rollover aliases give the execution engine what it needs: full mutability (`update`, `mget`, `doc_as_upsert`) for the execution loop, ILM-managed lifecycle for automatic rollover, and ILM-managed lifecycle progression once a backing index contains only terminal executions. Unlike the CQRS approach, there is no migration task and no deduplication logic. All execution data -- active and historical -- lives behind a single alias, with ILM managing the progression of fully-terminal backing indexes through lifecycle phases.

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
│  │ → eligible for ILM   │  │ → kept in hot         │        │
│  │   lifecycle progress  │  │                       │        │
│  └──────────────────────┘  └──────────────────────┘        │
│                                                             │
│  ┌──────────────────────┐                                   │
│  │ -000003 (write index)│ ← new executions land here       │
│  │ Active + recent      │                                   │
│  └──────────────────────┘                                   │
│                                                             │
│  ILM: rollover on max_age (default: 1d)                    │
│  Lifecycle: advance fully-terminal indexes through ILM phases│
└─────────────────────────────────────────────────────────────┘
```

On plugin startup, the system ensures three Elasticsearch resources exist for each execution index (workflow executions and step executions):

1. **ILM policy**: A lifecycle policy with five phases -- hot, warm, cold, frozen, and delete -- that manages the full lifecycle of execution data from active writes through long-term retention to eventual deletion. The hot phase rolls over based on `max_age` (configurable, default `1d`). See the [Tiered Lifecycle Progression](#tiered-lifecycle-progression) section for the full policy and tier transition mechanics.
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

**Search queries**: Fan out across all backing indexes via the alias. Performance is proportional to the total number of backing indexes. The number of hot-phase backing indexes stays small (typically the current write index plus a few old indexes with long-running executions that have not yet reached fully-terminal status). Backing indexes in later lifecycle phases are retained for long-term history but may have higher read latency depending on the tier.

### Tiered Lifecycle Progression

Backing indexes progress through five ILM lifecycle phases, matching the access pattern of execution data as it ages:

| Phase | Contents | Access Pattern |
|-------|----------|----------------|
| **Hot** | Non-terminal executions may be present | Frequent reads and writes (execution loop, cancel polling, UI polling) |
| **Warm** | All executions terminal, recently settled | Read-only, moderate frequency (UI history, debugging) |
| **Cold** | All executions terminal, aged | Infrequent reads (auditing, compliance) |
| **Frozen** | All executions terminal, old | Very rare reads (forensic, regulatory) |
| **Delete** | Past retention window | Removed entirely |

#### ILM Policy

The ILM policy encodes this tier model. The key design choice is that the warm phase has `min_age` set to an impossibly high value (`"99999d"`), which prevents ILM from ever auto-transitioning an index to warm. Instead, the hot-to-warm transition is driven by application logic (see below). Once an index enters warm, all subsequent transitions are automatic.

```json
{
  "policy": {
    "phases": {
      "hot": {
        "actions": {
          "rollover": { "max_age": "1d" }
        }
      },
      "warm": {
        "min_age": "99999d",
        "actions": {
          "forcemerge": { "max_num_segments": 1 },
          "shrink": { "number_of_shards": 1 }
        }
      },
      "cold": {
        "min_age": "30d",
        "actions": {}
      },
      "frozen": {
        "min_age": "90d",
        "actions": {}
      },
      "delete": {
        "min_age": "180d",
        "actions": {
          "delete": {}
        }
      }
    }
  }
}
```

The warm phase applies `forcemerge` (collapse to 1 segment) and `shrink` (reduce to 1 shard) to optimize fully-terminal indexes for read-only access. These actions reduce storage footprint and improve search performance on historical data. Note that `forcemerge` and `shrink` are IO-intensive operations. If many indexes transition to warm simultaneously (e.g., after a Kibana outage where the task backlog builds up), this could temporarily spike cluster IO. The lifecycle progression task processes indexes sequentially to mitigate this.

#### Hot-to-Warm Transition (Application-Driven)

The hot-to-warm transition requires a semantic condition that ILM cannot express natively: "all executions in the backing index are terminal." This is business logic that only the application can evaluate. The transition is driven by a **Kibana Task Manager task** that runs periodically:

1. **List backing indexes**: The task calls the `_alias` API to enumerate all backing indexes for each rollover alias (workflow executions and step executions).
2. **Skip the write index**: The current write index (identified by `is_write_index: true`) is always skipped -- it may contain active executions.
3. **Check ILM phase**: For each non-write backing index, the task calls `GET /{index}/_ilm/explain` to determine its current ILM phase. Only indexes still in the `hot` phase are candidates.
4. **Count non-terminal documents**: For each hot-phase candidate, the task runs a count query for documents with a non-terminal status (`status NOT IN [COMPLETED, FAILED, CANCELLED]`).
5. **Advance to warm**: If the non-terminal count is zero, the task calls `POST /{index}/_ilm/move` to advance the index from the hot phase to the warm phase.

The task runs once per day (default interval). It processes all eligible indexes per run -- the number of hot-phase non-write indexes is expected to be small. Both the workflow executions alias and the step executions alias are processed independently in the same run. Indexes are advanced sequentially (one `_ilm/move` at a time) to avoid overwhelming the cluster with concurrent forcemerge/shrink operations triggered by the warm phase.

The `_ilm/move` API is a supported Elasticsearch mechanism for cases where application logic determines phase readiness. It requires specifying the current ILM step (obtained from `_ilm/explain`) and the target phase. Once the move is issued, ILM takes over and executes the warm phase actions (forcemerge, shrink). There is a benign TOCTOU race: ILM can advance the index's internal step between the `_ilm/explain` and `_ilm/move` calls. If the `current_step` no longer matches, the `_ilm/move` call returns an error. The task treats this as a no-op and retries on the next run.

The progression is safe because:
- Active executions have their write index pinned -- they never reference old backing indexes.
- Terminal statuses are immutable -- once an execution reaches COMPLETED, FAILED, or CANCELLED, it never reverts.
- The `min_age: "99999d"` on warm guarantees ILM will never auto-transition to warm; only the Task Manager task can trigger this transition.

#### Automatic Warm-to-Cold-to-Frozen-to-Delete

Once a backing index enters the warm phase, ILM handles all subsequent transitions automatically based on `min_age` thresholds. No application involvement is needed. The default thresholds are:

- **Warm → Cold**: `30d` after rollover
- **Cold → Frozen**: `90d` after rollover
- **Frozen → Delete**: `180d` after rollover

In a future feature (not part of this RFC), users will be able to configure these retention thresholds to control how long historical execution data is retained at each tier. The hot-to-warm transition is not user-configurable -- it is always driven by the execution engine's terminal-status detection logic.

#### `min_age` Reference Point

ILM `min_age` is calculated relative to the index rollover time (or creation time), not from the time the index entered its current phase. This has practical implications:

**Example**: An index rolls over at T=0. A long-running execution delays the application-driven warm transition until T=15d. Cold is configured at `min_age: 30d`.

- The index enters warm at T=15d (via `_ilm/move`)
- The cold transition fires at T=30d (15 days after entering warm, not 30)
- If the warm transition were delayed until T=45d, the index would transition to cold immediately upon entering warm (because 45d > 30d)

This behavior is acceptable and arguably desirable: if data is old, it should be on cheaper storage regardless of when it became terminal. The `min_age` thresholds reflect the age of the data, not the age of the phase transition.

#### Failure Behavior

If the hot-to-warm `_ilm/move` call fails for any reason (network error, Kibana restart, Elasticsearch unavailable, transient cluster issue), the index simply remains in the hot phase. **No data is lost and no corruption occurs.** The Task Manager task retries on its next scheduled run. The worst-case impact is that a fully-terminal backing index consumes hot-tier resources longer than necessary -- a cost inefficiency, not a correctness problem.

This retry-safe design means the lifecycle progression mechanism has no failure modes that require manual intervention. The system self-heals on the next successful task run.

### Failure Recovery

- **ILM rollover is atomic**: Elasticsearch handles rollover internally. If the Kibana node restarts during a rollover, ILM completes or retries the operation independently. There is no application-level state to recover.
- **Index pinning is race-free**: The backing index name is resolved from the alias metadata and stored on the execution document atomically during creation. If ILM rolls over between resolution and the first write, the document lands in whichever index ES routes it to, and that index name is what gets persisted. Subsequent writes use the persisted name.
- **No transactional coupling**: Rollover and lifecycle progression are independent operations. ILM manages rollover; the Task Manager lifecycle progression task manages phase transitions for fully-terminal indexes. Neither depends on the other's success. The system is always in a consistent state -- at worst, old backing indexes remain in the hot phase until the next successful progression run.
- **Lifecycle progression is retry-safe**: If the `_ilm/move` call fails (network error, Kibana restart, ES unavailable), the index stays in the hot phase. The task retries on the next scheduled run. No data is lost, no inconsistency occurs. The only cost is temporarily holding a read-only index on the hot tier.

### Multi-Node Safety

ILM rollover is managed by Elasticsearch itself, not by any Kibana node. It executes exactly once regardless of how many Kibana instances are running. The lifecycle progression task is registered via Kibana Task Manager, which guarantees single-node execution across a multi-node deployment. There is no risk of duplicate rollover or conflicting lifecycle operations.

### Space Isolation

All execution documents carry a `spaceId` field, and all queries filter by `spaceId`. Index pinning does not affect space isolation because all executions in a backing index are separated by their `spaceId` at query time. The lifecycle progression task operates on index-level metadata (terminal status counts) and does not need to be space-aware -- it advances a backing index through lifecycle phases only when every document in it is terminal, regardless of which space the documents belong to.

### Configuration

A single configuration knob controls the rollover behavior in `kibana.yml`:

- `workflowsExecutionEngine.rolloverMaxAge` (default: `'1d'`): The ILM `max_age` threshold for rollover. Controls how frequently new backing indexes are created. Lower values (e.g., `'1h'`) create more backing indexes but enable more granular lifecycle management. Higher values (e.g., `'7d'`) create fewer indexes but delay lifecycle progression of completed executions. Changes take effect on the next Kibana restart.

**Tier retention thresholds** (warm-to-cold, cold-to-frozen, frozen-to-delete `min_age` values) are set in the ILM policy with sensible defaults (30d, 90d, 180d respectively). In a future feature -- separate from this RFC -- users will be able to configure these thresholds to control how long historical execution data is retained at each tier. The exact configuration surface (kibana.yml knobs, UI settings, or API) will be designed as part of that feature.

**The hot-to-warm transition is not user-configurable.** It is driven entirely by the execution engine's terminal-status detection logic via the Task Manager task. This transition requires a semantic condition ("all executions in the index are terminal") that only the application can evaluate, so it is always automatic and cannot be overridden by user configuration.

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

## Upgrade Path for Existing Deployments

Existing deployments have two flat indexes with hardcoded names (`.workflows-executions`, `.workflows-step-executions`) that share the same names as the rollover aliases. The upgrade must convert these flat indexes into aliased rollover indexes without data loss, and handle backward compatibility for pre-encoded execution IDs (plain UUIDs).

The leading approach is:

1. **Create the first backing index** (e.g., `.workflows-executions-000001`) with the rollover alias configured as `is_write_index: true`, and apply the index template.
2. **Reindex data** from the flat index (`.workflows-executions`) into the new backing index. This copies all existing execution documents into the rollover-managed infrastructure.
3. **Rename the old flat index** to a legacy name (e.g., `.workflows-executions-legacy`) and keep it for a safety period before eventual deletion. This avoids the alias/index name collision (Elasticsearch does not allow an alias and an index to share the same name) and provides a rollback path if issues are discovered.
4. **Backward compatibility for pre-encoded IDs**: Execution IDs created before the migration are plain UUIDs without an encoded index suffix. These cannot be resolved to a specific backing index via decoding. Instead, they fall back to alias-based search lookup rather than direct GET -- slower but functionally correct.

The same process applies to the step executions index (`.workflows-step-executions`).

This is the leading approach, not a finalized design. Details such as rollback safety, the reindex strategy (online vs. offline), the legacy index retention period, and edge cases remain to be defined during implementation.

## Observability (TODO)

The lifecycle progression task should provide visibility into its health and effectiveness:

- Logging the number of backing indexes checked and progressed per run, along with task duration.
- Monitoring the total number of backing indexes per alias and per lifecycle phase as a health metric. An increasing count of hot-phase indexes may indicate long-running executions preventing lifecycle progression.
- Alerting operators when the lifecycle progression task has not run successfully within a configurable window.

## Benefits and Trade-offs

### Benefits

- **Bounded hot-phase indexes**: ILM automatically creates new backing indexes on a configurable cadence. Once all executions in a backing index are terminal, the index is advanced through ILM lifecycle phases, moving it off the hot tier. The hot tier stays small and fast, bounded by the number of actively written backing indexes rather than the total volume of historical executions.
- **ILM-managed lifecycle**: Fully-terminal backing indexes are advanced through ILM lifecycle phases, enabling cost-optimized long-term retention and eventual automatic deletion. No `delete_by_query` is needed at any stage -- there are no tombstones, no segment merges, and no lingering deleted documents.
- **Preserved mutability**: Unlike data streams, rollover aliases fully support `update`, `doc_as_upsert`, `mget`, and `delete` operations. The execution engine's flush loop, which updates workflow and step documents on every step transition, works without any changes to the write pattern.
- **O(1) document lookups via encoded IDs**: Encoded execution IDs carry the backing index suffix, enabling direct GET operations on a specific backing index. This avoids alias fan-out for by-ID lookups, which is the hot path for cancel polling, execution status checks, and UI polling.
- **Transparent search via alias**: Search queries use the alias, which fans out across all backing indexes automatically. No application-level coordination is needed to search across the full execution history.

### Trade-offs

- **Encoded ID complexity**: Execution IDs are no longer human-readable UUIDs. They are base64url-encoded strings that require decoding to extract the index suffix. This adds complexity to debugging (IDs must be decoded to understand which backing index they reference) and to any external system that stores or parses execution IDs.
- **Long-running executions hold old indexes in the hot phase**: A workflow with a multi-hour timeout or indefinite wait steps prevents its backing index from progressing through lifecycle phases, even if all other executions in that index are terminal. In extreme cases, this could lead to hot-phase index accumulation. Monitoring the backing index count and setting maximum execution timeouts mitigates this risk.
- **ILM dependency**: The architecture depends on ILM being enabled and functioning correctly in the Elasticsearch cluster. If ILM is disabled or misconfigured, rollover will not occur and the index will behave like a flat index (growing unboundedly). This is mitigated by the fact that ILM is a core Elasticsearch feature that is enabled by default and widely used.
- **Separate indexes for workflows and steps**: Unlike the unified execution state index proposed in the prior RFC, this approach retains two separate indexes (one for workflow executions, one for step executions). This means two ILM policies, two rollover aliases, and two sets of backing indexes. The operational surface area is doubled compared to a unified index. However, this matches the existing index structure and avoids the migration complexity of merging two index schemas.
- **Search latency across lifecycle phases**: Search queries via the alias fan out across backing indexes in all lifecycle phases. Indexes in later phases (e.g., cold, frozen) have higher read latency, which may affect search performance for queries spanning old execution history. Get-by-id lookups are unaffected since they target a specific backing index directly. The UI/API layer may need to account for this -- for example, with query timeouts, progressive loading of results, or documenting to users that searches spanning old execution history may have higher latency than recent-history queries.

## Risks and Open Questions

- **Lifecycle progression mechanism not yet implemented**: The POC validates the rollover, pinning, and encoded ID mechanics. The tier transition design (five-phase ILM policy, Task Manager task for hot-to-warm, automatic warm-to-delete progression) is specified in this RFC, but the implementation is pending.
- **Upgrade migration not yet implemented**: The leading approach (reindex from flat index to backing index, rename flat to legacy) is sketched in this RFC, but the implementation is pending. Key open details include rollback safety, online vs. offline reindex strategy, legacy index retention period, and edge cases around concurrent writes during migration.
- **Tuning rollover frequency**: The `rolloverMaxAge` default of `1d` is a starting point. Too aggressive (e.g., `1h`) creates many backing indexes, increasing the number of shards and the cost of alias fan-out for search queries. Too conservative (e.g., `7d`) delays lifecycle progression and lets the active index grow larger. Optimal values depend on execution volume and cluster size.
- **Hot-phase index count under high concurrency**: If many long-running executions span multiple rollover periods, the number of hot-phase backing indexes can grow. Each hot-phase backing index consumes premium cluster resources (shard memory, file handles). A single stuck execution (infinite wait, bug, leaked timeout) can hold an entire backing index on the hot tier indefinitely. A separate feature (not part of this RFC) should address stuck-execution detection and forced termination to prevent this. This RFC acknowledges the risk and recommends that such a safety net be implemented as a follow-up.
- **Mapping evolution**: Index templates apply mappings to new backing indexes automatically, but existing backing indexes are not updated when the template changes. If a new field is added to the mappings, only new backing indexes will have it indexed. Old backing indexes will store the field in `_source` (because `dynamic: false`) but it will not be searchable. This is the same constraint as data streams and requires explicit reindexing for retroactive mapping changes.
