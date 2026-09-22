# Configurable relationship reset for snapshot-source maintainers — design

**Motivating case:** Workday `supervises` ([security-team#19402](https://github.com/elastic/security-team/issues/19402), [PR #292504](https://github.com/elastic/kibana/pull/292504))
**Related:** [kibana#292358](https://github.com/elastic/kibana/issues/292358) — relationship edge retraction (investigation)
**Date:** 2026-09-22

## Problem

Relationship maintainer writes are **purely additive**. An edge, once written to
`entity.relationships.<relType>.ids`, is never removed:

- `writeEntityIds` drops actors with no targets (`hasAnyTargets`, and the
  `Object.keys(relationships).length > 0` guard in
  `engine/update_entities.ts:229-233`), so a "clear this actor" write is
  structurally unreachable.
- An actor absent from a run's results simply receives no write, leaving whatever
  was there before untouched.

That is correct for **event-stream** sources — a login is a historical fact, and
absence from a window never means "no longer true". It is wrong for **snapshot**
sources, where each cycle re-emits the complete current state and absence *is*
evidence.

Workday is the latter. Its CEL input re-fetches the whole user inventory on every
24h poll, so a worker's newest row is authoritative about who manages them. Yet
every manager change leaves the previous edge in place forever:

| Run | Workday says | Index after run |
|---|---|---|
| 1 | Alice → Bob | `bob: [alice]` |
| 2 | Alice → Carol | `bob: [alice]`, `carol: [alice]` |
| 3 | Alice → (none) | `bob: [alice]`, `carol: [alice]` |

The org chart is wrong from the second run onward, and degrades monotonically.

### Why query-level fixes do not work

Four were attempted on PR #292504 and each addressed a symptom:

1. **`LAST(managerKey, event.ingested)` collapse** — fixes *same-page* duplicate
   managers. Kept; it is a real fix for a real bug. Does not address staleness.
2. **Moving the manager-presence gate after the collapse** — reverted. The engine
   applies `buildActorPageFilter` (`Manager_Email IN (…) OR Manager_ID IN (…)`) as
   the ES|QL `filter` parameter, at the source, *before* the query body. A
   worker's managerless newest row matches neither term and never reaches the
   collapse.
3. **Keying discovery on the worker instead of the manager** — rejected. It fixes
   the first transition only; once any manager has been written, every later
   change still leaves the old edge (verified against the three-run sequence
   above).
4. **Shortening the lookback window** — rejected. The collapse already selects the
   newest snapshot regardless of how many are in scope; a shorter window only
   increases the chance of missing a worker after a sync outage.

The common root is that **computing the right answer and having the right answer
in the index are different problems**. Only the second matters, and no query can
reach it.

## Approach: reset, then populate

Clear the relationship for this source at the start of each run, then let the
existing additive write path repopulate it. "Removing" a stale edge becomes "not
re-adding it", so the engine's write semantics need no change at all.

This is materially cheaper than retraction (#292358), which needs a set-difference
read, a new authoritative write path, and a completeness-at-write-time guarantee.

**Provenance is safe by construction.** Each `supervises` source writes to a
namespace-partitioned EUID — `user:…@workday`, `user:…@okta`, `user:…@entra_id`.
Those are *different entity documents*, so clearing Workday actors cannot touch
another source's contribution. This is what makes the reset viable here and is
the precondition any future source must also satisfy.

## Config surface

One optional field, absent by default, so no existing config changes behaviour:

```ts
/**
 * Clear this config's `relationshipKey` on all entities from `entitySource`
 * before processing any page.
 *
 * ONLY valid for sources that emit a COMPLETE snapshot of the relationship set
 * each cycle. On an event-stream source (accesses, communicates_with) this would
 * erase real observations — absence there means "not seen in this window", never
 * "no longer true".
 */
resetRelationshipsBeforeRun?: {
  /** Matched against `entity.source` on the latest entities index. */
  entitySource: string;
};
```

Workday sets `{ entitySource: 'workday' }`. Scoping by `entity.source` **plus**
the config's own `relationshipKey` means exactly one field on one source's
entities is touched.

## Mechanics

```
runIntegration(config):
  if (config.resetRelationshipsBeforeRun)
      await resetRelationships(...)        ← once, before pagination
  do {
      step 1 composite agg
      step 2 ES|QL
      writeEntityIds                       ← unchanged, still additive
  } while (afterKey)
```

Placed in `runIntegration` before the page loop — **not** in
`runRelationshipMaintainer` before the integration loop. Per-integration
placement matters: `supervises` runs three configs sharing one relationship key,
so a run-level reset would let Workday's reset wipe the Okta and Entra
contributions written earlier in the same run.

The clear reuses `updateByQueryWithScript`
(`entity_store/server/infra/elasticsearch/ingest.ts`), already used this way by
`history_snapshot_client` — it provides `conflicts: 'proceed'` and task-based
waiting for long-running updates. Raw ES I/O stays in `infra/`; the engine calls
a domain client rather than `esClient` directly, per the domain's I/O isolation
invariant.

Query and script shape:

```
query:  bool.filter:
          - term:   entity.source: <entitySource>
          - exists: entity.relationships.<relType>.ids
script: remove the single `ids` field for that relType
```

The `exists` clause keeps the operation proportional to entities that actually
hold the relationship rather than the whole source.

## Failure behaviour

**Reset succeeds, run fails partway** (ES|QL error, abort, write failure):
relationships stay partial until the next successful run. Data is temporarily
*incomplete* rather than *incorrect* — the trade this whole design makes — and
self-heals on the 24h schedule.

**Reset itself fails:** abort that integration rather than populating on top of
unknown state. The outer loop continues to other integrations, matching existing
per-integration isolation.

**Previous run truncated** (`MAX_ITERATIONS`): skip the reset. Without this
guard, a source that truncates every run would be perpetually cleared and only
partially repopulated — strictly worse than stale data.

This one needs new state. `runIntegration` returns `truncated`, but the
maintainer persists **only** `lastProcessedTimestamp` to Task Manager state
(`supervises/index.ts:96-99`), deliberately: the domain invariant is that TM
state holds only what the next run reads. The guard therefore requires adding a
persisted flag — the smallest form being `lastRunTruncated?: boolean` alongside
the watermark.

That is a real addition to a deliberately minimal state object and should be
reviewed as such. If it proves contentious, the fallback is to accept
repeated-truncation risk and log loudly on truncation when a reset is configured;
a source large enough to truncate at `MAX_ITERATIONS × COMPOSITE_PAGE_SIZE`
(3.5M actors) is already misconfigured for this maintainer.

## Known costs

1. **A visible gap during each run.** Between the reset and the final page write,
   this source's relationships are partial. On a large inventory that is minutes.
   No consumer reads these transactionally today, but it is a real behaviour
   change and should be called out in the PR.

2. **Truncation becomes destructive rather than merely incomplete.** Mitigated by
   the skip-on-previous-truncation guard above, but the failure mode is new:
   today truncation only fails to *add*.

3. **Cross-page manager splits improve but are not "fixed".** A manager whose
   reports span pages still receives several partial writes; they now union onto
   a *cleared* field instead of a stale one, so the end state is correct.

## Testing

**Unit** (`engine/update_entities.test.ts`, `supervises/configs.test.ts`):
- The reset runs only when `resetRelationshipsBeforeRun` is set; absent by
  default on every existing config.
- The generated query filters on both `entity.source` and the relationship key.
- Reset is skipped when the previous run was truncated.

**Scout** (`workday_supervises_maintainer.spec.ts`) — the cases that prove the
premise, all currently impossible:
- **Reassignment:** run with Alice→Bob, then re-seed Alice→Carol and re-run.
  Bob must no longer hold Alice; Carol must.
- **Unassignment:** run with Alice→Bob, then re-seed Alice with no manager fields
  and re-run. Bob must hold nothing.
- **Isolation:** an Okta-sourced actor's `supervises.ids` survives a Workday run
  untouched.
- **Repopulation:** a manager with two reports still has both after a reset-and-
  repopulate cycle (guards against clearing without restoring).

## Out of scope

- Retraction for event-stream sources — see #292358; absence carries no
  information there and a confidence/decay model is the separate question.
- Making `writeEntityIds` able to emit `{ ids: [] }`. The reset removes the need
  for it in this design; it remains the general solution #292358 must still
  answer.
- Cross-source provenance within one `ids` array. Not required here because the
  sources are namespace-partitioned into distinct entity documents, but any
  future source sharing an entity document with another would need it.
