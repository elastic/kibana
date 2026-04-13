# Entity Maintainers: Relationship Schema Update — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update the `communicates_with` and `accesses` entity maintainers to write relationship values as `{ ids: string[] }` objects instead of plain `string[]` arrays, aligning with the schema introduced in elastic/kibana#262242.

**Architecture:** Three layers change in `accesses`: the internal `ProcessedEntityRecord` type, the `postprocessEsqlResults` function that builds it, and the `buildEntityDoc` function that writes it to the entity store. In `communicates_with` only the final `buildEntityDoc` step changes. No new abstractions are introduced.

**Tech Stack:** TypeScript, Jest, Kibana entity store (`@kbn/entity-store`)

**Spec:** `docs/superpowers/specs/2026-04-13-entity-maintainers-relationship-schema-update.md`

---

## File Map

| Action | Path |
|--------|------|
| Modify | `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/communicates_with/update_entities.ts` |
| Modify | `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/communicates_with/update_entities.test.ts` |
| Modify | `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/accesses/types.ts` |
| Modify | `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/accesses/postprocess_records.ts` |
| Create | `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/accesses/postprocess_records.test.ts` |
| Modify | `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/accesses/run_maintainer.ts` |
| Modify | `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/accesses/update_entities.ts` |
| Create | `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/accesses/update_entities.test.ts` |

---

## Task 1: Update `communicates_with` tests and implementation

**Files:**
- Modify: `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/communicates_with/update_entities.test.ts:69-186`
- Modify: `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/communicates_with/update_entities.ts:52`

- [ ] **Step 1: Update the three test assertions that check `communicates_with` directly**

In `communicates_with/update_entities.test.ts`, update three tests:

*Test at line 69 — `'passes communicates_with strings directly'`:*
```ts
// Before (line 76-79)
expect(objects[0].doc.entity.relationships.communicates_with).toEqual([
  'service:s3.amazonaws.com',
  'service:ec2.amazonaws.com',
]);

// After
expect(objects[0].doc.entity.relationships.communicates_with).toEqual({
  ids: ['service:s3.amazonaws.com', 'service:ec2.amazonaws.com'],
});
```

*Test at line 141 — `'merges communicates_with targets when the same entityId appears...'`:*
```ts
// Before (line 157-160)
expect(objects[0].doc.entity.relationships.communicates_with).toEqual(
  expect.arrayContaining(['service:Microsoft Teams', 'service:Slack'])
);

// After
expect(objects[0].doc.entity.relationships.communicates_with).toEqual({
  ids: expect.arrayContaining(['service:Microsoft Teams', 'service:Slack']),
});
```

*Test at line 162 — `'deduplicates identical target strings when merging records'`:*
```ts
// Before (line 177-185)
const targets = objects[0].doc.entity.relationships.communicates_with;
expect(targets).toHaveLength(3);
expect(targets).toEqual(
  expect.arrayContaining([
    'service:s3.amazonaws.com',
    'service:ec2.amazonaws.com',
    'service:lambda.amazonaws.com',
  ])
);

// After
const { ids: targets } = objects[0].doc.entity.relationships.communicates_with;
expect(targets).toHaveLength(3);
expect(targets).toEqual(
  expect.arrayContaining([
    'service:s3.amazonaws.com',
    'service:ec2.amazonaws.com',
    'service:lambda.amazonaws.com',
  ])
);
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
node scripts/jest x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/communicates_with/update_entities.test.ts --no-coverage
```

Expected: 3 failures — `Expected: { ids: [...] }`, `Received: [...]`

- [ ] **Step 3: Update the implementation**

In `communicates_with/update_entities.ts`, change line 52:

```ts
// Before
communicates_with: Array.from(targets),

// After
communicates_with: { ids: Array.from(targets) },
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
node scripts/jest x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/communicates_with/update_entities.test.ts --no-coverage
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/communicates_with/update_entities.ts \
        x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/communicates_with/update_entities.test.ts
git commit -m "feat(entity-analytics): update communicates_with relationship to new ids schema"
```

