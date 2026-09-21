# Maintainers DSL+ES|QL Optimizations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve performance and observability of the `communicates_with` and `accesses` relationship maintainers by adding a hardcoded local-namespace ES|QL fast path, per-page entity writes, configurable ES client timeout, and per-integration completion logging.

**Architecture:** The engine's Step 1 (DSL composite agg) + Step 2 (ES|QL) flow is unchanged. Four targeted improvements are layered on top: (1) a new `localNamespaceFastPath` flag on `RelationshipIntegrationConfig` that causes the ES|QL builder to emit a minimized query with hardcoded `@local` namespace and no EVAL chain; (2) `writeEntityIds` + metadata called per page (not after the full integration loop); (3) a `requestTimeout` option threaded from the caller through to ES/ES|QL transport calls; (4) a `logger.info` completion log per integration on success.

**Tech Stack:** TypeScript, Jest (`node scripts/jest`), Kibana plugin conventions (Elastic License 2.0 header, `snake_case` filenames, `camelCase` functions).

## Global Constraints

- Elastic License 2.0 header on every new or modified file.
- `snake_case` filenames; `camelCase` functions/vars; `PascalCase` types.
- `import type` for type-only imports; no `any`/`unknown`; no non-null assertions; no `@ts-ignore`.
- Scope: log-source configs only. Entity-index configs (`administers`, `owns`) are **UNCHANGED**.
- Run tests with: `node scripts/jest <path-to-test-file>`
- Type check with: `node scripts/type_check --project x-pack/solutions/security/plugins/security_solution/tsconfig.json`
- Lint with: `node scripts/eslint --fix <changed-files>`

---

### Task 1: Add `localNamespaceFastPath` flag to config types + update existing configs

**Files:**
- Modify: `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/types.ts`
- Modify: `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/communicates_with/configs.ts`
- Modify: `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/accesses/configs.ts`
- Test: `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/communicates_with/configs.test.ts`
- Test: `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/accesses/configs.test.ts`

**Interfaces:**
- Produces: `localNamespaceFastPath?: true` optional field on `RelationshipIntegrationBase` (the shared interface that all three config variants extend). Present on `system_auth` and `system_security` in both `communicates_with` and `accesses` configs.

- [ ] **Step 1: Write failing tests**

In `communicates_with/configs.test.ts`:

```typescript
import { COMMUNICATES_WITH_INTEGRATION_RELATIONSHIP_CONFIGS } from './configs';

describe('communicates_with configs', () => {
  it('system_auth has localNamespaceFastPath: true', () => {
    const cfg = COMMUNICATES_WITH_INTEGRATION_RELATIONSHIP_CONFIGS.find((c) => c.id === 'system_auth');
    expect(cfg?.localNamespaceFastPath).toBe(true);
  });

  it('system_security has localNamespaceFastPath: true', () => {
    const cfg = COMMUNICATES_WITH_INTEGRATION_RELATIONSHIP_CONFIGS.find((c) => c.id === 'system_security');
    expect(cfg?.localNamespaceFastPath).toBe(true);
  });

  it('elastic_defend does NOT have localNamespaceFastPath', () => {
    const cfg = COMMUNICATES_WITH_INTEGRATION_RELATIONSHIP_CONFIGS.find((c) => c.id === 'elastic_defend');
    expect(cfg?.localNamespaceFastPath).toBeUndefined();
  });
});
```

In `accesses/configs.test.ts`:

```typescript
import { ACCESSES_INTEGRATION_RELATIONSHIP_CONFIGS } from './configs';

describe('accesses configs', () => {
  it('system_auth has localNamespaceFastPath: true', () => {
    const cfg = ACCESSES_INTEGRATION_RELATIONSHIP_CONFIGS.find((c) => c.id === 'system_auth');
    expect(cfg?.localNamespaceFastPath).toBe(true);
  });

  it('system_security has localNamespaceFastPath: true', () => {
    const cfg = ACCESSES_INTEGRATION_RELATIONSHIP_CONFIGS.find((c) => c.id === 'system_security');
    expect(cfg?.localNamespaceFastPath).toBe(true);
  });

  it('elastic_defend does NOT have localNamespaceFastPath', () => {
    const cfg = ACCESSES_INTEGRATION_RELATIONSHIP_CONFIGS.find((c) => c.id === 'elastic_defend');
    expect(cfg?.localNamespaceFastPath).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
node scripts/jest x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/communicates_with/configs.test.ts
node scripts/jest x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/accesses/configs.test.ts
```

