# Relationship Maintainer — Time-Sliced ES|QL Engine

**Date:** 2026-07-26
**Status:** Design approved, pending implementation
**Author:** alex.prozorov@elastic.co

## Problem

The relationship maintainer engine uses a 2-step model for log-based integrations:

1. **Step 1 (DSL composite agg):** Paginates through actors (up to 3500 per page) using a composite aggregation on actor identity fields.
2. **Step 2 (ES|QL with actor filter):** For each page of actors, runs an ES|QL query filtered to only those actors' events, then `STATS VALUES(targetEntityId) BY actorUserId`.

This causes **request timeouts in production** because:
- The actor-page filter (`user.name IN [3500 values] OR user.email IN [3500 values]`) is a large terms filter that ES cannot push down to an index lookup — it forces a full doc-values scan over every shard in every linked CPS cluster.
- On the overview env (21 CPS clusters, 748M+ docs), Step 2 consistently exceeds the Kibana ES client's 30s default `requestTimeout`.
- Step 1 page 2 also times out for `system_security` due to bucket explosion from Windows SIDs in `user.id`.

Additionally, the current engine accumulates all page records in memory before writing, creating an unbounded memory footprint for large integrations.

## Constraints

- ES|QL has no cursor/keyset pagination — `LIMIT N` gives top N rows with no "next page" token.
- Entity-index based maintainers (`administers`, `supervises`, `owns`) query the entity index, not raw logs. They use `entity.lifecycle.last_seen` as their freshness gate and cannot use time-slicing.
- Avoiding Painless scripts in write operations.
- No checkpoint persistence — each run restarts from `now-30d` (idempotent by design).

## Solution Overview

Replace the 2-step actor-filter model with a **probe → extend → extract → write** loop for log-source integrations. Entity-index integrations keep the 2-step model but move writes inside the pagination loop to eliminate memory accumulation.

---

## Config Type Changes (`engine/types.ts`)

Add `source: 'logs' | 'entity-index'` to `RelationshipIntegrationBase`:

```ts
interface RelationshipIntegrationBase {
  source: 'logs' | 'entity-index';  // new — controls which runner the engine dispatches to
  id: string;
  name: string;
  indexPattern: (namespace: string) => string;
  targetEntityType: TargetEntityType;
  compositeAggAdditionalFilters?: QueryDslQueryContainer[];
  requireTargetEntityIdExists?: boolean;
  customActor?: CustomActorBinding;
  validateTargetIds?: boolean;
  disableLookbackWindow?: boolean;
  maxActorsPerSlice?: number;  // new — probe target for log configs; defaults to COMPOSITE_PAGE_SIZE
}
```

**Source assignments:**

| Maintainer | `source` |
|---|---|
| `communicates_with` | `'logs'` |
| `accesses_frequently_and_infrequently` | `'logs'` |
| `administers` | `'entity-index'` |
| `supervises` | `'entity-index'` |
| `owns` | `'entity-index'` |

`disableLookbackWindow` is retained — still used by entity-index configs to suppress the lookback filter in metadata writes.

---

## Engine Dispatch (`run_relationship_maintainer.ts`)

```ts
for (const config of integrations) {
  if (config.source === 'logs') {
    await runLogsIntegration(config, esClient, logger, namespace, crudClient, entityMetadataClient, signal, metadataContext);
  } else {
    await runIntegration(config, esClient, logger, namespace, crudClient, entityMetadataClient, signal, metadataContext);
  }
}
```

`runIntegration` (entity-index path) is renamed for clarity but otherwise unchanged except for the write-per-page improvement (see below).

---

## Log-Source Runner (`engine/run_logs_integration.ts`)

New file. Implements the probe → extend → extract → write loop for `source: 'logs'` configs.

### Loop structure

```
sliceStart = LOOKBACK_WINDOW  ('now-30d')

while sliceStart < 'now':
  if signal?.aborted → break

  1. PROBE
     → sliceBoundary, isLastSlice

  2. EXTEND (skip if isLastSlice)
     → extendedSliceEnd
     if isLastSlice: extendedSliceEnd = 'now'

  3. EXTRACT
     → rows: Array<{ actorUserId, targetEntityIds[] }>

  4. WRITE
     writeEntityIds(rows)
     writeRelationshipMetadatas(rows)

  sliceStart = extendedSliceEnd + 1ms
```