---

## Task 2: Update `accesses/types.ts`

**Files:**
- Modify: `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/accesses/types.ts:17-19`

- [ ] **Step 1: Update `ProcessedEntityRecord` field types**

```ts
// Before
export interface ProcessedEntityRecord {
  entityId: string | null;
  accesses_frequently: string[];
  accesses_infrequently: string[];
}

// After
export interface ProcessedEntityRecord {
  entityId: string | null;
  accesses_frequently: { ids: string[] };
  accesses_infrequently: { ids: string[] };
}
```

- [ ] **Step 2: Verify TypeScript errors now show in downstream files**

```bash
node scripts/type_check --project x-pack/solutions/security/plugins/security_solution/tsconfig.json
```

Expected: errors in `postprocess_records.ts`, `run_maintainer.ts`, and `update_entities.ts` — these are fixed in subsequent tasks. Do not fix them yet.

- [ ] **Step 3: Commit**

```bash
git add x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/accesses/types.ts
git commit -m "feat(entity-analytics): update ProcessedEntityRecord to carry relationship ids object"
```

---

## Task 3: Create `accesses/postprocess_records.test.ts` and update `postprocess_records.ts`

**Files:**
- Create: `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/accesses/postprocess_records.test.ts`
- Modify: `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/accesses/postprocess_records.ts:34-35`

- [ ] **Step 1: Create the test file**

Create `accesses/postprocess_records.test.ts`:

```ts
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { postprocessEsqlResults } from './postprocess_records';

const COLUMNS = [
  { name: 'actorUserId', type: 'keyword' },
  { name: 'accesses_frequently', type: 'keyword' },
  { name: 'accesses_infrequently', type: 'keyword' },
];

describe('postprocessEsqlResults', () => {
  it('returns an empty array when values is empty', () => {
    expect(postprocessEsqlResults(COLUMNS, [])).toEqual([]);
  });

  it('sets entityId to null when actorUserId is null', () => {
    const [record] = postprocessEsqlResults(COLUMNS, [[null, null, null]]);
    expect(record.entityId).toBeNull();
  });

  it('prefixes actorUserId with "user:" to form entityId', () => {
    const [record] = postprocessEsqlResults(COLUMNS, [['alice@corp', null, null]]);
    expect(record.entityId).toBe('user:alice@corp');
  });

  it('wraps null accesses_frequently in { ids: [] }', () => {
    const [record] = postprocessEsqlResults(COLUMNS, [['alice@corp', null, null]]);
    expect(record.accesses_frequently).toEqual({ ids: [] });
  });

  it('wraps null accesses_infrequently in { ids: [] }', () => {
    const [record] = postprocessEsqlResults(COLUMNS, [['alice@corp', null, null]]);
    expect(record.accesses_infrequently).toEqual({ ids: [] });
  });

  it('wraps a single string accesses_frequently value in { ids: [value] }', () => {
    const [record] = postprocessEsqlResults(COLUMNS, [['alice@corp', 'host:prod-db-01@corp', null]]);
    expect(record.accesses_frequently).toEqual({ ids: ['host:prod-db-01@corp'] });
  });

  it('wraps an array accesses_frequently value in { ids: [...] }', () => {
    const [record] = postprocessEsqlResults(COLUMNS, [
      ['alice@corp', ['host:prod-db-01@corp', 'host:prod-db-02@corp'], null],
    ]);
    expect(record.accesses_frequently).toEqual({
      ids: ['host:prod-db-01@corp', 'host:prod-db-02@corp'],
    });
  });

  it('wraps accesses_infrequently independently from accesses_frequently', () => {
    const [record] = postprocessEsqlResults(COLUMNS, [
      ['alice@corp', ['host:prod-db-01@corp'], ['host:legacy-01@corp']],
    ]);
    expect(record.accesses_frequently).toEqual({ ids: ['host:prod-db-01@corp'] });
    expect(record.accesses_infrequently).toEqual({ ids: ['host:legacy-01@corp'] });
  });

  it('processes multiple rows independently', () => {
    const results = postprocessEsqlResults(COLUMNS, [
      ['alice@corp', ['host:a@corp'], null],
      ['bob@corp', null, ['host:b@corp']],
    ]);
    expect(results).toHaveLength(2);
    expect(results[0].entityId).toBe('user:alice@corp');
    expect(results[0].accesses_frequently).toEqual({ ids: ['host:a@corp'] });
    expect(results[0].accesses_infrequently).toEqual({ ids: [] });
    expect(results[1].entityId).toBe('user:bob@corp');
    expect(results[1].accesses_frequently).toEqual({ ids: [] });
    expect(results[1].accesses_infrequently).toEqual({ ids: ['host:b@corp'] });
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
node scripts/jest x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/accesses/postprocess_records.test.ts --no-coverage
```