Expected: FAIL — `localNamespaceFastPath` property does not exist.

- [ ] **Step 3: Add `localNamespaceFastPath` to `RelationshipIntegrationBase` in `types.ts`**

In `engine/types.ts`, add to the `RelationshipIntegrationBase` interface (after `disableLookbackWindow`):

```typescript
  /**
   * When true, the ES|QL builder emits a minimized local-namespace query:
   * hardcodes `@local` as the namespace suffix in the actor EUID, reads only
   * the three identity fields (`user.email`, `user.name`, `host.id`), and skips
   * the namespace/EUID EVAL chain. Measured to be ~26× faster than the full
   * builder on large indices (e.g. logs-system.auth, ~700M docs, 30d lookback).
   *
   * Only valid for integrations whose data exclusively uses the `@local`
   * namespace — all current `system_auth` and `system_security` configs qualify.
   * Setting this on a multi-namespace integration will silently produce wrong
   * EUIDs for non-local entities.
   */
  localNamespaceFastPath?: true;
```

- [ ] **Step 4: Set flag on `system_auth` and `system_security` in `communicates_with/configs.ts`**

Add `localNamespaceFastPath: true` to both configs:

```typescript
  {
    kind: 'standard',
    id: 'system_auth',
    name: 'System Auth',
    // ...existing fields...
    localNamespaceFastPath: true,
  },
  {
    kind: 'standard',
    id: 'system_security',
    name: 'System Security',
    // ...existing fields...
    localNamespaceFastPath: true,
  },
```

- [ ] **Step 5: Set flag on `system_auth` and `system_security` in `accesses/configs.ts`**

Same pattern — add `localNamespaceFastPath: true` to the `system_auth` and `system_security` entries.

- [ ] **Step 6: Run tests to confirm they pass**

```bash
node scripts/jest x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/communicates_with/configs.test.ts
node scripts/jest x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/accesses/configs.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/types.ts \
  x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/communicates_with/configs.ts \
  x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/communicates_with/configs.test.ts \
  x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/accesses/configs.ts \
  x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/accesses/configs.test.ts
git commit -m "feat(maintainers): add localNamespaceFastPath flag to config types and system_auth/security configs"
```

---

### Task 2: Implement fast-path ES|QL builder in `build_targets_per_actor_query.ts`

**Files:**
- Modify: `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/build_targets_per_actor_query.ts`
- Test: `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/build_targets_per_actor_query.test.ts`

**Interfaces:**
- Consumes: `localNamespaceFastPath?: true` from Task 1's `RelationshipIntegrationBase`.
- Produces: when `localNamespaceFastPath` is set, `buildTargetsPerActorQuery` emits a minimized query using hardcoded `@local`, `user.email`/`user.name`/`host.id` only, no namespace EVAL chain, no `getFieldEvaluationsEsql` call.

The fast-path query shape for `system_auth` `communicates_with` (standard):

```
SET unmapped_fields="nullify";
FROM logs-system.auth-<namespace>
| WHERE <esqlWhereClause>
    AND ((`user.email` IS NOT NULL AND `user.email` != "") OR (`user.name` IS NOT NULL AND `user.name` != ""))
    AND (`host.id` IS NOT NULL AND `host.id` != "")
| EVAL actorUserId = CONCAT("user:", COALESCE(TO_STRING(`user.email`), TO_STRING(`user.name`)), "@", TO_STRING(`host.id`), "@local")
| WHERE COALESCE(actorUserId, "") != ""
| EVAL targetEntityId = CONCAT("host:", TO_STRING(`host.id`))
| MV_EXPAND targetEntityId
| WHERE COALESCE(targetEntityId, "") != ""
| STATS communicates_with = VALUES(targetEntityId) BY actorUserId
| LIMIT 3500
```