No records accumulate across slices. Memory at any point is bounded to one slice's result set (~`maxActorsPerSlice` actors × avg targets per actor).

---

## Probe Query (`engine/build_actor_slice_probe_query.ts`)

Finds the timestamp boundary where ~`maxActorsPerSlice` distinct actors fit, using sampling to keep the probe cheap.

```esql
FROM logs-system.auth-default
| WHERE @timestamp >= "2026-06-26T00:00:00Z" AND @timestamp < "now"
  AND <esqlWhereClause filters>
  AND <actorPresence filter>
| SAMPLE 0.1
| EVAL actorUserId = <euid expression>
| WHERE COALESCE(actorUserId, "") != ""
| STATS _firstEvent = MIN(@timestamp) BY actorUserId
| SORT _firstEvent ASC
| LIMIT 3500
| STATS sliceBoundary = MAX(_firstEvent), actorCount = COUNT(*)
```

**Return value interpretation:**
- `actorCount < maxActorsPerSlice` → last slice; `sliceEnd = 'now'`
- `actorCount == maxActorsPerSlice` → more slices follow; `sliceEnd = sliceBoundary`

**Sampling:** `SAMPLE 0.1` reads ~10% of docs, making the probe an order of magnitude cheaper than a full scan. The boundary is approximate — actors near the boundary may straddle it, resolved by the extend step.

**New constant:** `SLICE_SAMPLE_PROBABILITY = 0.1` in `constants.ts`.

---

## Boundary Extension Query (`engine/build_actor_slice_boundary_query.ts`)

After the probe finds `sliceBoundary`, the extend query finds the true last event timestamp for all actors whose first event falls within this slice. This guarantees no actor straddles the slice boundary — all of an actor's events are in exactly one slice.

```esql
FROM logs-system.auth-default
| WHERE @timestamp >= "sliceStart" AND @timestamp < "now"
  AND <esqlWhereClause filters>
  AND <actorPresence filter>
| EVAL actorUserId = <euid expression>
| WHERE COALESCE(actorUserId, "") != ""
| STATS _firstEvent = MIN(@timestamp), _lastEvent = MAX(@timestamp) BY actorUserId
| WHERE _firstEvent <= "sliceBoundary"
| STATS extendedSliceEnd = MAX(_lastEvent)
```

**Result:** `extendedSliceEnd` is the last `@timestamp` of any event belonging to any actor that started in this slice. The next `sliceStart = extendedSliceEnd + 1ms` (exclusive lower bound — avoids re-processing the boundary event on the next slice).

**Note:** The `WHERE _firstEvent <= "sliceBoundary"` clause filters on a `STATS`-computed column. This is valid ES|QL — a `| WHERE` after `| STATS` operates on the aggregated result rows, not on raw documents.

**Why this guarantees completeness:** Any actor whose first event is `<= sliceBoundary` has all their events included in `[sliceStart, extendedSliceEnd]` by definition (since `extendedSliceEnd = MAX(@timestamp)` for those actors). An actor whose first event is `> sliceBoundary` will be picked up in the next slice.

---

## Extraction Query (`engine/build_targets_per_actor_query.ts`)

Updated to accept `fromDate`/`toDate` and embed the time window directly in the `WHERE` clause. The DSL `filter` parameter (actor-page filter) is eliminated entirely for log configs.

```esql
SET unmapped_fields="nullify";
FROM logs-system.auth-default
| WHERE @timestamp >= "sliceStart" AND @timestamp <= "extendedSliceEnd"
  AND <esqlWhereClause filters>
  AND <actorPresence filter>
| EVAL <userFieldEvals>
| EVAL actorUserId = <euid expression>
| WHERE COALESCE(actorUserId, "") != ""
| EVAL targetEntityId = <targetEuidEval>
| MV_EXPAND targetEntityId
| WHERE COALESCE(targetEntityId, "") != ""
| STATS communicates_with = VALUES(targetEntityId) BY actorUserId
```

