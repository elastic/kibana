# Relationship Maintainer — Time-Sliced ES|QL Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 2-step DSL composite agg + ES|QL actor-filter model with a probe→extend→extract→write loop for log-source maintainers, eliminating request timeouts caused by large actor-page filters on CPS clusters.

**Architecture:** Log-source configs (`communicates_with`, `accesses`) use a new runner that probes for actor-bounded time slices, extends the slice boundary to guarantee actor completeness, then runs the extraction query over each bounded slice without any actor filter. Entity-index configs (`administers`, `supervises`, `owns`) keep the existing 2-step model but move writes inside the pagination loop to eliminate memory accumulation.

**Tech Stack:** TypeScript, Elasticsearch ES|QL, `@elastic/elasticsearch` client, `@kbn/entity-store/server`, Jest.

## Global Constraints

- All new files must use `snake_case` filenames.
- No `any` or `unknown` — use explicit types throughout.
- No `@ts-ignore` or `@ts-expect-error` — fix root cause.
- No `eslint-disable` — fix root cause.
- No Painless scripts in write operations.
- Follow existing import style in each file (single quotes, `import type` for type-only imports).
- Run tests with: `node scripts/jest x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine`
- Run type check with: `node scripts/type_check --project x-pack/solutions/security/plugins/security_solution/tsconfig.json`
- All files live under: `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/`

---

## File Map

### New files
- `engine/build_actor_slice_probe_query.ts` — builds the sampled probe ES|QL query that finds the timestamp boundary for a slice
- `engine/build_actor_slice_probe_query.test.ts` — snapshot tests for probe query
- `engine/build_actor_slice_boundary_query.ts` — builds the boundary extension ES|QL query that guarantees actor completeness
- `engine/build_actor_slice_boundary_query.test.ts` — snapshot tests for boundary query
- `engine/run_logs_integration.ts` — probe→extend→extract→write loop for `source: 'logs'` configs
- `engine/run_logs_integration.test.ts` — unit tests for slice loop sequencing

### Modified files
- `engine/types.ts` — add `source: 'logs' | 'entity-index'` and `maxActorsPerSlice?: number`
- `engine/constants.ts` — add `SLICE_SAMPLE_PROBABILITY`
- `engine/build_targets_per_actor_query.ts` — accept `fromDate`/`toDate`, embed time window in `WHERE`, remove DSL filter path for log configs
- `engine/build_targets_per_actor_query.test.ts` — update snapshots for new signature
- `engine/run_relationship_maintainer.ts` — add `source` dispatch; move writes inside entity-index pagination loop
- `engine/run_relationship_maintainer.test.ts` — update tests for dispatch and per-page write
- `communicates_with/configs.ts` — add `source: 'logs'`
- `accesses/configs.ts` — add `source: 'logs'`
- `administers/configs.ts` — add `source: 'entity-index'`
- `supervises/configs.ts` — add `source: 'entity-index'`
- `owns/configs.ts` — add `source: 'entity-index'`

---

## Task 1: Extend Config Types and Constants

**Files:**
- Modify: `engine/types.ts`
- Modify: `engine/constants.ts`

**Interfaces:**
- Produces: `source: 'logs' | 'entity-index'` on `RelationshipIntegrationBase`; `maxActorsPerSlice?: number` on `RelationshipIntegrationBase`; `SLICE_SAMPLE_PROBABILITY = 0.1` from `constants.ts`

- [ ] **Step 1: Add `source` and `maxActorsPerSlice` to `RelationshipIntegrationBase` in `engine/types.ts`**

The `RelationshipIntegrationBase` interface starts around line 97. Add two fields after `id`:

```ts
/**
 * Controls which runner the engine dispatches to.
 * - 'logs': uses the time-sliced probe→extend→extract→write loop
 * - 'entity-index': uses the existing 2-step composite agg + ES|QL model
 */
source: 'logs' | 'entity-index';

/**
 * Target number of distinct actors per time slice for log-source configs.
 * The probe query aims to find a slice containing this many distinct actors.
 * Defaults to COMPOSITE_PAGE_SIZE (3500) if not specified.
 */
maxActorsPerSlice?: number;
```

- [ ] **Step 2: Add `SLICE_SAMPLE_PROBABILITY` to `engine/constants.ts`**

```ts
/** Sampling probability for the actor slice probe query. Reads ~10% of docs to find the slice boundary cheaply. */
export const SLICE_SAMPLE_PROBABILITY = 0.1;
```

- [ ] **Step 3: Add `source` to all config files**

In `communicates_with/configs.ts` — add `source: 'logs'` to every config object in `COMMUNICATES_WITH_INTEGRATION_RELATIONSHIP_CONFIGS`.

In `accesses/configs.ts` — add `source: 'logs'` to every config object in the accesses configs array.

In `administers/configs.ts` — add `source: 'entity-index'` to the config object.

In `supervises/configs.ts` — add `source: 'entity-index'` to every config object.

In `owns/configs.ts` — add `source: 'entity-index'` to every config object.

- [ ] **Step 4: Run type check to confirm no errors**

```bash
node scripts/type_check --project x-pack/solutions/security/plugins/security_solution/tsconfig.json
```

Expected: 0 errors. If TypeScript complains that existing configs are missing `source`, that's expected — fix by adding the field to each config as described in Step 3.

- [ ] **Step 5: Commit**

```bash
git add engine/types.ts engine/constants.ts communicates_with/configs.ts accesses/configs.ts administers/configs.ts supervises/configs.ts owns/configs.ts
git commit -m "feat(maintainers): add source field and SLICE_SAMPLE_PROBABILITY for time-sliced engine"
```

---

## Task 2: Build Probe Query

The probe query finds the timestamp boundary where ~`maxActorsPerSlice` distinct actors fit, using sampling to keep the probe cheap.

**Files:**
- Create: `engine/build_actor_slice_probe_query.ts`
- Create: `engine/build_actor_slice_probe_query.test.ts`