For `bucketed` (accesses), the STATS block uses the bucketed shape (same as the existing `buildRelationshipEsql` bucketed path), but the EVAL and identity sections are minimized.

- [ ] **Step 1: Write failing tests**

In `build_targets_per_actor_query.test.ts`, add a new `describe` block:

```typescript
describe('localNamespaceFastPath', () => {
  const fastPathStandard: RelationshipIntegrationConfig = {
    kind: 'standard',
    id: 'system_auth',
    name: 'System Auth',
    indexPattern: (ns) => `logs-system.auth-${ns}`,
    relationshipKey: 'communicates_with',
    targetEntityType: 'host',
    requireTargetEntityIdExists: true,
    localNamespaceFastPath: true,
    customActor: { fields: ['user.email', 'user.name'] },
    esqlWhereClause: `(MV_CONTAINS(TO_STRING(event.category), "authentication") OR MV_CONTAINS(TO_STRING(event.category), "session"))
    AND event.action == "ssh_login"
    AND event.outcome == "success"`,
  };

  const fastPathBucketed: RelationshipIntegrationConfig = {
    kind: 'bucketed',
    id: 'system_auth',
    name: 'System Auth',
    indexPattern: (ns) => `logs-system.auth-${ns}`,
    targetEntityType: 'host',
    bucketTargetByThreshold: {
      threshold: 4,
      aboveThresholdRelationship: 'accesses_frequently',
      belowThresholdRelationship: 'accesses_infrequently',
    },
    requireTargetEntityIdExists: true,
    localNamespaceFastPath: true,
    customActor: { fields: ['user.email', 'user.name'] },
    esqlWhereClause: `(MV_CONTAINS(TO_STRING(event.category), "authentication") OR MV_CONTAINS(TO_STRING(event.category), "session"))
    AND event.action == "ssh_login"
    AND event.outcome == "success"`,
  };

  it('does NOT include entity.namespace EVAL chain', () => {
    const query = buildTargetsPerActorQuery(fastPathStandard, 'default');
    expect(query).not.toContain('entity.namespace');
    expect(query).not.toContain('_src_entity_namespace');
    expect(query).not.toContain('getFieldEvaluations');
  });

  it('hardcodes @local in the actorUserId EVAL expression', () => {
    const query = buildTargetsPerActorQuery(fastPathStandard, 'default');
    expect(query).toContain('@local');
    expect(query).toContain('actorUserId');
  });

  it('uses CONCAT with user.email / user.name COALESCE for actor EUID', () => {
    const query = buildTargetsPerActorQuery(fastPathStandard, 'default');
    expect(query).toContain('`user.email`');
    expect(query).toContain('`user.name`');
    expect(query).toContain('`host.id`');
  });

  it('includes host.id IS NOT NULL gate (requireTargetEntityIdExists fast-path equivalent)', () => {
    const query = buildTargetsPerActorQuery(fastPathStandard, 'default');
    expect(query).toContain('`host.id` IS NOT NULL');
    expect(query).toContain('`host.id` != ""');
  });

  it('emits correct STATS column for standard kind', () => {
    const query = buildTargetsPerActorQuery(fastPathStandard, 'default');
    expect(query).toContain('communicates_with = VALUES(targetEntityId)');
  });

  it('emits bucketed STATS block for bucketed kind', () => {
    const query = buildTargetsPerActorQuery(fastPathBucketed, 'default');
    expect(query).toContain('accesses_frequently');
    expect(query).toContain('accesses_infrequently');
    expect(query).toContain('access_count = COUNT(*)');
  });

  it('still includes LIMIT', () => {
    const query = buildTargetsPerActorQuery(fastPathStandard, 'default');
    expect(query).toContain('| LIMIT 3500');
  });

  it('still prepends the engine preamble exactly once', () => {
    const query = buildTargetsPerActorQuery(fastPathStandard, 'default');
    const matches = query.match(/SET unmapped_fields="nullify";/g) ?? [];
    expect(matches).toHaveLength(1);
  });

  it('uses the namespace-derived index pattern', () => {
    expect(buildTargetsPerActorQuery(fastPathStandard, 'prod')).toContain(
      'logs-system.auth-prod'
    );
  });

  it('does NOT emit entity.namespace or EUID chain for fast-path bucketed', () => {
    const query = buildTargetsPerActorQuery(fastPathBucketed, 'default');
    expect(query).not.toContain('entity.namespace');
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
node scripts/jest x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/build_targets_per_actor_query.test.ts
```

