# Entra ID `owns` Maintainer Config Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a log-based `owns` relationship maintainer config for the `entityanalytics_entra_id` integration that inverts device `registeredOwners` arrays into user-keyed `owns.host` edges.

**Architecture:** A second entry in `buildOwnsConfigs()` using `kind: 'override'`. Step 1 buckets a composite aggregation on the flattened `registered_owners.{mail,id}` keyword arrays over the `logs-entityanalytics_entra_id.entity-<ns>` log index; Step 2 unions those two fields into one multi-valued column, `MV_EXPAND`s it to recover one row per owner, and emits `user:<value>@entra_id` actors against a `host:<device.id>` target.

**Tech Stack:** TypeScript, Elasticsearch ES|QL + composite aggregations, Jest (unit + snapshot), Scout/Playwright (API integration).

## Global Constraints

- Design spec: `docs/superpowers/specs/2026-08-06-entra-id-owns-maintainer-design.md` — authoritative for all decisions below.
- Emit **only** the active direction `user.entity.relationships.owns.host.ids`. Never `host.entity.relationships.owns.user.*`, never `owned_by`.
- Read `registered_owners` **only**. `registered_users` is a separate concept and must not be folded into `owns`.
- Do **not** modify the Entra ID ingest pipelines (`device.yml` / `user.yml`) in the `integrations` repo.
- `validateTargetIds: false` on the new config — the target `host:<device.id>` is never ambiguous, and `validateTargetIds` does not validate actors.
- `disableLookbackWindow` stays **unset** on the new config so the engine's default 30-day `@timestamp` filter applies.
- Constants used across tasks: `ENTRA_ID_ENTITY_SOURCE = 'entityanalytics_entra_id'`, `OWNERS = 'entityanalytics_entra_id.device.registered_owners'`.
- Never suppress type or lint errors with `@ts-ignore`, `@ts-expect-error`, or `eslint-disable`.
- New filenames must be `snake_case`.

---

## File Structure

| File | Responsibility |
|---|---|
| `.../maintainers/owns/configs.ts` (modify) | Add `buildEntraIdOwnsEsqlQuery()` + the entra_id config entry |
| `.../maintainers/owns/configs.test.ts` (modify) | Re-scope Okta-only assertions; add entra_id unit tests |
| `.../maintainers/owns/__snapshots__/configs.test.ts.snap` (regenerate) | Golden ES\|QL snapshot |
| `.../test/scout/entity_analytics/api/fixtures/maintainers/helpers.ts` (modify) | Add `seedEntraIdDeviceLog()` |
| `.../test/scout/entity_analytics/api/tests/maintainers/entra_id_owns_maintainer.spec.ts` (create) | New Scout suite (own file — `scout_max_one_describe`) |

Paths are relative to `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/` for `maintainers/*`, and to `x-pack/solutions/security/plugins/security_solution/` for `test/*`.

---

### Task 1: Re-scope existing Okta-only assertions in `configs.test.ts`

`owns/configs.test.ts` currently asserts universally over `OWNS_INTEGRATION_RELATIONSHIP_CONFIGS` that every config has `disableLookbackWindow === true`, `validateTargetIds === true`, and an entity-index `indexPattern`. All three are false for a log-based config. This task narrows those assertions to Okta **before** adding the new config, so the suite stays green at every commit.

**Files:**
- Modify: `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/owns/configs.test.ts`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: a `const oktaConfig = buildOwnsConfigs()[0] as OverrideRelationshipIntegrationConfig;` module-level binding, and Okta-scoped versions of the four previously-universal `describe` blocks. Task 3 appends new `describe` blocks alongside these.

- [ ] **Step 1: Run the existing tests to confirm a green baseline**

Run:
```bash
node scripts/jest x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/owns/configs.test.ts
```
Expected: PASS (all tests green, snapshots match).

- [ ] **Step 2: Narrow the universal assertions to Okta**

In `configs.test.ts`, add this binding directly below the existing `overrideConfigs` declaration near the top of the file:

```ts
const OKTA_ID = 'entityanalytics_okta';

const oktaConfig = OWNS_INTEGRATION_RELATIONSHIP_CONFIGS.find(
  (c): c is OverrideRelationshipIntegrationConfig => c.id === OKTA_ID
)!;
```

Then replace the `it('ships exactly the one expected integration (okta)')` test body with:

```ts
  it('ships exactly the expected integrations', () => {
    expect(OWNS_INTEGRATION_RELATIONSHIP_CONFIGS.map((c) => c.id).sort()).toEqual([
      'entityanalytics_okta',
    ]);
  });
```

Replace the `it.each(...)('$id: indexPattern points to the entity index (not a log index)')` block with an Okta-scoped test:

```ts
  it('entityanalytics_okta: indexPattern points to the entity index', () => {
    expect(oktaConfig.indexPattern('myns')).toContain('.entities.v2.latest.security_myns');
    expect(oktaConfig.indexPattern('default')).not.toContain('myns');
  });
```

Replace the entire `describe('lookback window', ...)` block with:

