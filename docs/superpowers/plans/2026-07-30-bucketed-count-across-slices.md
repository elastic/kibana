# Bucketed Count-Across-Slices Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make bucketed (`accesses_frequently`/`accesses_infrequently`) relationship classification correct under time-slicing by accumulating per-target access counts across all slices and applying the threshold once, after the loop.

**Architecture:** For `kind: 'bucketed'` configs the per-slice ES|QL extract stops classifying and instead emits, per actor, a single `VALUES()` array of `"<targetEuid>|<count>"` strings. A new parser turns each slice's rows into `Map<targetEuid, count>` per actor. `runLogsIntegration` branches on `config.kind`: bucketed accumulates `Map<actorEuid, Map<targetEuid, count>>` across slices, classifies once after the loop, and writes once; standard/override keep the existing per-slice write path.

**Tech Stack:** TypeScript, ES|QL, Jest (`node scripts/jest`), Kibana Security Solution entity_analytics maintainers engine.

## Global Constraints

- All modified/created files must keep the Elastic License 2.0 header block already present in sibling files.
- New filenames are `snake_case`; functions/vars are `camelCase`; types/interfaces are `PascalCase`.
- Prefer `import type` for type-only imports; no `any`/`unknown` leakage in public signatures; no non-null assertions.
- The count-mode extract must emit **one row per actor** and keep `| LIMIT ${COMPOSITE_PAGE_SIZE}` so the LIMIT caps actors (not actor×target pairs).
- The per-target count is encoded as `CONCAT(targetEntityId, "|", TO_STRING(access_count))` and decoded by splitting on the **last** `|`.
- Only `kind: 'bucketed'` behavior changes. `kind: 'standard'` and `kind: 'override'` query output, parser output, and per-slice write timing are unchanged.
- On `signal.aborted` mid-loop, the bucketed path writes nothing (accumulator discarded) and returns `outcome: 'aborted'`.
- Both bucket keys are always present on each written record (empty bucket → `[]`), matching the current parser's shape.
- Threshold comparison is `count >= threshold` → above bucket, else below (verbatim from spec: `count >= threshold`).
- Run each package's tests with `node scripts/jest <path-to-test-file>` (config auto-discovered).

---

## File Structure

- `engine/columns.ts` — add the `targetCounts` count-mode column name to the `ENGINE_COLUMNS` contract.
- `engine/build_targets_per_actor_query.ts` — bucketed `statsClause` becomes the count-emitting pipeline (one row per actor, `targetCounts` array).
- `engine/parse_targets_per_actor_rows.ts` — add `parseBucketedCountRows` + the `ActorTargetCounts` interface; leave `parseTargetsPerActorRows` untouched.
- `engine/run_logs_integration.ts` — branch on `config.kind`; bucketed accumulates counts and does a single terminal classify+write.
- Test files (siblings): `columns.test.ts` (new), `build_targets_per_actor_query.test.ts` (rewrite bucketed assertions), `parse_targets_per_actor_rows.test.ts` (add count-mode describe block), `run_logs_integration.test.ts` (add bucketed cross-slice tests).

---

### Task 1: Add the `targetCounts` column to the engine column contract

**Files:**
- Modify: `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/columns.ts`
- Test: `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/columns.test.ts` (create)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `ENGINE_COLUMNS.targetCounts` — a `string` constant equal to `'targetCounts'`, used by Task 2 (query builder emits this column) and Task 3 (parser reads it).

- [ ] **Step 1: Write the failing test**

Create `columns.test.ts`:

```ts
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENGINE_COLUMNS } from './columns';

describe('ENGINE_COLUMNS', () => {
  it('exposes the count-mode targetCounts column name', () => {
    expect(ENGINE_COLUMNS.targetCounts).toBe('targetCounts');
  });

  it('keeps the actor column name stable', () => {
    expect(ENGINE_COLUMNS.actor).toBe('actorUserId');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/jest x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/columns.test.ts`
Expected: FAIL — `ENGINE_COLUMNS.targetCounts` is `undefined` (`expect(undefined).toBe('targetCounts')`).

- [ ] **Step 3: Write minimal implementation**