**Interfaces:**
- Consumes: `RelationshipIntegrationConfig` from `./types`; `ESQL_ENGINE_PREAMBLE`, `COMPOSITE_PAGE_SIZE`, `SLICE_SAMPLE_PROBABILITY` from `./constants`; `buildLookbackFilter` from `./build_actor_discovery_query` (for the actorPresence logic — reuse `buildAnyActorFieldNonEmptyEsql` pattern)
- Produces:
  ```ts
  export interface ActorSliceProbeResult {
    sliceBoundary: string | null; // ISO timestamp of the ~Nth actor's first event; null if no actors found
    isLastSlice: boolean;         // true when actorCount < maxActorsPerSlice
  }
  export const buildActorSliceProbeQuery: (
    config: RelationshipIntegrationConfig,
    namespace: string,
    fromDate: string,
  ) => string
  export const parseActorSliceProbeResult: (
    columns: Array<{ name: string; type: string }>,
    values: unknown[][]
  ) => ActorSliceProbeResult
  ```

- [ ] **Step 1: Write the failing snapshot test**

Create `engine/build_actor_slice_probe_query.test.ts`:

```ts
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildActorSliceProbeQuery, parseActorSliceProbeResult } from './build_actor_slice_probe_query';
import type { RelationshipIntegrationConfig } from './types';

const systemAuthConfig: RelationshipIntegrationConfig = {
  source: 'logs',
  kind: 'standard',
  id: 'system_auth',
  name: 'System Auth',
  indexPattern: (ns) => `logs-system.auth-${ns}`,
  relationshipKey: 'communicates_with',
  targetEntityType: 'host',
  customActor: { fields: ['user.email', 'user.name'] },
  esqlWhereClause: 'event.action == "ssh_login" AND event.outcome == "success"',
};

const elasticDefendConfig: RelationshipIntegrationConfig = {
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

describe('buildActorSliceProbeQuery', () => {
  it('builds probe query for standard config with customActor', () => {
    const query = buildActorSliceProbeQuery(systemAuthConfig, 'default', '2026-06-26T00:00:00.000Z');
    expect(query).toMatchInlineSnapshot();
  });

  it('builds probe query for bucketed config with default USER_IDENTITY_FIELDS', () => {
    const query = buildActorSliceProbeQuery(elasticDefendConfig, 'default', '2026-06-26T00:00:00.000Z');
    expect(query).toMatchInlineSnapshot();
  });

  it('respects maxActorsPerSlice when set on config', () => {
    const customConfig: RelationshipIntegrationConfig = {
      ...systemAuthConfig,
      maxActorsPerSlice: 1000,
    };
    const query = buildActorSliceProbeQuery(customConfig, 'default', '2026-06-26T00:00:00.000Z');
    expect(query).toContain('| LIMIT 1000');
  });
});

describe('parseActorSliceProbeResult', () => {
  it('returns isLastSlice=true and sliceBoundary=null when no rows returned', () => {
    const result = parseActorSliceProbeResult(
      [{ name: 'sliceBoundary', type: 'date' }, { name: 'actorCount', type: 'long' }],
      []
    );
    expect(result).toEqual({ sliceBoundary: null, isLastSlice: true });
  });

  it('returns isLastSlice=true when actorCount < COMPOSITE_PAGE_SIZE', () => {
    const result = parseActorSliceProbeResult(
      [{ name: 'sliceBoundary', type: 'date' }, { name: 'actorCount', type: 'long' }],
      [['2026-06-27T00:00:00.000Z', 42]]
    );
    expect(result).toEqual({ sliceBoundary: '2026-06-27T00:00:00.000Z', isLastSlice: true });
  });

  it('returns isLastSlice=false when actorCount == COMPOSITE_PAGE_SIZE', () => {
    const result = parseActorSliceProbeResult(
      [{ name: 'sliceBoundary', type: 'date' }, { name: 'actorCount', type: 'long' }],
      [['2026-06-27T00:00:00.000Z', 3500]]
    );
    expect(result).toEqual({ sliceBoundary: '2026-06-27T00:00:00.000Z', isLastSlice: false });
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
node scripts/jest engine/build_actor_slice_probe_query.test.ts
```

Expected: FAIL — `Cannot find module './build_actor_slice_probe_query'`

- [ ] **Step 3: Implement `engine/build_actor_slice_probe_query.ts`**

```ts
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euid } from '@kbn/entity-store/common/euid_helpers';
import { getFieldEvaluationsEsql } from '@kbn/entity-store/common/domain/euid';

import type { RelationshipIntegrationConfig } from './types';
import { COMPOSITE_PAGE_SIZE, ESQL_ENGINE_PREAMBLE, SLICE_SAMPLE_PROBABILITY } from './constants';

const USER_IDENTITY_FIELDS = euid.esql.getUserIdentityFields();

const buildActorPresenceEsql = (fields: string[]): string =>
  fields.map((f) => `(\`${f}\` IS NOT NULL AND \`${f}\` != "")`).join(' OR ');

const buildActorEuidEsql = (config: RelationshipIntegrationConfig): string => {
  if (config.customActor?.evalOverride) return config.customActor.evalOverride;
  return euid.esql.getActorEuidExpression('user');
};

export interface ActorSliceProbeResult {
  sliceBoundary: string | null;
  isLastSlice: boolean;
}

export const buildActorSliceProbeQuery = (
  config: RelationshipIntegrationConfig,
  namespace: string,
  fromDate: string
): string => {
  const actorFields = config.customActor?.fields ?? USER_IDENTITY_FIELDS;
  const maxActors = config.maxActorsPerSlice ?? COMPOSITE_PAGE_SIZE;
  const index = config.indexPattern(namespace);
  const actorPresence = buildActorPresenceEsql(actorFields);
  const fieldEvals = getFieldEvaluationsEsql(actorFields);
  const actorEuid = buildActorEuidEsql(config);

  const whereClause = config.source === 'logs'
    ? `@timestamp >= "${fromDate}" AND @timestamp < NOW()`
    : '';

  const integrationFilter = 'esqlWhereClause' in config && config.esqlWhereClause
    ? `AND ${config.esqlWhereClause}`
    : '';

  return [
    ESQL_ENGINE_PREAMBLE,
    `FROM ${index}`,
    `| WHERE ${whereClause}`,
    `    ${integrationFilter}`,
    `    AND (${actorPresence})`,
    `| SAMPLE ${SLICE_SAMPLE_PROBABILITY}`,
    `| EVAL ${fieldEvals}`,
    `| EVAL actorUserId = ${actorEuid}`,
    `| WHERE COALESCE(actorUserId, "") != ""`,
    `| STATS _firstEvent = MIN(@timestamp) BY actorUserId`,
    `| SORT _firstEvent ASC`,
    `| LIMIT ${maxActors}`,
    `| STATS sliceBoundary = MAX(_firstEvent), actorCount = COUNT(*)`,
  ].join('\n');
};