Expected: failures — `Expected: { ids: [...] }`, `Received: [...]`

- [ ] **Step 3: Update `postprocess_records.ts`**

Change lines 34–35 in `accesses/postprocess_records.ts`:

```ts
// Before
accesses_frequently: toStringArray(record.accesses_frequently),
accesses_infrequently: toStringArray(record.accesses_infrequently),

// After
accesses_frequently: { ids: toStringArray(record.accesses_frequently) },
accesses_infrequently: { ids: toStringArray(record.accesses_infrequently) },
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
node scripts/jest x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/accesses/postprocess_records.test.ts --no-coverage
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/accesses/postprocess_records.ts \
        x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/accesses/postprocess_records.test.ts
git commit -m "feat(entity-analytics): update postprocessEsqlResults to emit ids objects for accesses relationships"
```

---

## Task 4: Fix `accesses/run_maintainer.ts` logging

**Files:**
- Modify: `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/accesses/run_maintainer.ts:166,169`

- [ ] **Step 1: Update the two logging lines**

In `accesses/run_maintainer.ts`, update lines 165–173 (the logging block inside the `if (columns && values)` branch):

```ts
// Before
for (const record of records) {
  const freq =
    record.accesses_frequently.length > 0 ? record.accesses_frequently.join(', ') : 'none';
  const infreq =
    record.accesses_infrequently.length > 0
      ? record.accesses_infrequently.join(', ')
      : 'none';
  logger.info(
    `[${integration.id}] Entity ${record.entityId}: frequently=[${freq}], infrequently=[${infreq}]`
  );
}

// After
for (const record of records) {
  const freq =
    record.accesses_frequently.ids.length > 0
      ? record.accesses_frequently.ids.join(', ')
      : 'none';
  const infreq =
    record.accesses_infrequently.ids.length > 0
      ? record.accesses_infrequently.ids.join(', ')
      : 'none';
  logger.info(
    `[${integration.id}] Entity ${record.entityId}: frequently=[${freq}], infrequently=[${infreq}]`
  );
}
```

- [ ] **Step 2: Verify TypeScript passes for this file**

```bash
node scripts/type_check --project x-pack/solutions/security/plugins/security_solution/tsconfig.json
```

Expected: the `run_maintainer.ts` error is gone. Only `update_entities.ts` errors remain.

- [ ] **Step 3: Commit**

```bash
git add x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/accesses/run_maintainer.ts
git commit -m "feat(entity-analytics): update accesses run_maintainer logging for new ids schema"
```

---

## Task 5: Create `accesses/update_entities.test.ts` and update `update_entities.ts`

**Files:**
- Create: `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/accesses/update_entities.test.ts`
- Modify: `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/accesses/update_entities.ts:20-23`

- [ ] **Step 1: Create the test file**

Create `accesses/update_entities.test.ts`:

```ts
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { EntityUpdateClient } from '@kbn/entity-store/server';
import { updateEntityRelationships } from './update_entities';
import type { ProcessedEntityRecord } from './types';

function createRecord(overrides?: Partial<ProcessedEntityRecord>): ProcessedEntityRecord {
  return {
    entityId: 'user:alice@corp@system_auth',
    accesses_frequently: { ids: ['host:prod-db-01@corp'] },
    accesses_infrequently: { ids: [] },
    ...overrides,
  };
}

function createCrudClient(errors: unknown[] = []): EntityUpdateClient {
  return {
    bulkUpdateEntity: jest.fn().mockResolvedValue(errors),
    updateEntity: jest.fn(),
  } as unknown as EntityUpdateClient;
}

describe('accesses updateEntityRelationships', () => {
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 0 without calling the API when records is empty', async () => {
    const crudClient = createCrudClient();
    const result = await updateEntityRelationships(crudClient, logger, []);
    expect(result).toBe(0);
    expect(crudClient.bulkUpdateEntity).not.toHaveBeenCalled();
  });

  it('sets accesses_frequently to undefined when ids is empty', async () => {
    const crudClient = createCrudClient();
    const record = createRecord({ accesses_frequently: { ids: [] } });
    await updateEntityRelationships(crudClient, logger, [record]);
    const { objects } = (crudClient.bulkUpdateEntity as jest.Mock).mock.calls[0][0];
    expect(objects[0].doc.entity.relationships.accesses_frequently).toBeUndefined();
  });

  it('sets accesses_infrequently to undefined when ids is empty', async () => {
    const crudClient = createCrudClient();
    const record = createRecord({ accesses_infrequently: { ids: [] } });
    await updateEntityRelationships(crudClient, logger, [record]);
    const { objects } = (crudClient.bulkUpdateEntity as jest.Mock).mock.calls[0][0];
    expect(objects[0].doc.entity.relationships.accesses_infrequently).toBeUndefined();
  });

  it('passes accesses_frequently as { ids: [...] } when non-empty', async () => {
    const crudClient = createCrudClient();
    const record = createRecord({
      accesses_frequently: { ids: ['host:prod-db-01@corp', 'host:prod-db-02@corp'] },
    });
    await updateEntityRelationships(crudClient, logger, [record]);
    const { objects } = (crudClient.bulkUpdateEntity as jest.Mock).mock.calls[0][0];
    expect(objects[0].doc.entity.relationships.accesses_frequently).toEqual({
      ids: ['host:prod-db-01@corp', 'host:prod-db-02@corp'],
    });
  });

  it('passes accesses_infrequently as { ids: [...] } when non-empty', async () => {
    const crudClient = createCrudClient();
    const record = createRecord({
      accesses_frequently: { ids: [] },
      accesses_infrequently: { ids: ['host:legacy-01@corp'] },
    });
    await updateEntityRelationships(crudClient, logger, [record]);
    const { objects } = (crudClient.bulkUpdateEntity as jest.Mock).mock.calls[0][0];
    expect(objects[0].doc.entity.relationships.accesses_infrequently).toEqual({
      ids: ['host:legacy-01@corp'],
    });
  });

  it('sets entity.id to entityId', async () => {
    const crudClient = createCrudClient();
    await updateEntityRelationships(crudClient, logger, [createRecord()]);
    const { objects } = (crudClient.bulkUpdateEntity as jest.Mock).mock.calls[0][0];
    expect(objects[0].doc.entity.id).toBe('user:alice@corp@system_auth');
  });

  it('hardcodes entity type as "user"', async () => {
    const crudClient = createCrudClient();
    await updateEntityRelationships(crudClient, logger, [createRecord()]);
    const { objects } = (crudClient.bulkUpdateEntity as jest.Mock).mock.calls[0][0];
    expect(objects[0].type).toBe('user');
  });

  it('calls bulkUpdateEntity with force: true', async () => {
    const crudClient = createCrudClient();
    await updateEntityRelationships(crudClient, logger, [createRecord()]);
    expect(crudClient.bulkUpdateEntity).toHaveBeenCalledWith(
      expect.objectContaining({ force: true })
    );
  });

  it('returns the count of successfully updated records', async () => {
    const crudClient = createCrudClient([]);
    const records = [
      createRecord({ entityId: 'user:a@corp@auth' }),
      createRecord({ entityId: 'user:b@corp@auth' }),
    ];
    const result = await updateEntityRelationships(crudClient, logger, records);
    expect(result).toBe(2);
  });

  it('returns updated count minus errors when some fail', async () => {
    const errors = [{ _id: 'hash1', status: 429, type: 'too_many_requests', reason: 'throttled' }];
    const crudClient = createCrudClient(errors);
    const records = [
      createRecord({ entityId: 'user:a@corp@auth' }),
      createRecord({ entityId: 'user:b@corp@auth' }),
    ];
    const result = await updateEntityRelationships(crudClient, logger, records);
    expect(result).toBe(1);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to update 1'));
  });

  it('updates all records in a single bulk call', async () => {
    const crudClient = createCrudClient();
    const records = [
      createRecord({ entityId: 'user:a@corp@auth' }),
      createRecord({ entityId: 'user:b@corp@auth' }),
      createRecord({ entityId: 'user:c@corp@auth' }),
    ];
    await updateEntityRelationships(crudClient, logger, records);
    expect(crudClient.bulkUpdateEntity).toHaveBeenCalledTimes(1);
    const { objects } = (crudClient.bulkUpdateEntity as jest.Mock).mock.calls[0][0];
    expect(objects).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
node scripts/jest x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/accesses/update_entities.test.ts --no-coverage
```