In `columns.ts`, add a `targetCounts` field to the `ENGINE_COLUMNS` object literal (place it after `actor`, before `flat`):

```ts
  /**
   * Column name for the count-mode targets list emitted by `kind: 'bucketed'`
   * configs. One row per actor; each entry is `"<targetEuid>|<count>"`
   * (access count within the current slice). The engine accumulates these
   * across slices and classifies once, so the extract itself does NOT emit
   * the bucket relationship-key columns.
   */
  targetCounts: 'targetCounts',
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node scripts/jest x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/columns.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/columns.ts x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/columns.test.ts
git commit -m "feat(maintainers): add targetCounts column to engine contract"
```

---

### Task 2: Emit count-mode ES|QL for bucketed configs

**Files:**
- Modify: `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/build_targets_per_actor_query.ts:69-92` (the `statsClause` for `kind: 'bucketed'`)
- Test: `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/build_targets_per_actor_query.test.ts:138-185` (rewrite the bucketed assertions)

**Interfaces:**
- Consumes: `ENGINE_COLUMNS.targetCounts` and `ENGINE_COLUMNS.actor` from Task 1.
- Produces: for `kind: 'bucketed'`, `buildTargetsPerActorQuery(config, ns, timeWindow?)` returns a query whose STATS section is:
  ```
  | STATS access_count = COUNT(*) BY actorUserId, targetEntityId
  | EVAL _pair = CONCAT(targetEntityId, "|", TO_STRING(access_count))
  | STATS targetCounts = VALUES(_pair) BY actorUserId
  ```
  followed (as today) by `| LIMIT ${COMPOSITE_PAGE_SIZE}`. The `access_type` CASE and the `WHERE access_type == ...` double-STATS are removed. Bucket relationship-key names (`accesses_frequently` etc.) NO LONGER appear anywhere in the bucketed query.

Context — the `MV_EXPAND targetEntityId` and target empty-guard lines above `statsClause` are unchanged; only the `statsClause` string differs.

- [ ] **Step 1: Rewrite the failing tests**

In `build_targets_per_actor_query.test.ts`, replace the three bucketed tests at lines 138-185 (`'produces accesses_frequently and accesses_infrequently STATS columns'`, `'uses the threshold the config declares (no engine-side default)'`, `'emits the bucket relationship keys the config declares (engine has no hardcoded names)'`) with:

```ts
    it('emits count-mode STATS: COUNT(*) by actor+target, one row per actor', () => {
      const query = buildTargetsPerActorQuery(accessesConfig, 'default');
      expect(query).toContain('STATS access_count = COUNT(*) BY actorUserId, targetEntityId');
      expect(query).toContain('STATS targetCounts = VALUES(_pair) BY actorUserId');
    });

    it('encodes each target with its count as "<target>|<count>" via CONCAT', () => {
      const query = buildTargetsPerActorQuery(accessesConfig, 'default');
      expect(query).toContain('EVAL _pair = CONCAT(targetEntityId, "|", TO_STRING(access_count))');
    });

    it('does NOT classify in-query: no threshold CASE and no bucket-key columns in the extract', () => {
      const query = buildTargetsPerActorQuery(accessesConfig, 'default');
      // Classification now happens in TS after cross-slice accumulation, so the
      // extract must not contain a per-slice threshold CASE or the bucket keys.
      expect(query).not.toContain('access_type');
      expect(query).not.toContain('CASE(');
      expect(query).not.toContain('accesses_frequently');
      expect(query).not.toContain('accesses_infrequently');
    });

    it('keeps the actor-bound LIMIT (one row per actor, not per pair)', () => {
      const query = buildTargetsPerActorQuery(accessesConfig, 'default');
      // LIMIT runs after the final STATS ... BY actorUserId, so it caps actors.
      expect(query).toContain(`| LIMIT ${COMPOSITE_PAGE_SIZE}`);
    });
```

Ensure `COMPOSITE_PAGE_SIZE` is imported at the top of the test file. Check the existing imports; if absent, add:

```ts
import { COMPOSITE_PAGE_SIZE } from './constants';
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node scripts/jest x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/build_targets_per_actor_query.test.ts -t "accesses template"`
Expected: FAIL — current query still contains `access_type` / `CASE(` / `accesses_frequently`; the new `targetCounts` STATS is absent.