Expected: FAIL — `localNamespaceFastPath` has no effect yet.

- [ ] **Step 3: Implement the fast-path builder**

In `build_targets_per_actor_query.ts`, add a new function `buildLocalNamespaceFastPathEsql` and wire it into `buildTargetsPerActorQuery`:

```typescript
/**
 * Minimized ES|QL builder for local-namespace configs (system_auth, system_security).
 *
 * Skips the full namespace/EUID EVAL chain. Hardcodes `@local` as namespace,
 * reads only `user.email`, `user.name`, `host.id`. Measured ~26× faster than
 * the full builder on logs-system.auth (~700M docs, 30d lookback).
 *
 * Only valid for integrations whose data exclusively uses the `@local`
 * namespace. The flag `localNamespaceFastPath` on the config opts in.
 */
function buildLocalNamespaceFastPathEsql(
  config: StandardRelationshipIntegrationConfig | BucketedRelationshipIntegrationConfig,
  namespace: string
): string {
  const indexPattern = config.indexPattern(namespace);
  const actorFields = config.customActor?.fields ?? ['user.email', 'user.name'];

  const actorPresenceGate = actorFields
    .map((f) => `(\`${f}\` IS NOT NULL AND \`${f}\` != "")`)
    .join(' OR ');

  // For host-targeted configs with requireTargetEntityIdExists, gate on host.id directly
  // (avoids the full EUID-exists DSL — we know the target is always host.id for these configs).
  const targetGate =
    config.requireTargetEntityIdExists && config.targetEntityType === 'host'
      ? '\n    AND (`host.id` IS NOT NULL AND `host.id` != "")'
      : '';

  // Actor EUID: CONCAT("user:", COALESCE(user.email, user.name), "@", host.id, "@local")
  // Uses COALESCE over actor fields in declaration order.
  const coalesceArgs = actorFields.map((f) => `TO_STRING(\`${f}\`)`).join(', ');
  const actorEval = `| EVAL ${ENGINE_COLUMNS.actor} = CONCAT("user:", COALESCE(${coalesceArgs}), "@", TO_STRING(\`host.id\`), "@local")`;

  const targetEval =
    config.targetEntityType === 'host'
      ? `| EVAL targetEntityId = CONCAT("host:", TO_STRING(\`host.id\`))`
      : `| EVAL ${euid.esql.getEuidEvaluation(config.targetEntityType, 'targetEntityId', { withTypeId: true })}`;

  const statsClause =
    config.kind === 'bucketed'
      ? (() => {
          const {
            threshold,
            aboveThresholdRelationship: above,
            belowThresholdRelationship: below,
          } = config.bucketTargetByThreshold;
          const aboveCol = ENGINE_COLUMNS.bucketAbove(above);
          const belowCol = ENGINE_COLUMNS.bucketBelow(below);
          return `| STATS access_count = COUNT(*) BY ${ENGINE_COLUMNS.actor}, targetEntityId
| EVAL access_type = CASE(
    access_count >= ${threshold}, "${above}",
    "${below}"
  )
| STATS targets = VALUES(targetEntityId) BY access_type, ${ENGINE_COLUMNS.actor}
| STATS
    ${aboveCol} = VALUES(targets) WHERE access_type == "${above}",
    ${belowCol} = VALUES(targets) WHERE access_type == "${below}"
  BY ${ENGINE_COLUMNS.actor}`;
        })()
      : `| STATS ${ENGINE_COLUMNS.flat(config.relationshipKey)} = VALUES(targetEntityId) BY ${ENGINE_COLUMNS.actor}`;

  return `FROM ${indexPattern}
| WHERE ${config.esqlWhereClause}
    AND (${actorPresenceGate})${targetGate}
${actorEval}
| WHERE COALESCE(${ENGINE_COLUMNS.actor}, "") != ""
${targetEval}
| MV_EXPAND targetEntityId
| WHERE COALESCE(targetEntityId, "") != ""
${statsClause}
| LIMIT ${COMPOSITE_PAGE_SIZE}`;
}
```

Then update `buildTargetsPerActorQuery` to branch on the flag:

```typescript
export const buildTargetsPerActorQuery = (
  config: RelationshipIntegrationConfig,
  namespace: string
): string => {
  let body: string;
  if (config.kind === 'override') {
    body = config.esqlQueryOverride(namespace);
  } else if (config.localNamespaceFastPath) {
    body = buildLocalNamespaceFastPathEsql(config, namespace);
  } else {
    body = buildRelationshipEsql(config, namespace);
  }
  return `${ESQL_ENGINE_PREAMBLE}\n${body}`;
};
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
node scripts/jest x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/build_targets_per_actor_query.test.ts
```

Expected: PASS (including all pre-existing tests).

- [ ] **Step 5: Commit**

```bash
git add x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/build_targets_per_actor_query.ts \
  x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/build_targets_per_actor_query.test.ts