```ts
  describe('lookback window', () => {
    it('entityanalytics_okta declares disableLookbackWindow (entity-index source)', () => {
      expect(oktaConfig.disableLookbackWindow).toBe(true);
    });

    it('entityanalytics_okta: Step 1 actor discovery query omits the @timestamp lookback range', () => {
      const query = buildActorDiscoveryQuery(oktaConfig, undefined) as {
        query: { bool: { filter: unknown[] } };
      };
      const hasTimestampRange = query.query.bool.filter.some((f) =>
        JSON.stringify(f).includes('"@timestamp"')
      );
      expect(hasTimestampRange).toBe(false);
    });
  });
```

Replace the entire `describe('validateTargetIds', ...)` block with:

```ts
  describe('validateTargetIds', () => {
    it('entityanalytics_okta declares validateTargetIds (raw_identifiers targets may not exist)', () => {
      expect(oktaConfig.validateTargetIds).toBe(true);
    });
  });
```

Now scope the four `it.each(...)` ES|QL-shape tests to Okta. Replace each of these five blocks — `'$id: override query expands raw host.id before CONCAT ...'`, `'$id: override query does NOT resolve host.name ...'`, `'$id: override query guards against non-EUID target values via RLIKE'`, `'$id: override query does NOT filter by entity.type ...'`, and `'$id: override query sets actorUserId from entity.id ...'` — with these Okta-scoped equivalents:

```ts
  it('entityanalytics_okta: override query expands raw host.id before CONCAT (CONCAT is null on multi-valued input)', () => {
    const query = buildTargetsPerActorQuery(oktaConfig, 'default');
    expect(query).toContain('raw_identifiers.host.id');
    expect(query).toContain('MV_EXPAND rawKey0');
    expect(query).toContain('CONCAT("host:", rawKey0)');
  });

  it('entityanalytics_okta: override query does NOT resolve host.name (device display name is not a valid EUID basis)', () => {
    const query = buildTargetsPerActorQuery(oktaConfig, 'default');
    expect(query).not.toContain('raw_identifiers.host.name');
  });

  it('entityanalytics_okta: override query guards against non-EUID target values via RLIKE', () => {
    const query = buildTargetsPerActorQuery(oktaConfig, 'default');
    expect(query).toContain('targetEntityId RLIKE ".+:.+"');
  });

  it('entityanalytics_okta: override query does NOT filter by entity.type (actor discovered by entity.id)', () => {
    const query = buildTargetsPerActorQuery(oktaConfig, 'default');
    expect(query).not.toContain('entity.type ==');
  });

  it('entityanalytics_okta: override query sets actorUserId from entity.id (already EUID-prefixed)', () => {
    const query = buildTargetsPerActorQuery(oktaConfig, 'default');
    expect(query).toContain('actorUserId = entity.id');
  });
```

Leave these blocks **unchanged** — they are already correctly scoped or remain valid for every config: `'declares kind: "override" on every owns config'`, `'declares relationshipKey "owns" on every config'`, `'declares targetEntityType "host" on every config'`, `'$id: builds a syntactically-locked actor discovery query'`, `describe('actor existence gate')`, `describe('entity.source filter')`, `describe('watermark behaviour')`, and `describe('golden snapshots')`.

- [ ] **Step 3: Run the tests to verify they still pass**

Run:
```bash
node scripts/jest x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/owns/configs.test.ts
```
Expected: PASS. No snapshot changes (the config itself is untouched — only test scoping changed).

- [ ] **Step 4: Commit**

```bash
git add x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/owns/configs.test.ts
git commit -m "test: scope owns config assertions to okta before adding entra_id"
```

---

### Task 2: Add the Entra ID config and its ES|QL builder

**Files:**
- Modify: `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/owns/configs.ts`
- Test: `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/owns/configs.test.ts`

**Interfaces:**
- Consumes: `oktaConfig` / `OKTA_ID` bindings from Task 1.
- Produces:
  - `ENTRA_ID_ENTITY_SOURCE: 'entityanalytics_entra_id'` (module constant, not exported)
  - `OWNERS: 'entityanalytics_entra_id.device.registered_owners'` (module constant, not exported)
  - `buildEntraIdOwnsEsqlQuery(namespace: string): string` (module-private function)
  - `buildOwnsConfigs(lastProcessedTimestamp?: string)` now returns **two** configs; the entra_id one has `id: 'entityanalytics_entra_id'`. Task 3 asserts on it; Task 5 runs it end-to-end via maintainer id `owns`.

- [ ] **Step 1: Write the failing test**

Append this `describe` block inside the top-level `describe('OWNS_INTEGRATION_RELATIONSHIP_CONFIGS', ...)` in `configs.test.ts`, immediately before the closing `});` of that block:

```ts
  describe('entityanalytics_entra_id (log-based)', () => {
    const ENTRA_ID = 'entityanalytics_entra_id';
    const OWNERS_FIELD = 'entityanalytics_entra_id.device.registered_owners';

    const entraConfig = () =>
      buildOwnsConfigs().find(
        (c): c is OverrideRelationshipIntegrationConfig => c.id === ENTRA_ID
      )!;

    it('is shipped alongside the okta config', () => {
      expect(buildOwnsConfigs().map((c) => c.id).sort()).toEqual([
        'entityanalytics_entra_id',
        'entityanalytics_okta',
      ]);
    });

    it('reads the Entra ID log index, not the entity index', () => {
      expect(entraConfig().indexPattern('myns')).toBe(
        'logs-entityanalytics_entra_id.entity-myns'
      );
      expect(entraConfig().indexPattern('default')).not.toContain('.entities.v2.latest');
    });

    it('does NOT disable the lookback window (log index uses the engine 30d @timestamp filter)', () => {
      expect(entraConfig().disableLookbackWindow).toBeUndefined();
    });

    it('does NOT validate target ids (host:<device.id> target is never ambiguous)', () => {
      expect(entraConfig().validateTargetIds).toBe(false);
    });

    it('discovers actors from both flattened owner identifier fields', () => {
      expect(entraConfig().customActor?.fields).toEqual([
        `${OWNERS_FIELD}.mail`,
        `${OWNERS_FIELD}.id`,
      ]);
    });

    it('Step 1 narrows to device documents, requires host.id, and gates on owner presence', () => {
      const filters = entraConfig().compositeAggAdditionalFilters ?? [];
      expect(filters).toContainEqual({
        term: { 'data_stream.dataset': 'entityanalytics_entra_id.device' },
      });
      expect(filters).toContainEqual({ exists: { field: 'host.id' } });

      const ownerGate = filters.find((f) => JSON.stringify(f).includes('registered_owners'));
      expect(JSON.stringify(ownerGate)).toContain(`${OWNERS_FIELD}.mail`);
      expect(JSON.stringify(ownerGate)).toContain(`${OWNERS_FIELD}.id`);
    });

    it('Step 1 applies the engine @timestamp lookback (log index)', () => {
      const query = buildActorDiscoveryQuery(entraConfig(), undefined) as {
        query: { bool: { filter: unknown[] } };
      };
      const hasTimestampRange = query.query.bool.filter.some((f) =>
        JSON.stringify(f).includes('"@timestamp"')
      );
      expect(hasTimestampRange).toBe(true);
    });

    it('Step 2 emits the engine column contract (actorUserId + owns)', () => {
      const query = buildTargetsPerActorQuery(entraConfig(), 'default');
      expect(query).toContain('STATS owns = VALUES(targetEntityId) BY actorUserId');
    });

    it('Step 2 guards MV_APPEND against nulls before expanding owners', () => {
      const query = entraConfig().esqlQueryOverride('default');
      // MV_APPEND(null, x) returns null in ES|QL, so each field is appended only
      // when the accumulator is non-null. Without the CASE, every owner missing
      // either field would be silently dropped.
      expect(query).toContain('CASE(');
      expect(query).toContain('MV_APPEND(');
      expect(query).toContain('MV_EXPAND ownerKey');
      // The expand must come after the union and before the actor CONCAT.
      expect(query.indexOf('MV_APPEND(')).toBeLessThan(query.indexOf('MV_EXPAND ownerKey'));
      expect(query.indexOf('MV_EXPAND ownerKey')).toBeLessThan(
        query.indexOf('CONCAT("user:", ownerKey')
      );
    });

    it('Step 2 builds namespace-suffixed actor EUIDs and a namespace-less host target', () => {
      const query = entraConfig().esqlQueryOverride('default');
      expect(query).toContain('CONCAT("user:", ownerKey, "@entra_id")');
      expect(query).toContain('CONCAT("host:", TO_STRING(host.id))');
    });

    it('Step 2 rejects empty-value actor EUIDs', () => {
      const query = entraConfig().esqlQueryOverride('default');
      // An empty owner value would otherwise yield the invalid id "user:@entra_id".
      expect(query).toContain('actorUserId != "user:@entra_id"');
      expect(query).toContain('actorUserId RLIKE ".+:.+@.+"');
    });

    it('never reads registered_users (a separate concept from registered_owners)', () => {
      const query = entraConfig().esqlQueryOverride('default');
      expect(query).not.toContain('registered_users');
      expect(JSON.stringify(entraConfig().compositeAggAdditionalFilters)).not.toContain(
        'registered_users'
      );
    });

    it('ignores the watermark (log-based config re-scans the trailing lookback window)', () => {
      const withWatermark = buildOwnsConfigs('2026-06-01T00:00:00.000Z').find(
        (c): c is OverrideRelationshipIntegrationConfig => c.id === ENTRA_ID
      )!;
      expect(withWatermark.esqlQueryOverride('default')).toBe(
        entraConfig().esqlQueryOverride('default')
      );
      expect(JSON.stringify(withWatermark.compositeAggAdditionalFilters)).not.toContain(
        'entity.lifecycle.last_seen'
      );
    });

    it('targets-per-actor ES|QL is locked', () => {
      expect(buildTargetsPerActorQuery(entraConfig(), '__namespace__')).toMatchSnapshot();
    });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
node scripts/jest x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/owns/configs.test.ts
```
Expected: FAIL. The `entraConfig()` lookup returns `undefined` and the non-null assertion yields a `TypeError: Cannot read properties of undefined`, plus the `'is shipped alongside the okta config'` test fails with a one-element array.

- [ ] **Step 3: Write the implementation**

In `configs.ts`, add these constants directly below the existing `const OKTA_ENTITY_SOURCE = 'entityanalytics_okta';` line:

```ts
const ENTRA_ID_ENTITY_SOURCE = 'entityanalytics_entra_id';
const ENTRA_ID_DEVICE_DATASET = 'entityanalytics_entra_id.device';
const OWNERS = 'entityanalytics_entra_id.device.registered_owners';
const OWNER_MAIL_FIELD = `${OWNERS}.mail`;
const OWNER_ID_FIELD = `${OWNERS}.id`;
```

