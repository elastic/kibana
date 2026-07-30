# Daily-Incremental Log Relationship Maintainer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the full-30-day-recompute log maintainer with a daily-incremental two-phase engine — raw logs aggregated once per day into a plugin-owned daily-aggregates index, then a 30-day rolling merge of those daily docs written per-actor-page to the entity store.

**Architecture:** A single `runLogsIntegration` runs two ES|QL phases: Phase A aggregates raw logs into one doc per `(maintainer, integration, actor, day)` in a new plain index (incremental via a per-integration `lastComputedDay` watermark stored in Task Manager maintainer state); Phase B reads that index over `day >= now-30d`, merge-sums per-target counts `BY actor`, and writes each actor page to the entity store with a plain overwrite (correct because each page carries the actor's complete 30-day target set). Bucketed vs standard differ only at the final projection.

**Tech Stack:** TypeScript, ES|QL, Elasticsearch index templates + ILM, Kibana Task Manager, Jest (`node scripts/jest`).

**Spec:** `docs/superpowers/specs/2026-07-30-daily-incremental-log-maintainer-design.md` (supersedes the bucketed-count-across-slices spec/plan — do not implement those).

## Global Constraints

- Elastic License 2.0 header on every new/modified file (copy from a sibling).
- `snake_case` filenames; `camelCase` functions/vars; `PascalCase` types.
- `import type` for type-only imports; no `any`/`unknown` in public signatures; no non-null assertions; no `@ts-ignore`/`@ts-expect-error`/`eslint-disable`.
- Scope: log-source configs only (`source: 'logs'`). Entity-index configs (`administers`, `owns`) and their path are UNCHANGED.
- Daily-aggregates doc grain: one per `(maintainer, integration, actor, day)`; `_id` = deterministic hash of `maintainer | integration | actor | day`; `maintainer` and `integration` are explicit doc fields.
- Daily-aggregates index is a **plain index + alias + ILM**, NOT a data stream (needs overwrite-by-`_id`).
- Daily doc stores `targetCounts` (`Map<target,count>`) for BOTH kinds (one schema). `standard`/`override` ignore counts at projection.
- Retention: ILM `data_retention: '30d'` + buffer; Phase B ALSO filters `day >= now-30d`.
- Watermark: `lastComputedDay` per `(maintainer, integration)` stored in the maintainer's Task Manager state (the `run` method returns `EntityMaintainerState`; the executor persists it — see `entity_store/.../tasks/entity_maintainers/execution.ts:283,311`). No new saved object.
- Entity write is a plain OVERWRITE via `writeEntityIds` (no server-side array-union, no Painless). Per-page writes.
- Configurable ES|QL `requestTimeout`, default `60_000ms`, on both phases (generalize `EXTRACT_QUERY_TIMEOUT_MS`).
- Bucketed threshold: `count >= threshold` → above, else below.
- Run each package's tests with `node scripts/jest <path-to-test-file>`.
- `scripts/type_check` currently aborts on a pre-existing `alerting`/`@kbn/response-ops-schedule-schema` kbn_references error unrelated to this work — rely on Jest (ts-jest) + `scripts/eslint` for validation; note this in reports.

---

## File Structure

All paths under `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/` unless noted.

New files:
- `daily_aggregates/index_names.ts` — index/alias/template id helpers + `dailyAggregateDocId`.
- `daily_aggregates/index_template.ts` — `putIndexTemplate` config for the daily-aggregates index.
- `daily_aggregates/install.ts` — `installDailyAggregatesIndex` + `ensureDailyAggregatesMappingsOnce`.
- `daily_aggregates/write_daily_aggregates.ts` — `writeDailyAggregates` (upsert daily docs) + `DailyAggregateDoc` type.
- `build_daily_aggregate_query.ts` — Phase A per-day ES|QL builder (`buildDailyAggregateQuery`).
- `build_rolling_totals_query.ts` — Phase B ES|QL builder over the daily index (`buildRollingTotalsQuery`).
- `parse_rolling_totals_rows.ts` — parse Phase B rows → `ActorTargetCounts[]` (full 30d map per actor).
- `day_window.ts` — day math: `daysToCompute`, `dayBounds`, `UTC_DAY_MS`.
- Test siblings for each of the above (`*.test.ts`).

Modified files:
- `constants.ts` — add `DAILY_AGGREGATES_*` constants, `DEFAULT_ESQL_TIMEOUT_MS`, `ROLLING_WINDOW_DAYS = 30`.
- `run_logs_integration.ts` — rewrite to the two-phase daily-incremental flow.
- `run_relationship_maintainer.ts` — pass watermark state in/out; thread completion logging + timeout.
- `columns.ts` — add `targetCounts` column name (Phase A/B contract).
- `communicates_with/configs.ts`, `accesses/configs.ts` — add `localNamespaceFastPath` where applicable (see Task 12) + drop `user.id` bloat already noted in comments.
- `accesses/index.ts`, `communicates_with/index.ts` — read/return watermark state.

Retired (deleted in the final task, after the new path is green):
- `build_actor_slice_probe_query.ts` (+test), `build_actor_slice_boundary_query.ts` (+test) — time-slicing.

---

### Task 1: Day-window math helper

**Files:**
- Create: `engine/day_window.ts`
- Test: `engine/day_window.test.ts`

**Interfaces:**
- Produces:
  - `UTC_DAY_MS: number` (= 86_400_000).
  - `dayKey(date: Date): string` — UTC `YYYY-MM-DD`.
  - `dayBounds(dayKey: string): { gte: string; lt: string }` — ISO bounds `[day, day+1)`.
  - `daysToCompute(lastComputedDay: string | null, today: Date, windowDays: number): string[]` — first run (`null`) → the last `windowDays` day keys ending at `today` (inclusive); else → day keys in `(lastComputedDay, today]` (exclusive of already-computed, inclusive of today). Returns `[]` if `lastComputedDay === dayKey(today)`.

- [ ] **Step 1: Write the failing test**

Create `engine/day_window.test.ts`:

```ts
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { UTC_DAY_MS, dayKey, dayBounds, daysToCompute } from './day_window';

describe('day_window', () => {
  const today = new Date('2026-07-30T09:15:00.000Z');

  it('UTC_DAY_MS is one day', () => {
    expect(UTC_DAY_MS).toBe(86_400_000);
  });

  it('dayKey returns UTC YYYY-MM-DD', () => {
    expect(dayKey(today)).toBe('2026-07-30');
  });

  it('dayBounds returns [day, day+1)', () => {
    expect(dayBounds('2026-07-30')).toEqual({
      gte: '2026-07-30T00:00:00.000Z',
      lt: '2026-07-31T00:00:00.000Z',
    });
  });

  it('first run (null watermark) returns the last N day keys ending today', () => {
    const days = daysToCompute(null, today, 30);
    expect(days).toHaveLength(30);
    expect(days[0]).toBe('2026-07-01');
    expect(days[29]).toBe('2026-07-30');
  });

  it('incremental run returns only days after the watermark through today', () => {
    expect(daysToCompute('2026-07-28', today, 30)).toEqual(['2026-07-29', '2026-07-30']);
  });

  it('returns [] when already computed today', () => {
    expect(daysToCompute('2026-07-30', today, 30)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/jest x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/day_window.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

Create `engine/day_window.ts`:

```ts
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const UTC_DAY_MS = 86_400_000;

export const dayKey = (date: Date): string => date.toISOString().slice(0, 10);

export const dayBounds = (day: string): { gte: string; lt: string } => {
  const gte = `${day}T00:00:00.000Z`;
  const lt = new Date(new Date(gte).getTime() + UTC_DAY_MS).toISOString();
  return { gte, lt };
};

export const daysToCompute = (
  lastComputedDay: string | null,
  today: Date,
  windowDays: number
): string[] => {
  const todayKey = dayKey(today);
  const todayMidnight = new Date(`${todayKey}T00:00:00.000Z`).getTime();

  // First run: the full window ending today (inclusive).
  const startMidnight =
    lastComputedDay === null
      ? todayMidnight - (windowDays - 1) * UTC_DAY_MS
      : new Date(`${lastComputedDay}T00:00:00.000Z`).getTime() + UTC_DAY_MS; // day after watermark

  const days: string[] = [];
  for (let t = startMidnight; t <= todayMidnight; t += UTC_DAY_MS) {
    days.push(dayKey(new Date(t)));
  }
  return days;
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node scripts/jest x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/day_window.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/day_window.ts x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/day_window.test.ts
git commit -m "feat(maintainers): add day-window math helper for daily-incremental engine"
```

---

### Task 2: Constants for daily-aggregates + timeout + window

**Files:**
- Modify: `engine/constants.ts`
- Test: `engine/constants.test.ts` (create)

**Interfaces:**
- Produces (added to `constants.ts`):
  - `ROLLING_WINDOW_DAYS = 30`
  - `DEFAULT_ESQL_TIMEOUT_MS = 60_000`
  - `DAILY_AGGREGATES_MAPPING_VERSION = 1`
  - `DAILY_AGGREGATES_ALIAS = '.entity-analytics.maintainers.daily-aggregates'` (base; namespaced by helper in Task 3)

- [ ] **Step 1: Write the failing test**

Create `engine/constants.test.ts`:

```ts
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  ROLLING_WINDOW_DAYS,
  DEFAULT_ESQL_TIMEOUT_MS,
  DAILY_AGGREGATES_MAPPING_VERSION,
  DAILY_AGGREGATES_ALIAS,
} from './constants';

describe('daily-incremental constants', () => {
  it('rolling window is 30 days', () => expect(ROLLING_WINDOW_DAYS).toBe(30));
  it('default esql timeout is 60s', () => expect(DEFAULT_ESQL_TIMEOUT_MS).toBe(60_000));
  it('mapping version starts at 1', () => expect(DAILY_AGGREGATES_MAPPING_VERSION).toBe(1));
  it('daily aggregates alias base is defined', () =>
    expect(DAILY_AGGREGATES_ALIAS).toBe('.entity-analytics.maintainers.daily-aggregates'));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/jest x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/constants.test.ts`
Expected: FAIL — new constants undefined.

- [ ] **Step 3: Write minimal implementation**

Append to `engine/constants.ts`:

```ts
/** Rolling window (days) over which relationships are computed from daily aggregates. */
export const ROLLING_WINDOW_DAYS = 30;

/** Default per-request ES|QL timeout for both daily-aggregate (Phase A) and rolling-total (Phase B) queries. */
export const DEFAULT_ESQL_TIMEOUT_MS = 60_000;

/** Mapping version stamped in the daily-aggregates index template `_meta`. Bump when the mapping changes. */
export const DAILY_AGGREGATES_MAPPING_VERSION = 1;

/** Base alias for the daily-aggregates index (namespaced by getDailyAggregatesAlias). */
export const DAILY_AGGREGATES_ALIAS = '.entity-analytics.maintainers.daily-aggregates';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node scripts/jest x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/constants.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/constants.ts x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/constants.test.ts
git commit -m "feat(maintainers): add daily-aggregate/timeout/window constants"
```

---

### Task 3: Index-name + doc-id helpers

**Files:**
- Create: `engine/daily_aggregates/index_names.ts`
- Test: `engine/daily_aggregates/index_names.test.ts`

**Interfaces:**
- Consumes: `DAILY_AGGREGATES_ALIAS` (Task 2).
- Produces:
  - `getDailyAggregatesIndexName(namespace: string): string` — `${DAILY_AGGREGATES_ALIAS}-${namespace}-000001`.
  - `getDailyAggregatesAlias(namespace: string): string` — `${DAILY_AGGREGATES_ALIAS}-${namespace}`.
  - `getDailyAggregatesTemplateId(namespace: string): string` — `${DAILY_AGGREGATES_ALIAS}-${namespace}-template`.
  - `dailyAggregateDocId(maintainer: string, integration: string, actor: string, day: string): string` — sha256 hex of `` `${maintainer}|${integration}|${actor}|${day}` ``.

- [ ] **Step 1: Write the failing test**

```ts
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createHash } from 'crypto';
import {
  getDailyAggregatesIndexName,
  getDailyAggregatesAlias,
  getDailyAggregatesTemplateId,
  dailyAggregateDocId,
} from './index_names';

describe('daily aggregates index names', () => {
  it('namespaces the index name with a rollover suffix', () => {
    expect(getDailyAggregatesIndexName('default')).toBe(
      '.entity-analytics.maintainers.daily-aggregates-default-000001'
    );
  });
  it('namespaces the alias', () => {
    expect(getDailyAggregatesAlias('default')).toBe(
      '.entity-analytics.maintainers.daily-aggregates-default'
    );
  });
  it('namespaces the template id', () => {
    expect(getDailyAggregatesTemplateId('default')).toBe(
      '.entity-analytics.maintainers.daily-aggregates-default-template'
    );
  });
  it('doc id is deterministic sha256 of the tuple', () => {
    const expected = createHash('sha256')
      .update('communicates_with|system_auth|user:alice@h1@local|2026-07-30')
      .digest('hex');
    expect(
      dailyAggregateDocId('communicates_with', 'system_auth', 'user:alice@h1@local', '2026-07-30')
    ).toBe(expected);
  });
  it('doc id changes when any component changes', () => {
    const a = dailyAggregateDocId('m', 'i', 'actor', '2026-07-30');
    const b = dailyAggregateDocId('m', 'i', 'actor', '2026-07-31');
    expect(a).not.toBe(b);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/jest x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/daily_aggregates/index_names.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createHash } from 'crypto';
import { DAILY_AGGREGATES_ALIAS } from '../constants';

export const getDailyAggregatesAlias = (namespace: string): string =>
  `${DAILY_AGGREGATES_ALIAS}-${namespace}`;

export const getDailyAggregatesIndexName = (namespace: string): string =>
  `${getDailyAggregatesAlias(namespace)}-000001`;

export const getDailyAggregatesTemplateId = (namespace: string): string =>
  `${getDailyAggregatesAlias(namespace)}-template`;

export const dailyAggregateDocId = (
  maintainer: string,
  integration: string,
  actor: string,
  day: string
): string =>
  createHash('sha256').update(`${maintainer}|${integration}|${actor}|${day}`).digest('hex');
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node scripts/jest x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/daily_aggregates/index_names.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/daily_aggregates/index_names.ts x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/daily_aggregates/index_names.test.ts
git commit -m "feat(maintainers): add daily-aggregates index-name and doc-id helpers"
```

---

### Task 4: Index template config

**Files:**
- Create: `engine/daily_aggregates/index_template.ts`
- Test: `engine/daily_aggregates/index_template.test.ts`

**Interfaces:**
- Consumes: `getDailyAggregatesTemplateId`, `getDailyAggregatesIndexName`, `getDailyAggregatesAlias` (Task 3); `DAILY_AGGREGATES_MAPPING_VERSION`, `ROLLING_WINDOW_DAYS` (Task 2).
- Produces: `getDailyAggregatesIndexTemplate(namespace: string): IndicesPutIndexTemplateRequest`. Plain-index template (NOT a data stream): `index_patterns: [getDailyAggregatesIndexName(namespace)]`, `priority: 200`, explicit mappings (`maintainer`/`integration`/`actor`/`day` keyword, `@timestamp` date, `targetCounts` flattened), `template.aliases` with the namespaced alias, ILM `lifecycle.data_retention: '35d'` (30 + 5 buffer), `settings.index.codec: 'best_compression'`. No `data_stream: {}` key.

- [ ] **Step 1: Write the failing test**

```ts
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getDailyAggregatesIndexTemplate } from './index_template';

describe('getDailyAggregatesIndexTemplate', () => {
  const tpl = getDailyAggregatesIndexTemplate('default');

  it('is a plain-index template (no data_stream key)', () => {
    expect(tpl).not.toHaveProperty('data_stream');
  });
  it('matches the namespaced concrete index', () => {
    expect(tpl.index_patterns).toEqual([
      '.entity-analytics.maintainers.daily-aggregates-default-000001',
    ]);
  });
  it('declares the namespaced alias', () => {
    expect(tpl.template?.aliases).toHaveProperty(
      '.entity-analytics.maintainers.daily-aggregates-default'
    );
  });
  it('keys the grain fields as keyword and @timestamp as date', () => {
    const props = tpl.template?.mappings?.properties as Record<string, { type: string }>;
    expect(props.maintainer.type).toBe('keyword');
    expect(props.integration.type).toBe('keyword');
    expect(props.actor.type).toBe('keyword');
    expect(props.day.type).toBe('keyword');
    expect(props['@timestamp'].type).toBe('date');
    expect(props.targetCounts.type).toBe('flattened');
  });
  it('sets retention beyond the 30-day window as a buffer', () => {
    expect(tpl.template?.lifecycle?.data_retention).toBe('35d');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/jest x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/daily_aggregates/index_template.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IndicesPutIndexTemplateRequest } from '@elastic/elasticsearch/lib/api/types';
import { DAILY_AGGREGATES_MAPPING_VERSION } from '../constants';
import {
  getDailyAggregatesTemplateId,
  getDailyAggregatesIndexName,
  getDailyAggregatesAlias,
} from './index_names';

// 30-day rolling window + 5-day buffer so late day-recomputes and Phase B's
// `day >= now-30d` filter never race retention.
const DATA_RETENTION = '35d';

export const getDailyAggregatesIndexTemplate = (
  namespace: string
): IndicesPutIndexTemplateRequest => ({
  name: getDailyAggregatesTemplateId(namespace),
  _meta: {
    description: 'Relationship maintainer per-day (maintainer, integration, actor) access counts.',
    managed: true,
    mappingsVersion: DAILY_AGGREGATES_MAPPING_VERSION,
  },
  index_patterns: [getDailyAggregatesIndexName(namespace)],
  priority: 200,
  template: {
    aliases: { [getDailyAggregatesAlias(namespace)]: {} },
    lifecycle: { data_retention: DATA_RETENTION },
    settings: { index: { codec: 'best_compression' } },
    mappings: {
      _meta: { mappingsVersion: DAILY_AGGREGATES_MAPPING_VERSION },
      dynamic: false,
      properties: {
        maintainer: { type: 'keyword' },
        integration: { type: 'keyword' },
        actor: { type: 'keyword' },
        day: { type: 'keyword' },
        '@timestamp': { type: 'date' },
        targetCounts: { type: 'flattened' },
      },
    },
  },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node scripts/jest x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/daily_aggregates/index_template.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/daily_aggregates/index_template.ts x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/daily_aggregates/index_template.test.ts
git commit -m "feat(maintainers): add daily-aggregates plain-index template"
```

---

### Task 5: Index install + mappings-once

**Files:**
- Create: `engine/daily_aggregates/install.ts`
- Test: `engine/daily_aggregates/install.test.ts`

**Interfaces:**
- Consumes: `getDailyAggregatesIndexTemplate` (Task 4); `getDailyAggregatesTemplateId`, `getDailyAggregatesIndexName`, `getDailyAggregatesAlias` (Task 3).
- Produces:
  - `installDailyAggregatesIndex(esClient, namespace, logger): Promise<void>` — `putIndexTemplate` then `indices.create` (swallow `resource_already_exists_exception`) with the alias. Idempotent.
  - `ensureDailyAggregatesMappingsOnce(esClient, namespace, logger): Promise<void>` — memoized per (esClient, namespace) `indices.putMapping` of the mapping properties (in-place field additions without reinstall). Mirrors entity_store's `ensure…MappingsOnce`.

- [ ] **Step 1: Write the failing test**

```ts
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { installDailyAggregatesIndex } from './install';

const createEs = () => elasticsearchServiceMock.createElasticsearchClient();
const logger = loggingSystemMock.createLogger();

describe('installDailyAggregatesIndex', () => {
  it('puts the template then creates the index with the alias', async () => {
    const es = createEs();
    await installDailyAggregatesIndex(es, 'default', logger);
    expect(es.indices.putIndexTemplate).toHaveBeenCalledTimes(1);
    expect(es.indices.create).toHaveBeenCalledTimes(1);
    const createArg = (es.indices.create as jest.Mock).mock.calls[0][0];
    expect(createArg.index).toBe('.entity-analytics.maintainers.daily-aggregates-default-000001');
  });

  it('swallows resource_already_exists_exception on create', async () => {
    const es = createEs();
    (es.indices.create as jest.Mock).mockRejectedValueOnce({
      meta: { body: { error: { type: 'resource_already_exists_exception' } } },
    });
    await expect(installDailyAggregatesIndex(es, 'default', logger)).resolves.toBeUndefined();
  });

  it('rethrows other create errors', async () => {
    const es = createEs();
    (es.indices.create as jest.Mock).mockRejectedValueOnce({
      meta: { body: { error: { type: 'illegal_argument_exception' } } },
    });
    await expect(installDailyAggregatesIndex(es, 'default', logger)).rejects.toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/jest x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/daily_aggregates/install.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { getDailyAggregatesIndexTemplate } from './index_template';
import { getDailyAggregatesIndexName, getDailyAggregatesAlias } from './index_names';

const isAlreadyExists = (err: unknown): boolean =>
  (err as { meta?: { body?: { error?: { type?: string } } } })?.meta?.body?.error?.type ===
  'resource_already_exists_exception';

export const installDailyAggregatesIndex = async (
  esClient: ElasticsearchClient,
  namespace: string,
  logger: Logger
): Promise<void> => {
  await esClient.indices.putIndexTemplate(getDailyAggregatesIndexTemplate(namespace));
  try {
    await esClient.indices.create({
      index: getDailyAggregatesIndexName(namespace),
      aliases: { [getDailyAggregatesAlias(namespace)]: {} },
    });
  } catch (err) {
    if (!isAlreadyExists(err)) {
      logger.error(`[daily-aggregates] failed to create index: ${JSON.stringify(err)}`);
      throw err;
    }
  }
};

const ensuredMappings = new WeakMap<ElasticsearchClient, Set<string>>();

export const ensureDailyAggregatesMappingsOnce = async (
  esClient: ElasticsearchClient,
  namespace: string,
  logger: Logger
): Promise<void> => {
  let ns = ensuredMappings.get(esClient);
  if (!ns) {
    ns = new Set();
    ensuredMappings.set(esClient, ns);
  }
  if (ns.has(namespace)) return;

  const { template } = getDailyAggregatesIndexTemplate(namespace);
  await esClient.indices.putMapping({
    index: getDailyAggregatesAlias(namespace),
    properties: template?.mappings?.properties,
  });
  ns.add(namespace);
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node scripts/jest x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/daily_aggregates/install.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/daily_aggregates/install.ts x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/daily_aggregates/install.test.ts
git commit -m "feat(maintainers): install daily-aggregates index (idempotent + mappings-once)"
```

---

### Task 6: Daily-aggregate doc writer

**Files:**
- Create: `engine/daily_aggregates/write_daily_aggregates.ts`
- Test: `engine/daily_aggregates/write_daily_aggregates.test.ts`

**Interfaces:**
- Consumes: `dailyAggregateDocId`, `getDailyAggregatesAlias` (Task 3); `dayBounds` (Task 1); `ensureDailyAggregatesMappingsOnce` (Task 5).
- Produces:
  - `interface DailyAggregateDoc { maintainer: string; integration: string; actor: string; day: string; '@timestamp': string; targetCounts: Record<string, number>; }`
  - `interface DailyAggregateInput { actor: string; targetCounts: Record<string, number>; }`
  - `writeDailyAggregates(esClient, logger, params: { namespace: string; maintainer: string; integration: string; day: string; rows: DailyAggregateInput[] }): Promise<{ written: number; errors: number }>` — bulk `index` op with deterministic `_id` (overwrite) into the alias. Skips empty `rows`. Calls `ensureDailyAggregatesMappingsOnce` before writing.

- [ ] **Step 1: Write the failing test**

```ts
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { createHash } from 'crypto';
import { writeDailyAggregates } from './write_daily_aggregates';

const logger = loggingSystemMock.createLogger();
const createEs = () => {
  const es = elasticsearchServiceMock.createElasticsearchClient();
  (es.bulk as jest.Mock).mockResolvedValue({ errors: false, items: [] });
  return es;
};

describe('writeDailyAggregates', () => {
  it('bulk-indexes one doc per actor with a deterministic _id (overwrite)', async () => {
    const es = createEs();
    const res = await writeDailyAggregates(es, logger, {
      namespace: 'default',
      maintainer: 'communicates_with',
      integration: 'system_auth',
      day: '2026-07-30',
      rows: [{ actor: 'user:alice@h1@local', targetCounts: { 'host:h1': 3 } }],
    });
    expect(res.written).toBe(1);
    const ops = (es.bulk as jest.Mock).mock.calls[0][0].operations;
    const expectedId = createHash('sha256')
      .update('communicates_with|system_auth|user:alice@h1@local|2026-07-30')
      .digest('hex');
    expect(ops[0]).toEqual({ index: { _id: expectedId } });
    expect(ops[1]).toMatchObject({
      maintainer: 'communicates_with',
      integration: 'system_auth',
      actor: 'user:alice@h1@local',
      day: '2026-07-30',
      targetCounts: { 'host:h1': 3 },
    });
  });

  it('returns early for empty rows without calling bulk', async () => {
    const es = createEs();
    const res = await writeDailyAggregates(es, logger, {
      namespace: 'default',
      maintainer: 'm',
      integration: 'i',
      day: '2026-07-30',
      rows: [],
    });
    expect(res).toEqual({ written: 0, errors: 0 });
    expect(es.bulk).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/jest x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/daily_aggregates/write_daily_aggregates.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { dailyAggregateDocId, getDailyAggregatesAlias } from './index_names';
import { dayBounds } from '../day_window';
import { ensureDailyAggregatesMappingsOnce } from './install';

export interface DailyAggregateInput {
  actor: string;
  targetCounts: Record<string, number>;
}

export interface DailyAggregateDoc {
  maintainer: string;
  integration: string;
  actor: string;
  day: string;
  '@timestamp': string;
  targetCounts: Record<string, number>;
}

export const writeDailyAggregates = async (
  esClient: ElasticsearchClient,
  logger: Logger,
  params: {
    namespace: string;
    maintainer: string;
    integration: string;
    day: string;
    rows: DailyAggregateInput[];
  }
): Promise<{ written: number; errors: number }> => {
  const { namespace, maintainer, integration, day, rows } = params;
  if (rows.length === 0) return { written: 0, errors: 0 };

  await ensureDailyAggregatesMappingsOnce(esClient, namespace, logger);

  const timestamp = dayBounds(day).gte;
  const operations = rows.flatMap((row) => {
    const doc: DailyAggregateDoc = {
      maintainer,
      integration,
      actor: row.actor,
      day,
      '@timestamp': timestamp,
      targetCounts: row.targetCounts,
    };
    return [{ index: { _id: dailyAggregateDocId(maintainer, integration, row.actor, day) } }, doc];
  });

  const resp = await esClient.bulk({ index: getDailyAggregatesAlias(namespace), operations });
  const errorItems = resp.errors
    ? (resp.items ?? []).filter((i) => i.index?.error != null)
    : [];
  if (errorItems.length > 0) {
    logger.error(`[daily-aggregates] ${errorItems.length} bulk errors writing day ${day}`);
  }
  return { written: rows.length - errorItems.length, errors: errorItems.length };
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node scripts/jest x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/daily_aggregates/write_daily_aggregates.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/daily_aggregates/write_daily_aggregates.ts x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/daily_aggregates/write_daily_aggregates.test.ts
git commit -m "feat(maintainers): add daily-aggregate doc writer (deterministic-id overwrite)"
```

---

### Task 7: Phase A query builder (raw logs → per-day counts)

**Files:**
- Create: `engine/build_daily_aggregate_query.ts`
- Test: `engine/build_daily_aggregate_query.test.ts`

**Interfaces:**
- Consumes: `RelationshipIntegrationConfig` (`engine/types.ts`); the existing actor/target EVAL helpers used by `build_targets_per_actor_query.ts`; `dayBounds` (Task 1); `ENGINE_COLUMNS` (`columns.ts`); `COMPOSITE_PAGE_SIZE` (`constants.ts`).
- Produces: `buildDailyAggregateQuery(config, namespace, day): string` — ES|QL over raw logs for `[day, day+1)` emitting one row per `(actor, target, count)`:
  ```
  <PREAMBLE>
  FROM <indexPattern>
  | WHERE @timestamp >= "<gte>" AND @timestamp < "<lt>" AND <config filters + actor/target gates>
  | EVAL <actor EVAL>
  | WHERE COALESCE(actorUserId,"") != ""
  | EVAL <target EVAL>
  | MV_EXPAND targetEntityId
  | WHERE COALESCE(targetEntityId,"") != ""
  | STATS access_count = COUNT(*) BY actorUserId, targetEntityId
  | LIMIT COMPOSITE_PAGE_SIZE
  ```
  For `kind: 'override'`, wrap the override body (which emits `actorUserId` + target column) with the `STATS access_count = COUNT(*) BY actorUserId, targetEntityId` and the day-window filter. Reuse the actor/target EVAL construction already in `build_targets_per_actor_query.ts` — extract the shared EVAL fragment into a helper imported by both if it reduces duplication; otherwise duplicate the fragment with a comment. (Do NOT change `build_targets_per_actor_query.ts` behavior in this task.)

- [ ] **Step 1: Write the failing test**

Model the fixtures on `build_targets_per_actor_query.test.ts` (same `accessesConfig`/`commConfig` shapes). Assert:

```ts
it('filters to the single day window', () => {
  const q = buildDailyAggregateQuery(commConfig, 'default', '2026-07-30');
  expect(q).toContain('@timestamp >= "2026-07-30T00:00:00.000Z"');
  expect(q).toContain('@timestamp < "2026-07-31T00:00:00.000Z"');
});

it('emits per-(actor,target) counts', () => {
  const q = buildDailyAggregateQuery(commConfig, 'default', '2026-07-30');
  expect(q).toContain('STATS access_count = COUNT(*) BY actorUserId, targetEntityId');
});

it('includes the integration esqlWhereClause', () => {
  expect(buildDailyAggregateQuery(commConfig, 'default', '2026-07-30')).toContain(
    'event.action == "ssh_login"'
  );
});

it('caps rows with the composite page limit', () => {
  expect(buildDailyAggregateQuery(commConfig, 'default', '2026-07-30')).toContain('| LIMIT');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/jest x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/build_daily_aggregate_query.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

Implement `buildDailyAggregateQuery` per the Interfaces block, reusing the actor/target EVAL and preamble from `build_targets_per_actor_query.ts`. Use `dayBounds(day)` for the window. Emit `STATS access_count = COUNT(*) BY actorUserId, targetEntityId` then `| LIMIT ${COMPOSITE_PAGE_SIZE}`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node scripts/jest x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/build_daily_aggregate_query.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/build_daily_aggregate_query.ts x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/build_daily_aggregate_query.test.ts
git commit -m "feat(maintainers): add Phase A per-day aggregate ESQL builder"
```

---

### Task 8: Phase A row parser (count rows → DailyAggregateInput[])

**Files:**
- Create: `engine/parse_daily_aggregate_rows.ts` (or add to `parse_targets_per_actor_rows.ts` — keep separate for clarity)
- Test: `engine/parse_daily_aggregate_rows.test.ts`

**Interfaces:**
- Consumes: `ENGINE_COLUMNS` (`columns.ts`); `DailyAggregateInput` (Task 6).
- Produces: `parseDailyAggregateRows(columns, values, logger): DailyAggregateInput[]` — input rows are `(actorUserId, targetEntityId, access_count)`. Groups by actor into `{ actor, targetCounts: { [target]: count } }`. Multiple rows for the same actor merge into one entry (sum if a (actor,target) appears twice within a day — shouldn't, but be safe). Skips rows with null actor/target or non-integer count (debug log).

- [ ] **Step 1: Write the failing test**

```ts
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { parseDailyAggregateRows } from './parse_daily_aggregate_rows';

const logger = loggingSystemMock.createLogger();
const columns = [
  { name: 'actorUserId', type: 'keyword' },
  { name: 'targetEntityId', type: 'keyword' },
  { name: 'access_count', type: 'long' },
];

describe('parseDailyAggregateRows', () => {
  it('groups (actor,target,count) rows by actor into a targetCounts map', () => {
    const rows = parseDailyAggregateRows(
      columns,
      [
        ['user:alice@h1@local', 'host:h1', 3],
        ['user:alice@h1@local', 'host:h2', 1],
        ['user:bob@h2@local', 'host:h2', 5],
      ],
      logger
    );
    expect(rows).toEqual([
      { actor: 'user:alice@h1@local', targetCounts: { 'host:h1': 3, 'host:h2': 1 } },
      { actor: 'user:bob@h2@local', targetCounts: { 'host:h2': 5 } },
    ]);
  });

  it('skips rows with null actor or target', () => {
    const rows = parseDailyAggregateRows(
      columns,
      [
        [null, 'host:h1', 3],
        ['user:alice@h1@local', null, 3],
        ['user:alice@h1@local', 'host:h1', 2],
      ],
      logger
    );
    expect(rows).toEqual([{ actor: 'user:alice@h1@local', targetCounts: { 'host:h1': 2 } }]);
  });

  it('returns [] for empty values', () => {
    expect(parseDailyAggregateRows(columns, [], logger)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/jest x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/parse_daily_aggregate_rows.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

Implement grouping-by-actor with a `Map<string, Record<string, number>>`, summing counts per target, skipping null actor/target and non-integer counts. Return entries in first-seen actor order.

- [ ] **Step 4: Run test to verify it passes**

Run: `node scripts/jest x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/parse_daily_aggregate_rows.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/parse_daily_aggregate_rows.ts x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/parse_daily_aggregate_rows.test.ts
git commit -m "feat(maintainers): add Phase A daily-aggregate row parser"
```

---

### Task 9: Phase B query builder (daily index → 30d rolling totals)

**Files:**
- Create: `engine/build_rolling_totals_query.ts`
- Test: `engine/build_rolling_totals_query.test.ts`

**Interfaces:**
- Consumes: `getDailyAggregatesAlias` (Task 3); `ROLLING_WINDOW_DAYS` (Task 2); `ESQL_ENGINE_PREAMBLE`, `COMPOSITE_PAGE_SIZE` (`constants.ts`).
- Produces: `buildRollingTotalsQuery(params: { namespace: string; maintainer: string; integration: string; nowMs: number }): string`. Reads the daily index, filters `maintainer`/`integration`/`day >= now-30d`, and produces one row per actor carrying the actor's full 30-day `target → summed count`. Binding contract: columns `actorUserId` + `targetCounts` where each `targetCounts` entry is `"<target>|<summed count>"` (reuse the Phase-B parser from Task 10). Recommended shape:
  ```
  <PREAMBLE>
  FROM <daily-aggregates-alias>
  | WHERE maintainer == "<M>" AND integration == "<I>" AND day >= "<now-30d day>"
  | MV_EXPAND targetCountsEntries            // if stored as array of "target|count"
  ...
  | STATS total = SUM(count) BY actor, target
  | EVAL _pair = CONCAT(target, "|", TO_STRING(total))
  | STATS targetCounts = VALUES(_pair) BY actor
  | RENAME actor AS actorUserId
  | LIMIT COMPOSITE_PAGE_SIZE
  ```
  NOTE: `targetCounts` is stored as a `flattened` object (Task 4). If ES|QL cannot iterate flattened object keys directly, Phase A (Task 11 wiring) must ALSO store a parallel `targetCountPairs` keyword array of `"target|count"` strings for Phase B to `MV_EXPAND`. Decide during this task by testing an ES|QL shape against the flattened field; if unsupported, add `targetCountPairs: { type: 'keyword' }` to the Task 4 mapping and write it in Task 6/11. Record the decision in the task report. The builder's OUTPUT contract (columns `actorUserId` + `targetCounts` array of `"target|total"`) is fixed regardless.

- [ ] **Step 1: Write the failing test**

```ts
it('filters by maintainer, integration and the 30-day window', () => {
  const q = buildRollingTotalsQuery({
    namespace: 'default',
    maintainer: 'communicates_with',
    integration: 'system_auth',
    nowMs: Date.parse('2026-07-30T00:00:00.000Z'),
  });
  expect(q).toContain('maintainer == "communicates_with"');
  expect(q).toContain('integration == "system_auth"');
  expect(q).toContain('day >= "2026-06-30"'); // now - 30d
  expect(q).toContain('.entity-analytics.maintainers.daily-aggregates-default');
});

it('sums per target across days and collapses to one row per actor', () => {
  const q = buildRollingTotalsQuery({
    namespace: 'default',
    maintainer: 'm',
    integration: 'i',
    nowMs: Date.parse('2026-07-30T00:00:00.000Z'),
  });
  expect(q).toContain('SUM(');
  expect(q).toContain('BY actorUserId');
  expect(q).toContain('| LIMIT');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/jest x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/build_rolling_totals_query.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

Implement per the Interfaces block. Compute the window-start day key = `dayKey(new Date(nowMs - ROLLING_WINDOW_DAYS*UTC_DAY_MS))`. Emit the SUM-BY-actor-target then collapse-to-actor pipeline producing `actorUserId` + `targetCounts` (array of `"target|total"`), `| LIMIT COMPOSITE_PAGE_SIZE`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node scripts/jest x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/build_rolling_totals_query.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/build_rolling_totals_query.ts x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/build_rolling_totals_query.test.ts
git commit -m "feat(maintainers): add Phase B rolling-totals ESQL builder"
```

---

### Task 10: Phase B row parser (rolling totals → ActorTargetCounts[])

**Files:**
- Create: `engine/parse_rolling_totals_rows.ts`
- Test: `engine/parse_rolling_totals_rows.test.ts`

**Interfaces:**
- Consumes: `ENGINE_COLUMNS` (`columns.ts`); `entityTypeFromEuid` (`engine/types.ts`).
- Produces:
  - `interface ActorTargetCounts { entityId: string | null; entityType: 'user' | 'host' | 'service'; targetCounts: Map<string, number>; }`
  - `parseRollingTotalsRows(columns, values, logger): ActorTargetCounts[]` — reads `actorUserId` + `targetCounts` (array of `"target|total"`), split on the LAST `|`, parse integer; malformed entries skipped with a debug log; empty → `[]`. (Same parsing idiom as the superseded `parseBucketedCountRows`, reused here.)

- [ ] **Step 1: Write the failing test**

```ts
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { parseRollingTotalsRows } from './parse_rolling_totals_rows';

const logger = loggingSystemMock.createLogger();
const columns = [
  { name: 'actorUserId', type: 'keyword' },
  { name: 'targetCounts', type: 'keyword' },
];

describe('parseRollingTotalsRows', () => {
  it('parses "<target>|<total>" into a Map', () => {
    const rows = parseRollingTotalsRows(
      columns,
      [['user:alice@h1@local', ['host:h1|5', 'host:h2|1']]],
      logger
    );
    expect(rows[0].entityId).toBe('user:alice@h1@local');
    expect(rows[0].entityType).toBe('user');
    expect(rows[0].targetCounts.get('host:h1')).toBe(5);
    expect(rows[0].targetCounts.get('host:h2')).toBe(1);
  });

  it('splits on the last pipe (target may contain |)', () => {
    const rows = parseRollingTotalsRows(columns, [['user:x@h@local', ['host:a|b|7']]], logger);
    expect(rows[0].targetCounts.get('host:a|b')).toBe(7);
  });

  it('skips malformed entries, keeps valid ones', () => {
    const rows = parseRollingTotalsRows(
      columns,
      [['user:x@h@local', ['host:a|4', 'nopipe', 'host:b|xyz']]],
      logger
    );
    expect(rows[0].targetCounts.get('host:a')).toBe(4);
    expect(rows[0].targetCounts.size).toBe(1);
  });

  it('returns [] for empty values', () => {
    expect(parseRollingTotalsRows(columns, [], logger)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/jest x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/parse_rolling_totals_rows.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

Implement per the Interfaces block (last-`|` split, integer parse, skip malformed).

- [ ] **Step 4: Run test to verify it passes**

Run: `node scripts/jest x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/parse_rolling_totals_rows.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/parse_rolling_totals_rows.ts x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/parse_rolling_totals_rows.test.ts
git commit -m "feat(maintainers): add Phase B rolling-totals row parser"
```

---

### Task 11: Projection helper (ActorTargetCounts → EntityRelationshipRecord)

**Files:**
- Create: `engine/project_relationship_records.ts`
- Test: `engine/project_relationship_records.test.ts`

**Interfaces:**
- Consumes: `ActorTargetCounts` (Task 10); `EntityRelationshipRecord`, `RelationshipIntegrationConfig` (`engine/types.ts`).
- Produces: `projectRelationshipRecords(actors: ActorTargetCounts[], config): EntityRelationshipRecord[]` — the single kind-branch:
  - `bucketed`: split each actor's targets by `count >= config.bucketTargetByThreshold.threshold` into `{ [above]: [...], [below]: [...] }` (both keys always present).
  - `standard`/`override`: `{ [config.relationshipKey]: [all targets] }` (counts ignored).
  Actors with `entityId === null` are dropped.

- [ ] **Step 1: Write the failing test**

```ts
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { projectRelationshipRecords } from './project_relationship_records';
import type { ActorTargetCounts } from './parse_rolling_totals_rows';

const actors: ActorTargetCounts[] = [
  {
    entityId: 'user:alice@h1@local',
    entityType: 'user',
    targetCounts: new Map([['host:h1', 5], ['host:h2', 2]]),
  },
];

describe('projectRelationshipRecords', () => {
  it('bucketed: splits targets at threshold into two keys (both present)', () => {
    const recs = projectRelationshipRecords(actors, {
      kind: 'bucketed',
      bucketTargetByThreshold: {
        threshold: 4,
        aboveThresholdRelationship: 'accesses_frequently',
        belowThresholdRelationship: 'accesses_infrequently',
      },
    } as never);
    expect(recs[0].relationships.accesses_frequently).toEqual(['host:h1']);
    expect(recs[0].relationships.accesses_infrequently).toEqual(['host:h2']);
  });

  it('standard: collapses to a single relationship key, counts ignored', () => {
    const recs = projectRelationshipRecords(actors, {
      kind: 'standard',
      relationshipKey: 'communicates_with',
    } as never);
    expect(recs[0].relationships.communicates_with.sort()).toEqual(['host:h1', 'host:h2']);
  });

  it('drops actors with null entityId', () => {
    const recs = projectRelationshipRecords(
      [{ entityId: null, entityType: 'user', targetCounts: new Map([['host:h1', 9]]) }],
      { kind: 'standard', relationshipKey: 'communicates_with' } as never
    );
    expect(recs).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/jest x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/project_relationship_records.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

Implement the kind-branch per the Interfaces block.

- [ ] **Step 4: Run test to verify it passes**

Run: `node scripts/jest x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/project_relationship_records.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/project_relationship_records.ts x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/project_relationship_records.test.ts
git commit -m "feat(maintainers): add kind projection (bucketed split / standard collapse)"
```

---

### Task 12: Local-namespace fast-path config flag + minimized EUID

**Files:**
- Modify: `engine/types.ts` (add `localNamespaceFastPath?: boolean` to `CustomActorBinding`)
- Modify: `engine/build_daily_aggregate_query.ts` (honor the flag → minimized actor/target EVAL)
- Modify: `communicates_with/configs.ts`, `accesses/configs.ts` (set the flag; confirm `user.id` not in `customActor.fields`)
- Test: extend `engine/build_daily_aggregate_query.test.ts`

**Interfaces:**
- Consumes: existing config types.
- Produces: when `config.customActor?.localNamespaceFastPath === true`, Phase A emits the minimized EUID form — actor `CONCAT("user:", COALESCE(TO_STRING(\`user.email\`), TO_STRING(\`user.name\`)), "@", TO_STRING(\`host.id\`), "@local")`, target `CONCAT("host:", TO_STRING(\`host.id\`))`, no namespace/source EVALs — and requires `host.id` present in the WHERE. Otherwise the full generic EVAL chain (unchanged).

- [ ] **Step 1: Write the failing test**

Add to `build_daily_aggregate_query.test.ts`:

```ts
describe('localNamespaceFastPath', () => {
  const fastConfig = {
    ...commConfig,
    customActor: { fields: ['user.email', 'user.name'], localNamespaceFastPath: true },
  };

  it('emits the minimized @local EUID and skips namespace EVALs', () => {
    const q = buildDailyAggregateQuery(fastConfig, 'default', '2026-07-30');
    expect(q).toContain('"@local"');
    expect(q).not.toContain('entity.namespace');
    expect(q).toContain('CONCAT("host:", TO_STRING(`host.id`))');
  });

  it('requires host.id in the WHERE for the fast path', () => {
    const q = buildDailyAggregateQuery(fastConfig, 'default', '2026-07-30');
    expect(q).toContain('`host.id` IS NOT NULL');
  });

  it('non-fast-path config still emits the generic namespace chain', () => {
    const q = buildDailyAggregateQuery(commConfig, 'default', '2026-07-30');
    expect(q).toContain('entity.namespace');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/jest x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/build_daily_aggregate_query.test.ts -t "localNamespaceFastPath"`
Expected: FAIL — flag not honored.

- [ ] **Step 3: Write minimal implementation**

Add `localNamespaceFastPath?: boolean` to `CustomActorBinding` in `types.ts` (with a doc comment). In `build_daily_aggregate_query.ts`, branch on it to emit the minimized EVALs + `host.id` WHERE gate. Set `localNamespaceFastPath: true` on `system_auth`/`system_security` (both maintainers) and any other local medium-confidence config; verify `user.id` is not in their `customActor.fields` (comments already note the bucket-explosion rationale).

- [ ] **Step 4: Run test to verify it passes**

Run: `node scripts/jest x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/build_daily_aggregate_query.test.ts`
Expected: PASS (all, incl. fast-path).

- [ ] **Step 5: Commit**

```bash
git add x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/types.ts x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/build_daily_aggregate_query.ts x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/communicates_with/configs.ts x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/accesses/configs.ts x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/build_daily_aggregate_query.test.ts
git commit -m "feat(maintainers): add localNamespaceFastPath minimized-EUID Phase A path"
```

---

### Task 13: Rewrite `runLogsIntegration` to the two-phase daily flow

**Files:**
- Modify (rewrite): `engine/run_logs_integration.ts`
- Test (rewrite): `engine/run_logs_integration.test.ts`

**Interfaces:**
- Consumes: `daysToCompute`, `dayKey` (Task 1); `installDailyAggregatesIndex` (Task 5); `buildDailyAggregateQuery` (Task 7); `parseDailyAggregateRows` (Task 8); `writeDailyAggregates` (Task 6); `buildRollingTotalsQuery` (Task 9); `parseRollingTotalsRows` (Task 10); `projectRelationshipRecords` (Task 11); `writeEntityIds`, `writeRelationshipMetadatas`; `DEFAULT_ESQL_TIMEOUT_MS`, `ROLLING_WINDOW_DAYS` (Task 2).
- Produces:
  ```ts
  export interface RunLogsIntegrationResult {
    daysComputed: number;
    actorsWritten: number;
    write: WriteEntityIdsResult;
    metadata: WriteRelationshipMetadatasResult;
    outcome: 'empty' | 'aborted' | 'producing' | 'error';
    lastComputedDay: string; // watermark to persist
  }

  export const runLogsIntegration = async (
    config: RelationshipIntegrationConfig,
    esClient: ElasticsearchClient,
    logger: Logger,
    namespace: string,
    crudClient: EntityUpdateClient,
    entityMetadataClient: EntityMetadataClient,
    signal: AbortSignal | undefined,
    metadataContext: { scanId: string; observedAt: string },
    params: {
      maintainerId: string;
      lastComputedDay: string | null;
      now: Date;
      requestTimeoutMs?: number; // default DEFAULT_ESQL_TIMEOUT_MS
    }
  ): Promise<RunLogsIntegrationResult>;
  ```
  Flow:
  1. `installDailyAggregatesIndex` (idempotent).
  2. **Phase A:** `days = daysToCompute(params.lastComputedDay, params.now, ROLLING_WINDOW_DAYS)`. For each `day`: abort-check; run `buildDailyAggregateQuery` (requestTimeout); `parseDailyAggregateRows`; `writeDailyAggregates({ maintainer: params.maintainerId, integration: config.id, day, rows })`. Track `lastComputedDay` = last fully-written day (start from `params.lastComputedDay`; advance per completed day). On abort mid-Phase-A: return with `outcome:'aborted'` and the watermark at the last completed day (progress preserved).
  3. **Phase B:** run `buildRollingTotalsQuery({ namespace, maintainer: params.maintainerId, integration: config.id, nowMs: params.now.getTime() })` (requestTimeout); `parseRollingTotalsRows`; page over actors (the query already `LIMIT`s a page — for >1 page, paginate by actor as the old code did, or note single-page assumption if the query is one-shot); `projectRelationshipRecords`; `writeEntityIds(records)` + `writeRelationshipMetadatas(records)` **per page**; merge into `totalWrite`/`totalMetadata`. `lastComputedDay` becomes `dayKey(params.now)` on full success.
  4. Return the result incl. final `lastComputedDay`.

  Remove the probe/boundary/slice loop entirely.

- [ ] **Step 1: Rewrite the failing tests**

Replace `run_logs_integration.test.ts`. Key tests (mock `esClient.esql.query`, `esClient.indices.*`, `esClient.bulk`, `crudClient.bulkUpdateEntity`, `entityMetadataClient.bulkAppendMetadata`):

```ts
it('first run computes the full window into daily docs then writes the rolling total', async () => {
  // daysToCompute(null, now, 30) => 30 Phase A queries; then 1 Phase B query.
  // Assert writeDailyAggregates path invoked per day (esClient.bulk called),
  // Phase B esql called once, and writeEntityIds (bulkUpdate) called for the actor page.
});

it('incremental run computes only today then rewrites the rolling total', async () => {
  // lastComputedDay = yesterday => exactly 1 Phase A query for today, then Phase B.
});

it('per-page write: an actor with two targets writes both in one overwrite', async () => {
  // Phase B returns alice -> {host:x:5, host:y:2}; standard config => communicates_with=[x,y].
});

it('bucketed classification uses the merged 30d total (split-day pair is frequent)', async () => {
  // Phase B rolling total for a pair = 5 (>=4) => accesses_frequently.
});

it('aborts mid-Phase-A preserving watermark at last completed day', async () => {
  // signal aborts after day 1 => outcome 'aborted', lastComputedDay = day 1.
});

it('advances lastComputedDay to today on full success', async () => {
  // returns lastComputedDay === dayKey(now).
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node scripts/jest x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/run_logs_integration.test.ts`
Expected: FAIL — new signature/flow not implemented.

- [ ] **Step 3: Write the implementation**

Rewrite `run_logs_integration.ts` per the Interfaces flow. Wrap ES|QL calls with `{ ...transportOpts, requestTimeout: params.requestTimeoutMs ?? DEFAULT_ESQL_TIMEOUT_MS }`. Keep `errMsg`/try-catch → `outcome:'error'`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node scripts/jest x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/run_logs_integration.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/run_logs_integration.ts x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/run_logs_integration.test.ts
git commit -m "feat(maintainers): rewrite runLogsIntegration as two-phase daily-incremental"
```

---

### Task 14: Wire watermark + completion logging in the dispatcher

**Files:**
- Modify: `engine/run_relationship_maintainer.ts` (dispatch loop for `source==='logs'`)
- Modify: `accesses/index.ts`, `communicates_with/index.ts` (read/return watermark from `status.state`)
- Test: `engine/run_relationship_maintainer.test.ts` (extend)

**Interfaces:**
- Consumes: `runLogsIntegration` new signature (Task 13); `EntityMaintainerState` (from `@kbn/entity-store/server`).
- Produces:
  - The `source==='logs'` dispatch passes `params: { maintainerId, lastComputedDay: state.lastComputedDays?.[config.id] ?? null, now: new Date(), requestTimeoutMs }` and collects the returned `lastComputedDay` back into a `nextState.lastComputedDays[config.id]`.
  - `runRelationshipMaintainer` accepts an incoming `state` (per-integration `lastComputedDays` map) and returns the updated state.
  - The maintainer `run` (`accesses/index.ts`, `communicates_with/index.ts`) reads `status.state` as `{ lastComputedDays?: Record<string,string> }` and returns the updated state object (the executor persists it — `entity_store/.../execution.ts:283`).
  - **Completion log:** after each integration completes, emit one structured `logger.info` with `maintainer`, `integration`, `daysComputed`, `actorsWritten`, `written`, `notFound`, `errors`, `durationMs`, `outcome`. (Item-3 requirement — log on completion, not only error.)

- [ ] **Step 1: Write the failing test**

Extend `run_relationship_maintainer.test.ts`:

```ts
it('passes prior lastComputedDay per integration and returns the advanced watermark', async () => {
  // Provide state.lastComputedDays = { system_auth: '2026-07-29' }.
  // Assert runLogsIntegration received lastComputedDay '2026-07-29',
  // and the returned state.lastComputedDays.system_auth advanced to today.
});

it('logs a completion line per integration (not only on error)', async () => {
  // Assert logger.info called with a message containing the integration id,
  // daysComputed, actorsWritten, outcome on a successful run.
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node scripts/jest x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/run_relationship_maintainer.test.ts -t "lastComputedDay|completion line"`
Expected: FAIL.

- [ ] **Step 3: Write the implementation**

Thread `state` in/out of `runRelationshipMaintainer`; in the `source==='logs'` branch call `runLogsIntegration` with `params`, collect `lastComputedDay`, emit the completion log. Update the two maintainer `index.ts` files to read `status.state` and return the updated state. Leave the `entity-index` (`runIntegration`) branch unchanged.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node scripts/jest x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/run_relationship_maintainer.test.ts`
Expected: PASS.

Also run the maintainer index tests if present:
Run: `node scripts/jest x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/accesses x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/communicates_with`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/run_relationship_maintainer.ts x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/accesses/index.ts x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/communicates_with/index.ts x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/run_relationship_maintainer.test.ts
git commit -m "feat(maintainers): wire daily watermark state + per-integration completion logging"
```

---

### Task 15: Retire time-slicing + full engine sweep

**Files:**
- Delete: `engine/build_actor_slice_probe_query.ts` (+`.test.ts`), `engine/build_actor_slice_boundary_query.ts` (+`.test.ts`).
- Delete (superseded): `engine/parse_targets_per_actor_rows.ts` bucketed count path IF now unused (check), and the scratch files listed below.
- Modify: `constants.ts` (remove `SLICE_SAMPLE_PROBABILITY`, `EXTRACT_QUERY_TIMEOUT_MS` if fully replaced by `DEFAULT_ESQL_TIMEOUT_MS`; keep `LOOKBACK_WINDOW`/`MAX_ITERATIONS` only if still referenced).

**Interfaces:** none new.

- [ ] **Step 1: Find dead references**

Run: `grep -rn "build_actor_slice_probe_query\|build_actor_slice_boundary_query\|SLICE_SAMPLE_PROBABILITY\|EXTRACT_QUERY_TIMEOUT_MS\|parseBucketedCountRows" x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers`
Expected: references only in the files to be deleted and `run_logs_integration.ts` (now rewritten — should already not reference them).

- [ ] **Step 2: Delete retired files + dead constants**

Delete the time-slicing builders and their tests. Remove now-unused constants. If `parseBucketedCountRows` (from the superseded plan) was never merged to `main`, it won't exist — skip. Do NOT delete `build_targets_per_actor_query.ts` (still used by the `entity-index` `runIntegration` path).

- [ ] **Step 3: Run the whole engine + maintainer test directory**

Run: `node scripts/jest x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers`
Expected: PASS — entire maintainers suite (engine + accesses + communicates_with + administers + owns). Entity-index configs unaffected.

- [ ] **Step 4: Lint all changed/new files**

Run: `node scripts/eslint $(git diff --name-only main -- 'x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/**/*.ts')`
Expected: `✅ no eslint errors found`. Fix root causes (no `eslint-disable`).

- [ ] **Step 5: Clean scratch files + commit**

Remove the stray non-source scratch files in the engine dir if present (`access_summary.txt`, `accesses_system.auth_events.csv`, `count.txt`, `error_log.txt`, `esql_query*.txt`, `new_res.txt`, `old_res.txt`, `profile_*.txt`, `system.auth_events.csv`, `request_timeout_investigation.md`, `HANDOFF-dsl-esql-vs-timeslicing.md`) — confirm with the user before deleting the HANDOFF and investigation docs; delete only the pure data/scratch dumps otherwise.

```bash
git add -A x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers
git commit -m "chore(maintainers): retire time-slicing, remove dead constants and scratch files"
```

---

## Notes for the executor

- **Column names:** the new ES|QL columns (`access_count`, `targetEntityId`, `targetCounts`) are emitted and read as string literals within the Phase A/B builder+parser pairs (each column has exactly one producer and one consumer in this plan). Do NOT add them to `ENGINE_COLUMNS` in `columns.ts` — that contract exists for the multi-consumer `actorUserId`/relationship-key columns of the entity-index path. Keep `actorUserId` referencing `ENGINE_COLUMNS.actor` where a builder already imports it; use plain literals for the daily-path-only columns. Consistency is enforced by each task's builder test asserting the exact literal the parser test reads.
- **Type-check caveat:** `scripts/type_check` aborts on a pre-existing unrelated `alerting` kbn_references error. Validate via Jest (ts-jest) + `scripts/eslint`. If type_check becomes runnable, scope to the security_solution project.
- **Phase B flattened-field decision (Task 9):** confirm whether ES|QL can iterate the `flattened` `targetCounts` field. If not, add a parallel `targetCountPairs: keyword[]` (`"target|count"`) to the Task 4 mapping and write it in Task 6, and have Phase B `MV_EXPAND` that. Record the decision in the Task 9 report; if it changes Task 4/6, note the follow-up.
- **Single-page vs multi-page Phase B:** if an integration can exceed `COMPOSITE_PAGE_SIZE` actors, Phase B must paginate by actor (composite `after`/keyset) like the old `runIntegration`. Task 13 notes this; implement pagination if the actor count can exceed one page, else document the single-page assumption with a `log()` of any truncation.
- **Do NOT** touch entity-index configs (`administers`, `owns`) or `runIntegration`.
- **Do NOT** implement server-side array-union — the daily index makes overwrite correct by design.