export const parseActorSliceProbeResult = (
  columns: Array<{ name: string; type: string }>,
  values: unknown[][]
): ActorSliceProbeResult => {
  if (values.length === 0) {
    return { sliceBoundary: null, isLastSlice: true };
  }

  const colIndex = (name: string) => columns.findIndex((c) => c.name === name);
  const row = values[0] as unknown[];
  const sliceBoundary = row[colIndex('sliceBoundary')] as string | null;
  const actorCount = row[colIndex('actorCount')] as number;

  // Use config's maxActorsPerSlice if available — but parseActorSliceProbeResult
  // doesn't have config access, so callers pass the effective limit separately.
  // isLastSlice is true when fewer actors were found than the limit, meaning
  // the probe did not saturate — no more slices needed.
  return {
    sliceBoundary: sliceBoundary ?? null,
    isLastSlice: actorCount < COMPOSITE_PAGE_SIZE,
  };
};
```

**Note:** `parseActorSliceProbeResult` uses `COMPOSITE_PAGE_SIZE` as the default threshold. The caller (`run_logs_integration.ts`) should pass `config.maxActorsPerSlice ?? COMPOSITE_PAGE_SIZE` as the limit and override the `isLastSlice` check if `maxActorsPerSlice` differs. Adjust the signature in the next step if needed.

- [ ] **Step 4: Update `parseActorSliceProbeResult` to accept the effective limit**

Change the signature to accept `maxActors`:

```ts
export const parseActorSliceProbeResult = (
  columns: Array<{ name: string; type: string }>,
  values: unknown[][],
  maxActors: number
): ActorSliceProbeResult => {
  if (values.length === 0) {
    return { sliceBoundary: null, isLastSlice: true };
  }
  const colIndex = (name: string) => columns.findIndex((c) => c.name === name);
  const row = values[0] as unknown[];
  const sliceBoundary = row[colIndex('sliceBoundary')] as string | null;
  const actorCount = row[colIndex('actorCount')] as number;
  return {
    sliceBoundary: sliceBoundary ?? null,
    isLastSlice: actorCount < maxActors,
  };
};
```

Update the tests accordingly — pass `COMPOSITE_PAGE_SIZE` (3500) as the third argument, and `1000` for the custom test.

- [ ] **Step 5: Run tests and update snapshots**

```bash
node scripts/jest engine/build_actor_slice_probe_query.test.ts --updateSnapshot
```

Expected: All tests PASS. Snapshots written for the two `toMatchInlineSnapshot()` calls.

- [ ] **Step 6: Commit**

```bash
git add engine/build_actor_slice_probe_query.ts engine/build_actor_slice_probe_query.test.ts
git commit -m "feat(maintainers): add actor slice probe query builder"
```

---

## Task 3: Build Boundary Extension Query

After the probe finds `sliceBoundary`, the boundary extension query finds the true last event timestamp for all actors whose first event falls within this slice. This guarantees no actor straddles a boundary.

**Files:**
- Create: `engine/build_actor_slice_boundary_query.ts`
- Create: `engine/build_actor_slice_boundary_query.test.ts`

**Interfaces:**
- Consumes: `RelationshipIntegrationConfig` from `./types`; `ESQL_ENGINE_PREAMBLE` from `./constants`
- Produces:
  ```ts
  export const buildActorSliceBoundaryQuery: (
    config: RelationshipIntegrationConfig,
    namespace: string,
    fromDate: string,
    sliceBoundary: string
  ) => string
  export const parseActorSliceBoundaryResult: (
    columns: Array<{ name: string; type: string }>,
    values: unknown[][]
  ) => string | null  // extendedSliceEnd ISO timestamp, or null if no docs
  ```

- [ ] **Step 1: Write the failing test**

Create `engine/build_actor_slice_boundary_query.test.ts`:

```ts
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildActorSliceBoundaryQuery, parseActorSliceBoundaryResult } from './build_actor_slice_boundary_query';
import type { RelationshipIntegrationConfig } from './types';

const systemAuthConfig: RelationshipIntegrationConfig = {
  source: 'logs',
  kind: 'standard',
  id: 'system_auth',
  name: 'System Auth',
  indexPattern: (ns) => `logs-system.auth-${ns}`,
  relationshipKey: 'communicates_with',
  targetEntityType: 'host',
  customActor: { fields: ['user.email', 'user.name'] },
  esqlWhereClause: 'event.action == "ssh_login" AND event.outcome == "success"',
};

describe('buildActorSliceBoundaryQuery', () => {
  it('builds boundary extension query for standard config', () => {
    const query = buildActorSliceBoundaryQuery(
      systemAuthConfig,
      'default',
      '2026-06-26T00:00:00.000Z',
      '2026-06-27T00:00:00.000Z'
    );
    expect(query).toMatchInlineSnapshot();
  });
});

