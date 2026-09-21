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

```
FROM logs-workday.user-<ns>
| WHERE (workday.user.Manager_Email IS NOT NULL OR workday.user.Manager_ID IS NOT NULL)
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
  // @timestamp is Hire_Date, so the default 30d lookback would select only
  // new hires rather than recently-synced workers. See D5.
  disableLookbackWindow: true,
  validateTargetIds: true,
  compositeAggAdditionalFilters: [
    { bool: { should: [
        { exists: { field: 'workday.user.Manager_Email' } },
        { exists: { field: 'workday.user.Manager_ID' } },
      ], minimum_should_match: 1 } },
  ],
  esqlQueryOverride: (ns) => buildWorkdaySupervisesEsqlQuery(ns),
}
```

`customActor.fields` holds only the two manager fields. Both are keyword-mapped
and low-cardinality relative to the workforce (managers ⊂ employees), so composite
bucketing is safe — contrast the `system_auth` bucket-explosion caused by including
a per-host-varying `user.id` (PR #278471).

### D5 — `disableLookbackWindow: true` with no replacement time filter

This is the one place the design deliberately diverges from the Entra ID `owns`
precedent, so the reasoning is recorded in full.

The engine's 30d lookback is applied as an **ES|QL `filter` parameter**
(`run_relationship_maintainer.ts:138`), not as text in the query body, so it
reaches `kind: 'override'` configs too — an override cannot sidestep it. Entra ID
`owns` simply omits `disableLookbackWindow` and therefore runs with the default
30d window on `@timestamp`.

That default is wrong for Workday. `default.yml:201-205` sets `@timestamp` from
`Hire_Date`, so a 30d `@timestamp` window selects workers **hired** in the last 30
days — not workers *synced* in the last 30 days. A tenured employee is re-ingested
every 24h but keeps a years-old `@timestamp`, so they fall outside the window
permanently. All five documents in the integration's own test fixture
(`@timestamp` 2024-03-19 / 2024-04-15) would be excluded. The result would be an
org chart containing only new hires.

Three options were evaluated:

| Option | Verdict |
|---|---|
| Engine default 30d on `@timestamp` (Entra ID parity) | **Rejected** — selects only new hires; the standing org chart is never built |
| 30d on `event.ingested` | **Rejected** — not available (below) |
| `disableLookbackWindow: true`, full scan | **Chosen** — correct; heaviest; sanctioned by the ticket |

`event.ingested` would be the natural incremental field and is what the ticket
gestures at ("watermark on `event.ingested` if needed"). It is **not usable**:
Workday's `data_stream/user/fields/base-fields.yml` declares only
`data_stream.*`, `event.dataset`, `event.module`, and `@timestamp`, and its
`ecs.yml` declares a single field — `event.ingested` is mapped nowhere in the
package (109 other packages declare it explicitly when they depend on it). Fleet's
managed final pipeline still sets a value, but building an incremental window on
an undeclared, dynamically-mapped field is fragile and would silently select
nothing if the mapping is absent. Adding the mapping is a **Workday ingest
change, explicitly out of scope**.

The engine watermark does not help either: `lastProcessedTimestamp` is
per-maintainer (shared with the Okta and Entra configs) and gates on
`entity.lifecycle.last_seen`, which does not exist on log documents.

So this config performs a full scan of the inventory each run — which the ticket
explicitly accepts ("a full scan of the inventory is fine"). No watermark clause
is added to the ES|QL. The maintainer already declares `timeout: '1h'`.

If inventory size later makes this tight, the fix is to declare `event.ingested`
in the Workday package and add a range filter here — a follow-up spanning both
repos.

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
contract — emits `actorUserId`/`supervises`, no `SET unmapped_fields`, references
neither `Worker_s_Manager` nor any 30d lookback; golden snapshot.

A separate unit assertion covers the `user.ts` change: a Workday-sourced document
resolves `entity.namespace` to `workday` (not `unknown`).

**Scout** (`workday_supervises_maintainer.spec.ts`) — the ticket's four cases:

1. Worker with **no manager** → no `supervises` write.
2. **One report** → manager entity gets exactly `[user:<report>@workday]`.
3. **Shared manager** (two reports) → one actor write with both targets.
4. **Manager missing from store** → write dropped, no phantom manager entity minted.

A new spec file is required: `scout_max_one_describe` forbids a second suite
registration in `log_inverted_relationship_maintainer.spec.ts`.

`seedLogDocument` must be generalized — it currently hardcodes `host.id` /
`host.name` and `event.category: ['host']`, which cannot express a user-target
Workday row. The existing `LogInvertedRelationshipMaintainerSuiteConfig` is also
host-shaped (`buildIntegrationFields` takes `{ id, mail, upn }` and the assertions
expect `host:<id>` targets). Generalizing that suite to parameterize the target
EUID form is preferred over copying it; if generalization proves invasive, a
purpose-built Workday spec is acceptable rather than duplicating 390 lines.

## Out of scope

Per the ticket: new reverse ECS fields (security-team#18732), Workday ingest
pipeline changes, leaver watchlists, stripping manager ids from `related.user`.
Additionally: actor-side EUID pre-validation (D3), and chunking
`matchExistingTargetIds`.

## Known risks

- **`matchExistingTargetIds` is an unbounded terms query** and can hit
  `max_terms_count` on large stores — a pre-existing, documented engine risk for
  any `validateTargetIds: true` maintainer, not introduced here, but Workday
  org-scale full scans will exercise it.
- **Full scan every run.** No usable time filter or watermark exists (see D5).
  Acceptable per the ticket; revisit if inventory size makes the 1h timeout
  tight. This is the main divergence from the Entra ID `owns` precedent and the
  most likely thing a reviewer will question — D5 records why each alternative
  was rejected.
- **`user.ts` re-keying.** See D4 blast radius.
