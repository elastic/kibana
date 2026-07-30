# Bucketed Count-Across-Slices Fix — Design

**Status:** SUPERSEDED (2026-07-30) by
`docs/superpowers/specs/2026-07-30-daily-incremental-log-maintainer-design.md`.
The daily-incremental design removes time-slicing for counting entirely, so the per-slice
count-split bug this doc patched no longer exists and the accumulate-then-classify approach below is
obsolete. Do not implement the accompanying plan
(`docs/superpowers/plans/2026-07-30-bucketed-count-across-slices.md`). Retained for historical
context only.

**Goal:** Fix the correctness bug where time-slicing splits a bucketed maintainer's (`accesses_frequently` / `accesses_infrequently`) per-pair access counts across slices, causing genuinely-frequent actor→target pairs to be misclassified as infrequent.

**Scope:** `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/` — the log-source time-sliced relationship maintainer engine. Only `kind: 'bucketed'` configs are affected. `kind: 'standard'` (e.g. `communicates_with`) and `kind: 'override'` behavior is unchanged.

---

## Problem

Bucketed configs classify an actor→target pair by `COUNT(*) >= threshold`. The current
`build_targets_per_actor_query.ts` computes that COUNT **within a single time slice's window**
(`@timestamp >= fromDate AND @timestamp <= toDate`), then applies the CASE threshold and writes
per slice.

The log engine chops the 30-day lookback (`LOOKBACK_WINDOW = now-30d`) into time slices, each
covering ~`maxActorsPerSlice` (default `COMPOSITE_PAGE_SIZE = 3500`) distinct actors. A single
actor→target pair's accesses can therefore land in **different slices**:

- `alice@host-1` → `host-1`: 2 accesses in slice A, 3 accesses in slice B.
- True 30-day count = 5 (≥ threshold 4 → should be `accesses_frequently`).
- Slice A sees 2 (< 4 → `infrequently`); slice B sees 3 (< 4 → `infrequently`).
- Per-slice writes make the last slice win → the pair is written as `accesses_infrequently`,
  never `accesses_frequently`. The frequent signal is silently lost.

`communicates_with` (`kind: 'standard'`) is immune: it records relationship *existence* via
`VALUES(targetEntityId)`, which is idempotent across slices. Bucketing needs a **global COUNT**
over the whole window, which per-slice classification structurally breaks.

### Why the boundary-extension query does not save it

Step 2 (`build_actor_slice_boundary_query.ts`) extends a slice's `toDate` to cover the last
event of every actor whose first event fell in the slice, aiming to keep an actor's events within
one slice. This is not a reliable guarantee for counting because (a) the probe uses `SAMPLE 0.1`
so `sliceBoundary` is approximate, and (b) an actor active on day 1 and day 25 would force a
24-day slice, defeating slicing. Relying on it for count-correctness is fragile. The robust fix
is to accumulate counts across slices and classify once at the end.

---

## Approach: two-phase accumulate-then-bucket

**Phase 1 (per slice):** the extract stops classifying. It emits raw per-target counts for each
actor in the slice.

**Phase 2 (after the loop):** the engine accumulates counts across all slices into
`Map<actorEuid, Map<targetEuid, count>>`, applies the threshold **once** per (actor, target),
splits into above/below buckets, builds records, and writes **once**.

`runLogsIntegration` branches on `config.kind`:
- `bucketed` → accumulate-then-write (this design).
- `standard` / `override` → existing per-slice write (unchanged).

---

## Component 1 — Count-mode ES|QL query

**File:** `engine/build_targets_per_actor_query.ts`

For `config.kind === 'bucketed'`, replace the current double-`STATS`+`CASE` `statsClause` with a
count-emitting pipeline that produces **one row per actor** (preserving the actor-bound `LIMIT`):

```
| STATS access_count = COUNT(*) BY actorUserId, targetEntityId
| EVAL _pair = CONCAT(targetEntityId, "|", TO_STRING(access_count))
| STATS targetCounts = VALUES(_pair) BY actorUserId
```

followed by the existing `| LIMIT COMPOSITE_PAGE_SIZE`.

Rationale:
- **One `VALUES()` array** (`targetCounts`), each entry a `"<targetEuid>|<count>"` string. A single
  array is order-independent — it avoids the ES|QL pitfall where two separate `VALUES()`
  aggregations (`targets` and `counts`) are not guaranteed to return elements in matching order.
- `| LIMIT COMPOSITE_PAGE_SIZE` runs after the final `STATS ... BY actorUserId`, so it still caps
  **actors** (one row each), exactly as the current bucketed query does. It does NOT become a
  pair-cap, so no new silent truncation is introduced.

Standard/override `statsClause` and the rest of the builder are unchanged.

**Column contract:** add `targetCounts` to `engine/columns.ts` (`ENGINE_COLUMNS`). The count-mode
query emits `actorUserId` + `targetCounts`.

---

## Component 2 — Count-mode parser

**File:** `engine/parse_targets_per_actor_rows.ts`

Add a **new, separate** function; leave `parseTargetsPerActorRows` (standard/override) untouched.

```ts
export interface ActorTargetCounts {
  entityId: string | null;
  entityType: 'user' | 'host' | 'service';
  targetCounts: Map<string, number>; // targetEuid → count within this slice
}

export const parseBucketedCountRows = (
  columns: EsqlColumn[],
  values: unknown[][],
  config: { id: string; kind: 'bucketed' },
  logger: Logger
): ActorTargetCounts[]
```