**Key differences from today:**
- `@timestamp` range in `WHERE`, not in DSL `filter`
- No `LIMIT` — probe bounds actor count so result fits in one response
- No actor-page filter — this is the core fix eliminating the fan-out

**`override` configs:** Not applicable — all existing `override` configs (`administers`, `supervises`) are `source: 'entity-index'` and use the unchanged runner. No migration needed.

---

## Entity-Index Runner — Write Per Page

The existing `runIntegration` function moves `writeEntityIds` and `writeRelationshipMetadatas` **inside the composite agg pagination loop**, after each page's ES|QL result. The `records` array shrinks to page-scoped (bounded by `COMPOSITE_PAGE_SIZE = 3500`).

```ts
// Before: records accumulated across all pages, single write after loop
const records: EntityRelationshipRecord[] = [];
do {
  const pageRecords = parseTargetsPerActorRows(...);
  records.push(...pageRecords);   // accumulates across pages
} while (afterKey);
writeEntityIds(records);          // one write for entire integration

// After: write per page
do {
  const pageRecords = parseTargetsPerActorRows(...);
  writeEntityIds(pageRecords);          // write this page
  writeRelationshipMetadatas(pageRecords);
} while (afterKey);
```

The `succeededEntityIds` filtering for metadata (actors that landed in the entity store) still applies per-page — no semantic change, just scoped to the page.

---

## File Change Summary

### Modified files

| File | Change |
|---|---|
| `engine/types.ts` | Add `source: 'logs' \| 'entity-index'`; add `maxActorsPerSlice?: number` |
| `engine/constants.ts` | Add `SLICE_SAMPLE_PROBABILITY = 0.1` |
| `engine/run_relationship_maintainer.ts` | Add `source` dispatch; rename `runIntegration` → `runEntityIndexIntegration` for clarity |
| `engine/run_relationship_maintainer.ts` | Move writes inside pagination loop in entity-index runner |
| `engine/build_targets_per_actor_query.ts` | Accept `fromDate`/`toDate`; embed time window in `WHERE`; remove DSL filter path for log configs |
| `communicates_with/configs.ts` | Add `source: 'logs'` to all configs |
| `accesses/configs.ts` | Add `source: 'logs'` to all configs |
| `administers/configs.ts` | Add `source: 'entity-index'` |
| `supervises/configs.ts` | Add `source: 'entity-index'` |
| `owns/configs.ts` | Add `source: 'entity-index'` |

### New files

| File | Purpose |
|---|---|
| `engine/run_logs_integration.ts` | Probe → extend → extract → write loop for log-source configs |
| `engine/build_actor_slice_probe_query.ts` | Probe ES|QL: sampled `COUNT_DISTINCT(actorUserId)` → slice boundary |
| `engine/build_actor_slice_boundary_query.ts` | Boundary extension ES|QL: `MAX(@timestamp)` for actors in probe result |

---

## Testing

- `build_actor_slice_probe_query.ts` — snapshot tests for probe query shape per config kind
- `build_actor_slice_boundary_query.ts` — snapshot tests for boundary extension query
- `run_logs_integration.ts` — unit tests for slice loop: probe → extend → extract → write sequencing, abort handling, last-slice detection
- `build_targets_per_actor_query.ts` — update existing snapshots to reflect `fromDate`/`toDate` in `WHERE` and removal of DSL filter path
- `run_relationship_maintainer.ts` — update existing tests for dispatch and per-page write behaviour

---

## Out of Scope

- Checkpoint/crash-recovery — each run restarts from `now-30d` (idempotent)
- Stall detection — entity store's 1ms bump is not needed since boundary extension guarantees actor completeness
- `requestTimeout` override — short-term fix tracked separately in GitHub issue #280917; this redesign eliminates the root cause for log configs

## References

- GitHub issue #280917 — short-term `requestTimeout` fix + `system_security` `user.id` removal
- GitHub issue #279481 — raw identifiers maintainer telemetry
- PR #278471 — `system_auth` `user.id` bucket explosion fix
- `depends_on/system_auth_query_optimization.md` — prior investigation
- `engine/request_timeout_investigation.md` — timeout root cause analysis