Add the ES|QL builder above `buildOwnsConfigs`:

```ts
/**
 * Step 2 ES|QL for the Entra ID `owns` maintainer.
 *
 * Entra ID exposes device ownership only on the *device* object
 * (`registeredOwners`) — there is no user-side "devices I own" field — so this
 * query reads device documents and inverts device→user to emit a user-keyed
 * edge.
 *
 * `registered_owners` is declared `type: group`, not `nested`, so Elasticsearch
 * flattens the array at index time and per-owner correlation is lost:
 *
 *   registered_owners.id   = [idA, idB]
 *   registered_owners.mail = [mailA, mailB]
 *
 * Nothing links `id[0]` to `mail[0]`, so a per-owner ranked fallback is not
 * expressible. Instead both fields are unioned into one multi-valued column and
 * expanded, emitting one candidate actor EUID per value.
 *
 * The entity store's user EUID ranking is email > id > name@domain > name, so
 * `mail` matches rank 1 and `id` rank 2. Emitting both means one lands on the
 * real entity and the other 404s. That is safe because the ambiguous EUID here
 * is the *actor*: `writeEntityIds` never validates actors (only targets), and a
 * missing actor is a counted no-op, not dangling relationship data. This is why
 * the config sets `validateTargetIds: false` — the target `host:<device.id>` was
 * never ambiguous, so validating it would buy nothing.
 *
 * Expect `notFound` to run roughly 2× the owner count for this integration. That
 * is the losing half of each union pair, not a regression.
 */
function buildEntraIdOwnsEsqlQuery(namespace: string): string {
  const logIndex = `logs-${ENTRA_ID_ENTITY_SOURCE}.entity-${namespace}`;

  return `FROM ${logIndex}
| WHERE data_stream.dataset == "${ENTRA_ID_DEVICE_DATASET}"
    AND host.id IS NOT NULL
    AND (${OWNER_MAIL_FIELD} IS NOT NULL OR ${OWNER_ID_FIELD} IS NOT NULL)
| EVAL targetEntityId = CONCAT("host:", TO_STRING(host.id))
| EVAL ownerKey = CASE(${OWNER_MAIL_FIELD} IS NULL, ${OWNER_ID_FIELD}, ${OWNER_ID_FIELD} IS NULL, ${OWNER_MAIL_FIELD}, MV_APPEND(${OWNER_MAIL_FIELD}, ${OWNER_ID_FIELD}))
| MV_EXPAND ownerKey
| EVAL ${ENGINE_COLUMNS.actor} = CONCAT("user:", ownerKey, "@entra_id")
| WHERE COALESCE(${ENGINE_COLUMNS.actor}, "") != ""
    AND ${ENGINE_COLUMNS.actor} != "user:@entra_id"
    AND ${ENGINE_COLUMNS.actor} RLIKE ".+:.+@.+"
| STATS ${RELATIONSHIP_KEY} = VALUES(targetEntityId) BY ${ENGINE_COLUMNS.actor}
| LIMIT ${COMPOSITE_PAGE_SIZE}`;
}
```

Add the two new imports at the top of `configs.ts`, alongside the existing imports:

```ts
import { COMPOSITE_PAGE_SIZE } from '../engine/constants';
import { ENGINE_COLUMNS } from '../engine/columns';
```

Append the new config to the array returned by `buildOwnsConfigs`, directly after the closing `},` of the existing Okta object and before the closing `];`:

```ts
    {
      kind: 'override',
      id: ENTRA_ID_ENTITY_SOURCE,
      name: 'Entra ID Entity Analytics',
      // Log-based source: device documents live in the integration's log index,
      // NOT the entity index. Ownership exists only on the device object, so the
      // maintainer reads devices and inverts device→user (see
      // buildEntraIdOwnsEsqlQuery).
      indexPattern: (ns) => `logs-${ENTRA_ID_ENTITY_SOURCE}.entity-${ns}`,
      targetEntityType: 'host',
      relationshipKey: RELATIONSHIP_KEY,
      // Actors are owner identifiers on the device doc, not ECS user.* fields.
      // Both are keyword-mapped, so each value of the flattened array becomes its
      // own composite bucket — one bucket per distinct owner.
      customActor: {
        fields: [OWNER_MAIL_FIELD, OWNER_ID_FIELD],
      },
      // The target is host:<device.id>, taken from the device doc's own host.id —
      // unambiguous, so there is nothing to validate. See buildEntraIdOwnsEsqlQuery
      // for why the *actor* ambiguity is not addressed by this flag.
      validateTargetIds: false,
      // `disableLookbackWindow` deliberately unset: this is a log index, so the
      // engine's default 30d @timestamp filter both bounds the scan and is the
      // correct freshness signal. Relationship writes merge rather than append,
      // so re-scanning the trailing window each run is idempotent.
      compositeAggAdditionalFilters: [
        // Device and user documents share this index; select devices only.
        { term: { 'data_stream.dataset': ENTRA_ID_DEVICE_DATASET } },
        { exists: { field: 'host.id' } },
        {
          bool: {
            should: [
              { exists: { field: OWNER_MAIL_FIELD } },
              { exists: { field: OWNER_ID_FIELD } },
            ],
            minimum_should_match: 1,
          },
        },
      ],
      // No watermark: `entity.lifecycle.last_seen` is written by the entity-store
      // transform and does not exist on log documents. The lookback window is the
      // bound instead.
      esqlQueryOverride: (ns) => buildEntraIdOwnsEsqlQuery(ns),
    },
```

