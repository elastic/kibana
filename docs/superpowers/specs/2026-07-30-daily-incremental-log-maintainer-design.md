# Daily-Incremental Log Relationship Maintainer — Design

**Status:** Approved (2026-07-30)

**Supersedes:** `docs/superpowers/specs/2026-07-30-bucketed-count-across-slices-design.md`
(and its plan `docs/superpowers/plans/2026-07-30-bucketed-count-across-slices.md`). That design
patched the per-slice count-split bug with end-of-run accumulation; this design removes the cause
(time-slicing for counting) entirely and makes per-page writes correct for all log configs. Do not
implement the superseded plan.

**Goal:** Replace the full-30-day-recompute-every-run log maintainer engine with a daily-incremental
two-phase engine: raw logs are aggregated once per day into a plugin-owned daily-aggregates index,
and the entity store is written from a 30-day rolling merge of those daily docs. This fixes bucketed
count-across-window correctness, enables correct per-page (per-actor) writes for both bucketed and
standard configs, and avoids recomputing 30 days on every run.

**Scope:** `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/`
— log-source configs only (`source: 'logs'`), covering `kind: 'standard'`, `kind: 'bucketed'`, and
log-source `kind: 'override'`. Entity-index configs (`administers`, `owns`, `source: 'entity-index'`)
are unchanged.

---

## Background & motivation

The current log engine rescans the full `now-30d` window every run (`LOOKBACK_WINDOW = 'now-30d'`,
`engine/constants.ts`) and, in its time-sliced form, computes bucketed `COUNT(*)` thresholds
per-slice — which splits an actor→target pair's accesses across slices and misclassifies frequent
pairs as infrequent. Two forces drive this redesign:

1. **Correctness:** bucketed classification needs a *global* 30-day count; per-slice counting is
   structurally wrong, and the accumulate-then-classify patch (superseded doc) reintroduces
   end-of-run accumulation and writes nothing on abort.
2. **Cost & per-page writes:** a future high-confidence integration (e.g. `user:alex@okta`) can
   communicate with two different hosts that must aggregate onto the *same* entity
   (`entity.relationships.communicates_with = [host:x, host:y]`). The entity write path
   (`bulkUpdateEntity`) **overwrites** `entity.relationships.<relType>.ids` — there is no
   server-side array union (see the TODO at `engine/run_logs_integration.ts` and the write path in
   `entity_store/server/domain/crud/crud_client.ts`). Overwrite is only safe if each write carries
   the actor's *complete* target set.

The daily-aggregates index solves both: reading it with `STATS BY actor` yields each actor's
complete 30-day total in one actor-disjoint page, so a plain overwrite write is correct, and the
per-day compute avoids the 30-day rescan.

**Precedents mirrored** (from entity_store, for implementers):
- Watermark storage: entity_store keeps `checkpointTimestamp` in a saved object
  (`entity_store/.../saved_objects/engine_descriptor/`). We instead extend the maintainer's existing
  Task Manager state (`maintainers/engine/execution.ts` `persistMaintainerState`).
- Internal index standup: `entity_store/.../asset_manager/install_assets.ts` — ingest pipeline →
  component template → `putIndexTemplate` → `createIndex(throwIfExists:false)` + alias, plus an
  `ensure…MappingsOnce` upgrade hook.
- Confirmed: **no existing write path unions arrays server-side** — our design deliberately avoids
  needing one.

---

## Architecture: single two-phase `runLogsIntegration`

One runner handles all log-source configs. Each run has two ES|QL phases against different indices.

```
PHASE A  (raw logs -> daily-aggregates index)     [incremental: only days since watermark]
  for each day D in [lastComputedDay .. today]:    (first run: all 30 days)
    ESQL: FROM <logs>
          | WHERE @timestamp in [D, D+1) AND <config filters>
          | EVAL actor, target
          | STATS access_count = COUNT(*) BY actor, target
    upsert one doc per (maintainer, integration, actor, D) into daily-aggregates index
  advance watermark lastComputedDay = today

PHASE B  (daily-aggregates index -> entity store)  [always full 30d rolling]
  ESQL: FROM <daily-aggregates>
        | WHERE maintainer == M AND integration == I AND day >= now-30d
        | STATS targetCounts30d = <merge-sum per-day counts> BY actor
  for each actor page (actor-disjoint):
    project by kind (bucketed split | standard collapse)
    writeEntityIds(page)            // plain OVERWRITE, correct: page carries full 30d total
    writeRelationshipMetadatas(page)
```

Both phases paginate by actor (composite / `LIMIT` page), so pages are actor-disjoint and writes
are safe.

---

## Component 1 — Daily-aggregates index

A **plain index + alias + ILM** (mirrors the LATEST entity index in `install_assets.ts`), **not a
data stream** — Phase A must idempotently overwrite a day's doc by `_id`, which data streams do not
cleanly support.