describe('parseActorSliceBoundaryResult', () => {
  it('returns null when no rows returned', () => {
    const result = parseActorSliceBoundaryResult(
      [{ name: 'extendedSliceEnd', type: 'date' }],
      []
    );
    expect(result).toBeNull();
  });

  it('returns the extendedSliceEnd timestamp from the first row', () => {
    const result = parseActorSliceBoundaryResult(
      [{ name: 'extendedSliceEnd', type: 'date' }],
      [['2026-06-27T23:59:59.999Z']]
    );
    expect(result).toBe('2026-06-27T23:59:59.999Z');
  });

  it('returns null when extendedSliceEnd value is null', () => {
    const result = parseActorSliceBoundaryResult(
      [{ name: 'extendedSliceEnd', type: 'date' }],
      [[null]]
    );
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
node scripts/jest engine/build_actor_slice_boundary_query.test.ts
```

Expected: FAIL — `Cannot find module './build_actor_slice_boundary_query'`

- [ ] **Step 3: Implement `engine/build_actor_slice_boundary_query.ts`**

```ts
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euid } from '@kbn/entity-store/common/euid_helpers';
import { getFieldEvaluationsEsql } from '@kbn/entity-store/common/domain/euid';

import type { RelationshipIntegrationConfig } from './types';
import { ESQL_ENGINE_PREAMBLE } from './constants';

const USER_IDENTITY_FIELDS = euid.esql.getUserIdentityFields();

const buildActorPresenceEsql = (fields: string[]): string =>
  fields.map((f) => `(\`${f}\` IS NOT NULL AND \`${f}\` != "")`).join(' OR ');

const buildActorEuidEsql = (config: RelationshipIntegrationConfig): string => {
  if (config.customActor?.evalOverride) return config.customActor.evalOverride;
  return euid.esql.getActorEuidExpression('user');
};

export const buildActorSliceBoundaryQuery = (
  config: RelationshipIntegrationConfig,
  namespace: string,
  fromDate: string,
  sliceBoundary: string
): string => {
  const actorFields = config.customActor?.fields ?? USER_IDENTITY_FIELDS;
  const index = config.indexPattern(namespace);
  const actorPresence = buildActorPresenceEsql(actorFields);
  const fieldEvals = getFieldEvaluationsEsql(actorFields);
  const actorEuid = buildActorEuidEsql(config);

  const integrationFilter = 'esqlWhereClause' in config && config.esqlWhereClause
    ? `AND ${config.esqlWhereClause}`
    : '';

  return [
    ESQL_ENGINE_PREAMBLE,
    `FROM ${index}`,
    `| WHERE @timestamp >= "${fromDate}" AND @timestamp < NOW()`,
    `    ${integrationFilter}`,
    `    AND (${actorPresence})`,
    `| EVAL ${fieldEvals}`,
    `| EVAL actorUserId = ${actorEuid}`,
    `| WHERE COALESCE(actorUserId, "") != ""`,
    `| STATS _firstEvent = MIN(@timestamp), _lastEvent = MAX(@timestamp) BY actorUserId`,
    `| WHERE _firstEvent <= "${sliceBoundary}"`,
    `| STATS extendedSliceEnd = MAX(_lastEvent)`,
  ].join('\n');
};

export const parseActorSliceBoundaryResult = (
  columns: Array<{ name: string; type: string }>,
  values: unknown[][]
): string | null => {
  if (values.length === 0) return null;
  const colIndex = columns.findIndex((c) => c.name === 'extendedSliceEnd');
  const value = (values[0] as unknown[])[colIndex];
  return typeof value === 'string' ? value : null;
};
```

- [ ] **Step 4: Run tests and update snapshots**

```bash
node scripts/jest engine/build_actor_slice_boundary_query.test.ts --updateSnapshot
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add engine/build_actor_slice_boundary_query.ts engine/build_actor_slice_boundary_query.test.ts
git commit -m "feat(maintainers): add actor slice boundary extension query builder"
```

---

## Task 4: Update Extraction Query to Accept Time Window

Update `buildTargetsPerActorQuery` to accept `fromDate`/`toDate` and embed the time window directly in the `WHERE` clause. Remove the DSL filter path for log configs.

**Files:**
- Modify: `engine/build_targets_per_actor_query.ts`
- Modify: `engine/build_targets_per_actor_query.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export const buildTargetsPerActorQuery: (
    config: RelationshipIntegrationConfig,
    namespace: string,
    timeWindow?: { fromDate: string; toDate: string }
  ) => string
  ```
  When `timeWindow` is provided (log configs), the `@timestamp` range is embedded in `WHERE`. When absent (entity-index configs / override path), behaviour is unchanged.

- [ ] **Step 1: Update `buildTargetsPerActorQuery` signature and embed time window**

In `engine/build_targets_per_actor_query.ts`, update the exported function (currently at lines 126-135):

```ts
export const buildTargetsPerActorQuery = (
  config: RelationshipIntegrationConfig,
  namespace: string,
  timeWindow?: { fromDate: string; toDate: string }
): string => {
  if (config.kind === 'override') {
    return ESQL_ENGINE_PREAMBLE + '\n' + config.esqlQueryOverride(namespace);
  }
  return ESQL_ENGINE_PREAMBLE + '\n' + buildRelationshipEsql(config, namespace, timeWindow);
};
```

Update `buildRelationshipEsql` signature to accept `timeWindow?` and prepend to the `WHERE` clause inside the function. Find the `WHERE` line inside `buildRelationshipEsql` (it currently starts with the `esqlWhereClause` and actor-presence filter). Add the time window filter at the top:

```ts
const timeFilter = timeWindow
  ? `@timestamp >= "${timeWindow.fromDate}" AND @timestamp <= "${timeWindow.toDate}" AND `
  : '';

// Then in the FROM...WHERE block:
`| WHERE ${timeFilter}${config.esqlWhereClause}...`
```

Also remove the `| LIMIT ${COMPOSITE_PAGE_SIZE}` line from the standard/bucketed path — the probe bounds actor count so `LIMIT` is not needed for log configs. Keep `LIMIT` only when `timeWindow` is absent (entity-index path), since those still paginate via composite agg and the ES|QL result can be large.

- [ ] **Step 2: Update existing snapshot tests**

In `engine/build_targets_per_actor_query.test.ts`, all existing calls to `buildTargetsPerActorQuery(config, namespace)` remain valid (no `timeWindow` → entity-index path, unchanged). Add two new tests for the log path:

```ts
it('embeds time window in WHERE clause when timeWindow provided', () => {
  const query = buildTargetsPerActorQuery(
    accessesConfig,  // existing bucketed config in the test file
    'default',
    { fromDate: '2026-06-26T00:00:00.000Z', toDate: '2026-06-27T00:00:00.000Z' }
  );
  expect(query).toContain('@timestamp >= "2026-06-26T00:00:00.000Z"');
  expect(query).toContain('@timestamp <= "2026-06-27T00:00:00.000Z"');
  expect(query).not.toContain('| LIMIT');
});

it('does not embed time window when timeWindow absent (entity-index path)', () => {
  const query = buildTargetsPerActorQuery(accessesConfig, 'default');
  expect(query).not.toContain('@timestamp >=');
  expect(query).toContain('| LIMIT');
});
```

- [ ] **Step 3: Run tests and update snapshots**

```bash
node scripts/jest engine/build_targets_per_actor_query.test.ts --updateSnapshot
```

Expected: All tests PASS.

- [ ] **Step 4: Commit**

```bash
git add engine/build_targets_per_actor_query.ts engine/build_targets_per_actor_query.test.ts
git commit -m "feat(maintainers): embed time window in extraction query for log-source configs"
```

---

## Task 5: Implement Log-Source Runner

New file implementing the probe→extend→extract→write loop for `source: 'logs'` configs.

**Files:**
- Create: `engine/run_logs_integration.ts`
- Create: `engine/run_logs_integration.test.ts`

**Interfaces:**
- Consumes:
  - `buildActorSliceProbeQuery`, `parseActorSliceProbeResult`, `ActorSliceProbeResult` from `./build_actor_slice_probe_query`
  - `buildActorSliceBoundaryQuery`, `parseActorSliceBoundaryResult` from `./build_actor_slice_boundary_query`
  - `buildTargetsPerActorQuery` from `./build_targets_per_actor_query`
  - `parseTargetsPerActorRows` from `./parse_targets_per_actor_rows`
  - `writeEntityIds`, `WriteEntityIdsResult` from `./update_entities`
  - `writeRelationshipMetadatas`, `WriteRelationshipMetadatasResult` from `./write_relationship_metadatas`
  - `RelationshipIntegrationConfig` from `./types`
  - `COMPOSITE_PAGE_SIZE`, `LOOKBACK_WINDOW` from `./constants`
  - `ElasticsearchClient` from `@kbn/core/server`
  - `Logger` from `@kbn/logging`
  - `EntityUpdateClient`, `EntityMetadataClient` from `@kbn/entity-store/server`
- Produces:
  ```ts
  export interface RunLogsIntegrationResult {
    slices: number;
    recordsCount: number;
    write: WriteEntityIdsResult;
    metadata: WriteRelationshipMetadatasResult;
    outcome: 'index_missing' | 'empty' | 'aborted' | 'producing' | 'error';
    truncated: false; // log runner has no MAX_ITERATIONS cap
  }
  export const runLogsIntegration: (
    config: RelationshipIntegrationConfig,
    esClient: ElasticsearchClient,
    logger: Logger,
    namespace: string,
    crudClient: EntityUpdateClient,
    entityMetadataClient: EntityMetadataClient,
    signal: AbortSignal | undefined,
    metadataContext: { scanId: string; observedAt: string }
  ) => Promise<RunLogsIntegrationResult>
  ```

- [ ] **Step 1: Write failing tests**

Create `engine/run_logs_integration.test.ts`:

```ts
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { EntityUpdateClient, EntityMetadataClient } from '@kbn/entity-store/server';
import { loggerMock } from '@kbn/logging-mocks';
import { runLogsIntegration } from './run_logs_integration';
import type { RelationshipIntegrationConfig } from './types';
import { COMPOSITE_PAGE_SIZE } from './constants';

const makeEsClient = () => {
  const esql = jest.fn();
  const esClient = { esql: { query: esql } } as unknown as ElasticsearchClient;
  return { esClient, esql };
};

const makeClients = () => {
  const bulkUpdate = jest.fn().mockResolvedValue([]);
  const bulkAppend = jest.fn().mockImplementation(async (docs: unknown[]) => ({
    successful: docs.length,
    failed: 0,
  }));
  const crudClient = { bulkUpdateEntity: bulkUpdate } as unknown as EntityUpdateClient;
  const entityMetadataClient = { bulkAppendMetadata: bulkAppend } as unknown as EntityMetadataClient;
  return { crudClient, entityMetadataClient, bulkUpdate, bulkAppend };
};

const baseConfig: RelationshipIntegrationConfig = {
  source: 'logs',
  kind: 'standard',
  id: 'system_auth',
  name: 'System Auth',
  indexPattern: (ns) => `logs-system.auth-${ns}`,
  relationshipKey: 'communicates_with',
  targetEntityType: 'host',
  customActor: { fields: ['user.email', 'user.name'] },
  esqlWhereClause: 'event.action == "ssh_login" AND event.outcome == "success"',
};

const probeColumns = [
  { name: 'sliceBoundary', type: 'date' },
  { name: 'actorCount', type: 'long' },
];

const boundaryColumns = [{ name: 'extendedSliceEnd', type: 'date' }];

const extractColumns = [
  { name: 'communicates_with', type: 'keyword' },
  { name: 'actorUserId', type: 'keyword' },
];

describe('runLogsIntegration', () => {
  it('returns empty outcome when probe returns no actors', async () => {
    const { esClient, esql } = makeEsClient();
    const { crudClient, entityMetadataClient } = makeClients();
    const logger = loggerMock.create();

    // Probe returns empty → isLastSlice=true, no actors
    esql.mockResolvedValueOnce({ columns: probeColumns, values: [] });

    const result = await runLogsIntegration(
      baseConfig, esClient, logger, 'default',
      crudClient, entityMetadataClient, undefined,
      { scanId: 'scan-1', observedAt: '2026-07-26T00:00:00.000Z' }
    );

    expect(result.outcome).toBe('empty');
    expect(result.slices).toBe(0);
    expect(esql).toHaveBeenCalledTimes(1); // probe only, no boundary/extract
  });

  it('runs probe → boundary → extract → write for a single slice', async () => {
    const { esClient, esql } = makeEsClient();
    const { crudClient, entityMetadataClient, bulkUpdate } = makeClients();
    const logger = loggerMock.create();

    // Probe: 1 actor found (< COMPOSITE_PAGE_SIZE → isLastSlice=true)
    esql.mockResolvedValueOnce({
      columns: probeColumns,
      values: [['2026-06-27T00:00:00.000Z', 1]],
    });
    // Boundary: extended slice end
    esql.mockResolvedValueOnce({
      columns: boundaryColumns,
      values: [['2026-06-27T12:00:00.000Z']],
    });
    // Extract: one actor with one target
    esql.mockResolvedValueOnce({
      columns: extractColumns,
      values: [['host:server-a', 'user:alice@host-123@local']],
    });

    bulkUpdate.mockResolvedValue([]);

    const result = await runLogsIntegration(
      baseConfig, esClient, logger, 'default',
      crudClient, entityMetadataClient, undefined,
      { scanId: 'scan-1', observedAt: '2026-07-26T00:00:00.000Z' }
    );

    expect(result.outcome).toBe('producing');
    expect(result.slices).toBe(1);
    expect(esql).toHaveBeenCalledTimes(3); // probe + boundary + extract
    expect(bulkUpdate).toHaveBeenCalledTimes(1);
  });

  it('iterates multiple slices when probe is saturated', async () => {
    const { esClient, esql } = makeEsClient();
    const { crudClient, entityMetadataClient } = makeClients();
    const logger = loggerMock.create();

    // Slice 1 probe: saturated (actorCount == COMPOSITE_PAGE_SIZE) → isLastSlice=false
    esql.mockResolvedValueOnce({
      columns: probeColumns,
      values: [['2026-06-27T00:00:00.000Z', COMPOSITE_PAGE_SIZE]],
    });
    // Slice 1 boundary
    esql.mockResolvedValueOnce({
      columns: boundaryColumns,
      values: [['2026-06-27T12:00:00.000Z']],
    });
    // Slice 1 extract: empty result
    esql.mockResolvedValueOnce({ columns: extractColumns, values: [] });

    // Slice 2 probe: not saturated → isLastSlice=true
    esql.mockResolvedValueOnce({
      columns: probeColumns,
      values: [['2026-06-28T00:00:00.000Z', 10]],
    });
    // Slice 2 boundary
    esql.mockResolvedValueOnce({
      columns: boundaryColumns,
      values: [['2026-06-28T12:00:00.000Z']],
    });
    // Slice 2 extract: empty
    esql.mockResolvedValueOnce({ columns: extractColumns, values: [] });

    const result = await runLogsIntegration(
      baseConfig, esClient, logger, 'default',
      crudClient, entityMetadataClient, undefined,
      { scanId: 'scan-1', observedAt: '2026-07-26T00:00:00.000Z' }
    );

    expect(result.slices).toBe(2);
    expect(esql).toHaveBeenCalledTimes(6); // 3 per slice × 2 slices
  });

  it('stops early and returns aborted outcome when signal is aborted', async () => {
    const { esClient, esql } = makeEsClient();
    const { crudClient, entityMetadataClient } = makeClients();
    const logger = loggerMock.create();

    const controller = new AbortController();
    controller.abort();

    const result = await runLogsIntegration(
      baseConfig, esClient, logger, 'default',
      crudClient, entityMetadataClient, controller.signal,
      { scanId: 'scan-1', observedAt: '2026-07-26T00:00:00.000Z' }
    );

    expect(result.outcome).toBe('aborted');
    expect(esql).not.toHaveBeenCalled();
  });

  it('skips boundary query and uses "now" as slice end on last slice', async () => {
    const { esClient, esql } = makeEsClient();
    const { crudClient, entityMetadataClient } = makeClients();
    const logger = loggerMock.create();

    // Probe: 1 actor (< COMPOSITE_PAGE_SIZE → isLastSlice=true)
    esql.mockResolvedValueOnce({
      columns: probeColumns,
      values: [['2026-06-27T00:00:00.000Z', 1]],
    });
    // No boundary call expected — last slice goes to 'now'
    // Extract
    esql.mockResolvedValueOnce({ columns: extractColumns, values: [] });

    await runLogsIntegration(
      baseConfig, esClient, logger, 'default',
      crudClient, entityMetadataClient, undefined,
      { scanId: 'scan-1', observedAt: '2026-07-26T00:00:00.000Z' }
    );

    // Only probe + extract, no boundary
    expect(esql).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
node scripts/jest engine/run_logs_integration.test.ts
```

Expected: FAIL — `Cannot find module './run_logs_integration'`

- [ ] **Step 3: Implement `engine/run_logs_integration.ts`**

```ts
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { EntityUpdateClient, EntityMetadataClient } from '@kbn/entity-store/server';

import type { RelationshipIntegrationConfig } from './types';
import { COMPOSITE_PAGE_SIZE, LOOKBACK_WINDOW } from './constants';
import {
  buildActorSliceProbeQuery,
  parseActorSliceProbeResult,
} from './build_actor_slice_probe_query';
import {
  buildActorSliceBoundaryQuery,
  parseActorSliceBoundaryResult,
} from './build_actor_slice_boundary_query';
import { buildTargetsPerActorQuery } from './build_targets_per_actor_query';
import { parseTargetsPerActorRows } from './parse_targets_per_actor_rows';
import { writeEntityIds, type WriteEntityIdsResult } from './update_entities';
import {
  writeRelationshipMetadatas,
  type WriteRelationshipMetadatasResult,
} from './write_relationship_metadatas';

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : JSON.stringify(err);
}

const ZERO_WRITE: WriteEntityIdsResult = {
  updated: 0,
  notFound: 0,
  errors: 0,
  droppedTargets: 0,
  relationshipTypeApplied: {},
  succeededEntityIds: new Set(),
};

const ZERO_METADATA: WriteRelationshipMetadatasResult = {
  docsAttempted: 0,
  docsApplied: 0,
};

function mergeWriteResult(a: WriteEntityIdsResult, b: WriteEntityIdsResult): WriteEntityIdsResult {
  const relationshipTypeApplied = { ...a.relationshipTypeApplied };
  for (const [key, count] of Object.entries(b.relationshipTypeApplied)) {
    relationshipTypeApplied[key] = (relationshipTypeApplied[key] ?? 0) + count;
  }
  return {
    updated: a.updated + b.updated,
    notFound: a.notFound + b.notFound,
    errors: a.errors + b.errors,
    droppedTargets: a.droppedTargets + b.droppedTargets,
    relationshipTypeApplied,
    validTargetIds: undefined, // not tracked across slices
    succeededEntityIds: new Set([...a.succeededEntityIds, ...b.succeededEntityIds]),
  };
}

function mergeMetadataResult(
  a: WriteRelationshipMetadatasResult,
  b: WriteRelationshipMetadatasResult
): WriteRelationshipMetadatasResult {
  return {
    docsAttempted: a.docsAttempted + b.docsAttempted,
    docsApplied: a.docsApplied + b.docsApplied,
  };
}

export interface RunLogsIntegrationResult {
  slices: number;
  recordsCount: number;
  write: WriteEntityIdsResult;
  metadata: WriteRelationshipMetadatasResult;
  outcome: 'index_missing' | 'empty' | 'aborted' | 'producing' | 'error';
  truncated: false;
}

export const runLogsIntegration = async (
  config: RelationshipIntegrationConfig,
  esClient: ElasticsearchClient,
  logger: Logger,
  namespace: string,
  crudClient: EntityUpdateClient,
  entityMetadataClient: EntityMetadataClient,
  signal: AbortSignal | undefined,
  metadataContext: { scanId: string; observedAt: string }
): Promise<RunLogsIntegrationResult> => {
  const transportOpts = signal ? { signal } : undefined;
  const maxActors = config.maxActorsPerSlice ?? COMPOSITE_PAGE_SIZE;

  let slices = 0;
  let recordsCount = 0;
  let totalWrite = ZERO_WRITE;
  let totalMetadata = ZERO_METADATA;
  let sliceStart = LOOKBACK_WINDOW;

  try {
    while (true) {
      if (signal?.aborted) {
        logger.info(`[${config.id}] Aborted during slice loop`);
        return {
          slices,
          recordsCount,
          write: totalWrite,
          metadata: totalMetadata,
          outcome: slices === 0 ? 'aborted' : 'aborted',
          truncated: false,
        };
      }

      // Step 1: Probe
      const probeQuery = buildActorSliceProbeQuery(config, namespace, sliceStart);
      const probeResponse = await esClient.esql.query({ query: probeQuery }, transportOpts) as {
        columns: Array<{ name: string; type: string }>;
        values: unknown[][];
      };

      const probeResult = parseActorSliceProbeResult(
        probeResponse.columns,
        probeResponse.values,
        maxActors
      );

      if (probeResult.sliceBoundary === null) {
        // No actors found at all
        logger.info(`[${config.id}] No actors found in probe, finishing`);
        return {
          slices,
          recordsCount,
          write: totalWrite,
          metadata: totalMetadata,
          outcome: slices === 0 ? 'empty' : 'producing',
          truncated: false,
        };
      }

      // Step 2: Extend (skip for last slice — use 'now' as boundary)
      let toDate: string;
      if (probeResult.isLastSlice) {
        toDate = new Date().toISOString();
      } else {
        const boundaryQuery = buildActorSliceBoundaryQuery(
          config,
          namespace,
          sliceStart,
          probeResult.sliceBoundary
        );
        const boundaryResponse = await esClient.esql.query(
          { query: boundaryQuery },
          transportOpts
        ) as {
          columns: Array<{ name: string; type: string }>;
          values: unknown[][];
        };
        const extendedEnd = parseActorSliceBoundaryResult(
          boundaryResponse.columns,
          boundaryResponse.values
        );
        toDate = extendedEnd ?? probeResult.sliceBoundary;
      }

      // Step 3: Extract
      const extractQuery = buildTargetsPerActorQuery(config, namespace, {
        fromDate: sliceStart,
        toDate,
      });
      const extractResponse = await esClient.esql.query(
        { query: extractQuery },
        transportOpts
      ) as {
        columns: Array<{ name: string; type: string }>;
        values: unknown[][];
      };

      const pageRecords = parseTargetsPerActorRows(
        extractResponse.columns,
        extractResponse.values,
        config,
        logger
      );
      recordsCount += pageRecords.length;

      // Step 4: Write
      if (pageRecords.length > 0) {
        const write = await writeEntityIds(
          crudClient,
          logger,
          pageRecords,
          esClient,
          namespace,
          config.validateTargetIds
        );
        totalWrite = mergeWriteResult(totalWrite, write);

        const { succeededEntityIds } = write;
        const metadataRecords = pageRecords.filter(
          (r) => r.entityId !== null && succeededEntityIds.has(r.entityId)
        );
        const metadata = await writeRelationshipMetadatas(entityMetadataClient, logger, metadataRecords, {
          scanId: metadataContext.scanId,
          lookbackWindow: LOOKBACK_WINDOW,
          entitySource: config.id,
          observedAt: metadataContext.observedAt,
        });
        totalMetadata = mergeMetadataResult(totalMetadata, metadata);
      }

      slices++;
      logger.info(`[${config.id}] Slice ${slices} complete: ${pageRecords.length} records, toDate=${toDate}`);

      if (probeResult.isLastSlice) break;

      // Advance: +1ms to avoid re-processing the boundary event
      const nextStart = new Date(new Date(toDate).getTime() + 1).toISOString();
      sliceStart = nextStart;
    }

    return {
      slices,
      recordsCount,
      write: totalWrite,
      metadata: totalMetadata,
      outcome: recordsCount === 0 ? 'empty' : 'producing',
      truncated: false,
    };
  } catch (err) {
    logger.error(`[${config.id}] Logs integration failed: ${errMsg(err)}`);
    return {
      slices,
      recordsCount,
      write: totalWrite,
      metadata: totalMetadata,
      outcome: 'error',
      truncated: false,
    };
  }
};
```

- [ ] **Step 4: Run tests**

```bash
node scripts/jest engine/run_logs_integration.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add engine/run_logs_integration.ts engine/run_logs_integration.test.ts
git commit -m "feat(maintainers): add log-source time-sliced integration runner"
```

---

## Task 6: Update Engine Dispatch + Entity-Index Write Per Page

Wire up the new `runLogsIntegration` in `run_relationship_maintainer.ts` and move writes inside the entity-index pagination loop.

**Files:**
- Modify: `engine/run_relationship_maintainer.ts`
- Modify: `engine/run_relationship_maintainer.test.ts`

**Interfaces:**
- Consumes: `runLogsIntegration`, `RunLogsIntegrationResult` from `./run_logs_integration`

- [ ] **Step 1: Add dispatch in `runRelationshipMaintainer`**

In `run_relationship_maintainer.ts`, inside the `for...of integrations` loop, replace the existing `await runIntegration(config, ...)` call with:

```ts
const integrationResult =
  config.source === 'logs'
    ? await runLogsIntegration(
        config,
        esClient,
        logger,
        namespace,
        crudClient,
        entityMetadataClient,
        signal,
        metadataContext
      )
    : await runIntegration(
        config,
        esClient,
        logger,
        namespace,
        crudClient,
        entityMetadataClient,
        signal,
        metadataContext
      );
```

Update the result accumulation below to use `integrationResult` (same fields: `recordsCount`, `write`, `metadata`, `outcome`, `truncated`). The `RunLogsIntegrationResult` has `slices` instead of `iterations` and `buckets` — map `slices` to `iterations` for telemetry, and `recordsCount` to both `buckets` and `records` (slices do not have a separate bucket count).

- [ ] **Step 2: Move writes inside entity-index pagination loop**

In `runIntegration` (the entity-index runner), find the `records` array and the single `writeEntityIds` / `writeRelationshipMetadatas` calls after the `do...while` loop. Move them inside the loop, after `parseTargetsPerActorRows`:

```ts
// Inside the do...while loop, after:
const pageRecords = parseTargetsPerActorRows(columns, values, config, logger);

// Add:
if (pageRecords.length > 0) {
  const pageWrite = await writeEntityIds(
    crudClient, logger, pageRecords, esClient, namespace, config.validateTargetIds
  );
  // Accumulate write results
  write = mergeWriteResult(write, pageWrite);

  const { succeededEntityIds } = pageWrite;
  const metadataRecords = pageRecords.filter(
    (r) => r.entityId !== null && succeededEntityIds.has(r.entityId)
  );
  const pageMeta = await writeRelationshipMetadatas(entityMetadataClient, logger, metadataRecords, {
    scanId: metadataContext.scanId,
    lookbackWindow: config.disableLookbackWindow ? '' : LOOKBACK_WINDOW,
    entitySource: config.id,
    observedAt: metadataContext.observedAt,
  });
  metadata = mergeMetadataResult(metadata, pageMeta);
}
records.push(...pageRecords); // keep for final recordsCount only
```

Remove the `writeEntityIds` and `writeRelationshipMetadatas` calls that currently appear after the loop. Keep the `records` array only for the final `recordsCount` tally — or accumulate `recordsCount` inline and remove `records` entirely.

Import `mergeWriteResult` and `mergeMetadataResult` — extract them to a shared helper file or inline them. Simplest: define them in `run_relationship_maintainer.ts` locally (same pattern as `run_logs_integration.ts`).

- [ ] **Step 3: Update existing tests for dispatch**

In `engine/run_relationship_maintainer.test.ts`, existing tests use configs without `source`. Add `source: 'entity-index'` to all `baseConfig` / test configs to keep them on the entity-index path. Add one new test:

```ts
it('dispatches to runLogsIntegration for source: "logs" configs', async () => {
  const { esClient, esql } = makeEsClient();
  const { crudClient, entityMetadataClient } = makeClients();
  const logger = loggerMock.create();

  const logsConfig: RelationshipIntegrationConfig = {
    source: 'logs',
    kind: 'standard',
    id: 'system_auth',
    name: 'System Auth',
    indexPattern: (ns) => `logs-system.auth-${ns}`,
    relationshipKey: 'communicates_with',
    targetEntityType: 'host',
    esqlWhereClause: 'event.action == "ssh_login"',
  };

  // Probe returns empty → outcome: empty, no further calls
  esql.mockResolvedValueOnce({
    columns: [{ name: 'sliceBoundary', type: 'date' }, { name: 'actorCount', type: 'long' }],
    values: [],
  });

  const result = await runRelationshipMaintainer({
    esClient,
    cpsEsClient: undefined,
    logger,
    namespace: 'default',
    crudClient,
    entityMetadataClient,
    integrations: [logsConfig],
    signal: undefined,
    telemetryCollector: { sources: [], relationshipTypeApplied: {} },
  });

  expect(result.totalBuckets).toBe(0);
  expect(result.totalRecords).toBe(0);
});
```

- [ ] **Step 4: Run all engine tests**

```bash
node scripts/jest x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine
```

Expected: All tests PASS.

- [ ] **Step 5: Run type check**

```bash
node scripts/type_check --project x-pack/solutions/security/plugins/security_solution/tsconfig.json
```

Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add engine/run_relationship_maintainer.ts engine/run_relationship_maintainer.test.ts engine/run_logs_integration.ts
git commit -m "feat(maintainers): wire log-source dispatch and move entity-index writes per page"
```

---

## Self-Review

**Spec coverage check:**

| Spec section | Task |
|---|---|
| Add `source` field to config type | Task 1 |
| Add `maxActorsPerSlice` to config type | Task 1 |
| Add `SLICE_SAMPLE_PROBABILITY` constant | Task 1 |
| Add `source: 'logs'` to communicates_with, accesses configs | Task 1 |
| Add `source: 'entity-index'` to administers, supervises, owns | Task 1 |
| Probe query builder | Task 2 |
| Boundary extension query builder | Task 3 |
| Extraction query: embed time window, remove actor filter, remove LIMIT | Task 4 |
| Log-source runner: probe→extend→extract→write loop | Task 5 |
| Log-source runner: abort handling | Task 5 |
| Log-source runner: last-slice detection | Task 5 |
| Engine dispatch on `source` | Task 6 |
| Entity-index runner: write per page | Task 6 |
| Snapshot tests for probe query | Task 2 |
| Snapshot tests for boundary query | Task 3 |
| Unit tests for log runner sequencing | Task 5 |
| Updated extraction query tests | Task 4 |
| Updated dispatch tests | Task 6 |

All spec sections covered. ✅

**Type consistency check:**

- `parseActorSliceProbeResult` takes `maxActors: number` (Task 2 Step 4) — `run_logs_integration.ts` passes `config.maxActorsPerSlice ?? COMPOSITE_PAGE_SIZE` ✅
- `buildTargetsPerActorQuery` accepts `timeWindow?: { fromDate: string; toDate: string }` (Task 4) — `run_logs_integration.ts` passes it ✅
- `RunLogsIntegrationResult.truncated` is typed `false` — the accumulation in `run_relationship_maintainer.ts` must handle this (the outer loop checks `truncated` for telemetry; `false` is always falsy so no special handling needed) ✅
- `mergeWriteResult` / `mergeMetadataResult` used in both Task 5 and Task 6 — if extracted to a shared helper, import path must be consistent. Simplest: define in each file independently (they are small pure functions). ✅