- [ ] **Step 4: Run tests and update the snapshot**

Run:
```bash
node scripts/jest x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/owns/configs.test.ts -u
```
Expected: PASS. The `-u` flag writes the new `entityanalytics_entra_id` entry into `__snapshots__/configs.test.ts.snap`.

- [ ] **Step 5: Inspect the written snapshot**

Run:
```bash
git diff x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/owns/__snapshots__/configs.test.ts.snap
```
Confirm the added snapshot is **additive only** (the Okta entries are unchanged) and that the new query text contains `MV_EXPAND ownerKey`, `@entra_id`, and `STATS owns = VALUES(targetEntityId) BY actorUserId`.

- [ ] **Step 6: Type check and lint**

Run:
```bash
node scripts/type_check --project x-pack/solutions/security/plugins/security_solution/tsconfig.json
node scripts/eslint --fix x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/owns/configs.ts x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/owns/configs.test.ts
```
Expected: both clean.

- [ ] **Step 7: Commit**

```bash
git add x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/owns/configs.ts \
        x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/owns/configs.test.ts \
        x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/owns/__snapshots__/configs.test.ts.snap
git commit -m "feat: add log-based owns maintainer config for entityanalytics_entra_id"
```

---

### Task 3: Update the `owns` maintainer description

`owns/index.ts` describes the maintainer as Okta-only. No logic changes are needed — the maintainer already maps whatever `buildOwnsConfigs()` returns and already declares `timeout: '1h'` — but the description is now inaccurate.

**Files:**
- Modify: `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/owns/index.ts:16-18`

**Interfaces:**
- Consumes: `buildOwnsConfigs()` from Task 2 (already wired; no call-site change).
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Update the description string**

Replace lines 16–18 of `owns/index.ts`:

```ts
  description:
    'Resolves owns (user → host device) relationships from raw_identifiers on entity documents ' +
    '(Okta: user → enrolled device via owns.raw_identifiers.host.id)',
```

with:

```ts
  description:
    'Resolves owns (user → host device) relationships. ' +
    'Okta: from raw_identifiers on entity documents (owns.raw_identifiers.host.id). ' +
    'Entra ID: from device log documents, inverting registered_owners into user-keyed edges.',
```

- [ ] **Step 2: Verify nothing else in the file needs changing**

Confirm by inspection that `owns/index.ts` still: declares `timeout: '1h'`, calls `buildOwnsConfigs(lastProcessedTimestamp)`, and passes `maintainerName: 'owns'`. The watermark plumbing stays — it is harmless for the log-based config, which ignores it (asserted in Task 2).

- [ ] **Step 3: Run the maintainer unit tests**

Run:
```bash
node scripts/jest x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/owns/
```
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/owns/index.ts
git commit -m "docs: describe entra_id source in owns maintainer description"
```

---

### Task 4: Add a device-log seeding helper for Scout tests

Existing helpers seed *entity* documents (`seedUserEntity`, `seedHostEntity`). This maintainer reads *log* documents, so a new seeder is required. The shape follows `ingestSshLogin` in `test/scout_cps_local/api/tests/maintainers/accesses.spec.ts`, which is the log-based precedent.

**Files:**
- Modify: `x-pack/solutions/security/plugins/security_solution/test/scout/entity_analytics/api/fixtures/maintainers/helpers.ts`

**Interfaces:**
- Consumes: the existing `EsClient` type import already present in `helpers.ts`.
- Produces: `seedEntraIdDeviceLog(esClient: EsClient, options: SeedEntraIdDeviceLogOptions): Promise<void>` where

  ```ts
  interface SeedEntraIdDeviceLogOptions {
    deviceId: string;
    deviceName: string;
    owners: Array<{ id: string; mail?: string }>;
    timestamp?: string;
  }
  ```

  Task 5 imports `seedEntraIdDeviceLog` from `'../../fixtures/maintainers/helpers'`.

- [ ] **Step 1: Write the helper**

Append to `helpers.ts`:

```ts
/** Entra ID integration log index (device + user documents share it). */
const ENTRA_ID_LOG_INDEX = 'logs-entityanalytics_entra_id.entity-default';

interface SeedEntraIdDeviceLogOptions {
  /** Device object id — becomes host.id and the `host:<id>` target EUID. */
  deviceId: string;
  /** Device display name — becomes host.name. Not a resolvable identifier. */
  deviceName: string;
  /**
   * Registered owners of the device. `mail` is optional so tests can exercise
   * the non-mailbox-enabled case, where the owner resolves via id alone.
   *
   * NOTE: these are written as FLATTENED parallel arrays, mirroring how
   * Elasticsearch indexes the `type: group` mapping in the real integration.
   * Per-owner correlation is deliberately absent — a test that relied on
   * mail[i] pairing with id[i] would not reflect production behaviour.
   */
  owners: Array<{ id: string; mail?: string }>;
  /** @timestamp for the document. Defaults to 5 minutes ago (inside the 30d lookback). */
  timestamp?: string;
}