Expected: failures on the `{ ids: [...] }` shape assertions.

- [ ] **Step 3: Update `accesses/update_entities.ts`**

In `accesses/update_entities.ts`, change lines 20–23 in `buildEntityDoc`:

```ts
// Before
function buildEntityDoc(record: ProcessedEntityRecord): Entity {
  return {
    entity: {
      id: record.entityId,
      relationships: {
        accesses_frequently:
          record.accesses_frequently.length > 0 ? record.accesses_frequently : undefined,
        accesses_infrequently:
          record.accesses_infrequently.length > 0 ? record.accesses_infrequently : undefined,
      },
    },
  } as Entity;
}

// After
function buildEntityDoc(record: ProcessedEntityRecord): Entity {
  return {
    entity: {
      id: record.entityId,
      relationships: {
        accesses_frequently:
          record.accesses_frequently.ids.length > 0 ? record.accesses_frequently : undefined,
        accesses_infrequently:
          record.accesses_infrequently.ids.length > 0 ? record.accesses_infrequently : undefined,
      },
    },
  } as Entity;
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
node scripts/jest x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/accesses/update_entities.test.ts --no-coverage
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/accesses/update_entities.ts \
        x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/accesses/update_entities.test.ts
git commit -m "feat(entity-analytics): update accesses update_entities to use new ids schema"
```

---

## Task 6: Final Verification

- [ ] **Step 1: Run all maintainer tests**

```bash
node scripts/jest x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers --no-coverage
```

Expected: all tests pass, no failures.

- [ ] **Step 2: TypeScript check**

```bash
node scripts/type_check --project x-pack/solutions/security/plugins/security_solution/tsconfig.json
```

Expected: no errors.

- [ ] **Step 3: Lint check**

```bash
node scripts/eslint --fix x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/accesses/types.ts \
  x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/accesses/postprocess_records.ts \
  x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/accesses/postprocess_records.test.ts \
  x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/accesses/run_maintainer.ts \
  x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/accesses/update_entities.ts \
  x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/accesses/update_entities.test.ts \
  x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/communicates_with/update_entities.ts \
  x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/communicates_with/update_entities.test.ts
```

Expected: no errors or warnings.

- [ ] **Step 4: Run full change validation**

```bash
node scripts/check_changes.ts
```

Expected: passes.

- [ ] **Step 5: Commit any lint auto-fixes**

If `--fix` made any changes:
```bash
git add -p
git commit -m "chore: apply lint fixes to entity maintainer schema update"
```