- **Doc grain:** one document per `(maintainer, integration, actor, day)`.
- **`_id`:** deterministic hash of `maintainer | integration | actor | day`. Recomputing a day
  overwrites its docs.
- **Doc shape:**
  ```json
  {
    "maintainer": "communicates_with",
    "integration": "system_auth",
    "actor": "user:alice@host-1@local",
    "day": "2026-07-30",
    "@timestamp": "2026-07-30T00:00:00.000Z",
    "targetCounts": { "host:host-a": 3, "host:host-b": 1 }
  }
  ```
  `maintainer` and `integration` are explicit fields (not only in `_id`) because the same actor's
  target set means different things per maintainer — e.g. `communicates_with` targets `[x, y]` do
  NOT imply `accesses_frequently` on `x` and `y`. Phase B filters on both.
- **`targetCounts`** is stored for **both** kinds (one schema, one Phase A shape). `standard`/
  `override` ignore the counts at projection time.
- **Write op:** `update { _id } + doc_as_upsert: true` (or index-by-`_id`). Phase A always writes the
  complete per-day total per actor, so wholesale overwrite of a daily doc is correct.
- **Retention:** ILM `data_retention` of `30d` + a small buffer (reclaims storage). Phase B *also*
  filters `day >= now-30d`, so window correctness never depends on retention timing alone.
- **Standup:** component template + `putIndexTemplate` + `createIndex(throwIfExists:false)` with an
  alias, plus an `ensureDailyAggregatesMappingsOnce` upgrade hook — same pattern and idempotency as
  `install_assets.ts`. Mapping: `maintainer`/`integration`/`actor`/`day` as `keyword`, `@timestamp`
  as `date`, `targetCounts` as a flattened/object field of `keyword→long` (dynamic
  `strings_as_keyword` template, matching entity_store templates).

## Component 2 — Phase A: raw logs → daily docs + watermark

- **Watermark:** `lastComputedDay` **per (maintainer, integration)**, added to the maintainer's
  existing **Task Manager state** (extend `persistMaintainerState` in
  `maintainers/engine/execution.ts`). No new saved object.
