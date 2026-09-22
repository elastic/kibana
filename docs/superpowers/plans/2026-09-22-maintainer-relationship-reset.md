# Relationship Reset for Snapshot Sources — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a maintainer config opt into clearing its relationship for one `entity.source` before each run, so a snapshot source (Workday) repopulates from a clean slate instead of accumulating stale edges forever.

**Architecture:** A new optional `resetRelationshipsBeforeRun` field on the integration config. When set, `runIntegration` calls a new `clearRelationshipIds` method on the CRUD client once, before pagination. The existing additive write path then repopulates. No change to write semantics.

**Tech Stack:** TypeScript, Elasticsearch `update_by_query` + Painless, Jest, Scout/Playwright.

**Spec:** `docs/superpowers/specs/2026-09-22-maintainer-relationship-reset-design.md`

## Global Constraints

- Node **24.21.0** (`.nvmrc`). Prefix test commands with:
  `export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 24.21.0`
- `pnpm` comes from corepack. If missing: `corepack enable && corepack prepare pnpm@12.4.2 --activate`.
- Unit tests: `node scripts/jest <path>`. Type check scoped: `node scripts/type_check --project <path>/tsconfig.json`.
- No `any` / `unknown`; never suppress with `@ts-ignore`, `@ts-expect-error`, `eslint-disable`.
- `import type` for type-only imports. Const arrow functions. `snake_case` filenames.
- Comments explain **why**, not what. Over-commenting is an explicitly reviewed-on pattern in this domain.
- **Raw ES I/O stays in `infra/elasticsearch/`** — domain clients delegate, never call `esClient` directly. (Domain invariant, PR #271806.)
- **Default off.** Every existing config must behave identically; `resetRelationshipsBeforeRun` absent means no reset.
- Reset is scoped by `entity.source` **and** the config's `relationshipKey`. It must never touch another relationship type or another source.

---

## File Structure

| File | Responsibility |
|---|---|
| `entity_store/server/infra/elasticsearch/entity_relationships.ts` | **New.** Raw `update_by_query` + Painless that removes one relationship key for one source. |
| `entity_store/server/domain/crud/crud_client.ts` | Add `clearRelationshipIds`, delegating to the infra helper. |
| `entity_store/server/index.ts` | No change — `EntityUpdateClient` is `Omit<CRUDClient, …>`, so the new method is exposed automatically. |
| `maintainers/engine/types.ts` | Add optional `resetRelationshipsBeforeRun` to `RelationshipIntegrationBase`. |
| `maintainers/engine/run_relationship_maintainer.ts` | Call the reset once per integration, before the page loop. |
| `maintainers/supervises/configs.ts` | Set the flag on the Workday config. |
| Tests | `crud_client.test.ts`, `run_relationship_maintainer.test.ts`, `supervises/configs.test.ts`, Scout `workday_supervises_maintainer.spec.ts` |

**Path prefixes:**
- entity_store: `x-pack/platform/plugins/shared/entity_store/`
- maintainers: `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/`
- Scout: `x-pack/solutions/security/plugins/security_solution/test/scout/entity_analytics/api/`

**Critical trap:** `runIntegration` receives `readClient` (`cpsEsClient ?? esClient`), which on CPS deployments is a **read-only** client. The reset must go through `crudClient`, never that esClient.

---

## Task 1: Infra helper that clears one relationship key

**Files:**
- Create: `x-pack/platform/plugins/shared/entity_store/server/infra/elasticsearch/entity_relationships.ts`
- Modify: `x-pack/platform/plugins/shared/entity_store/server/infra/elasticsearch/index.ts`
- Test: `x-pack/platform/plugins/shared/entity_store/server/infra/elasticsearch/entity_relationships.test.ts`

**Interfaces:**
- Consumes: `updateByQueryWithScript` from `./ingest` — signature:
  `(esClient, { index, query, script, params, signal?, waitForTask? }) => Promise<{ updated: number; total: number }>`.
  It already sets `refresh: true` and `conflicts: 'proceed'`.
- Produces:
  ```ts
  export const clearRelationshipIdsByEntitySource: (
    esClient: ElasticsearchClient,
    options: {
      index: string;
      entitySource: string;
      relationshipKey: string;
      signal?: AbortSignal;
    }
  ) => Promise<{ updated: number; total: number }>;
  ```

- [ ] **Step 1: Write the failing test**

Create `entity_relationships.test.ts`:

```ts
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { clearRelationshipIdsByEntitySource } from './entity_relationships';

describe('clearRelationshipIdsByEntitySource', () => {
  const buildEsClient = () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.updateByQuery.mockResolvedValue({ updated: 2, total: 2 } as never);
    return esClient;
  };

  it('narrows to the given source and only entities holding the relationship', async () => {
    const esClient = buildEsClient();

    await clearRelationshipIdsByEntitySource(esClient, {
      index: 'entities-latest-default',
      entitySource: 'workday',
      relationshipKey: 'supervises',
    });

    const body = esClient.updateByQuery.mock.calls[0][0] as {
      index: string;
      query: { bool: { filter: unknown[] } };
    };
    expect(body.index).toBe('entities-latest-default');
    expect(body.query.bool.filter).toEqual([
      { term: { 'entity.source': 'workday' } },
      { exists: { field: 'entity.relationships.supervises.ids' } },
    ]);
  });

  it('removes only the targeted relationship key', async () => {
    const esClient = buildEsClient();

    await clearRelationshipIdsByEntitySource(esClient, {
      index: 'entities-latest-default',
      entitySource: 'workday',
      relationshipKey: 'supervises',
    });

    const body = esClient.updateByQuery.mock.calls[0][0] as {
      script: { source: string; params: Record<string, unknown> };
    };
    // The key travels as a param, never interpolated into the script source —
    // a relationshipKey is config-supplied and must not reach Painless as code.
    expect(body.script.params).toEqual({ relationshipKey: 'supervises' });
    expect(body.script.source).not.toContain('supervises');
  });

  it('returns the update counts', async () => {
    const esClient = buildEsClient();

    const result = await clearRelationshipIdsByEntitySource(esClient, {
      index: 'entities-latest-default',
      entitySource: 'workday',
      relationshipKey: 'supervises',
    });

    expect(result).toEqual({ updated: 2, total: 2 });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
node scripts/jest x-pack/platform/plugins/shared/entity_store/server/infra/elasticsearch/entity_relationships.test.ts
```
Expected: FAIL — cannot find module `./entity_relationships`.

- [ ] **Step 3: Write the implementation**

Create `entity_relationships.ts`:

```ts
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { updateByQueryWithScript } from './ingest';

/**
 * Removes `entity.relationships.<relationshipKey>.ids` from every entity whose
 * `entity.source` matches, leaving all other relationship keys intact.
 *
 * For snapshot sources only: the caller re-populates from the current scan, so
 * clearing first is what makes a removed relationship actually disappear. On an
 * event-stream source this would erase real observations.
 */
export const clearRelationshipIdsByEntitySource = async (
  esClient: ElasticsearchClient,
  {
    index,
    entitySource,
    relationshipKey,
    signal,
  }: {
    index: string;
    entitySource: string;
    relationshipKey: string;
    signal?: AbortSignal;
  }
): Promise<{ updated: number; total: number }> =>
  updateByQueryWithScript(esClient, {
    index,
    query: {
      bool: {
        filter: [
          { term: { 'entity.source': entitySource } },
          // Keeps the operation proportional to entities that actually hold the
          // relationship rather than every document from this source.
          { exists: { field: `entity.relationships.${relationshipKey}.ids` } },
        ],
      },
    },
    // relationshipKey arrives as a param, never interpolated into the source:
    // it is config-supplied and must not be evaluated as Painless.
    script: `
      if (ctx._source.entity?.relationships != null) {
        ctx._source.entity.relationships.remove(params.relationshipKey);
      }
    `,
    params: { relationshipKey },
    signal,
  });
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
node scripts/jest x-pack/platform/plugins/shared/entity_store/server/infra/elasticsearch/entity_relationships.test.ts
```
Expected: PASS (3 tests).

- [ ] **Step 5: Export it from the infra barrel**

In `infra/elasticsearch/index.ts`, beside the existing `updateByQueryWithScript` export:

```ts
export { clearRelationshipIdsByEntitySource } from './entity_relationships';
```

- [ ] **Step 6: Type check**

```bash
node scripts/type_check --project x-pack/platform/plugins/shared/entity_store/tsconfig.json
```
Expected: exit 0.

- [ ] **Step 7: Commit**

```bash
git add x-pack/platform/plugins/shared/entity_store/server/infra/elasticsearch/
git commit -m "$(cat <<'EOF'
feat(entity-store): add infra helper to clear one relationship key by source

Scoped update_by_query that removes entity.relationships.<key>.ids from
entities of a single entity.source, leaving other relationship keys intact.
The key travels as a Painless param rather than being interpolated into the
script source.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Expose it on the CRUD client

**Files:**
- Modify: `x-pack/platform/plugins/shared/entity_store/server/domain/crud/crud_client.ts`
- Test: `x-pack/platform/plugins/shared/entity_store/server/domain/crud/crud_client.test.ts`

**Interfaces:**
- Consumes: `clearRelationshipIdsByEntitySource` (Task 1).
- Produces: a public method on `CRUDClient`, therefore also on
  `EntityUpdateClient` (`Omit<CRUDClient, 'createEntity' | 'deleteEntity'>`),
  which is what maintainers receive:
  ```ts
  public async clearRelationshipIds(params: {
    entitySource: string;
    relationshipKey: string;
    signal?: AbortSignal;
  }): Promise<{ updated: number; total: number }>;
  ```

- [ ] **Step 1: Write the failing test**

Append to `crud_client.test.ts`. Match the file's existing construction of
`CRUDClient` — read the top of the file first and reuse its mocks/helpers rather
than inventing new ones.

```ts
describe('clearRelationshipIds', () => {
  it('clears the relationship on the resolved latest index', async () => {
    const { client, esClient } = buildClient(); // reuse this file's existing helper
    esClient.updateByQuery.mockResolvedValue({ updated: 3, total: 3 } as never);

    const result = await client.clearRelationshipIds({
      entitySource: 'workday',
      relationshipKey: 'supervises',
    });

    const body = esClient.updateByQuery.mock.calls[0][0] as {
      query: { bool: { filter: unknown[] } };
    };
    expect(body.query.bool.filter).toContainEqual({
      term: { 'entity.source': 'workday' },
    });
    expect(result).toEqual({ updated: 3, total: 3 });
  });
});
```

If `buildClient` does not exist in that file, construct `CRUDClient` the same way
the neighbouring tests do.

- [ ] **Step 2: Run the test to verify it fails**

```bash
node scripts/jest x-pack/platform/plugins/shared/entity_store/server/domain/crud/crud_client.test.ts -t clearRelationshipIds
```
Expected: FAIL — `client.clearRelationshipIds is not a function`.

- [ ] **Step 3: Add the method**

In `crud_client.ts`, add the import beside the other infra imports:

```ts
import { clearRelationshipIdsByEntitySource } from '../../infra/elasticsearch';
```

Then add the method after `bulkUpdateEntity`:

```ts
  /**
   * Clears `entity.relationships.<relationshipKey>.ids` for every entity from
   * `entitySource`. Intended for snapshot-source maintainers that repopulate the
   * relationship from a full scan immediately afterwards.
   */
  public async clearRelationshipIds({
    entitySource,
    relationshipKey,
    signal,
  }: {
    entitySource: string;
    relationshipKey: string;
    signal?: AbortSignal;
  }): Promise<{ updated: number; total: number }> {
    await this.assertInstalled();
    return clearRelationshipIdsByEntitySource(this.esClient, {
      index: await this.latestIndexName(),
      entitySource,
      relationshipKey,
      signal,
    });
  }
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
node scripts/jest x-pack/platform/plugins/shared/entity_store/server/domain/crud/crud_client.test.ts
```
Expected: PASS, including all pre-existing tests in the file.

- [ ] **Step 5: Type check**

```bash
node scripts/type_check --project x-pack/platform/plugins/shared/entity_store/tsconfig.json
```
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add x-pack/platform/plugins/shared/entity_store/server/domain/crud/
git commit -m "$(cat <<'EOF'
feat(entity-store): expose clearRelationshipIds on the CRUD client

Delegates to the infra helper, resolving the latest index name and asserting
the store is installed first. Available to maintainers via EntityUpdateClient.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Config field + engine call site

**Files:**
- Modify: `maintainers/engine/types.ts` (inside `interface RelationshipIntegrationBase`, which starts at line 97)
- Modify: `maintainers/engine/run_relationship_maintainer.ts`
- Test: `maintainers/engine/run_relationship_maintainer.test.ts`

**Interfaces:**
- Consumes: `crudClient.clearRelationshipIds({ entitySource, relationshipKey, signal })` (Task 2).
- Produces:
  ```ts
  resetRelationshipsBeforeRun?: { entitySource: string };
  ```
  on every integration config variant. Task 4 sets it on the Workday config.

**Why `crudClient` and not the engine's `esClient`:** `runIntegration` receives
`readClient` (`cpsEsClient ?? esClient`), which on CPS deployments is read-only.
The reset is a write and must go through `crudClient`.

- [ ] **Step 1: Write the failing tests**

Append to `run_relationship_maintainer.test.ts`. Read the file first and reuse its
existing config fixtures and mock clients.

```ts
describe('resetRelationshipsBeforeRun', () => {
  it('does not clear anything when the config omits the flag', async () => {
    const { crudClient, ...deps } = buildDeps(); // reuse this file's helpers

    await runRelationshipMaintainer({
      ...deps,
      crudClient,
      integrations: [buildConfig({ id: 'no-reset' })],
    });

    expect(crudClient.clearRelationshipIds).not.toHaveBeenCalled();
  });

  it('clears once per integration, before any write', async () => {
    const { crudClient, ...deps } = buildDeps();
    const callOrder: string[] = [];
    crudClient.clearRelationshipIds.mockImplementation(async () => {
      callOrder.push('clear');
      return { updated: 0, total: 0 };
    });
    crudClient.bulkUpdateEntity.mockImplementation(async () => {
      callOrder.push('write');
      return [];
    });

    await runRelationshipMaintainer({
      ...deps,
      crudClient,
      integrations: [
        buildConfig({
          id: 'workday',
          relationshipKey: 'supervises',
          resetRelationshipsBeforeRun: { entitySource: 'workday' },
        }),
      ],
    });

    expect(crudClient.clearRelationshipIds).toHaveBeenCalledTimes(1);
    expect(crudClient.clearRelationshipIds).toHaveBeenCalledWith(
      expect.objectContaining({ entitySource: 'workday', relationshipKey: 'supervises' })
    );
    // The clear must precede every write, or the run would erase its own output.
    expect(callOrder[0]).toBe('clear');
    expect(callOrder.filter((c) => c === 'clear')).toHaveLength(1);
  });

  it('skips the integration when the clear fails, without touching writes', async () => {
    const { crudClient, ...deps } = buildDeps();
    crudClient.clearRelationshipIds.mockRejectedValue(new Error('boom'));

    const result = await runRelationshipMaintainer({
      ...deps,
      crudClient,
      integrations: [
        buildConfig({
          id: 'workday',
          relationshipKey: 'supervises',
          resetRelationshipsBeforeRun: { entitySource: 'workday' },
        }),
      ],
    });

    // Populating on top of an unknown state is worse than leaving it alone.
    expect(crudClient.bulkUpdateEntity).not.toHaveBeenCalled();
    expect(result.totalWritten).toBe(0);
  });
});
```

Adapt `buildDeps` / `buildConfig` to whatever the file already uses. If the mock
client is typed, add `clearRelationshipIds: jest.fn()` to it.

- [ ] **Step 2: Run the tests to verify they fail**

```bash
node scripts/jest x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/run_relationship_maintainer.test.ts -t resetRelationshipsBeforeRun
```
Expected: FAIL — the config field does not exist and nothing calls the clear.

- [ ] **Step 3: Add the config field**

In `engine/types.ts`, inside `RelationshipIntegrationBase` (after
`compositeAggAdditionalFilters`):

```ts
  /**
   * Clear this config's `relationshipKey` on all entities from `entitySource`
   * before processing any page, so the run repopulates from a clean slate.
   *
   * ONLY for sources that emit a COMPLETE snapshot of the relationship set each
   * cycle (e.g. Workday's 24h user inventory). On an event-stream source
   * (`accesses`, `communicates_with`) absence means "not seen in this window",
   * never "no longer true" — clearing there would erase real observations.
   *
   * Safe only while a source's actors are namespace-partitioned into their own
   * entity documents; otherwise this would delete another source's contribution
   * to the same `ids` array.
   */
  resetRelationshipsBeforeRun?: { entitySource: string };
```

- [ ] **Step 4: Call it in the engine**

In `run_relationship_maintainer.ts`, inside `runIntegration`, immediately before
the `try {` that wraps the `do…while` loop:

```ts
  if (config.resetRelationshipsBeforeRun) {
    const { entitySource } = config.resetRelationshipsBeforeRun;
    const relationshipKey =
      config.kind === 'bucketed'
        ? config.bucketTargetByThreshold.aboveThresholdRelationship
        : config.relationshipKey;
    try {
      const { updated } = await crudClient.clearRelationshipIds({
        entitySource,
        relationshipKey,
        signal,
      });
      logger.info(`${logPrefix} Cleared ${relationshipKey} on ${updated} ${entitySource} entities`);
    } catch (err) {
      // Populating on top of a half-cleared state is worse than leaving the
      // previous run's data in place, so skip this integration entirely.
      logger.error(`${logPrefix} Relationship reset failed, skipping integration: ${errMsg(err)}`);
      return {
        buckets: 0,
        recordsCount: 0,
        write: totalWriteResult,
        metadata: totalMetadataResult,
        outcome: 'error',
        iterations: 0,
        truncated: false,
      };
    }
  }
```

Place it after the accumulator declarations (`totalWriteResult`,
`totalMetadataResult`) so the early return can reference them.

- [ ] **Step 5: Run the tests to verify they pass**

```bash
node scripts/jest x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine
```
Expected: PASS, including all pre-existing engine tests.

- [ ] **Step 6: Commit**

```bash
git add x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/
git commit -m "$(cat <<'EOF'
feat(entity-analytics): add opt-in relationship reset before a maintainer run

Adds resetRelationshipsBeforeRun to the integration config. When set, the engine
clears that relationship for the given entity.source once per integration,
before pagination, so the existing additive write path repopulates from a clean
slate. Absent by default, so every existing config is unchanged.

A failed reset skips the integration rather than populating over an unknown
state. The clear goes through crudClient because the engine's read client may be
a read-only CPS client.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Enable it on the Workday config

**Files:**
- Modify: `maintainers/supervises/configs.ts`
- Test: `maintainers/supervises/configs.test.ts`

**Interfaces:**
- Consumes: `resetRelationshipsBeforeRun` (Task 3).
- Produces: nothing new.

- [ ] **Step 1: Write the failing tests**

Append to the `workday (log-inverted) supervises config` describe block:

```ts
  it('resets its relationships before each run', () => {
    // Workday re-emits the full inventory every poll, so a manager change must
    // remove the previous edge. The engine cannot retract, so the config clears
    // and repopulates instead.
    expect(getWorkdayConfig().resetRelationshipsBeforeRun).toEqual({
      entitySource: 'workday',
    });
  });

  it('leaves the IDP configs additive', () => {
    // Okta and Entra read raw_identifiers off the entity index, which is already
    // current-state; they have no stale-edge problem to solve and must not be
    // cleared.
    for (const config of buildSupervisesConfigs().filter((c) => c.id !== 'workday')) {
      expect(config.resetRelationshipsBeforeRun).toBeUndefined();
    }
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
node scripts/jest x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/supervises/configs.test.ts
```
Expected: FAIL — `resetRelationshipsBeforeRun` is `undefined` on the Workday config.

- [ ] **Step 3: Set the flag**

In `buildWorkdaySupervisesConfig`, after `validateTargetIds: true`:

```ts
    // Workday re-emits the complete inventory each poll, so absence from the
    // newest snapshot means the relationship ended. The engine cannot retract
    // (#292358), so clear this source's supervises edges and repopulate from
    // the current scan instead.
    resetRelationshipsBeforeRun: { entitySource: WORKDAY_ENTITY_SOURCE },
```

Add the constant beside the other Workday constants:

```ts
const WORKDAY_ENTITY_SOURCE = 'workday';
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
node scripts/jest x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/supervises
```
Expected: PASS. Golden snapshots are unaffected — this changes config shape, not ES|QL.

- [ ] **Step 5: Run the whole maintainers suite**

```bash
node scripts/jest x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers
```
Expected: PASS. Confirms no other maintainer picked up a reset.

- [ ] **Step 6: Lint and type check**

```bash
node scripts/eslint x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/supervises/
node scripts/type_check --project x-pack/solutions/security/plugins/security_solution/tsconfig.json
```
Expected: no errors, exit 0.

- [ ] **Step 7: Commit**

```bash
git add x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/supervises/
git commit -m "$(cat <<'EOF'
feat(entity-analytics): reset Workday supervises edges before each run

Workday re-emits its complete inventory every poll, so a worker's newest
snapshot is authoritative about who manages them. Clearing this source's
supervises edges before repopulating makes reassignment and unassignment
actually take effect, which additive writes alone cannot do.

Okta and Entra stay additive: they read current-state raw_identifiers off the
entity index and have no stale-edge problem.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Scout coverage for reassignment and unassignment

These are the cases the whole design exists for, and none of them can pass today.

**Files:**
- Modify: `test/scout/entity_analytics/api/tests/maintainers/workday_supervises_maintainer.spec.ts`

**Interfaces:**
- Consumes: everything above. Existing helpers: `seedUserEntity`, `seedWorkdayRow`
  (local, accepts `{ userEmail, managerEmail?, managerId?, ingestedAgoMinutes? }`),
  `triggerMaintainerRun`, `waitForRelationshipIds`, `getRelationshipIds`,
  `assertNoRelationshipId`.
- Produces: nothing.

- [ ] **Step 1: Write the tests**

Append inside the existing `apiTest.describe` block:

```ts
    apiTest(
      'moves the report to the new manager when the worker is reassigned',
      async ({ apiClient, esClient }) => {
        // Two runs, not two snapshots: run 1 establishes the edge, run 2 must
        // remove it. Only the pre-run reset can do that — additive writes never
        // retract.
        const runId = randomUUID().slice(0, 8);
        const oldManagerEmail = `reassign.old.${runId}@example.com`;
        const newManagerEmail = `reassign.new.${runId}@example.com`;
        const reportEmail = `reassign.report.${runId}@example.com`;
        const oldManagerEntityId = `user:${oldManagerEmail}@${NAMESPACE}`;
        const newManagerEntityId = `user:${newManagerEmail}@${NAMESPACE}`;
        const reportEntityId = `user:${reportEmail}@${NAMESPACE}`;

        for (const [entityId, email] of [
          [oldManagerEntityId, oldManagerEmail],
          [newManagerEntityId, newManagerEmail],
          [reportEntityId, reportEmail],
        ]) {
          await seedUserEntity(esClient, {
            entityId,
            namespace: NAMESPACE,
            email,
            entitySource: ENTITY_SOURCE,
          });
        }

        // Run 1: reports to the old manager.
        await seedWorkdayRow(esClient, {
          userEmail: reportEmail,
          managerEmail: oldManagerEmail,
        });
        await triggerMaintainerRun(apiClient, internalHeaders, MAINTAINER_ID, { sync: true });
        await waitForRelationshipIds(
          esClient,
          RELATIONSHIP_KEY,
          oldManagerEntityId,
          reportEntityId
        );

        // Run 2: Workday now reports a different manager.
        await esClient.deleteByQuery({
          index: LOG_INDEX,
          query: { match_all: {} },
          refresh: true,
          ignore_unavailable: true,
        });
        await seedWorkdayRow(esClient, {
          userEmail: reportEmail,
          managerEmail: newManagerEmail,
        });
        await triggerMaintainerRun(apiClient, internalHeaders, MAINTAINER_ID, { sync: true });

        await waitForRelationshipIds(
          esClient,
          RELATIONSHIP_KEY,
          newManagerEntityId,
          reportEntityId
        );
        // The point of the whole feature: the old edge is gone.
        await assertNoRelationshipId(
          esClient,
          RELATIONSHIP_KEY,
          oldManagerEntityId,
          reportEntityId
        );
      }
    );

    apiTest(
      'drops the report when the worker is unassigned',
      async ({ apiClient, esClient }) => {
        const runId = randomUUID().slice(0, 8);
        const managerEmail = `unassign.mgr.${runId}@example.com`;
        const reportEmail = `unassign.report.${runId}@example.com`;
        const managerEntityId = `user:${managerEmail}@${NAMESPACE}`;
        const reportEntityId = `user:${reportEmail}@${NAMESPACE}`;

        for (const [entityId, email] of [
          [managerEntityId, managerEmail],
          [reportEntityId, reportEmail],
        ]) {
          await seedUserEntity(esClient, {
            entityId,
            namespace: NAMESPACE,
            email,
            entitySource: ENTITY_SOURCE,
          });
        }

        await seedWorkdayRow(esClient, { userEmail: reportEmail, managerEmail });
        await triggerMaintainerRun(apiClient, internalHeaders, MAINTAINER_ID, { sync: true });
        await waitForRelationshipIds(esClient, RELATIONSHIP_KEY, managerEntityId, reportEntityId);

        // Workday now reports the worker with no manager at all.
        await esClient.deleteByQuery({
          index: LOG_INDEX,
          query: { match_all: {} },
          refresh: true,
          ignore_unavailable: true,
        });
        await seedWorkdayRow(esClient, { userEmail: reportEmail });
        await triggerMaintainerRun(apiClient, internalHeaders, MAINTAINER_ID, { sync: true });

        await assertNoRelationshipId(
          esClient,
          RELATIONSHIP_KEY,
          managerEntityId,
          reportEntityId
        );
      }
    );

    apiTest(
      'keeps a manager who still has reports after the reset',
      async ({ apiClient, esClient }) => {
        // Guards the obvious failure mode of a reset: clearing without
        // repopulating.
        const runId = randomUUID().slice(0, 8);
        const managerEmail = `keep.mgr.${runId}@example.com`;
        const firstReport = `keep.first.${runId}@example.com`;
        const secondReport = `keep.second.${runId}@example.com`;
        const managerEntityId = `user:${managerEmail}@${NAMESPACE}`;
        const firstEntityId = `user:${firstReport}@${NAMESPACE}`;
        const secondEntityId = `user:${secondReport}@${NAMESPACE}`;

        for (const [entityId, email] of [
          [managerEntityId, managerEmail],
          [firstEntityId, firstReport],
          [secondEntityId, secondReport],
        ]) {
          await seedUserEntity(esClient, {
            entityId,
            namespace: NAMESPACE,
            email,
            entitySource: ENTITY_SOURCE,
          });
        }

        await seedWorkdayRow(esClient, { userEmail: firstReport, managerEmail });
        await seedWorkdayRow(esClient, { userEmail: secondReport, managerEmail });
        await triggerMaintainerRun(apiClient, internalHeaders, MAINTAINER_ID, { sync: true });
        await waitForRelationshipIds(esClient, RELATIONSHIP_KEY, managerEntityId, firstEntityId);

        // Second run over unchanged data must end in the same state.
        await triggerMaintainerRun(apiClient, internalHeaders, MAINTAINER_ID, { sync: true });

        await waitForRelationshipIds(esClient, RELATIONSHIP_KEY, managerEntityId, firstEntityId);
        const ids = await getRelationshipIds(esClient, RELATIONSHIP_KEY, managerEntityId);
        expect(ids.sort()).toStrictEqual([firstEntityId, secondEntityId].sort());
      }
    );
```

- [ ] **Step 2: Lint and type check**

```bash
node scripts/eslint x-pack/solutions/security/plugins/security_solution/test/scout/entity_analytics/api/tests/maintainers/workday_supervises_maintainer.spec.ts
node scripts/type_check --project x-pack/solutions/security/plugins/security_solution/tsconfig.json
```
Expected: no errors, exit 0.

- [ ] **Step 3: Start a stack**

In a separate terminal, leave running:

```bash
node scripts/scout start-server --arch stateful --domain classic
```

Ready when ES answers on `:9220` and Kibana on `:5620`.

- [ ] **Step 4: Run the suite against it**

Do **not** use `scout run-tests` — it starts its own stack and fails on a
port-9220 lock conflict. Drive Playwright directly:

```bash
node_modules/.bin/playwright test \
  --project=local \
  --config=x-pack/solutions/security/plugins/security_solution/test/scout/entity_analytics/api/playwright.config.ts \
  workday_supervises --reporter=line
```

Expected: all tests pass, including the three new ones.

Debugging notes:
- *Reassignment test fails with the old edge still present* → the reset is not
  running. Check the engine logs for `Cleared supervises on N workday entities`.
- *All tests fail with no relationships at all* → the reset is running but
  repopulation is not; check that the clear happens before, not after, the loop.
- *`assertNoRelationshipId` times out* → it polls for 10s; the sync run should
  already have settled, so a timeout means the edge is genuinely still there.

- [ ] **Step 5: Commit**

```bash
git add x-pack/solutions/security/plugins/security_solution/test/scout/entity_analytics/api/tests/maintainers/workday_supervises_maintainer.spec.ts
git commit -m "$(cat <<'EOF'
test(entity-analytics): cover Workday manager reassignment and unassignment

Three two-run cases that are impossible without the pre-run reset: a reassigned
worker must leave the old manager, an unassigned worker must leave entirely, and
a manager whose reports are unchanged must still have them after a
reset-and-repopulate cycle.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Documentation and full validation

**Files:**
- Modify: `maintainers/supervises/configs.ts` (comment block only)

**Interfaces:** consumes everything above.

- [ ] **Step 1: Update the stale-edge comments**

The Workday config's doc comment currently documents cross-page manager change
and manager removal as unfixable limitations tracked against #292358. The reset
resolves both. Replace those two numbered cases with a short statement that the
pre-run reset handles them, and keep only what remains true:

- The reset handles reassignment and unassignment, because each run starts clean.
- A run that fails partway leaves the relationship *incomplete* until the next
  clean run — temporarily incomplete rather than permanently incorrect.
- #292358 remains open for event-stream sources, where absence carries no
  information and clearing would erase real observations.

Do not delete the `LAST(managerKey, event.ingested)` collapse explanation — it is
still load-bearing for same-page duplicate managers within a single run.

- [ ] **Step 2: Run the repo's scoped check**

```bash
node scripts/check.js --scope=branch
```
Expected: PASS (Jest, types, lint over the branch's changes).

- [ ] **Step 3: Verify the entity_store package**

```bash
node scripts/jest --config x-pack/platform/plugins/shared/entity_store/jest.config.js
```
Expected: PASS. This package is where Tasks 1–2 landed and where a stale snapshot
would surface.

- [ ] **Step 4: Confirm no other maintainer changed behaviour**

```bash
node scripts/jest x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers
```
Expected: PASS, with `resetRelationshipsBeforeRun` undefined on every config
except Workday.

- [ ] **Step 5: Commit**

```bash
git add x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/supervises/configs.ts
git commit -m "$(cat <<'EOF'
docs(entity-analytics): fold the reset into the Workday stale-edge notes

Cross-page manager change and manager removal were documented as unfixable
without retraction; the pre-run reset resolves both. Records what remains true:
a partially-failed run leaves data incomplete rather than incorrect, and #292358
still governs event-stream sources.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Notes carried from the spec

- **Placement is load-bearing.** Per-integration, not per-run: `supervises` runs
  three configs sharing one relationship key, so a run-level reset would let
  Workday's clear wipe the Okta and Entra writes from earlier in the same run.
- **Provenance is safe only because the sources are namespace-partitioned**
  (`user:…@workday` vs `user:…@okta`) into distinct entity documents. Any future
  source sharing an entity document with another would need per-source provenance
  before it could use this flag.
- **Truncation becomes destructive.** A run that hits `MAX_ITERATIONS` has already
  cleared but not fully repopulated. The spec proposes a skip-on-previous-truncation
  guard, which needs a new persisted TM state field (`lastRunTruncated`); that is
  deliberately **not** in this plan. Raise it in review — a source large enough to
  truncate (3.5M actors) is already misconfigured for this maintainer, and the
  fallback is to log loudly instead.
