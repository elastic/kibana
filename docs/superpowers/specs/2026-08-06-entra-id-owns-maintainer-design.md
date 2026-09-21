# Design: `owns` maintainer config for `entityanalytics_entra_id` (log-based)

Date: 2026-08-06
Status: Approved
Area: `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/owns/`

## Goal

Populate `user.entity.relationships.owns.host.ids` for the `entityanalytics_entra_id`
integration by reading **device log documents** and inverting their `registeredOwners`
array into user-keyed edges.

This adds a second config to the `owns` maintainer. The existing Okta config reads the
**entity index** via `raw_identifiers`; this one reads **logs** — a first for this
maintainer.

## Background

Entra ID exposes device ownership **only on the device object** (`registeredOwners`).
There is no user-side "devices I own" field, and
`data_stream/entity/agent/stream/entity-analytics.yml.hbs` only supports
`expand.users: [directReports, appRoleAssignments]` — so this cannot be fixed by an
input/config change. This is why PR
[elastic/integrations#18621](https://github.com/elastic/integrations/pull/18621) shipped
`supervises` but silently dropped the intended `owns`.

Settled constraints (see
`maintainers/engine/handoff-entra-id-owns-maintainer.md`, prior investigation
[elastic/security-team#18732](https://github.com/elastic/security-team/issues/18732)):

- **Direction is active-only.** Emit `user.entity.relationships.owns.host.{id,name}`.
  Never `host.entity.relationships.owns.user.*` (valid ECS, but reads "this host owns
  these users" — the passive inverse).
- **`owned_by` does not exist** anywhere in the package and is not an ECS field. The
  lines resembling it in `test-device.json-expected.json` are the raw
  `registered_owners` array, not a relationship field.
- **The relationship is built Kibana-side, not in the ingest pipelines.** Do not open a
  PR against `device.yml` / `user.yml`.
- **`registered_users` is a separate concept** and must not be folded into `owns`.

## The inversion

Every shipped log-based config (`accesses`, `communicates_with`) reads documents where
the actor is the document's subject. Entra ID inverts this:

| | source doc | actor | target |
|---|---|---|---|
| `accesses` / `communicates_with` | logon event | `user.name` on the doc | `host.id` on the doc |
| **`owns` / `entityanalytics_entra_id`** | **device doc** | **`registered_owners.*`** (array) | **`host.id`** on the doc |

A device with two owners must produce **two edges**, one per owner — not one collapsed
edge.

## Key decision: which EUID identifies the actor

The entity store's user `euidRanking` (non-local branch,
`entity_store/common/domain/definitions/user.ts`) is:

1. `user.email@<ns>`
2. `user.id@<ns>`
3. `user.name@user.domain@<ns>`
4. `user.name@<ns>`

This **inverts** the handoff document's ranking. The handoff ranked the *join* by data
quality (`id` most authoritative, being an immutable GUID). But the EUID the entity
store actually **minted** for that user is derived from `user.email` first. On the device
side `registered_owners.mail` carries the same value as the user's `user.email`, so
`mail` is the rank-1 match — but it is null for non-mailbox-enabled accounts, in which
case the entity's EUID falls back to `user.id`.

**Decision: union `mail` and `id`, emit both, do not validate.**

`validateTargetIds` prunes **targets** only. Reading `writeEntityIds` in
`engine/update_entities.ts`, `pruneNonExistingTargets` walks the relationship ID sets;
the **actor** EUID is never validated — it goes to `bulkUpdateEntity` and a
non-existent actor returns 404, counted in `notFound` and logged as "actor entities not
yet in store".

Here the ambiguous EUID is the **actor**; the target (`host:<device.id>`) is never
ambiguous. So `validateTargetIds: true` would spend a round-trip validating something
never in doubt while doing nothing about the real ambiguity — and would inherit the
unresolved `max_terms_count` concern from PR
[#272948](https://github.com/elastic/kibana/pull/272948). The union is already safe for
the actor: a wrong guess 404s harmlessly rather than writing dangling data.

## Structural hazard: `registered_owners` is `type: group`, not `nested`

Declared at `data_stream/entity/fields/fields.yml:95`. Elasticsearch flattens the array
at index time and loses per-object correlation:

```
registered_owners.id   = ["5ebc6a0f-...", "7fa23b1e-..."]   # Alice, Bob
registered_owners.mail = ["alice.smith@...", "bob.jones@..."]
```

Nothing links `id[0]` to `mail[0]`. Consequences:

1. **Never write a cross-field clause within one owner** — a query combining two owner
   attributes matches a device even when no single owner has that combination.
2. **Querying one field at a time is safe** — hence union-then-expand rather than
   pairing.
3. **`MV_EXPAND` is what recovers one row per owner.**

A per-owner ranked fallback (`id`, else `upn`) is **not expressible in ES|QL** for this
reason — `MV_EXPAND` on two flattened columns yields a cross product, not pairs.

Both `registered_owners.mail` and `.id` are mapped `keyword`
(`fields.yml:104,110`), so both are aggregatable and valid composite sources.

## Why `kind: 'override'`

The default ES|QL builder derives the actor EUID from ECS `user.*` fields on the
document. Device docs have no `user.*` — the actor lives in a vendor-namespaced array.
`customActor.evalOverride` can set the Step 2 actor expression, but the union requires
`MV_EXPAND` on a line of its own before the `EVAL`, which a single expression cannot
express. So the config supplies the entire Step 2 query, exactly as `supervises` does.

## The config

Appended to `buildOwnsConfigs()` in `owns/configs.ts`, alongside the existing Okta entry.

Throughout this section `OWNERS` is the module-level constant:

```ts
const ENTRA_ID_ENTITY_SOURCE = 'entityanalytics_entra_id';
const OWNERS = 'entityanalytics_entra_id.device.registered_owners';
```

```ts
{
  kind: 'override',
  id: 'entityanalytics_entra_id',
  name: 'Entra ID Entity Analytics',
  indexPattern: (ns) => `logs-entityanalytics_entra_id.entity-${ns}`,
  targetEntityType: 'host',
  relationshipKey: 'owns',
  customActor: { fields: [`${OWNERS}.mail`, `${OWNERS}.id`] },
  validateTargetIds: false,   // target is host:<device.id> — never ambiguous
  compositeAggAdditionalFilters: [
    { term: { 'data_stream.dataset': 'entityanalytics_entra_id.device' } },
    { exists: { field: 'host.id' } },
    { bool: { should: [
        { exists: { field: `${OWNERS}.mail` } },
        { exists: { field: `${OWNERS}.id` } },
      ], minimum_should_match: 1 } },
  ],
  esqlQueryOverride: (ns) => buildEntraIdOwnsEsqlQuery(ns),
}
```

`disableLookbackWindow` stays **unset**, so the engine's default 30-day `@timestamp`
filter applies to both steps and bounds the scan. No watermark: `entity.lifecycle.last_seen`
does not exist on log documents, and relationship writes merge rather than append, so a
trailing-30d re-scan each run is idempotent.

### Step 1 — actor discovery

The composite aggregation buckets on `[registered_owners.mail, registered_owners.id]`.
Because both are `keyword`, each *value* of the flattened array becomes its own bucket —
one bucket per distinct owner.

The page filter's tuple→OR widening (documented in `build_actor_discovery_query.ts`) is
harmless here: Step 2 re-derives actors from the document itself, so a superset only
means extra candidate documents, never wrong edges.

The `data_stream.dataset` term is required because device and user documents share the
`logs-entityanalytics_entra_id.entity-<ns>` index.

### Step 2 — ES|QL

Column contract: `actorUserId` plus a column named `owns`.

Rendered for namespace `default`, with `${OWNERS}` expanded:

```
FROM logs-entityanalytics_entra_id.entity-default
| WHERE data_stream.dataset == "entityanalytics_entra_id.device"
    AND host.id IS NOT NULL
    AND (entityanalytics_entra_id.device.registered_owners.mail IS NOT NULL
         OR entityanalytics_entra_id.device.registered_owners.id IS NOT NULL)
| EVAL targetEntityId = CONCAT("host:", TO_STRING(host.id))
| EVAL ownerKey = CASE(
    entityanalytics_entra_id.device.registered_owners.mail IS NULL,
      entityanalytics_entra_id.device.registered_owners.id,
    entityanalytics_entra_id.device.registered_owners.id IS NULL,
      entityanalytics_entra_id.device.registered_owners.mail,
    MV_APPEND(entityanalytics_entra_id.device.registered_owners.mail,
              entityanalytics_entra_id.device.registered_owners.id))
| MV_EXPAND ownerKey
| EVAL actorUserId = CONCAT("user:", ownerKey, "@entra_id")
| WHERE COALESCE(actorUserId, "") != ""
    AND actorUserId != "user:@entra_id"
    AND actorUserId RLIKE ".+:.+@.+"
| STATS owns = VALUES(targetEntityId) BY actorUserId
| LIMIT 3500
```

Details that matter:

- The `CASE` guard is **mandatory** — `MV_APPEND(null, x)` returns `null` in ES|QL, so a
  naive append drops every owner missing either field. Pattern copied from
  `buildSupervisesEsqlQuery`.
- `actorUserId != "user:@entra_id"` guards the empty-value case, mirroring the
  `supervises` guard and the invariant from PR
  [#262345](https://github.com/elastic/kibana/pull/262345) (empty UPN produced an
  invalid `"user:@entra_id"`).
- Bare identifiers throughout — no dotted-numeric segments, so no backticks required.
- `VALUES()` in `STATS` deduplicates, so a user owning the same device via both `mail`
  and `id` rows yields one target ID.

## Testing

### Unit — `owns/configs.test.ts`

| Test | Asserts |
|---|---|
| Config shape | Two configs returned; entra_id is `kind: 'override'`, `validateTargetIds: false`, `disableLookbackWindow` unset |
| Index pattern | `logs-entityanalytics_entra_id.entity-default` for namespace `default` |
| ES\|QL snapshot | Full query text — `CASE`/`MV_APPEND` guard, `MV_EXPAND`, `@entra_id` suffix, `owns` column |
| Column contract | Query emits exactly `actorUserId` and `owns` |
| Composite filters | Dataset term, `host.id` exists, owner-field `should` gate |

### Scout API — new spec file

A new host-target maintainer requires its **own spec file**: `scout_max_one_describe`
forbids a second suite registration in an existing file. Must call
`waitForEntityStoreRunning` after install and set `apiTest.setTimeout(180_000)` — both
documented domain invariants.

Seeded cases mirror the real fixtures in
`data_stream/entity/_dev/test/pipeline/test-device.json-expected.json`:

1. Device with no `registered_owners` → no edge emitted.
2. Single-owner device → one edge; `owns.host.ids == ["host:<device.id>"]`.
3. **Shared workstation with two owners → two distinct users each receive the edge.**
   This is the flattening-hazard regression test and the most important of the three.

## Error handling

Inherited from the engine; nothing bespoke:

- Wrong-guess actor EUID → 404 → `notFound` counter, logged as "actor entities not yet
  in store". Expected, roughly one per owner.
- ES|QL failure → surfaces as a run error; per the engine invariant it must not report
  success alongside partial writes.
- Abort signal → clean exit; watermark untouched (moot — no watermark used).

`owns/index.ts` needs **no changes**: it already declares `timeout: '1h'`, threads the
watermark harmlessly, and maps whatever `buildOwnsConfigs()` returns.

## Known risk

`notFound` will roughly double for this integration, since each owner emits one winning
and one losing EUID. Benign, but it will read as a regression on the telemetry funnel to
anyone looking at it cold. This must be stated in a code comment on the config.

## Out of scope

- Emitting `host.entity.relationships.owns.user.*` or any `owned_by` variant.
- Adding processors to the Entra ID ingest pipelines.
- Reading `registered_users` (a separate concept from `registered_owners`).
- Re-opening the edge-direction question — it is settled.

## References

- Handoff: `maintainers/engine/handoff-entra-id-owns-maintainer.md`
- Domain knowledge: `security_solution/.agents/domains/entity-relationship-maintainers/`
- `supervises` precedent (same integration, entity-index based): `maintainers/supervises/configs.ts`
- Okta `owns` precedent: `maintainers/owns/configs.ts`
- Engine target validation: `maintainers/engine/update_entities.ts`
- User EUID ranking: `entity_store/common/domain/definitions/user.ts`
- Device fixtures: `packages/entityanalytics_entra_id/data_stream/entity/_dev/test/pipeline/`
- PR that added `supervises` and intended `owns`: https://github.com/elastic/integrations/pull/18621
- Prior investigation: https://github.com/elastic/security-team/issues/18732