Behavior:
- Read `actorUserId` (→ `entityId`, `entityType` via `entityTypeFromEuid`).
- Read the `targetCounts` string array. For each `"<target>|<count>"` entry, split on the **last**
  `|` (the count is always a trailing integer; splitting on the last delimiter is robust even if a
  target EUID were to contain `|`). Parse the trailing segment as an integer.
- Build the `Map<targetEuid, number>`.
- Malformed entries (no `|`, or a non-numeric trailing segment) are **skipped with a debug log**,
  not thrown — a single bad row must not abort the run.

---

## Component 3 — Accumulator + terminal write

**File:** `engine/run_logs_integration.ts`

Branch on `config.kind === 'bucketed'`.

**Bucketed path:**
- Before the loop: `const counts = new Map<string, Map<string, number>>();` (actorEuid →
  targetEuid → summed count).
- Inside the loop: probe → boundary → extract (count-mode query) → `parseBucketedCountRows` →
  **merge** each actor's slice counts into `counts` (add per target). **No write inside the loop.**
- On `signal.aborted` mid-loop: return `outcome: 'aborted'` with zero writes — the accumulator is
  discarded. Bucketing needs the complete window to classify correctly; a partial write would
  reintroduce the split-count bug for the un-scanned portion. The next scheduled run recomputes
  from scratch.
- After the loop: for each actor, split its targets into above/below by `count >= threshold`
  (`config.bucketTargetByThreshold`), build **one** `EntityRelationshipRecord` per actor with
  `{ [aboveThresholdRelationship]: [...], [belowThresholdRelationship]: [...] }`, then call
  `writeEntityIds` + `writeRelationshipMetadatas` **once**. Set `totalWrite` / `totalMetadata`
  from that single result; `recordsCount` = number of records built.
  - **Both bucket keys are always present** on the record (an empty bucket → `[]`), matching the
    shape the current parser produces for bucketed configs (`parse_targets_per_actor_rows.ts`
    always sets both `[above]` and `[below]` via `toStringArray`). This keeps `writeEntityIds`
    and the metadata writer behavior identical to today.

**Standard/override path:** unchanged (per-slice write + incremental merge into
`totalWrite`/`totalMetadata`).

**Memory bound:** the accumulator holds distinct `(actor, target)` pairs across 30 days. For
host-anchored configs (`system_auth`, `system_security`) each actor maps to ≈1 host, so the map is
≈ #actors; for `elastic_defend` / `aws_cloudtrail` an actor may hit a few hosts. No artificial cap
— this matches the pre-slicing composite-aggregation footprint. The bound is documented in code.

---

## Data flow

```
per slice (bucketed):
  probe (SAMPLE)  → sliceBoundary, isLastSlice
  boundary query  → extended toDate  (skipped on last slice)
  count-mode extract over [sliceStart, toDate]
      → rows: (actorUserId, targetCounts=["host:a|3", "host:b|1", ...])
  parseBucketedCountRows → ActorTargetCounts[]
  merge into counts: Map<actor, Map<target, count>>   (ADD per target)
  advance sliceStart = toDate + 1ms

after loop (bucketed):
  for each actor in counts:
    above = targets where count >= threshold
    below = targets where count <  threshold
    record = { entityId, entityType, relationships: { [above]: [...], [below]: [...] } }
  writeEntityIds(records)  +  writeRelationshipMetadatas(records)   // ONCE
```

---

## Testing

**Query builder (`build_targets_per_actor_query.test.ts`):**
- Bucketed config produces the count-mode ES|QL: asserts `STATS access_count = COUNT(*) BY
  actorUserId, targetEntityId`, the `CONCAT(targetEntityId, "|", TO_STRING(access_count))` pair
  encoding, a single `STATS targetCounts = VALUES(_pair) BY actorUserId`, and `| LIMIT` present.
- Standard/override query output unchanged (existing assertions still pass).

**Parser (`parse_targets_per_actor_rows.test.ts`):**
- `parseBucketedCountRows` happy path: multiple targets with distinct counts → correct
  `Map<target, count>`.
- Last-`|`-split correctness (trailing integer parsed; delimiter is the final `|`).
- Malformed entry (no `|` / non-numeric count) skipped, other entries preserved.
- Empty `values` → `[]`.

**Engine (`run_logs_integration.test.ts`):**
- **Cross-slice accumulation (the core correctness test):** the same actor→target pair appears in
  two slices (2 accesses in slice A, 3 in slice B; threshold 4). Assert the pair is written under
  `accesses_frequently` (5 ≥ 4), not `accesses_infrequently`.
- Single write call after the loop for bucketed (writeEntityIds / bulkUpdate called once, not
  per-slice).
- Abort mid-loop for bucketed → `outcome: 'aborted'`, zero writes.
- Standard configs still write per-slice (regression guard).

---

## Non-goals

- No change to `communicates_with` / `standard` / `override` behavior or write timing.
- No change to the probe/boundary slicing mechanics (they still bound each slice by actors).
- No artificial cap on the accumulator (bounded naturally by distinct (actor,target) pairs).
- No change to `writeEntityIds` / `writeRelationshipMetadatas` signatures — the bucketed path
  builds the same `EntityRelationshipRecord` shape they already consume.