- [ ] **Step 3: Write minimal implementation**

In `build_targets_per_actor_query.ts`, replace the `config.kind === 'bucketed'` branch of `statsClause` (lines 70-89) with the count-mode pipeline. The full `statsClause` becomes:

```ts
  const statsClause =
    config.kind === 'bucketed'
      ? `| STATS access_count = COUNT(*) BY ${ENGINE_COLUMNS.actor}, targetEntityId
| EVAL _pair = CONCAT(targetEntityId, "|", TO_STRING(access_count))
| STATS ${ENGINE_COLUMNS.targetCounts} = VALUES(_pair) BY ${ENGINE_COLUMNS.actor}`
      : `| STATS ${ENGINE_COLUMNS.flat(config.relationshipKey)} = VALUES(targetEntityId) BY ${
          ENGINE_COLUMNS.actor
        }`;
```

The destructuring of `config.bucketTargetByThreshold` (old lines 72-76) and the `aboveCol`/`belowCol` locals are no longer used by the query builder — remove them from this branch. `ENGINE_COLUMNS.bucketAbove` / `bucketBelow` are no longer referenced here (they remain in `columns.ts`; the parser's classification path is gone too, so confirm in Task 3 they end up unused and remove them there if so — do NOT remove them in this task).

- [ ] **Step 4: Run tests to verify they pass**

Run: `node scripts/jest x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/build_targets_per_actor_query.test.ts`
Expected: PASS — all bucketed tests plus the untouched standard/override/communicates_with tests.

- [ ] **Step 5: Commit**

```bash
git add x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/build_targets_per_actor_query.ts x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/build_targets_per_actor_query.test.ts
git commit -m "feat(maintainers): emit count-mode ESQL for bucketed configs"
```

---

### Task 3: Add `parseBucketedCountRows` + `ActorTargetCounts`

**Files:**
- Modify: `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/parse_targets_per_actor_rows.ts`
- Test: `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/parse_targets_per_actor_rows.test.ts`

**Interfaces:**
- Consumes: `ENGINE_COLUMNS.actor`, `ENGINE_COLUMNS.targetCounts` (Task 1); the existing `entityTypeFromEuid` and `toStringArray` helpers in this file.
- Produces:
  ```ts
  export interface ActorTargetCounts {
    entityId: string | null;
    entityType: 'user' | 'host' | 'service';
    targetCounts: Map<string, number>; // targetEuid -> count within this slice
  }

  export const parseBucketedCountRows: (
    columns: Array<{ name: string; type: string }>,
    values: unknown[][],
    config: { id: string; kind: 'bucketed' },
    logger: Logger
  ) => ActorTargetCounts[];
  ```
  Task 4 consumes `parseBucketedCountRows` and `ActorTargetCounts`.

- [ ] **Step 1: Write the failing tests**

Append a new describe block to `parse_targets_per_actor_rows.test.ts`. First extend the import line:

```ts
import { parseTargetsPerActorRows, parseBucketedCountRows } from './parse_targets_per_actor_rows';
```

Then add:

```ts
const COUNT_COLUMNS = [
  { name: 'actorUserId', type: 'keyword' },
  { name: 'targetCounts', type: 'keyword' },
];

const BUCKETED_COUNT_CONFIG = { id: 'elastic_defend', kind: 'bucketed' as const };

describe('parseBucketedCountRows', () => {
  it('returns [] for empty values', () => {
    const result = parseBucketedCountRows(COUNT_COLUMNS, [], BUCKETED_COUNT_CONFIG, createLogger());
    expect(result).toEqual([]);
  });

  it('parses "<target>|<count>" entries into a Map<target, count>', () => {
    const result = parseBucketedCountRows(
      COUNT_COLUMNS,
      [['user:alice@host-1@local', ['host:server-a|3', 'host:server-b|1']]],
      BUCKETED_COUNT_CONFIG,
      createLogger()
    );
    expect(result).toHaveLength(1);
    const rec = result[0];
    expect(rec.entityId).toBe('user:alice@host-1@local');
    expect(rec.entityType).toBe('user');
    expect(rec.targetCounts.get('host:server-a')).toBe(3);
    expect(rec.targetCounts.get('host:server-b')).toBe(1);
  });

  it('splits on the LAST pipe so target EUIDs containing "|" survive', () => {
    const result = parseBucketedCountRows(
      COUNT_COLUMNS,
      [['user:bob@host-2@local', ['host:weird|name|5']]],
      BUCKETED_COUNT_CONFIG,
      createLogger()
    );
    expect(result[0].targetCounts.get('host:weird|name')).toBe(5);
  });

  it('accepts a single (non-array) targetCounts value', () => {
    const result = parseBucketedCountRows(
      COUNT_COLUMNS,
      [['user:carol@host-3@local', 'host:server-c|2']],
      BUCKETED_COUNT_CONFIG,
      createLogger()
    );
    expect(result[0].targetCounts.get('host:server-c')).toBe(2);
  });

  it('skips malformed entries (no pipe / non-numeric count) but keeps valid ones', () => {
    const logger = createLogger();
    const result = parseBucketedCountRows(
      COUNT_COLUMNS,
      [['user:dan@host-4@local', ['host:good|4', 'host:nopipe', 'host:bad|xyz']]],
      BUCKETED_COUNT_CONFIG,
      logger
    );
    const map = result[0].targetCounts;
    expect(map.get('host:good')).toBe(4);
    expect(map.has('host:nopipe')).toBe(false);
    expect(map.has('host:bad')).toBe(false);
    expect(map.size).toBe(1);
  });

  it('sets entityId to null when actorUserId is null', () => {
    const result = parseBucketedCountRows(
      COUNT_COLUMNS,
      [[null, ['host:server-a|1']]],
      BUCKETED_COUNT_CONFIG,
      createLogger()
    );
    expect(result[0].entityId).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node scripts/jest x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/parse_targets_per_actor_rows.test.ts -t "parseBucketedCountRows"`
Expected: FAIL — `parseBucketedCountRows` is not exported (import error / not a function).

- [ ] **Step 3: Write minimal implementation**

In `parse_targets_per_actor_rows.ts`, add the interface and function. Reuse the existing `toStringArray` and `entityTypeFromEuid`. Add after the existing `parseTargetsPerActorRows` export:

```ts
/**
 * One actor's per-target access counts within a single slice. The engine
 * accumulates these across slices (summing counts per target) before applying
 * the bucketed threshold once. This is the count-mode counterpart to
 * `EntityRelationshipRecord`, which carries already-classified bucket arrays.
 */
export interface ActorTargetCounts {
  entityId: string | null;
  entityType: 'user' | 'host' | 'service';
  /** targetEuid -> access count within this slice. */
  targetCounts: Map<string, number>;
}

/**
 * Parses count-mode extract rows (one row per actor, a `targetCounts` array of
 * `"<targetEuid>|<count>"` strings) into `ActorTargetCounts[]`.
 *
 * Each entry is split on the LAST `|` — the count is always a trailing integer,
 * so this is robust even if a target EUID itself contains `|`. Malformed
 * entries (no `|`, or a non-numeric trailing segment) are skipped with a debug
 * log rather than throwing, so one bad row cannot abort the whole run.
 */
export const parseBucketedCountRows = (
  columns: EsqlColumn[],
  values: unknown[][],
  config: { id: string; kind: 'bucketed' },
  logger: Logger
): ActorTargetCounts[] => {
  const actorIdx = columns.findIndex((c) => c.name === ENGINE_COLUMNS.actor);
  const countsIdx = columns.findIndex((c) => c.name === ENGINE_COLUMNS.targetCounts);

  return values.map((row): ActorTargetCounts => {
    const actorRaw = actorIdx >= 0 ? row[actorIdx] : null;
    const entityId = actorRaw != null ? String(actorRaw) : null;

    const targetCounts = new Map<string, number>();
    const rawEntries = countsIdx >= 0 ? toStringArray(row[countsIdx]) : [];
    for (const entry of rawEntries) {
      const sep = entry.lastIndexOf('|');
      if (sep <= 0) {
        logger.debug(`[${config.id}] skipping malformed count entry (no separator): ${entry}`);
        continue;
      }
      const target = entry.slice(0, sep);
      const count = Number(entry.slice(sep + 1));
      if (!Number.isInteger(count)) {
        logger.debug(`[${config.id}] skipping malformed count entry (bad count): ${entry}`);
        continue;
      }
      targetCounts.set(target, count);
    }

    return {
      entityId,
      // TODO(#266748): entityType hardcoded to 'user' at the producer sites.
      entityType: entityTypeFromEuid(entityId),
      targetCounts,
    };
  });
};
```

Note: `ENGINE_COLUMNS` is already imported at the top of this file (used by `parseTargetsPerActorRows`). `EsqlColumn`, `toStringArray`, and `entityTypeFromEuid` are already defined/imported in this file. Because the count-mode path classifies in TS (Task 4), the `ENGINE_COLUMNS.bucketAbove` / `bucketBelow` helpers are no longer referenced anywhere — verify with `grep -rn "bucketAbove\|bucketBelow" x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers`; if the only remaining hits are their definitions in `columns.ts`, delete those two helpers from `columns.ts` and remove the now-dead bucket branch in `parseTargetsPerActorRows` (lines 96-109, the `if (config.kind === 'bucketed')` block) — but keep `parseTargetsPerActorRows` handling standard/override. If any production (non-test, non-definition) reference remains, leave them and note it in the task report.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node scripts/jest x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/parse_targets_per_actor_rows.test.ts`
Expected: PASS — new `parseBucketedCountRows` block plus existing blocks. If the dead bucket branch in `parseTargetsPerActorRows` was removed, the existing `parseTargetsPerActorRows — accesses` tests that fed pre-classified bucket columns will now be stale; update those specific tests to drive `parseBucketedCountRows` instead, OR keep the branch if still referenced. Decide based on the grep result above and record the choice in the task report.

- [ ] **Step 5: Commit**

```bash
git add x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/parse_targets_per_actor_rows.ts x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/parse_targets_per_actor_rows.test.ts x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/columns.ts
git commit -m "feat(maintainers): add parseBucketedCountRows count-mode parser"
```

---

### Task 4: Branch `runLogsIntegration` — accumulate + classify + write once for bucketed

**Files:**
- Modify: `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/run_logs_integration.ts`
- Test: `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/run_logs_integration.test.ts`

**Interfaces:**
- Consumes: `parseBucketedCountRows`, `ActorTargetCounts` (Task 3); the count-mode query from `buildTargetsPerActorQuery` (Task 2); existing `writeEntityIds`, `writeRelationshipMetadatas`, `runProbeWithFallback`, `buildActorSliceBoundaryQuery`, `parseActorSliceBoundaryResult`, `EntityRelationshipRecord`.
- Produces: unchanged `RunLogsIntegrationResult` shape. Behavior: bucketed configs write once after the loop; standard/override unchanged.

**Design notes for the implementer:**
- The existing slice loop (probe → boundary → extract) is shared. Only the per-slice *body after extract* and the *post-loop* section differ by `config.kind`.
- For bucketed, do NOT call `writeEntityIds`/`writeRelationshipMetadatas` inside the loop, and do NOT increment `recordsCount` inside the loop.
- Keep the standard/override path exactly as it is today (per-slice write + incremental `totalWrite`/`totalMetadata` merge).

- [ ] **Step 1: Write the failing tests**

Add to `run_logs_integration.test.ts`. First add a bucketed config fixture and a count-columns constant near the existing `baseConfig` (do not modify `baseConfig`):

```ts
const bucketedConfig: RelationshipIntegrationConfig = {
  source: 'logs',
  kind: 'bucketed',
  id: 'elastic_defend',
  name: 'Elastic Defend',
  indexPattern: (ns) => `logs-endpoint.events.security-${ns}`,
  targetEntityType: 'host',
  bucketTargetByThreshold: {
    threshold: 4,
    aboveThresholdRelationship: 'accesses_frequently',
    belowThresholdRelationship: 'accesses_infrequently',
  },
  esqlWhereClause: 'event.action == "log_on" AND event.outcome == "success"',
};

const countColumns = [
  { name: 'actorUserId', type: 'keyword' },
  { name: 'targetCounts', type: 'keyword' },
];
```

Then add this describe block:

```ts
describe('runLogsIntegration — bucketed (accumulate across slices)', () => {
  it('sums a split actor→target pair across slices and classifies as frequent', async () => {
    const { esClient, esql } = makeEsClient();
    const { crudClient, entityMetadataClient, bulkUpdate } = makeClients();
    const logger = loggerMock.create();

    // Slice 1 probe: saturated → isLastSlice=false (forces a 2nd slice)
    esql.mockResolvedValueOnce({
      columns: probeColumns,
      values: [['2026-06-27T00:00:00.000Z', COMPOSITE_PAGE_SIZE, ['user:alice@host-1@local']]],
    });
    // Slice 1 boundary
    esql.mockResolvedValueOnce({
      columns: boundaryColumns,
      values: [['2026-06-27T12:00:00.000Z']],
    });
    // Slice 1 extract: alice→host-a counted 2 times
    esql.mockResolvedValueOnce({
      columns: countColumns,
      values: [['user:alice@host-1@local', ['host:host-a|2']]],
    });

    // Slice 2 probe: not saturated → isLastSlice=true
    esql.mockResolvedValueOnce({
      columns: probeColumns,
      values: [['2026-06-28T00:00:00.000Z', 1, ['user:alice@host-1@local']]],
    });
    // Slice 2 extract: alice→host-a counted 3 more times (total 5 ≥ threshold 4)
    esql.mockResolvedValueOnce({
      columns: countColumns,
      values: [['user:alice@host-1@local', ['host:host-a|3']]],
    });

    bulkUpdate.mockResolvedValue([]);

    const result = await runLogsIntegration(
      bucketedConfig,
      esClient,
      logger,
      'default',
      crudClient,
      entityMetadataClient,
      undefined,
      { scanId: 'scan-1', observedAt: '2026-07-30T00:00:00.000Z' }
    );

    expect(result.slices).toBe(2);
    // Written exactly once, after the loop.
    expect(bulkUpdate).toHaveBeenCalledTimes(1);

    const objects = bulkUpdate.mock.calls[0][0].objects;
    const alice = objects.find(
      (o: { doc: { entity: { id: string } } }) => o.doc.entity.id === 'user:alice@host-1@local'
    );
    expect(alice.doc.entity.relationships.accesses_frequently.ids).toContain('host:host-a');
    expect(alice.doc.entity.relationships.accesses_infrequently?.ids ?? []).not.toContain(
      'host:host-a'
    );
    expect(result.outcome).toBe('producing');
  });

  it('writes nothing when aborted mid-loop (accumulator discarded)', async () => {
    const { esClient, esql } = makeEsClient();
    const { crudClient, entityMetadataClient, bulkUpdate } = makeClients();
    const logger = loggerMock.create();

    const controller = new AbortController();
    controller.abort();

    const result = await runLogsIntegration(
      bucketedConfig,
      esClient,
      logger,
      'default',
      crudClient,
      entityMetadataClient,
      controller.signal,
      { scanId: 'scan-1', observedAt: '2026-07-30T00:00:00.000Z' }
    );

    expect(result.outcome).toBe('aborted');
    expect(bulkUpdate).not.toHaveBeenCalled();
    expect(esql).not.toHaveBeenCalled();
  });

  it('classifies a pair below threshold as infrequent', async () => {
    const { esClient, esql } = makeEsClient();
    const { crudClient, entityMetadataClient, bulkUpdate } = makeClients();
    const logger = loggerMock.create();

    // Single last slice: bob→host-b counted 2 times (< threshold 4)
    esql.mockResolvedValueOnce({
      columns: probeColumns,
      values: [['2026-06-27T00:00:00.000Z', 1, ['user:bob@host-2@local']]],
    });
    esql.mockResolvedValueOnce({
      columns: countColumns,
      values: [['user:bob@host-2@local', ['host:host-b|2']]],
    });
    bulkUpdate.mockResolvedValue([]);

    await runLogsIntegration(
      bucketedConfig,
      esClient,
      logger,
      'default',
      crudClient,
      entityMetadataClient,
      undefined,
      { scanId: 'scan-1', observedAt: '2026-07-30T00:00:00.000Z' }
    );

    const objects = bulkUpdate.mock.calls[0][0].objects;
    const bob = objects.find(
      (o: { doc: { entity: { id: string } } }) => o.doc.entity.id === 'user:bob@host-2@local'
    );
    expect(bob.doc.entity.relationships.accesses_infrequently.ids).toContain('host:host-b');
    expect(bob.doc.entity.relationships.accesses_frequently?.ids ?? []).not.toContain('host:host-b');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node scripts/jest x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/run_logs_integration.test.ts -t "bucketed"`
Expected: FAIL — with the current per-slice code the extract rows aren't parsed as counts, and bucketed classification/single-write don't exist; assertions on `accesses_frequently.ids` fail (or `bulkUpdate` call count is wrong).

- [ ] **Step 3: Write minimal implementation**

In `run_logs_integration.ts`:

1. Add imports:

```ts
import { parseBucketedCountRows, type ActorTargetCounts } from './parse_targets_per_actor_rows';
import type { EntityRelationshipRecord } from './types';
```
(`parseTargetsPerActorRows` and `EntityRelationshipRecord`/config types may already be imported — merge, don't duplicate.)

2. Before the loop, add the bucketed accumulator alongside the existing counters:

```ts
  const isBucketed = config.kind === 'bucketed';
  // actorEuid -> (targetEuid -> summed access count across all slices).
  // Only used for bucketed configs; bounded by distinct (actor, target) pairs
  // over the 30-day window (no artificial cap — matches the pre-slicing
  // composite-agg footprint). See spec 2026-07-30-bucketed-count-across-slices.
  const bucketedCounts = new Map<string, Map<string, number>>();
```

3. Inside the loop, after the extract response is fetched (replacing the current single `parseTargetsPerActorRows` + per-slice write block), branch:

```ts
      if (isBucketed) {
        const sliceCounts = parseBucketedCountRows(
          extractResponse.columns,
          extractResponse.values,
          { id: config.id, kind: 'bucketed' },
          logger
        );
        for (const actor of sliceCounts) {
          if (actor.entityId === null) continue;
          let targets = bucketedCounts.get(actor.entityId);
          if (!targets) {
            targets = new Map<string, number>();
            bucketedCounts.set(actor.entityId, targets);
          }
          for (const [targetEuid, count] of actor.targetCounts) {
            targets.set(targetEuid, (targets.get(targetEuid) ?? 0) + count);
          }
        }
        logger.debug(
          `[${config.id}] Slice accumulated counts for ${sliceCounts.length} actors`
        );
      } else {
        // ...existing standard/override per-slice path unchanged:
        // parseTargetsPerActorRows(...), recordsCount += pageRecords.length,
        // the pageRecords.length > 0 write block (writeEntityIds +
        // metadata) and the totalWrite/totalMetadata merges.
      }
```

Keep the existing slice bookkeeping that is common to both paths (`slices++`, the `probeResult.isLastSlice` break, the `sliceStart` advance, the abort check at the top of the loop). The abort check already returns `outcome: 'aborted'` with the current `totalWrite`/`totalMetadata` (both still `ZERO_*` for bucketed since nothing was written) — that satisfies "write nothing on abort".

4. After the loop (before the existing `truncated`/summary/return), add the bucketed terminal classify+write. Place it so it populates `totalWrite`, `totalMetadata`, and `recordsCount` before the summary log:

```ts
    if (isBucketed) {
      const { threshold, aboveThresholdRelationship, belowThresholdRelationship } =
        config.bucketTargetByThreshold;

      const records: EntityRelationshipRecord[] = [];
      for (const [entityId, targets] of bucketedCounts) {
        const above: string[] = [];
        const below: string[] = [];
        for (const [targetEuid, count] of targets) {
          if (count >= threshold) above.push(targetEuid);
          else below.push(targetEuid);
        }
        records.push({
          entityId,
          entityType: entityTypeFromEuid(entityId),
          relationships: {
            // Both keys always present (empty -> []), matching the parser's
            // historical bucketed shape and writeEntityIds' expectations.
            [aboveThresholdRelationship]: above,
            [belowThresholdRelationship]: below,
          },
        });
      }
      recordsCount = records.length;

      if (records.length > 0) {
        totalWrite = await writeEntityIds(
          crudClient,
          logger,
          records,
          esClient,
          namespace,
          config.validateTargetIds
        );

        const { validTargetIds, succeededEntityIds } = totalWrite;
        const actorFilteredRecords = records.filter(
          (r) => r.entityId !== null && succeededEntityIds.has(r.entityId)
        );
        const metadataRecords = validTargetIds
          ? actorFilteredRecords.flatMap((r) => {
              const filteredRels: Record<string, string[]> = {};
              for (const [relType, targetEuids] of Object.entries(r.relationships)) {
                const valid = targetEuids.filter((id) => validTargetIds.has(id));
                if (valid.length > 0) filteredRels[relType] = valid;
              }
              return Object.keys(filteredRels).length > 0
                ? [{ ...r, relationships: filteredRels }]
                : [];
            })
          : actorFilteredRecords;

        totalMetadata = await writeRelationshipMetadatas(
          entityMetadataClient,
          logger,
          metadataRecords,
          {
            scanId: metadataContext.scanId,
            lookbackWindow: LOOKBACK_WINDOW,
            entitySource: config.id,
            observedAt: metadataContext.observedAt,
          }
        );
      }
    }
```

Ensure `entityTypeFromEuid` is imported from `./types` (it is exported there). The metadata-filtering block mirrors the existing standard-path logic verbatim so behavior matches; factor it into a shared local helper only if it reads cleanly — otherwise duplicate is acceptable for this task.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node scripts/jest x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/run_logs_integration.test.ts`
Expected: PASS — the new bucketed block AND all pre-existing tests (standard path per-slice writes, empty/aborted/multi-slice) still green.

- [ ] **Step 5: Commit**

```bash
git add x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/run_logs_integration.ts x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/run_logs_integration.test.ts
git commit -m "feat(maintainers): accumulate+classify bucketed counts across slices"
```

---

### Task 5: Full engine test sweep + lint

**Files:**
- No source changes expected; this task is the integration gate.

**Interfaces:**
- Consumes: all prior tasks.
- Produces: a green engine test suite and clean lint for the four modified source files.

- [ ] **Step 1: Run the whole engine test directory**

Run: `node scripts/jest x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine`
Expected: PASS — every test in the engine directory, including `run_relationship_maintainer.test.ts` and `update_entities.test.ts` (guards that the bucketed refactor didn't disturb the shared write path).

- [ ] **Step 2: If any pre-existing test references the removed bucketed query shape, fix it**

If a test outside the four touched files asserts the old `access_type` / `VALUES(targets) WHERE access_type` query or the pre-classified bucket-column parser output, update it to the count-mode shape (the query no longer classifies; classification is asserted at the engine level in Task 4). Do NOT weaken assertions to pass — align them with the new contract. Re-run Step 1 until green.

- [ ] **Step 3: Lint the modified files**

Run: `node scripts/eslint x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/columns.ts x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/build_targets_per_actor_query.ts x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/parse_targets_per_actor_rows.ts x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/run_logs_integration.ts`
Expected: `✅ no eslint errors found`. Fix any root-cause issues (no `eslint-disable`).

- [ ] **Step 4: Commit any test/lint fixups**

```bash
git add -A x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine
git commit -m "test(maintainers): align engine tests with bucketed count-mode"
```

(If Steps 2-3 required no changes, skip the commit and note "no fixups needed" in the task report.)

---

## Notes for the executor

- **Type-check caveat:** `node scripts/type_check --project .../security_solution/tsconfig.json` currently aborts before checking, with `invalid kbn_references in alerting: @kbn/response-ops-schedule-schema does not point to another TS project`. This is a pre-existing repo-state issue unrelated to this change (a `yarn kbn bootstrap` may resolve it). Rely on the Jest runs (ts-jest transpiles each file, surfacing type-syntax errors) and ESLint for validation. If `type_check` is made runnable, scope it to the security_solution project.
- **Do not** touch `communicates_with`, `standard`, or `override` query/parse/write behavior.
- **Do not** add an artificial cap to the bucketed accumulator; the spec chose the natural (actor,target)-pair bound.