- **Day selection:** no watermark (first run) → compute all 30 days. Otherwise → each day in
  `[lastComputedDay, today]` (usually just today; multi-day gaps from missed runs are backfilled,
  one day at a time). Recompute-one-day is idempotent (overwrites that day's docs by `_id`).
- **Per-day ES|QL:** `FROM <logs> | WHERE @timestamp >= "<D>" AND @timestamp < "<D+1>" AND
  <config esqlWhereClause + actor/target presence gates> | EVAL actor, target | STATS access_count =
  COUNT(*) BY actor, target`.
  - **Local-namespace fast path (perf):** for medium-confidence local-namespace configs
    (all current `communicates_with` and `accesses` configs), the actor/target EVALs use the
    minimized EUID form — hardcode `@local`, read only the required fields (actor:
    `user.email`/`user.name` + `host.id`; target: `host.id`) and drop the namespace/source
    resolution EVALs. Empirically ~26× faster on large indices (the EUID EVAL chain, which
    materializes ~13 fields, is the dominant cost — not the 30-day span). The generic
    namespace-resolving builder remains for IDP/high-confidence configs. This is expressed via a
    config flag (e.g. `customActor.localNamespaceFastPath: true`) honored by the builder.
  - **Override (log-source) configs:** the config's own ES|QL must emit `(actor, target)` rows
    (existing column contract: `actorUserId` + target column). Phase A injects the per-day window
    and wraps the override body with `STATS access_count = COUNT(*) BY actor, target`. Fully unified.
- **Write:** upsert daily docs, paginated by actor. Advance `lastComputedDay = today` only after all
  selected days complete successfully.

## Component 3 — Phase B: daily index → entity store (per-page writes)

- **ES|QL over the daily index:** `FROM <daily-aggregates> | WHERE maintainer == "<M>" AND
  integration == "<I>" AND day >= "<now-30d>" | STATS targetCounts30d = <merge-sum of per-day
  targetCounts> BY actor`. Each result row = one actor with the **complete 30-day** `Map<target,
  count>`.
  - The merge-sum flattens per-day `targetCounts` maps and sums counts per target across the ≤30
    daily docs for the actor. **Contract (binding):** each Phase B result row is `(actor,
    targetCounts30d)` where `targetCounts30d` is the actor's full 30-day `target → summed count`
    map. **Mechanism (recommended, confirm feasibility in planning):** Phase A stores `targetCounts`
    such that Phase B can `MV_EXPAND` per-target `target|count` entries, then
    `STATS total = SUM(count) BY actor, target`, then `STATS ... BY actor` to re-collapse to one row
    per actor. If a chosen ES|QL shape cannot express the sum, fall back to reading daily rows and
    summing in TypeScript per actor page — but the row-per-actor-with-full-30d-map contract is
    fixed regardless of mechanism.
- **Pagination:** by actor (composite / `LIMIT`), actor-disjoint pages.
- **Per-page projection (the single kind-branch) + write:**
  - `bucketed`: split targets into `above` (`count >= threshold`) and `below`
    (`config.bucketTargetByThreshold`); build `EntityRelationshipRecord` with both bucket keys
    always present (`[]` when empty).
  - `standard` / `override`: single `{ [relationshipKey]: [all targets] }` (counts ignored —
    existence only).
  - Call `writeEntityIds(pageRecords)` — a plain **overwrite** — per page, then
    `writeRelationshipMetadatas(pageRecords)` per page.
- **Why overwrite is correct now:** the daily index already aggregated all days; each page row
  carries the actor's full 30-day target set, so overwriting `entity.relationships.<relType>.ids`
  is correct even when one actor has multiple targets (`alex → [host:x, host:y]`). No array union,
  no in-memory accumulation.

## Component 4 — Logging, timeout, abort

- **Completion logging:** one structured log line per `(maintainer, integration)` on run
  **completion** (not just on error): `daysComputed`, `actorsProcessed`, `pages`, `targetsWritten`,
  `durationMs`, `outcome`. Fills the current gap where logging skews to error paths.
- **Configurable timeout:** thread a configurable `requestTimeout` (default **60_000ms**) through
  both Phase A and Phase B ES|QL calls. Generalize the existing `EXTRACT_QUERY_TIMEOUT_MS`
  (`engine/constants.ts`) rather than adding a second constant.
- **Abort (`signal.aborted`):** stop between days/pages.
  - Phase A: days already written are committed; `lastComputedDay` advances only for fully-completed
    days → abort is **resumable**, not discarded.
  - Phase B: idempotent overwrite → safe to re-run from the start next cycle.

---

## Data flow (worked example)

```
Day 1 (first run), communicates_with / system_auth:
  Phase A computes 30 daily docs for alice:
    (…, actor=user:alice@h1@local, day=2026-07-01, targetCounts={host:h1:2})
    …
    (…, day=2026-07-30, targetCounts={host:h1:3})
  watermark lastComputedDay = 2026-07-30
  Phase B: STATS merge-sum over 30 docs -> alice: {host:h1: <sum>}
           write entity user:alice@h1@local  communicates_with=[host:h1]   (per page)

Day 2 (next run):
  Phase A computes ONLY 2026-07-31 -> upsert 1 daily doc for alice (idempotent)
  watermark -> 2026-07-31
  Phase B: STATS over now-30d (2026-07-02 .. 2026-07-31) -> alice full total -> overwrite entity
```

Bucketed correctness: a pair split across days (2 on day A, 3 on day B, threshold 4) sums to 5 in
Phase B → classified `accesses_frequently`. The split can never misclassify because classification
happens on the merged 30-day total, never per day.

---

## Testing

**Daily-aggregates index standup:**
- Template + index + alias created idempotently; re-install is a no-op; `ensure…MappingsOnce`
  adds fields without re-install.

**Phase A (raw logs → daily docs):**
- Per-day ES|QL shape (`STATS COUNT(*) BY actor, target`, day window bounds).
- Daily-doc `_id` determinism (same tuple → same `_id`); recomputing a day overwrites, does not
  duplicate.
- First-run computes 30 days; incremental run computes only today; multi-day gap backfills each
  missing day.
- Watermark advances only after all selected days succeed; abort mid-Phase-A leaves watermark at
  last completed day.
- Local-namespace fast-path config emits the minimized EUID ESQL (no namespace EVALs); generic
  config still emits the full chain.
- Override log config: body wrapped with `STATS COUNT(*) BY actor, target` and per-day window.

**Phase B (daily index → entity store):**
- Merge-sum over daily docs yields the correct 30-day total per actor (including a pair split
  across two days).
- `bucketed` split at threshold (≥ → above, < → below); both keys present.
- `standard`/`override` collapse to a single relationship key (counts ignored).
- Per-page write: `writeEntityIds` called once per actor page (not once at end); one actor with two
  targets writes `[x, y]` in a single overwrite.
- `day >= now-30d` filter scopes the window; docs older than 30d excluded even if retention lags.

**Cross-phase / regression:**
- End-to-end: two days of raw events for one pair → correct classification/relationship on the
  entity.
- Entity-index configs (`administers`, `owns`) unaffected (their path is untouched).

---

## Non-goals

- No change to entity-index (`source: 'entity-index'`) configs — `administers` / `owns` keep their
  composite-agg + raw_identifiers path.
- No server-side array-union / Painless scripted upsert — the daily index makes overwrite correct,
  so the `bulkUpdateEntity` TODO is intentionally NOT actioned here.
- No change to `writeEntityIds` / `writeRelationshipMetadatas` signatures — Phase B builds the same
  `EntityRelationshipRecord` shape they already consume.
- Time-slicing (probe/boundary) is retired for log configs; not carried into the daily model.