/**
 * Seeds one Entra ID device log document, shaped like the integration's
 * post-pipeline output (see
 * packages/entityanalytics_entra_id/data_stream/entity/_dev/test/pipeline/test-device.json-expected.json).
 *
 * Used by the entra_id `owns` maintainer suite, which reads device logs and
 * inverts `registered_owners` into user-keyed `owns.host` edges.
 */
export const seedEntraIdDeviceLog = async (
  esClient: EsClient,
  { deviceId, deviceName, owners, timestamp }: SeedEntraIdDeviceLogOptions
): Promise<void> => {
  const ts = timestamp ?? new Date(Date.now() - 5 * 60_000).toISOString();

  // Flatten to parallel arrays exactly as ES does for a `type: group` field.
  const ownerIds = owners.map((o) => o.id);
  const ownerMails = owners.map((o) => o.mail).filter((m): m is string => Boolean(m));

  const registeredOwners: Record<string, string[]> = { id: ownerIds };
  if (ownerMails.length > 0) {
    registeredOwners.mail = ownerMails;
  }

  await esClient.index({
    index: ENTRA_ID_LOG_INDEX,
    refresh: 'wait_for',
    document: {
      '@timestamp': ts,
      data_stream: {
        dataset: 'entityanalytics_entra_id.device',
        namespace: 'default',
        type: 'logs',
      },
      event: { kind: 'asset', category: ['host'] },
      host: { id: deviceId, name: deviceName },
      device: { id: deviceId },
      entityanalytics_entra_id: {
        device: {
          id: deviceId,
          display_name: deviceName,
          registered_owners: registeredOwners,
        },
      },
    },
  });
};
```

- [ ] **Step 2: Type check**

Run:
```bash
node scripts/type_check --project x-pack/solutions/security/plugins/security_solution/tsconfig.json
```
Expected: clean. `EsClient` is already imported at `helpers.ts:8`, so no new import is needed.

- [ ] **Step 3: Lint**

Run:
```bash
node scripts/eslint --fix x-pack/solutions/security/plugins/security_solution/test/scout/entity_analytics/api/fixtures/maintainers/helpers.ts
```
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add x-pack/solutions/security/plugins/security_solution/test/scout/entity_analytics/api/fixtures/maintainers/helpers.ts
git commit -m "test: add seedEntraIdDeviceLog helper for log-based maintainer suites"
```

---

### Task 5: Add the Scout API suite

Must be its **own spec file** — `scout_max_one_describe` forbids a second `apiTest.describe` registration in an existing spec.

**Files:**
- Create: `x-pack/solutions/security/plugins/security_solution/test/scout/entity_analytics/api/tests/maintainers/entra_id_owns_maintainer.spec.ts`

**Interfaces:**
- Consumes: `seedEntraIdDeviceLog` (Task 4); the entra_id config (Task 2) via maintainer id `'owns'`; existing helpers `waitForEntityStoreRunning`, `clearEntityStoreIndices`, `seedUserEntity`, `triggerMaintainerRun`, `waitForRelationshipIds`, `getRelationshipIds`.
- Produces: nothing consumed by later tasks (final task).

Helper signatures used, all verified against `helpers.ts`:
- `waitForRelationshipIds(esClient, relationshipKey, entityId, expectedTargetId, timeoutMs?)`
- `getRelationshipIds(esClient, relationshipKey, entityId): Promise<string[]>` — returns `[]` when the entity or field is absent, never `undefined`
- `triggerMaintainerRun(apiClient, headers, maintainerId, { sync })`
- `seedUserEntity(esClient, { entityId, namespace, email, entitySource })`

- [ ] **Step 1: Write the spec**

Create `entra_id_owns_maintainer.spec.ts`:

```ts
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import { apiTest } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import {
  PUBLIC_HEADERS,
  INTERNAL_HEADERS,
  ENTITY_STORE_ROUTES,
  ENTITY_STORE_TAGS,
} from '../../fixtures/maintainers/constants';
import {
  clearEntityStoreIndices,
  seedUserEntity,
  seedEntraIdDeviceLog,
  triggerMaintainerRun,
  waitForRelationshipIds,
  waitForEntityStoreRunning,
  getRelationshipIds,
} from '../../fixtures/maintainers/helpers';

const MAINTAINER_ID = 'owns';
const RELATIONSHIP_KEY = 'owns';
const ENTRA_ID_NAMESPACE = 'entra_id';
const ENTRA_ID_LOG_INDEX = 'logs-entityanalytics_entra_id.entity-default';

apiTest.describe(
  'Entity Store owns maintainer (Entra ID device logs)',
  { tag: ENTITY_STORE_TAGS },
  () => {
    // Each test issues a synchronous maintainer run plus polling loops; the
    // default 60s Playwright timeout is too tight.
    apiTest.setTimeout(180_000);

    let defaultHeaders: Record<string, string>;
    let internalHeaders: Record<string, string>;

    apiTest.beforeAll(async ({ apiClient, esClient, samlAuth }) => {
      // `admin` is required: the install route enforces `securitySolution` +
      // `entity-analytics` Kibana privileges that lower roles do not hold.
      const credentials = await samlAuth.asInteractiveUser('admin');
      defaultHeaders = { ...credentials.cookieHeader, ...PUBLIC_HEADERS };
      internalHeaders = { ...credentials.cookieHeader, ...INTERNAL_HEADERS };

      // Covers all three index families; deleting only latest+updates would leak
      // stale history snapshots into the next run.
      await clearEntityStoreIndices(esClient);
      await esClient.deleteByQuery({
        index: ENTRA_ID_LOG_INDEX,
        query: { match_all: {} },
        refresh: true,
        ignore_unavailable: true,
      });

      const installResponse = await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {},
      });
      expect([200, 201]).toContain(installResponse.statusCode);

      // The `running` status flips before the latest alias is ready, so seeding
      // immediately after install races entity-store initialization.
      await waitForEntityStoreRunning(apiClient, defaultHeaders);
    });

    apiTest.afterAll(async ({ apiClient, esClient }) => {
      await esClient
        .deleteByQuery({
          index: ENTRA_ID_LOG_INDEX,
          query: { match_all: {} },
          refresh: true,
          ignore_unavailable: true,
        })
        .catch(() => {});
      await clearEntityStoreIndices(esClient);
      await apiClient.post(ENTITY_STORE_ROUTES.public.UNINSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {},
      });
    });

    apiTest(
      'resolves a single-owner device into an owns edge on the owning user',
      async ({ apiClient, esClient }) => {
        const runId = randomUUID().slice(0, 8);
        const ownerMail = `single.owner.${runId}@example.com`;
        const ownerId = `owner-id-${runId}`;
        const deviceId = `device-${runId}`;
        const entityId = `user:${ownerMail}@${ENTRA_ID_NAMESPACE}`;

        // The user entity must exist for the write to land — a missing actor
        // 404s and is counted in notFound.
        await seedUserEntity(esClient, {
          entityId,
          namespace: ENTRA_ID_NAMESPACE,
          email: ownerMail,
          entitySource: 'entityanalytics_entra_id',
        });

        await seedEntraIdDeviceLog(esClient, {
          deviceId,
          deviceName: `WORKSTATION-${runId}`,
          owners: [{ id: ownerId, mail: ownerMail }],
        });

        await triggerMaintainerRun(apiClient, internalHeaders, MAINTAINER_ID, { sync: true });

        const ids = await waitForRelationshipIds(
          esClient,
          RELATIONSHIP_KEY,
          entityId,
          `host:${deviceId}`
        );
        expect(ids).toBeDefined();
      }
    );

    apiTest(
      'emits one edge per owner for a multi-owner shared device',
      async ({ apiClient, esClient }) => {
        // Regression test for the `registered_owners` flattening hazard: the
        // field is `type: group`, not `nested`, so ES flattens the array and
        // loses per-owner correlation. Both owners must still receive the edge.
        const runId = randomUUID().slice(0, 8);
        const aliceMail = `alice.${runId}@example.com`;
        const bobMail = `bob.${runId}@example.com`;
        const deviceId = `shared-device-${runId}`;
        const aliceEntityId = `user:${aliceMail}@${ENTRA_ID_NAMESPACE}`;
        const bobEntityId = `user:${bobMail}@${ENTRA_ID_NAMESPACE}`;

        for (const [entityId, email] of [
          [aliceEntityId, aliceMail],
          [bobEntityId, bobMail],
        ]) {
          await seedUserEntity(esClient, {
            entityId,
            namespace: ENTRA_ID_NAMESPACE,
            email,
            entitySource: 'entityanalytics_entra_id',
          });
        }

        await seedEntraIdDeviceLog(esClient, {
          deviceId,
          deviceName: `SHARED-WORKSTATION-${runId}`,
          owners: [
            { id: `alice-id-${runId}`, mail: aliceMail },
            { id: `bob-id-${runId}`, mail: bobMail },
          ],
        });

        await triggerMaintainerRun(apiClient, internalHeaders, MAINTAINER_ID, { sync: true });

        await waitForRelationshipIds(esClient, RELATIONSHIP_KEY, aliceEntityId, `host:${deviceId}`);
        await waitForRelationshipIds(esClient, RELATIONSHIP_KEY, bobEntityId, `host:${deviceId}`);
      }
    );

    apiTest(
      'writes no edge for a device with no registered owners',
      async ({ apiClient, esClient }) => {
        const runId = randomUUID().slice(0, 8);
        const ownerMail = `unowned.probe.${runId}@example.com`;
        const deviceId = `ownerless-device-${runId}`;
        const entityId = `user:${ownerMail}@${ENTRA_ID_NAMESPACE}`;

        await seedUserEntity(esClient, {
          entityId,
          namespace: ENTRA_ID_NAMESPACE,
          email: ownerMail,
          entitySource: 'entityanalytics_entra_id',
        });

        await seedEntraIdDeviceLog(esClient, {
          deviceId,
          deviceName: `ORPHAN-${runId}`,
          owners: [],
        });

        await triggerMaintainerRun(apiClient, internalHeaders, MAINTAINER_ID, { sync: true });

        const ids = await getRelationshipIds(esClient, RELATIONSHIP_KEY, entityId);
        expect(ids).not.toContain(`host:${deviceId}`);
      }
    );
  }
);
```

- [ ] **Step 2: Lint (checks `scout_max_one_describe`)**