git commit -m "feat(maintainers): implement localNamespaceFastPath ES|QL builder (~26x speedup for system_auth/security)"
```

---

### Task 3: Add configurable `requestTimeout` to the engine

**Files:**
- Modify: `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/run_relationship_maintainer.ts`
- Modify: `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/constants.ts`
- Modify: `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/communicates_with/index.ts`
- Modify: `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/accesses/index.ts`
- Test: `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/run_relationship_maintainer.test.ts`

**Interfaces:**
- Produces: `DEFAULT_ESQL_TIMEOUT_MS = 60_000` constant. `runRelationshipMaintainer` accepts optional `requestTimeoutMs?: number`; when set, it is passed as `requestTimeout` in transport options to both `esClient.search` (Step 1) and `esClient.esql.query` (Step 2). Defaults to `DEFAULT_ESQL_TIMEOUT_MS` (60s).

- [ ] **Step 1: Add constant to `constants.ts`**

```typescript
/** Default per-request timeout (ms) for ES client calls made by the engine. */
export const DEFAULT_ESQL_TIMEOUT_MS = 60_000;
```

- [ ] **Step 2: Write failing test**

In `run_relationship_maintainer.test.ts`, add to the existing test suite:

```typescript
describe('requestTimeoutMs', () => {
  it('passes requestTimeout to esClient.search when requestTimeoutMs is set', async () => {
    const { esClient, search, esql } = makeEsClient();
    const { crudClient, entityMetadataClient } = makeClients();
    search.mockResolvedValueOnce({ aggregations: { users: { buckets: [] } } });

    await runRelationshipMaintainer({
      esClient,
      logger: loggerMock.create(),
      namespace: 'default',
      crudClient,
      entityMetadataClient,
      integrations: [baseConfig],
      requestTimeoutMs: 90_000,
    });

    expect(search).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ requestTimeout: 90_000 })
    );
  });

  it('passes requestTimeout to esClient.esql.query when requestTimeoutMs is set', async () => {
    const { esClient, search, esql } = makeEsClient();
    const { crudClient, entityMetadataClient } = makeClients();
    search.mockResolvedValueOnce({
      aggregations: {
        users: {
          buckets: [{ key: { 'user.name': 'alice' }, doc_count: 1 }],
        },
      },
    });
    esql.mockResolvedValueOnce({ columns: [], values: [] });

    await runRelationshipMaintainer({
      esClient,
      logger: loggerMock.create(),
      namespace: 'default',
      crudClient,
      entityMetadataClient,
      integrations: [baseConfig],
      requestTimeoutMs: 90_000,
    });

    expect(esql).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ requestTimeout: 90_000 })
    );
  });
});
```

- [ ] **Step 3: Run test to confirm it fails**

```bash
node scripts/jest x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/run_relationship_maintainer.test.ts
```

Expected: FAIL — `requestTimeoutMs` param not accepted yet.

- [ ] **Step 4: Thread `requestTimeoutMs` through `run_relationship_maintainer.ts`**

1. Add `DEFAULT_ESQL_TIMEOUT_MS` import from `./constants`.
2. Add `requestTimeoutMs?: number` to the `runRelationshipMaintainer` parameter object.
3. Pass it into `runIntegration`.
4. In `runIntegration`, replace:

```typescript
const transportOpts = signal ? { signal } : undefined;
```

with:

```typescript
const timeoutMs = requestTimeoutMs ?? DEFAULT_ESQL_TIMEOUT_MS;
const transportOpts: { signal?: AbortSignal; requestTimeout?: number } = { requestTimeout: timeoutMs };
if (signal) transportOpts.signal = signal;
```

5. `fetchActorPage` already receives `transportOpts` and passes it to `esClient.search(…, transportOpts)` — no change needed there.
6. `fetchTargetsForActors` already receives `transportOpts` and passes it to `esClient.esql.query(…, transportOpts)` — no change needed there.
7. Update `runIntegration`'s signature to accept `requestTimeoutMs?: number`.

- [ ] **Step 5: Pass `requestTimeoutMs` from callers in `communicates_with/index.ts` and `accesses/index.ts`**

Both callers currently don't pass the param — they'll get the 60s default automatically. No change needed unless the caller wants to override. Leave them as-is (the default applies).

- [ ] **Step 6: Run tests to confirm they pass**

```bash
node scripts/jest x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/run_relationship_maintainer.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/constants.ts \
  x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/run_relationship_maintainer.ts
