# Workday `supervises` maintainer — design

**Ticket:** [security-team#19402](https://github.com/elastic/security-team/issues/19402)
**Epic:** [security-team#19403](https://github.com/elastic/security-team/issues/19403) — Catch relationship maintainers up to new entity integrations
**Precedent:** [kibana#283366](https://github.com/elastic/kibana/issues/283366) / [PR #283809](https://github.com/elastic/kibana/pull/283809) (Entra ID `owns`, log-inverted)
**Integration:** [integrations#20753](https://github.com/elastic/integrations/pull/20753)
**Date:** 2026-09-21

## Problem

Entity Store records org-chart edges in one direction only:
`entity.relationships.supervises` on the **manager**, pointing at reports. There is
no `supervised_by`, and adding reverse ECS fields is explicitly rejected
([security-team#18732](https://github.com/elastic/security-team/issues/18732)).

Workday's user inventory is one row per worker, and each row names only *who
manages this worker* — `workday.user.Manager_Email` and `workday.user.Manager_ID`.
The direction is the opposite of what the store needs, and integrations cannot
invert at ingest time (a manager's full report list is not knowable from a single
worker's row). The relationship maintainer is the correct layer to invert.

Today `buildSupervisesConfigs()` covers only Okta and Entra ID, both reading
**forward** `raw_identifiers` off the entity index. Workday never writes that bag;
manager data stays on `logs-workday.user-*`.

## Goal

```
logs-workday.user-<ns> row:
  user.email                 = alice@corp.com     ← the report   (TARGET)
  workday.user.Manager_Email = bob@corp.com
  workday.user.Manager_ID    = 000687             ← the manager  (ACTOR)
        ↓
  entity.id:                            user:bob@corp.com@workday
  entity.relationships.supervises.ids: [user:alice@corp.com@workday]
```

Add a **log-inverted** config to the existing `supervises` maintainer. No new
maintainer registration. Okta/Entra behaviour is unchanged.

## Data facts (verified against the integration)

From `packages/workday/data_stream/user/_dev/test/pipeline/test-user.log-expected.json`
and `.../ingest_pipeline/default.yml`:

- `workday.user.Manager_Email` (`manager1@example.com`) and `workday.user.Manager_ID`
  (`000687`) are both populated and are resolvable identifiers.
- `workday.user.Worker_s_Manager` is `"Alex Manager (000687)"` — a **display name**.
  Not resolvable; must not be used.
- The row's own user is `user.email` / `user.id` (`Employee_ID`) / `user.name`
  (`User_Name`).
- `user.domain` is **dissected from `user.email`** (`default.yml` line 75,
  `pattern: '%{}@%{user.domain}'`). It therefore only exists when `user.email`
  also exists.
- `@timestamp` is set from `Hire_Date` (e.g. `2024-03-19`). The engine's default
  30-day `@timestamp` lookback would drop nearly the entire org chart.
- `event.kind: asset`, so these documents do seed user entities. Poll interval 24h.
- `workday` appears nowhere in `entity_store` or `maintainers` source today.

## Design decisions

### D1 — `kind: 'override'`, not `kind: 'standard'`

The engine's standard Step 2 builder supports a custom actor expression via
`customActor.evalOverride`, documented for "integrations whose actor is not in
standard ECS `user.*` fields" — which describes this case exactly. It was
evaluated and rejected.

The standard pipeline emits `MV_EXPAND targetEntityId` only
(`engine/build_targets_per_actor_query.ts:157`); it never expands the **actor**
column. Our actor is a union of two manager fields and is therefore multi-valued,
so `STATS ... BY actorUserId` would mis-group or drop actors. There is no hook to
expand the actor on the standard path.

`kind: 'override'` it is — consistent with the two existing `supervises` configs
and with Entra ID `owns`.

### D2 — target EUID via `euid.esql.getEuidEvaluation`, not a hand-written CONCAT

The ticket specifies target ranking `user.email > user.id > user.name`. The real
ranking (`definitions/user.ts:119-132`) has a fourth arm:

```
user.email@<ns>  >  user.id@<ns>  >  user.name@user.domain@<ns>  >  user.name@<ns>
```

**For Workday specifically, the `user.domain` arm is unreachable**: `user.domain`
is derived from `user.email`, so whenever it is present the top-ranked
`user.email` arm already wins. The ticket's simplified ranking is therefore
behaviourally correct for today's data, and this is *not* a live dropped-report
bug.

The canonical helper is still used, for three reasons:

1. The domain invariant requires it — "EUID values in ES|QL must be computed via
   `euid.esql.getEuidEvaluation(...)`, not manual string concatenation"
   (PR #255418, PR #262345).
2. It stays correct if the ingest pipeline ever sets `user.domain` independently
   of `user.email`, or if the ranking changes.
3. It avoids hand-maintaining a second copy of the ranking that can silently drift
   from `user.ts`.

This applies to the **target** only — the target is the row's own `user.*` fields,
which is what the helper reads. The **actor** is a foreign key living in
`workday.user.Manager_*` and must be built explicitly.

### D3 — actor resolution: union both manager fields, accept write-time 404s

Actor EUIDs are built by unioning `Manager_Email` and `Manager_ID`, null-safely.
`user:<Manager_ID>@workday` will not resolve when the manager entity is keyed by
email — that write 404s and is counted as `notFound`.

This is the established precedent from Entra ID `owns` ("lower-ranked identifiers
of owners whose higher-ranked one resolves will 404 — that is expected and
harmless") and requires no engine change. It also satisfies the ticket's "do not
create manager entities from a foreign key; drop writes when the manager is not in
the store" — a 404 *is* the drop.

Actor-side pre-validation was considered and rejected as out of scope: it would
require new shared-engine work, and the ticket does not ask for it.

`validateTargetIds: true` (per the ticket) still applies to targets.

### D4 — `user.ts` namespace mapping is a load-bearing prerequisite

The namespace evaluation (`definitions/user.ts:68-103`) resolves a source value
from `event.module` / first chunk of `data_stream.dataset` — `workday` — then
tests it against `whenClauses`. None match:

- `localNamespaceGate` requires `user.name` **and** `host.id`; Workday user docs
  have no `host.id`.
- The `asset_discovery` clause requires `event.module: asset_discovery`.
- `okta` / `azure` / `o365` / `entityanalytics_ad` do not list `workday`.

So it falls through to `fallbackValue: 'unknown'` and every Workday user entity is
keyed `user:<id>@unknown`.

> Note: the ticket states Workday "currently falls through to raw `workday` from
> `data_stream.dataset`". That is inaccurate — `data_stream.dataset` supplies only
> the *match* input, not the result; there is no pass-through for an unmatched
> source. The fallback is `'unknown'`.

Without this mapping the maintainer emits `@workday` EUIDs on both ends, nothing
matches, every target fails validation and every actor 404s — the maintainer runs
cleanly and writes zero relationships. Hence: prerequisite, not tidy-up.

**Blast radius.** `user.ts` is a shared definition. This re-keys *every*
Workday-sourced user entity from `@unknown` to `@workday`, not only those touched
by this maintainer. Workday entities already ingested under `@unknown` keep those
EUIDs and would sit alongside new `@workday` ones. The Workday integration is
still landing (integrations#20753 is recent), so this is expected to be a
non-issue; if Workday data is already flowing in a real deployment, the
re-keying needs a deliberate call.

## Step 2 ES|QL

The engine prepends `SET unmapped_fields="nullify"`; the override must not.

The `<ingestedClause>` below is emitted only when a watermark exists (i.e. not on
the first run), mirroring the `compositeAggAdditionalFilters` range so Step 1 and
Step 2 narrow identically:

```
    AND event.ingested >= NOW() - 30 day
```

```
FROM logs-workday.user-<ns>
| WHERE (workday.user.Manager_Email IS NOT NULL OR workday.user.Manager_ID IS NOT NULL)<ingestedClause>
| EVAL <getEuidEvaluation('user', 'targetEntityId', { withTypeId: true })>
| EVAL managerKey = CASE(
    workday.user.Manager_Email IS NULL, workday.user.Manager_ID,
    workday.user.Manager_ID    IS NULL, workday.user.Manager_Email,
    MV_APPEND(workday.user.Manager_Email, workday.user.Manager_ID))
| MV_EXPAND managerKey
| EVAL actorUserId = CONCAT("user:", managerKey, "@workday")
| WHERE COALESCE(actorUserId, "") != ""
    AND actorUserId != "user:@workday"
    AND actorUserId RLIKE ".+:.+@.+"
    AND COALESCE(targetEntityId, "") != ""
| STATS supervises = VALUES(targetEntityId) BY actorUserId
| LIMIT 3500
```

Notes:

- The `CASE`/`MV_APPEND` guard is mandatory: `MV_APPEND(null, x)` returns null, and
  under `unmapped_fields="nullify"` an absent column is null, so an unguarded
  append would drop every manager on any row missing one field.
- `STATS ... VALUES()` deduplicates, so one manager with N reports collapses to a
  single actor row with N targets — the ticket's DoD item.
- Output columns must be exactly `actorUserId` and `supervises`; mismatches
  produce silently empty results.
- The exact `user.ts` EUID field evaluations emitted by the helper are locked by a
  golden snapshot rather than transcribed here.

## Config

```ts
{
  kind: 'override',
  id: 'workday',
  name: 'Workday',
  indexPattern: (ns) => `logs-workday.user-${ns}`,
  targetEntityType: 'user',
  relationshipKey: 'supervises',
  // Step 1 buckets MANAGERS, not reports.
  customActor: { fields: ['workday.user.Manager_Email', 'workday.user.Manager_ID'] },
  // @timestamp is Hire_Date, so the engine's default 30d lookback would select
  // only new hires rather than recently-synced workers. Replaced by an
  // event.ingested window below. See D5.
  disableLookbackWindow: true,
  validateTargetIds: true,
  compositeAggAdditionalFilters: [
    { bool: { should: [
        { exists: { field: 'workday.user.Manager_Email' } },
        { exists: { field: 'workday.user.Manager_ID' } },
      ], minimum_should_match: 1 } },
    // First run (no watermark) scans the full inventory; later runs narrow to
    // workers re-synced in the window.
    ...(lastProcessedTimestamp
      ? [{ range: { 'event.ingested': { gte: WORKDAY_INGESTED_LOOKBACK } } }]
      : []),
  ],
  esqlQueryOverride: (ns) => buildWorkdaySupervisesEsqlQuery(ns, lastProcessedTimestamp),
}
```

`WORKDAY_INGESTED_LOOKBACK = 'now-30d'`. The watermark's *presence* selects
full-scan vs incremental; the window itself is a fixed 30d rather than
`> lastProcessedTimestamp`, so a delayed or skipped run cannot open a gap.

`customActor.fields` holds only the two manager fields. Both are keyword-mapped
and low-cardinality relative to the workforce (managers ⊂ employees), so composite
bucketing is safe — contrast the `system_auth` bucket-explosion caused by including
a per-host-varying `user.id` (PR #278471).

### D5 — full scan on first run, then a 30d `event.ingested` window

The engine's default 30d lookback is applied as an **ES|QL `filter` parameter**
(`run_relationship_maintainer.ts:138`), not as text in the query body, so it
reaches `kind: 'override'` configs too — an override cannot sidestep it. Entra ID
`owns` simply omits `disableLookbackWindow` and runs with the default 30d window
on `@timestamp`.

**That default is wrong for Workday.** `default.yml:201-205` sets `@timestamp`
from `Hire_Date`, so a 30d `@timestamp` window selects workers **hired** in the
last 30 days — not workers *synced* in the last 30 days. A tenured employee is
re-ingested every 24h but keeps a years-old `@timestamp`. All five documents in
the integration's test fixture (`@timestamp` 2024-03-19 / 2024-04-15) would be
excluded. The result would be an org chart containing only new hires.

`entity.lifecycle.last_seen` is not an alternative: it is
`newestValue({ source: '@timestamp' })` (`common_fields.ts:164-168`), so the
`Hire_Date` problem propagates into the entity index too.

**`event.ingested` is the correct field, and it is available.** `sample_event.json`
— captured from a real ingested document, unlike the pipeline-test fixtures —
carries `event.ingested: "2026-08-25T07:08:39Z"` alongside
`@timestamp: "2024-03-19T00:00:00.000Z"` on the same document: exactly the
sync-time-vs-hire-date split this config needs.

It is mapped even though the package does not declare it in `fields/*.yml`. The
package is `format_version: 3.4.2`, and since package-spec 3.0 Fleet composes
every data stream's index template with the managed **`ecs@mappings`** component
template, which maps the full ECS field set (`event.ingested` as a `date`).
Packages that declare it explicitly are generally older or customizing it;
absence from `fields/*.yml` does not imply unmapped for a 3.x package.

So:

| Run | Window |
|---|---|
| First (no watermark) | **Full scan** — no time filter; builds the standing org chart |
| Subsequent | `event.ingested >= now-30d` — workers re-synced in the window |

`disableLookbackWindow: true` is still required, to suppress the engine's
`@timestamp`/`Hire_Date` window; the `event.ingested` range replaces it in
`compositeAggAdditionalFilters` and in the override ES|QL.

A 30d window against a 24h poll is deliberately generous — it tolerates sync
outages, backfills and re-indexes of up to a month without losing edges, while
still bounding the steady-state scan to recently-synced workers rather than the
entire inventory.

**Why a narrowing window is safe: writes are additive.**

`writeEntityIds` builds a partial-document update per actor containing only the
targets computed by the *current* run (`update_entities.ts:224-243`), and
`bulkUpdateEntity` issues it as an ES `update` with `{ doc }`
(`crud_client.ts:449-452`). A partial update replaces the `ids` array it is
given, but touches no field absent from the payload — and an actor with no
targets this run is dropped entirely, first by `hasAnyTargets`
(`update_entities.ts:29-31`) and again by the `Object.keys(relationships).length > 0`
guard (`:232`). This matches the documented invariant "omit unchanged
relationship fields with `undefined`, not `{ ids: [] }`", whose rationale is
exactly that an empty array "erases relationships observed in an earlier window
but absent in the current one".

Consequences, both of which follow from that one mechanism:

- **A worker outside the window keeps their edge.** Nothing is retracted by
  virtue of not being re-observed, so narrowing the window cannot lose
  previously-written edges. This is what makes the incremental path safe.
- **Active workers never leave the window anyway.** The integration re-ingests
  the full inventory every 24h poll, so `event.ingested` advances for every
  active worker each cycle regardless of hire date. Re-orgs, transfers and newly
  assigned reports are picked up on the next run — precisely what an
  `@timestamp`/`Hire_Date` window would have missed.

**Known limitation — stale edges on departure.** When a worker leaves, Workday
stops emitting their row; their `event.ingested` freezes and they age out of the
window. Because writes are additive, their manager's `supervises.ids` retains
them indefinitely. This is **not** introduced by the `event.ingested` window — an
unconditional full scan behaves identically, since a departed worker's document
is simply absent from the index either way. Retraction would require a
framework-level capability (diffing previous against current target sets) that
no maintainer has today. Out of scope; flagged for the epic.

| Option | Verdict |
|---|---|
| Engine default 30d on `@timestamp` (Entra ID parity) | **Rejected** — selects only new hires; the standing org chart is never built |
| `disableLookbackWindow: true`, unconditional full scan | **Rejected** — correct but rescans the whole inventory daily with no incrementality |
| Full scan first run, then 30d on `event.ingested` | **Chosen** |

The maintainer already declares `timeout: '1h'`, which covers the first-run full
scan.

## Files to change

| File | Change |
|---|---|
| `entity_store/common/domain/definitions/user.ts` | Add `{ sourceMatchesAny: ['workday'], then: 'workday' }` to `whenClauses` |
| `maintainers/supervises/configs.ts` | Add `buildWorkdaySupervisesEsqlQuery` + the log-inverted config |
| `maintainers/supervises/index.ts` | Extend `description` to mention the Workday log-inverted source |
| `maintainers/supervises/configs.test.ts` | Config-shape + Step 1 filter + ES|QL contract tests |
| `maintainers/supervises/__snapshots__/configs.test.ts.snap` | Golden ES|QL snapshot |
| Scout `api/fixtures/maintainers/helpers.ts` | Generalize `seedLogDocument` (currently hardcodes `host.id`/`host.name`) |
| Scout `api/tests/maintainers/workday_supervises_maintainer.spec.ts` | New spec file |

No new namespace constant is needed: `USER_ENTITY_NAMESPACE` in
`user_entity_constants.ts` declares only `Local`, and the IdP namespaces
(`okta`, `entra_id`, `microsoft_365`, `active_directory`) are inline string
literals in `user.ts`. `workday` follows that existing convention.

## Testing

**Unit** (`configs.test.ts`): Okta and Entra configs unchanged; Workday config
shape (`kind`, `indexPattern`, `targetEntityType`, `customActor.fields`,
`disableLookbackWindow`, `validateTargetIds`); Step 1 composite filters; ES|QL
contract — emits `actorUserId`/`supervises`, no `SET unmapped_fields`, and never
references `Worker_s_Manager`.

The first-run/steady-state split is tested explicitly, since it is the design's
most subtle behaviour:

- `buildSupervisesConfigs()` (no watermark) → **no** `event.ingested` filter in
  `compositeAggAdditionalFilters` and none in the ES|QL (full scan).
- `buildSupervisesConfigs('<ts>')` → `event.ingested` range present in **both**
  Step 1 and Step 2, so the two stages narrow identically.
- Neither variant filters on `@timestamp`.

Golden snapshots cover both variants.

A separate unit assertion covers the `user.ts` change: a Workday-sourced document
resolves `entity.namespace` to `workday` (not `unknown`).

**Scout** (`workday_supervises_maintainer.spec.ts`) — the ticket's four cases:

1. Worker with **no manager** → no `supervises` write.
2. **One report** → manager entity gets exactly `[user:<report>@workday]`.
3. **Shared manager** (two reports) → one actor write with both targets.
4. **Manager missing from store** → write dropped, no phantom manager entity minted.

Plus one case for D5, since seeded log documents must carry an explicit
`event.ingested` for the incremental path to be exercised at all:

5. **A worker whose `@timestamp` (`Hire_Date`) is years old but whose
   `event.ingested` is recent** still produces a `supervises` edge. This is the
   regression guard for the `Hire_Date` trap — it fails if the config ever falls
   back to the engine's `@timestamp` lookback.

A new spec file is required: `scout_max_one_describe` forbids a second suite
registration in `log_inverted_relationship_maintainer.spec.ts`.

`seedLogDocument` must be generalized — it currently hardcodes `host.id` /
`host.name` and `event.category: ['host']`, which cannot express a user-target
Workday row, and it sets only `@timestamp`, so it needs to accept an explicit
`event.ingested` for case 5. The existing `LogInvertedRelationshipMaintainerSuiteConfig` is also
host-shaped (`buildIntegrationFields` takes `{ id, mail, upn }` and the assertions
expect `host:<id>` targets). Generalizing that suite to parameterize the target
EUID form is preferred over copying it; if generalization proves invasive, a
purpose-built Workday spec is acceptable rather than duplicating 390 lines.

## Out of scope

Per the ticket: new reverse ECS fields (security-team#18732), Workday ingest
pipeline changes, leaver watchlists, stripping manager ids from `related.user`.
Additionally: actor-side EUID pre-validation (D3), chunking
`matchExistingTargetIds`, and **edge retraction for departed workers** (D5) —
a framework-level gap affecting every maintainer, not just this one.

## Known risks

- **`matchExistingTargetIds` is an unbounded terms query** and can hit
  `max_terms_count` on large stores — a pre-existing, documented engine risk for
  any `validateTargetIds: true` maintainer, not introduced here, but Workday
  org-scale full scans will exercise it.
- **First run is a full inventory scan** (see D5), covered by the existing
  `timeout: '1h'`. Steady-state runs narrow to a 30d `event.ingested` window.
- **`event.ingested` is mapped via the managed `ecs@mappings` component
  template, not declared in the Workday package.** This is standard for
  package-spec 3.x and verified against `sample_event.json`, but it is an
  implicit dependency: if a future package revision opted out of ECS mappings,
  the incremental filter would match nothing and steady-state runs would
  silently write zero relationships. An integration test asserting
  `event.ingested` is present and queryable guards this.
- **`user.ts` re-keying.** See D4 blast radius.