Run:
```bash
node scripts/eslint x-pack/solutions/security/plugins/security_solution/test/scout/entity_analytics/api/tests/maintainers/entra_id_owns_maintainer.spec.ts
```
Expected: clean. A `scout_max_one_describe` violation here means a second `apiTest.describe` slipped into the file — split it out rather than suppressing.

- [ ] **Step 3: Type check**

Run:
```bash
node scripts/type_check --project x-pack/solutions/security/plugins/security_solution/tsconfig.json
```
Expected: clean.

- [ ] **Step 4: Start the Scout stack (leave running between iterations)**

Run:
```bash
node scripts/scout start-server --arch stateful --domain classic
```
Leave this running in a separate terminal. Rebooting ES+Kibana per run is slow.

- [ ] **Step 5: Run the suite against the running stack**

Run:
```bash
node scripts/scout run-tests --arch stateful --domain classic \
  --testFiles x-pack/solutions/security/plugins/security_solution/test/scout/entity_analytics/api/tests/maintainers/entra_id_owns_maintainer.spec.ts
```
Expected: 3 tests PASS.

If the single-owner test fails with no relationship found, check the Kibana log for `Skipped N records: actor entities not yet in store` — that indicates the seeded `entityId` does not match the EUID the query built. Verify the seeded entity's `entity.id` is exactly `user:<mail>@entra_id`.

- [ ] **Step 6: Commit**

```bash
git add x-pack/solutions/security/plugins/security_solution/test/scout/entity_analytics/api/tests/maintainers/entra_id_owns_maintainer.spec.ts
git commit -m "test: add Scout suite for entra_id owns maintainer"
```

---

### Task 6: Full verification

**Files:** none modified.

**Interfaces:** consumes everything from Tasks 1–5.

- [ ] **Step 1: Run the full owns unit suite**

Run:
```bash
node scripts/jest x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/owns/
```
Expected: PASS, no snapshot drift.

- [ ] **Step 2: Run the whole maintainers unit suite (catches cross-config regressions)**

Run:
```bash
node scripts/jest x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/
```
Expected: PASS. Engine tests that enumerate all configs are the most likely place for an unexpected failure — the new config is the first log-based `kind: 'override'`.

- [ ] **Step 3: Scoped branch check**

Run:
```bash
node scripts/check.js --scope=branch
```
Expected: clean (Jest, types, lint).

- [ ] **Step 4: Commit any fixes**

If Step 3 surfaced fixes:
```bash
git add -A
git commit -m "fix: address check.js findings for entra_id owns maintainer"
```

---

## Self-Review

**Spec coverage:**

| Spec section | Task |
|---|---|
| Inversion (device→user) | Task 2 (`buildEntraIdOwnsEsqlQuery` + doc comment) |
| EUID ranking / union mail+id | Task 2 Step 3 (`CASE`/`MV_APPEND`), asserted Task 2 Step 1 |
| `validateTargetIds: false` rationale | Task 2 (config + comment), asserted Task 2 Step 1 |
| Flattening hazard | Task 2 (union-then-expand), Task 4 (parallel-array seeder), Task 5 (multi-owner test) |
| `kind: 'override'` justification | Task 2 |
| Step 1 composite/dataset filter | Task 2, asserted Task 2 Step 1 |
| Step 2 ES\|QL + guards | Task 2, asserted Task 2 Step 1 |
| 30d lookback, no watermark | Task 2, asserted Task 2 Step 1 |
| Unit test table (5 rows) | Task 1 (re-scope) + Task 2 Step 1 |
| Scout: own file, `waitForEntityStoreRunning`, 180s timeout | Task 5 |
| Scout: 3 seeded cases | Task 5 |
| `registered_users` not read | Task 2, asserted Task 2 Step 1 |
| `notFound` doubling documented in code | Task 2 Step 3 (doc comment) |
| `owns/index.ts` needs no logic change | Task 3 (description only) |

No gaps.

**Placeholder scan:** No TBD/TODO. Every code step carries literal code. Task 1 repeats full replacement blocks rather than saying "similar to".

**Type consistency:** `seedEntraIdDeviceLog` — defined Task 4, called Task 5 with matching `{ deviceId, deviceName, owners }`. `buildEntraIdOwnsEsqlQuery(namespace: string): string` — defined and called Task 2. `waitForRelationshipIds` / `triggerMaintainerRun` / `seedUserEntity` call sites match the signatures verified in `helpers.ts`. `RELATIONSHIP_KEY` and `ENGINE_COLUMNS.actor` reuse existing module bindings in `configs.ts`.

**Signatures verified against source before finalizing:** `getRelationshipIds` (3 args, returns `string[]`), `waitForRelationshipIds` (4 args + optional timeout), `EsClient` import at `helpers.ts:8`, `RELATIONSHIP_KEY = 'owns'` at `configs.ts:16`, and the absence of `COMPOSITE_PAGE_SIZE` / `ENGINE_COLUMNS` imports in `configs.ts` (hence Task 2 adds them). No unverified assumptions remain.

**Note on the `waitForRelationshipIds` signature:** the `scout` helper takes `(esClient, relationshipKey, entityId, expectedTargetId)`, whereas the `scout_cps_local` variant used in `accesses.spec.ts` takes `(esClient, entityId, relationshipKey)`. Task 5 uses the `scout` ordering — do not copy the call shape from the CPS spec.