git commit -m "feat(maintainers): add configurable requestTimeoutMs to engine, default 60s"
```

---

### Task 4: Write entity IDs per page instead of at end of integration loop

**Files:**
- Modify: `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/run_relationship_maintainer.ts`
- Test: `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/run_relationship_maintainer.test.ts`

**Interfaces:**
- Consumes: existing `writeEntityIds` and `writeRelationshipMetadatas` signatures — unchanged.
- Produces: `runIntegration` calls `writeEntityIds` + `writeRelationshipMetadatas` once per pagination page (immediately after `parseTargetsPerActorRows`) rather than accumulating all records and writing once at the end. The `records` accumulator is removed. Counters (`write.*`, `metadata.*`) are accumulated across pages.

**Why this is correct:** The current engine already writes per-integration (not per-page). Moving to per-page is safe because `writeEntityIds` uses plain OVERWRITE — each actor's relationship set is fully replaced on write. Since each page contains actor-disjoint records (composite agg produces each actor in exactly one page), per-page and end-of-integration writes produce identical state in the entity store.

- [ ] **Step 1: Write failing test**

In `run_relationship_maintainer.test.ts`, add:

```typescript
describe('per-page write', () => {
  it('calls bulkUpdateEntity once per page when there are multiple pages', async () => {
    const { esClient, search, esql } = makeEsClient();
    const { crudClient, entityMetadataClient, bulkUpdate } = makeClients();

    // Page 1: returns after_key so pagination continues
    search.mockResolvedValueOnce({
      aggregations: {
        users: {
          buckets: [{ key: { 'user.name': 'alice' }, doc_count: 1 }],
          after_key: { 'user.name': 'alice' },
        },
      },
    });
    // Page 2: no after_key — last page
    search.mockResolvedValueOnce({
      aggregations: {
        users: {
          buckets: [{ key: { 'user.name': 'bob' }, doc_count: 1 }],
        },
      },
    });

    esql.mockResolvedValue({
      columns: [
        { name: 'actorUserId', type: 'keyword' },
        { name: 'communicates_with', type: 'keyword' },
      ],
      values: [['user:alice@host1@local', 'host:h1']],
    });

    await runRelationshipMaintainer({
      esClient,
      logger: loggerMock.create(),
      namespace: 'default',
      crudClient,
      entityMetadataClient,
      integrations: [
        {
          kind: 'standard',
          id: 'system_auth',
          name: 'System Auth',
          indexPattern: (ns) => `logs-system.auth-${ns}`,
          relationshipKey: 'communicates_with',
          targetEntityType: 'host',
          esqlWhereClause: 'event.action == "ssh_login"',
        },
      ],
    });

    // bulkUpdateEntity called once per non-empty page (2 pages, both have esql results)
    expect(bulkUpdate).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
node scripts/jest x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/run_relationship_maintainer.test.ts
```

Expected: FAIL — currently `bulkUpdateEntity` is called once (end-of-integration).

- [ ] **Step 3: Refactor `runIntegration` to write per page**

In `run_relationship_maintainer.ts`, inside `runIntegration`:

1. Remove the `const records: EntityRelationshipRecord[] = []` accumulator.
2. Add per-page write result accumulators before the loop:

```typescript
let totalWriteResult: WriteEntityIdsResult = {
  updated: 0, notFound: 0, errors: 0, droppedTargets: 0,
  relationshipTypeApplied: {}, succeededEntityIds: new Set(),
};
let totalMetadataResult: WriteRelationshipMetadatasResult = { docsAttempted: 0, docsApplied: 0 };
```

3. Inside the loop, after `parseTargetsPerActorRows`, replace `records.push(...pageRecords)` with:

```typescript
const pageRecords = parseTargetsPerActorRows(columns, values, config, logger);
logger.debug(`[${config.id}] Produced ${pageRecords.length} records`);

if (pageRecords.length > 0) {
  const pageWrite = await writeEntityIds(
    crudClient, logger, pageRecords, esClient, namespace, config.validateTargetIds
  );
  const { validTargetIds, succeededEntityIds } = pageWrite;
  const actorFiltered = pageRecords.filter(
    (r) => r.entityId !== null && succeededEntityIds.has(r.entityId)
  );
  const metadataRecords = validTargetIds
    ? actorFiltered.flatMap((r) => {
        const filteredRels: Record<string, string[]> = {};
        for (const [relType, targetEuids] of Object.entries(r.relationships)) {
          const valid = targetEuids.filter((id) => validTargetIds.has(id));
          if (valid.length > 0) filteredRels[relType] = valid;
        }
        return Object.keys(filteredRels).length > 0 ? [{ ...r, relationships: filteredRels }] : [];
      })
    : actorFiltered;
  const pageMetadata = await writeRelationshipMetadatas(
    entityMetadataClient, logger, metadataRecords,
    {
      scanId: metadataContext.scanId,
      lookbackWindow: config.disableLookbackWindow ? '' : LOOKBACK_WINDOW,
      entitySource: config.id,
      observedAt: metadataContext.observedAt,
    }
  );

  // Accumulate across pages
  totalWriteResult = {
    updated: totalWriteResult.updated + pageWrite.updated,
    notFound: totalWriteResult.notFound + pageWrite.notFound,
    errors: totalWriteResult.errors + pageWrite.errors,
    droppedTargets: totalWriteResult.droppedTargets + pageWrite.droppedTargets,
    relationshipTypeApplied: mergeRelTypeApplied(
      totalWriteResult.relationshipTypeApplied, pageWrite.relationshipTypeApplied
    ),
    succeededEntityIds: new Set([
      ...totalWriteResult.succeededEntityIds,
      ...pageWrite.succeededEntityIds,
    ]),
    validTargetIds: pageWrite.validTargetIds,
  };
  totalMetadataResult = {
    docsAttempted: totalMetadataResult.docsAttempted + pageMetadata.docsAttempted,
    docsApplied: totalMetadataResult.docsApplied + pageMetadata.docsApplied,
  };
}
```

4. Add a small helper (or inline) for merging `relationshipTypeApplied`:

```typescript
function mergeRelTypeApplied(
  a: Record<string, number>,
  b: Record<string, number>
): Record<string, number> {
  const merged = { ...a };
  for (const [k, v] of Object.entries(b)) {
    merged[k] = (merged[k] ?? 0) + v;
  }
  return merged;
}
```

5. Remove the post-loop write block (the `writeEntityIds` + `writeRelationshipMetadatas` calls that currently follow the `do/while`).
6. Update the return statement to use `totalWriteResult` and `totalMetadataResult`.
7. Update `recordsCount` tracking: add a `let totalRecordsCount = 0` and increment by `pageRecords.length` each page.

- [ ] **Step 4: Run all maintainer engine tests**

```bash
node scripts/jest x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/run_relationship_maintainer.test.ts
```

Expected: PASS for all tests.

- [ ] **Step 5: Commit**

```bash
git add x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/run_relationship_maintainer.ts
git commit -m "feat(maintainers): write entity IDs per page instead of end-of-integration"
```

---

### Task 5: Add per-integration completion log + run full test suite

**Files:**
- Modify: `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/run_relationship_maintainer.ts`
- Test: `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/run_relationship_maintainer.test.ts`

**Interfaces:**
- Produces: after each successful integration run, `logger.info` emits a structured completion message containing: integration id, `buckets`, `records`, `written`, `notFound`, `errors`, `metadataDocsApplied`, `droppedTargets`, `iterations`, `durationMs`, `outcome`.

- [ ] **Step 1: Write failing test**

```typescript
describe('per-integration completion log', () => {
  it('logs info on successful integration completion with key metrics', async () => {
    const { esClient, search, esql } = makeEsClient();
    const { crudClient, entityMetadataClient } = makeClients();
    const logger = loggerMock.create();

    search.mockResolvedValueOnce({ aggregations: { users: { buckets: [] } } });

    await runRelationshipMaintainer({
      esClient,
      logger,
      namespace: 'default',
      crudClient,
      entityMetadataClient,
      integrations: [baseConfig],
      maintainerName: 'communicates_with',
    });

    const infoCalls = logger.info.mock.calls.map((c) => c[0] as string);
    const completionLog = infoCalls.find((msg) =>
      msg.includes('[elastic_defend][communicates_with] Integration complete:')
    );
    expect(completionLog).toBeDefined();
    expect(completionLog).toContain('outcome=');
    expect(completionLog).toContain('slices=');
    expect(completionLog).toContain('records=');
    expect(completionLog).toContain('written=');
    expect(completionLog).toContain('truncated=');
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
node scripts/jest x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/run_relationship_maintainer.test.ts
```

Expected: FAIL — no completion log emitted per integration.

- [ ] **Step 3: Add completion log inside `runRelationshipMaintainer`'s integration loop**

Capture `integrationStartMs` before the `runIntegration` call:

```typescript
const integrationStartMs = Date.now();
```

After the `await runIntegration(...)` call, before the `if (outcome === 'error')` block, emit the completion log. The prefix convention is `[config.id][maintainer-name]` where `maintainer-name` is the top-level maintainer id (e.g. `communicates_with` or `accesses_frequently_and_infrequently`) — pass it into `runRelationshipMaintainer` as an optional `maintainerName?: string` param (defaults to `'relationship_maintainer'`):

```typescript
const durationMs = Date.now() - integrationStartMs;
logger.info(
  `[${config.id}][${maintainerName ?? 'relationship_maintainer'}] Integration complete: ` +
  `outcome=${outcome} slices=${iterations} records=${recordsCount} ` +
  `written=${write.updated} notFound=${write.notFound} errors=${write.errors} ` +
  `truncated=${truncated}`
);
```

Add the union type to `engine/types.ts`:

```typescript
export type RelationshipMaintainerName =
  | 'communicates_with'
  | 'accesses_frequently_and_infrequently'
  | 'administers'
  | 'supervises'
  | 'owns';
```

Add `maintainerName: RelationshipMaintainerName` as a **required** field on the `runRelationshipMaintainer` params object (required, not optional — every caller must declare which maintainer it is so logs are unambiguous).

Update `communicates_with/index.ts` to pass `maintainerName: 'communicates_with'` and `accesses/index.ts` to pass `maintainerName: 'accesses_frequently_and_infrequently'`.

- [ ] **Step 4: Run full engine test suite**

```bash
node scripts/jest x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/
```

Expected: PASS for all tests.

- [ ] **Step 5: Run type check**

```bash
node scripts/type_check --project x-pack/solutions/security/plugins/security_solution/tsconfig.json
```

Expected: no new errors.

- [ ] **Step 6: Run linter on changed files**

```bash
node scripts/eslint --fix \
  x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/types.ts \
  x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/constants.ts \
  x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/build_targets_per_actor_query.ts \
  x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/run_relationship_maintainer.ts \
  x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/communicates_with/configs.ts \
  x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/accesses/configs.ts
```

- [ ] **Step 7: Commit**

```bash
git add x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/run_relationship_maintainer.ts \
  x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/run_relationship_maintainer.test.ts
git commit -m "feat(maintainers): add per-integration completion log with metrics"
```
