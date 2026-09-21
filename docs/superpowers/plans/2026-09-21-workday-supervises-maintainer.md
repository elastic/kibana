# Workday `supervises` Maintainer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Populate `entity.relationships.supervises.ids` on Workday **manager** entities by inverting each worker's `Manager_Email` / `Manager_ID` into manager→report edges.

**Architecture:** Add one log-inverted `kind: 'override'` config to the existing `supervises` maintainer (no new maintainer registration). Step 1 buckets managers via composite aggregation on the two manager fields over `logs-workday.user-<ns>`; Step 2 is a hand-written ES|QL override that unions the manager fields into the actor EUID and derives the target EUID (the row's own user) via the canonical `euid.esql.getEuidEvaluation` helper. A prerequisite change to the shared user entity definition maps the `workday` source to a `workday` entity namespace.

**Tech Stack:** TypeScript, Jest (unit + golden snapshots), ES|QL, Elasticsearch composite aggregations, Scout/Playwright (API tests).

**Spec:** `docs/superpowers/specs/2026-09-21-workday-supervises-maintainer-design.md`

**Ticket:** [security-team#19402](https://github.com/elastic/security-team/issues/19402)

## Global Constraints

- Node version: **24.21.0** (from `.nvmrc`). If `node scripts/jest` reports a version error, run `nvm use 24.21.0`.
- `pnpm` is provisioned through corepack. If missing: `corepack enable && corepack prepare pnpm@12.4.2 --activate`, then `node scripts/kbn bootstrap`.
- Run unit tests with `node scripts/jest <path>` (config auto-discovered). One `--config` per run.
- Type check scoped to one project: `node scripts/type_check --project <path>/tsconfig.json`. Never unscoped.
- Never use `any` / `unknown`; never suppress with `@ts-ignore` / `@ts-expect-error` / `eslint-disable`.
- Use `import type` for type-only imports. Prefer const arrow functions, explicit imports/exports.
- New filenames must be `snake_case`.
- Comments explain **why**, not what. Do not add JSDoc restating what code already says — this is an explicitly reviewed-on pattern in this domain.
- Okta and Entra ID `supervises` behaviour must remain byte-for-byte unchanged (their golden snapshots must not change).
- Relationship key is `supervises`; actor EUID namespace suffix is `workday`.
- ES|QL overrides MUST NOT include `SET unmapped_fields="nullify"` — the engine prepends it.
- Override queries MUST emit exactly the columns `actorUserId` and `supervises`.

---

## File Structure

| File | Responsibility |
|---|---|
| `x-pack/platform/plugins/shared/entity_store/common/domain/definitions/user.ts` | Prerequisite: map source `workday` → `entity.namespace: 'workday'` |
| `x-pack/platform/plugins/shared/entity_store/common/domain/definitions/user.test.ts` (or existing sibling test) | Assert the new namespace mapping |
| `.../maintainers/supervises/configs.ts` | Add `buildWorkdaySupervisesEsqlQuery` + the Workday log-inverted config |
| `.../maintainers/supervises/configs.test.ts` | Config shape, Step 1 filters, ES|QL contract, first-run vs incremental |
| `.../maintainers/supervises/__snapshots__/configs.test.ts.snap` | Golden ES|QL snapshots (regenerated) |
| `.../maintainers/supervises/index.ts` | Extend maintainer `description` |
| `.../test/scout/entity_analytics/api/fixtures/maintainers/helpers.ts` | Generalize `seedLogDocument` for user-target rows + `event.ingested` |
| `.../test/scout/entity_analytics/api/tests/maintainers/workday_supervises_maintainer.spec.ts` | New Scout suite (5 cases) |

Path prefix for maintainer files: `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/`
Path prefix for Scout files: `x-pack/solutions/security/plugins/security_solution/test/scout/entity_analytics/api/`

---

## Task 1: Map the `workday` entity namespace

Prerequisite. Without this, Workday user entities key as `user:<id>@unknown` while the maintainer emits `@workday` EUIDs — nothing matches, every target fails validation, every actor 404s, and the maintainer writes zero relationships while appearing to succeed.

**Files:**
- Modify: `x-pack/platform/plugins/shared/entity_store/common/domain/definitions/user.ts:98-101`
- Test: `x-pack/platform/plugins/shared/entity_store/common/domain/euid/field_evaluations.test.ts`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: `entity.namespace === 'workday'` for documents whose `event.module` is `workday` or whose `data_stream.dataset` first chunk is `workday`. Tasks 2–5 depend on this namespace string.

- [ ] **Step 1: Locate the existing namespace mapping test**

Run:
```bash
cd x-pack/platform/plugins/shared/entity_store && grep -n "sourceMatchesAny when whenClause matches" -A 25 common/domain/euid/field_evaluations.test.ts
```

Read the surrounding `describe` block and mirror its style for the new test. Existing tests around line 437-460 cover the okta case — that is the pattern to copy.

- [ ] **Step 2: Write the failing test**

Add to `common/domain/euid/field_evaluations.test.ts`, inside the same `describe` block as the existing `sourceMatchesAny` tests. Adapt the surrounding block's helper calls — the assertion below states the required behaviour; match the file's existing invocation style for building the evaluation input:

```ts
it('maps a workday-sourced document to the workday namespace', () => {
  const result = applyFieldEvaluations('user', {
    'event.module': 'workday',
    'event.kind': 'asset',
    'user.email': 'jdoe@example.com',
    'user.id': '007066',
    'user.name': 'jdoe',
  });

  expect(result['entity.namespace']).toBe('workday');
});

it('maps a workday document identified only by data_stream.dataset', () => {
  const result = applyFieldEvaluations('user', {
    'data_stream.dataset': 'workday.user',
    'event.kind': 'asset',
    'user.email': 'jdoe@example.com',
  });

  expect(result['entity.namespace']).toBe('workday');
});
```

If `applyFieldEvaluations` is not the symbol the neighbouring tests use, use whatever they use — the point is: a workday-sourced user document must resolve `entity.namespace` to `'workday'`, not `'unknown'`.

- [ ] **Step 3: Run the test to verify it fails**

Run:
```bash
node scripts/jest x-pack/platform/plugins/shared/entity_store/common/domain/euid/field_evaluations.test.ts -t workday
```

Expected: FAIL — received `"unknown"` instead of `"workday"` (no `whenClause` matches `workday`, so `fallbackValue: 'unknown'` applies).

- [ ] **Step 4: Add the mapping**

In `common/domain/definitions/user.ts`, add one clause to `whenClauses` after the `entityanalytics_ad` line (line 101). Order is not significant here — these are disjoint source values — but keep it grouped with the other IdP/HR source mappings:

```ts
          { sourceMatchesAny: ['okta', 'entityanalytics_okta'], then: 'okta' },
          { sourceMatchesAny: ['azure', 'entityanalytics_entra_id'], then: 'entra_id' },
          { sourceMatchesAny: ['o365', 'o365_metrics'], then: 'microsoft_365' },
          { sourceMatchesAny: ['entityanalytics_ad'], then: 'active_directory' },
          { sourceMatchesAny: ['workday'], then: 'workday' },
```

Do **not** add a namespace constant: `USER_ENTITY_NAMESPACE` declares only `Local`, and every IdP namespace here is an inline literal. Follow the existing convention.

- [ ] **Step 5: Run the test to verify it passes**

Run:
```bash
node scripts/jest x-pack/platform/plugins/shared/entity_store/common/domain/euid/field_evaluations.test.ts
```

Expected: PASS, including all pre-existing tests in the file (the new clause must not perturb okta/entra/o365/AD resolution).

- [ ] **Step 6: Check for snapshot fallout across the entity_store package**

The user definition feeds generated ES|QL/Painless in several places, some snapshot-locked.

Run:
```bash
node scripts/jest x-pack/platform/plugins/shared/entity_store/common
```

If snapshots fail **only** by gaining a `workday` arm in a namespace CASE expression, that is the expected consequence of this change — update them:
```bash
node scripts/jest x-pack/platform/plugins/shared/entity_store/common -u
```
Then read the snapshot diff and confirm every change is a `workday` addition and nothing else. If any other behaviour changed, stop and investigate.

- [ ] **Step 7: Type check**

Run:
```bash
node scripts/type_check --project x-pack/platform/plugins/shared/entity_store/tsconfig.json
```
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add x-pack/platform/plugins/shared/entity_store/
git commit -m "$(cat <<'EOF'
feat(entity-store): map workday source to the workday user namespace

Workday-sourced user documents previously fell through to the 'unknown'
namespace fallback, keying entities as user:<id>@unknown. Prerequisite for
the Workday supervises maintainer, whose actor and target EUIDs are
namespaced @workday.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Add the Workday `supervises` config and ES|QL override

**Files:**
- Modify: `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/supervises/configs.ts`
- Test: `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/supervises/configs.test.ts`

**Interfaces:**
- Consumes: `entity.namespace === 'workday'` (Task 1). `euid.esql.getEuidEvaluation(entityType, outputColumn, { withTypeId })` from `@kbn/entity-store/common/euid_helpers` — returns a multi-line ES|QL assignment string (comma-separated `EVAL` assignments) that computes `outputColumn` using the full user EUID ranking, and internally emits the `entity.namespace` field evaluation it depends on. `COMPOSITE_PAGE_SIZE` (3500) and `ENGINE_COLUMNS` from `../engine/`.

**What `getEuidEvaluation('user', 'targetEntityId', { withTypeId: true })` actually emits** (verified by running it, abridged — ~25 comma-separated assignments in one `EVAL`):

```
_src_entity_namespace0 = MV_FIRST(TO_STRING(event.module)),
 _src_entity_namespace1 = MV_FIRST(SPLIT(MV_FIRST(TO_STRING(data_stream.dataset)), ".")),
 _src_entity_namespace = COALESCE(...),
 _eval_entity_namespace_arm0 = (user.name non-empty AND host.id non-empty AND user.name NOT IN (<service accounts>)),
 ...
 entity.namespace = COALESCE(CASE(_eval_entity_namespace_arm0, "local"), ..., CASE(_src_entity_namespace IN ("okta", ...), "okta"), ..., CASE(_src_entity_namespace IS NULL OR == "", "unknown"), _src_entity_namespace),
 user_email_present = ..., user_id_present = ..., user_domain_present = ...,
 user_email_present_or_null = CASE(user_email_present, TO_STRING(user.email)), ...,
 _euid_branch_0_formula = CONCAT(user.name, "@", host.id, "@", entity.namespace),
 _euid_branch_0_cond = (entity.namespace == "local"),
 _euid_branch_1_formula = COALESCE(CONCAT(user.email,"@",ns), CONCAT(user.id,"@",ns), CONCAT(user.name,"@",user.domain,"@",ns), CONCAT(user.name,"@",ns)),
 targetEntityId = CONCAT("user:", CASE(_euid_branch_0_cond, _euid_branch_0_formula, TRUE, _euid_branch_1_formula, NULL))
```

Three consequences that drive the implementation:

1. **The namespace is derived from the document**, ending in a `_src_entity_namespace` pass-through. For a Workday row `data_stream.dataset: workday.user` → first chunk `workday`. This is why Task 1 is a hard prerequisite rather than cosmetic: the pass-through yields the literal `workday` only once the mapping exists; before Task 1 the explicit `"unknown"` arm is what fires for a source with no matching clause.
2. **The `local` branch outranks everything** and fires when `user.name` AND `host.id` are both present, producing `user:<name>@<host.id>@local`. Workday user rows carry no `host.id`, so branch 1 wins — but the test in Step 1 asserts this, because a future pipeline change adding `host.id` would silently re-key every Workday target.
3. **~25 EVAL columns per row.** This is the cost the domain doc flags (`hostScopedUsersOnly` exists to cut ~35 columns to ~2, measured ~26× faster on a 700M-doc log store). Accepted here: the Workday user inventory is one row per employee (tens of thousands), not a high-volume log stream, and correctness of the EUID ranking outweighs column count at that scale. Do **not** hand-roll a cheaper CONCAT to avoid this — that reintroduces the drift the helper prevents.
- Produces:
  - `buildSupervisesConfigs(lastProcessedTimestamp?: string): RelationshipIntegrationConfig[]` — now returns **three** configs; the new one has `id: 'workday'`.
  - `SUPERVISES_INTEGRATION_RELATIONSHIP_CONFIGS` — the no-watermark variant, now length 3.
  - Task 3 (index.ts description) and Task 4/5 (Scout) depend on `id: 'workday'` and the `logs-workday.user-<ns>` index pattern.

- [ ] **Step 1: Write the failing tests**

Append to `configs.test.ts`. Note the existing file has `EXPECTED_SOURCE_BY_ID` and several `it.each(SUPERVISES_INTEGRATION_RELATIONSHIP_CONFIGS)` blocks that assert raw_identifiers-specific ES|QL (`MV_EXPAND rawTargetKey`, `CONCAT("user:", rawTargetKey, ...)`). Those will now run against the Workday config too and fail — Step 3 fixes that.

Add a dedicated describe block:

```ts
describe('workday (log-inverted) supervises config', () => {
  const getWorkdayConfig = (lastProcessedTimestamp?: string) =>
    buildSupervisesConfigs(lastProcessedTimestamp).find(
      (c): c is OverrideRelationshipIntegrationConfig => c.id === 'workday'
    )!;

  it('is registered alongside the two IDP configs', () => {
    expect(buildSupervisesConfigs().map((c) => c.id).sort()).toEqual([
      'entityanalytics_entra_id',
      'entityanalytics_okta',
      'workday',
    ]);
  });

  it('reads the workday user log data stream, not the entity index', () => {
    expect(getWorkdayConfig().indexPattern('default')).toBe('logs-workday.user-default');
  });

  it('declares a user → user override config with target validation', () => {
    const config = getWorkdayConfig();
    expect(config.kind).toBe('override');
    expect(config.relationshipKey).toBe('supervises');
    expect(config.targetEntityType).toBe('user');
    expect(config.validateTargetIds).toBe(true);
  });

  it('disables the engine lookback because @timestamp is Hire_Date', () => {
    expect(getWorkdayConfig().disableLookbackWindow).toBe(true);
  });

  it('buckets managers, not reports, in step 1', () => {
    expect(getWorkdayConfig().customActor?.fields).toEqual([
      'workday.user.Manager_Email',
      'workday.user.Manager_ID',
    ]);
  });

  it('never reads the Worker_s_Manager display name', () => {
    const query = getWorkdayConfig().esqlQueryOverride('default');
    expect(query).not.toContain('Worker_s_Manager');
    expect(JSON.stringify(getWorkdayConfig().compositeAggAdditionalFilters)).not.toContain(
      'Worker_s_Manager'
    );
  });

  it('emits the engine actor and relationship columns', () => {
    const query = getWorkdayConfig().esqlQueryOverride('default');
    expect(query).toContain('STATS supervises = VALUES(targetEntityId) BY actorUserId');
  });

  it('does not prepend the engine preamble (the engine adds it)', () => {
    expect(getWorkdayConfig().esqlQueryOverride('default')).not.toContain('unmapped_fields');
  });

  it('builds the actor EUID from both manager fields, null-safely', () => {
    const query = getWorkdayConfig().esqlQueryOverride('default');
    // MV_APPEND(null, x) returns null, so each side must fall back when the
    // other is null; an unguarded append drops managers on partial rows.
    expect(query).toContain('MV_APPEND(workday.user.Manager_Email, workday.user.Manager_ID)');
    expect(query).toContain('MV_EXPAND managerKey');
    expect(query).toContain('CONCAT("user:", managerKey, "@workday")');
  });

  it('guards against namespace-only and malformed actor EUIDs', () => {
    const query = getWorkdayConfig().esqlQueryOverride('default');
    expect(query).toContain('actorUserId != "user:@workday"');
    expect(query).toContain('actorUserId RLIKE ".+:.+@.+"');
  });

  it('derives the target EUID via the canonical helper, not a hand-built CONCAT', () => {
    const query = getWorkdayConfig().esqlQueryOverride('default');
    // The helper emits the full user ranking (email > id > name@domain > name)
    // plus the entity.namespace evaluation it depends on.
    expect(query).toContain('targetEntityId =');
    expect(query).toContain('entity.namespace');
    expect(query).not.toContain('CONCAT("user:", user.email');
  });

  it('keeps the full target ranking including the user.domain arm', () => {
    const query = getWorkdayConfig().esqlQueryOverride('default');
    // Workday dissects user.domain from user.email, so the domain arm is
    // unreachable in practice — but it must still be present, because the
    // helper is the guard against the ranking drifting from user.ts.
    expect(query).toContain('user_domain_present');
    expect(query).toContain('user_email_present');
    expect(query).toContain('user_id_present');
  });

  it('emits the host-scoped local branch, which Workday rows must not trigger', () => {
    const query = getWorkdayConfig().esqlQueryOverride('default');
    // The `local` branch outranks the IDP branch and fires on
    // (user.name AND host.id), yielding user:<name>@<host.id>@local. Workday
    // user rows carry no host.id so it never wins, but if the ingest pipeline
    // ever adds one, every Workday target EUID would silently re-key. This
    // assertion documents the dependency; the Scout suite proves the outcome.
    expect(query).toContain('_euid_branch_0_cond');
    expect(query).toContain('"local"');
  });

  it('never filters on @timestamp in either step', () => {
    const config = getWorkdayConfig('2026-09-01T00:00:00.000Z');
    expect(config.esqlQueryOverride('default')).not.toContain('@timestamp');
    expect(JSON.stringify(config.compositeAggAdditionalFilters)).not.toContain('@timestamp');
  });

  describe('first run vs incremental', () => {
    it('scans the full inventory when there is no watermark', () => {
      const config = getWorkdayConfig();
      expect(config.esqlQueryOverride('default')).not.toContain('event.ingested');
      expect(JSON.stringify(config.compositeAggAdditionalFilters)).not.toContain('event.ingested');
    });

    it('narrows both steps to a 30d event.ingested window once a watermark exists', () => {
      const config = getWorkdayConfig('2026-09-01T00:00:00.000Z');
      expect(config.esqlQueryOverride('default')).toContain('event.ingested');
      expect(JSON.stringify(config.compositeAggAdditionalFilters)).toContain('event.ingested');
    });

    it('uses a fixed window rather than the watermark value, so a delayed run cannot open a gap', () => {
      const config = getWorkdayConfig('2026-09-01T00:00:00.000Z');
      expect(config.esqlQueryOverride('default')).not.toContain('2026-09-01T00:00:00.000Z');
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
node scripts/jest x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/supervises/configs.test.ts
```
Expected: FAIL — the new describe block fails (no `workday` config exists), and `getWorkdayConfig()` throws on the non-null assertion.

- [ ] **Step 3: Scope the pre-existing raw_identifiers assertions to the IDP configs**

The existing `it.each(SUPERVISES_INTEGRATION_RELATIONSHIP_CONFIGS)` blocks assert raw_identifiers ES|QL shapes that the Workday config deliberately does not have. Scope them to the entity-index configs.

At the top of the file, after `overrideConfigs` is defined, add:

```ts
// The IDP configs read raw_identifiers off the entity index. The workday config
// is log-inverted and shares none of that query shape, so the raw_identifiers
// assertions below are scoped to these two.
const rawIdentifiersConfigs = SUPERVISES_INTEGRATION_RELATIONSHIP_CONFIGS.filter(
  (c) => c.id !== 'workday'
);
```

Then change every `it.each(...)` that asserts raw_identifiers behaviour to iterate `rawIdentifiersConfigs` instead of `SUPERVISES_INTEGRATION_RELATIONSHIP_CONFIGS`. Specifically, the blocks asserting: `entity.source IN`, `MV_EXPAND rawTargetKey` ordering, `CONCAT("user:", rawTargetKey, "@<ns>")`, `targetEntityId != "user:@<ns>"`, the actor-discovery query shape, and `EXPECTED_SOURCE_BY_ID` lookups.

Leave genuinely universal assertions on the full list — `kind === 'override'`, `relationshipKey === 'supervises'`, `targetEntityType === 'user'` — since the Workday config satisfies all three. Update the "ships exactly the expected IDP integrations" test to expect all three ids.

- [ ] **Step 4: Implement the config**

In `configs.ts`, add above `buildSupervisesConfig`:

```ts
const WORKDAY_MANAGER_EMAIL_FIELD = 'workday.user.Manager_Email';
const WORKDAY_MANAGER_ID_FIELD = 'workday.user.Manager_ID';
const WORKDAY_NAMESPACE = 'workday';
/**
 * Generous against a 24h poll: tolerates sync outages and backfills without
 * losing edges. Declared once as a day count so the DSL and ES|QL forms of the
 * same window cannot drift — Step 1 and Step 2 must narrow identically.
 */
const WORKDAY_INGESTED_LOOKBACK_DAYS = 30;
const WORKDAY_INGESTED_LOOKBACK_DSL = `now-${WORKDAY_INGESTED_LOOKBACK_DAYS}d`;
const WORKDAY_INGESTED_LOOKBACK_ESQL = `NOW() - ${WORKDAY_INGESTED_LOOKBACK_DAYS} day`;

/**
 * Step 2 ES|QL for Workday `supervises`.
 *
 * Workday emits one row per worker naming only that worker's manager, so the
 * relationship must be inverted: the row's own user is the TARGET and the
 * manager is the ACTOR.
 *
 * The actor is a union of two manager fields, which is why this is a
 * `kind: 'override'` config — the standard builder only `MV_EXPAND`s the target,
 * so a multi-valued actor would mis-group under `STATS ... BY actorUserId`.
 *
 * `Worker_s_Manager` is deliberately unused: it is a display name
 * ("Alex Manager (000687)"), not a resolvable identifier.
 *
 * `user:<Manager_ID>@workday` will 404 when the manager entity is keyed by
 * email. That is the intended drop path for managers not in the store.
 */
function buildWorkdaySupervisesEsqlQuery(
  namespace: string,
  lastProcessedTimestamp?: string
): string {
  const logIndex = `logs-workday.user-${namespace}`;
  // The row's own user is the target, so the canonical helper applies directly —
  // it reproduces the full user EUID ranking and emits the entity.namespace
  // evaluation it depends on.
  const targetEuidEval = euid.esql.getEuidEvaluation('user', 'targetEntityId', {
    withTypeId: true,
  });
  // Presence of a watermark means this is not the first run: narrow to recently
  // re-synced workers. A fixed window (not `> lastProcessedTimestamp`) so a
  // delayed or skipped run cannot open a gap.
  const ingestedClause = lastProcessedTimestamp
    ? `\n    AND event.ingested >= ${WORKDAY_INGESTED_LOOKBACK_ESQL}`
    : '';

  return `FROM ${logIndex}
| WHERE (${WORKDAY_MANAGER_EMAIL_FIELD} IS NOT NULL OR ${WORKDAY_MANAGER_ID_FIELD} IS NOT NULL)${ingestedClause}
| EVAL ${targetEuidEval}
| EVAL managerKey = CASE(${WORKDAY_MANAGER_EMAIL_FIELD} IS NULL, ${WORKDAY_MANAGER_ID_FIELD}, ${WORKDAY_MANAGER_ID_FIELD} IS NULL, ${WORKDAY_MANAGER_EMAIL_FIELD}, MV_APPEND(${WORKDAY_MANAGER_EMAIL_FIELD}, ${WORKDAY_MANAGER_ID_FIELD}))
| MV_EXPAND managerKey
| EVAL ${ENGINE_COLUMNS.actor} = CONCAT("user:", managerKey, "@${WORKDAY_NAMESPACE}")
| WHERE COALESCE(${ENGINE_COLUMNS.actor}, "") != ""
    AND ${ENGINE_COLUMNS.actor} != "user:@${WORKDAY_NAMESPACE}"
    AND ${ENGINE_COLUMNS.actor} RLIKE ".+:.+@.+"
    AND COALESCE(targetEntityId, "") != ""
| STATS ${RELATIONSHIP_KEY} = VALUES(targetEntityId) BY ${ENGINE_COLUMNS.actor}
| LIMIT ${COMPOSITE_PAGE_SIZE}`;
}

function buildWorkdaySupervisesConfig(
  lastProcessedTimestamp?: string
): RelationshipIntegrationConfig {
  return {
    kind: 'override',
    id: 'workday',
    name: 'Workday',
    indexPattern: (namespace) => `logs-workday.user-${namespace}`,
    targetEntityType: 'user',
    relationshipKey: RELATIONSHIP_KEY,
    // Managers, not reports: step 1 must bucket the actor.
    customActor: {
      fields: [WORKDAY_MANAGER_EMAIL_FIELD, WORKDAY_MANAGER_ID_FIELD],
    },
    // @timestamp is Hire_Date, so the engine's 30d lookback would select only
    // recently-hired workers. Replaced by the event.ingested window below.
    disableLookbackWindow: true,
    validateTargetIds: true,
    compositeAggAdditionalFilters: [
      {
        bool: {
          should: [
            { exists: { field: WORKDAY_MANAGER_EMAIL_FIELD } },
            { exists: { field: WORKDAY_MANAGER_ID_FIELD } },
          ],
          minimum_should_match: 1,
        },
      },
      ...(lastProcessedTimestamp
        ? [{ range: { 'event.ingested': { gte: WORKDAY_INGESTED_LOOKBACK_DSL } } }]
        : []),
    ],
    esqlQueryOverride: (ns) => buildWorkdaySupervisesEsqlQuery(ns, lastProcessedTimestamp),
  };
}
```

Add the import at the top of the file:
```ts
import { euid } from '@kbn/entity-store/common/euid_helpers';
```

Then extend the exported builder:
```ts
export function buildSupervisesConfigs(
  lastProcessedTimestamp?: string
): RelationshipIntegrationConfig[] {
  return [
    ...SUPERVISES_SOURCES.map((source) => buildSupervisesConfig(source, lastProcessedTimestamp)),
    buildWorkdaySupervisesConfig(lastProcessedTimestamp),
  ];
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run:
```bash
node scripts/jest x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/supervises/configs.test.ts
```

Expected: the new describe block PASSES. Golden snapshot tests will FAIL because `it.each` now includes a third config with no stored snapshot — Task 3 handles snapshots. If any *assertion* about okta/entra content fails (not a missing snapshot), the scoping in Step 3 is incomplete — fix it before proceeding.

- [ ] **Step 6: Commit**

```bash
git add x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/supervises/configs.ts \
        x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/supervises/configs.test.ts
git commit -m "$(cat <<'EOF'
feat(entity-analytics): add Workday supervises log-inverted config

Inverts each Workday worker row (which names only that worker's manager) into
manager -> report edges. Actor is the union of Manager_Email and Manager_ID;
target is the row's own user, resolved via the canonical EUID helper.

First run scans the full inventory; later runs narrow to a 30d event.ingested
window, since @timestamp is Hire_Date and would select only new hires.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Lock the ES|QL with golden snapshots and update the maintainer description

**Files:**
- Modify: `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/supervises/__snapshots__/configs.test.ts.snap`
- Modify: `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/supervises/index.ts:16-18`

**Interfaces:**
- Consumes: the `workday` config from Task 2.
- Produces: no new symbols. Locked snapshots for the Workday query in both first-run and incremental forms.

- [ ] **Step 1: Confirm the existing snapshots are unchanged before regenerating**

Run:
```bash
node scripts/jest x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/supervises/configs.test.ts 2>&1 | tail -40
```

Expected: failures are **only** "New snapshot was not written" for the two `workday` cases. If an okta or entra snapshot shows a diff, stop — Task 2 changed shared code paths it should not have.

- [ ] **Step 2: Write the new snapshots**

Run:
```bash
node scripts/jest x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/supervises/configs.test.ts -u
```

- [ ] **Step 3: Read the generated snapshot and verify it against the spec**

Run:
```bash
git diff x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/supervises/__snapshots__/configs.test.ts.snap
```

Verify, by eye, on the two new `workday` entries:
- `FROM logs-workday.user-__namespace__`
- No `SET unmapped_fields` in the `esqlQueryOverride` variant (the `buildTargetsPerActorQuery` variant DOES have it — the engine prepends it there).
- `MV_EXPAND managerKey` appears **before** `CONCAT("user:", managerKey, "@workday")`.
- `STATS supervises = VALUES(targetEntityId) BY actorUserId`.
- No `Worker_s_Manager`, no `@timestamp`.
- The no-watermark snapshot has **no** `event.ingested`; the watermark snapshot **has** it.
- The target EUID assignment references `user.email`, `user.id`, `user.name`, `user.domain` and `entity.namespace` (proving the helper's full ranking is in play, not a hand-built CONCAT).
- Okta and entra snapshots are byte-identical to before (no diff lines on them).

If any check fails, fix `configs.ts` and regenerate rather than accepting the snapshot.

- [ ] **Step 4: Update the maintainer description**

In `index.ts`, replace lines 16-18:

```ts
  description:
    'Resolves supervises (user → user) relationships. ' +
    'Okta and Entra ID: from raw_identifiers on entity documents. ' +
    'Workday: from user log documents, inverting each worker\'s manager fields into manager-keyed edges.',
```

Leave `interval: '1d'` and `timeout: '1h'` unchanged — the 1h timeout already covers the first-run full scan.

- [ ] **Step 5: Run the full maintainers test suite**

Run:
```bash
node scripts/jest x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers
```
Expected: PASS. This catches any engine-level test that enumerates registered configs.

- [ ] **Step 6: Type check and lint**

Run:
```bash
node scripts/type_check --project x-pack/solutions/security/plugins/security_solution/tsconfig.json
node scripts/eslint x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/supervises/
```
Expected: no errors. Fix any root causes; do not suppress.

- [ ] **Step 7: Commit**

```bash
git add x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/supervises/
git commit -m "$(cat <<'EOF'
test(entity-analytics): lock Workday supervises ES|QL with golden snapshots

Also extends the maintainer description to cover the log-inverted Workday
source alongside the two raw_identifiers IDP sources.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Generalize the Scout log-seeding helper

`seedLogDocument` currently hardcodes `host.id` / `host.name` / `event.category: ['host']`, which cannot express a user-target Workday row, and sets only `@timestamp` — so the `event.ingested` incremental path is untestable.

**Files:**
- Modify: `x-pack/solutions/security/plugins/security_solution/test/scout/entity_analytics/api/fixtures/maintainers/helpers.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  ```ts
  interface SeedLogDocumentOptions {
    index: string;
    integrationFields: Record<string, unknown>;
    timestamp?: string;
    eventIngested?: string;
    event?: Record<string, unknown>;
    hostId?: string;
    hostName?: string;
  }
  export const seedLogDocument: (esClient: EsClient, options: SeedLogDocumentOptions) => Promise<void>;
  ```
  Task 5 calls this with `index`, `integrationFields`, `timestamp`, `eventIngested`, and `event`.

- [ ] **Step 1: Read the current helper**

Run:
```bash
grep -n "SeedLogDocumentOptions" -A 45 x-pack/solutions/security/plugins/security_solution/test/scout/entity_analytics/api/fixtures/maintainers/helpers.ts
```

Note it is consumed by `log_inverted_relationship_maintainer.spec.ts` (the Entra ID `owns` suite), which passes `hostId` / `hostName`. That call site must keep working unchanged.

- [ ] **Step 2: Make host fields optional and add `event.ingested` + event override**

Replace the interface and function with:

```ts
interface SeedLogDocumentOptions {
  /** `logs-*` data-stream target; `op_type: 'create'` is required. */
  index: string;
  /**
   * Integration-specific fields merged into the document root. For plain-object
   * mapped fields (e.g. `device.registered_owners`), pass flattened parallel
   * arrays to match how Elasticsearch stores them at ingest time.
   */
  integrationFields: Record<string, unknown>;
  /** Defaults to 5 minutes ago (within the 30d lookback window). */
  timestamp?: string;
  /**
   * Written to `event.ingested`. Required for maintainers that gate on sync
   * recency rather than `@timestamp` (e.g. Workday, whose `@timestamp` carries
   * Hire_Date). Defaults to `timestamp`.
   */
  eventIngested?: string;
  /** Overrides the default `{ kind: 'asset', category: [...] }` block. */
  event?: Record<string, unknown>;
  /** Written to `host.id` — becomes the `host:<id>` target EUID. Omit for user-target rows. */
  hostId?: string;
  hostName?: string;
}

/** Seeds one log document with ECS scaffolding plus integration-specific fields. */
export const seedLogDocument = async (
  esClient: EsClient,
  {
    index,
    hostId,
    hostName,
    integrationFields,
    timestamp,
    eventIngested,
    event,
  }: SeedLogDocumentOptions
): Promise<void> => {
  const ts = timestamp ?? new Date(Date.now() - 5 * 60_000).toISOString();
  const host =
    hostId !== undefined || hostName !== undefined
      ? { host: { ...(hostId !== undefined && { id: hostId }), ...(hostName !== undefined && { name: hostName }) } }
      : {};

  await esClient.index({
    index,
    op_type: 'create',
    refresh: 'wait_for',
    document: {
      '@timestamp': ts,
      event: { kind: 'asset', category: ['host'], ingested: eventIngested ?? ts, ...event },
      ...host,
      ...integrationFields,
    },
  });
};
```

Note `...event` spreads **after** the defaults so a caller can override `category`, and `ingested` is inside the same object so a caller-supplied `event` block does not erase it unless it sets `ingested` itself.

- [ ] **Step 3: Verify the existing Entra ID owns suite still compiles**

Run:
```bash
node scripts/type_check --project x-pack/solutions/security/plugins/security_solution/tsconfig.json
```
Expected: no errors. The existing call site passes `hostId`/`hostName`, which are still accepted.

- [ ] **Step 4: Lint**

Run:
```bash
node scripts/eslint x-pack/solutions/security/plugins/security_solution/test/scout/entity_analytics/api/fixtures/maintainers/helpers.ts
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add x-pack/solutions/security/plugins/security_solution/test/scout/entity_analytics/api/fixtures/maintainers/helpers.ts
git commit -m "$(cat <<'EOF'
test(entity-analytics): let seedLogDocument express user-target log rows

Host fields become optional and event.ingested is settable, so suites can seed
documents for maintainers that gate on sync recency rather than @timestamp.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Scout API suite for the Workday `supervises` maintainer

A new file is mandatory: `scout_max_one_describe` forbids a second suite registration in `log_inverted_relationship_maintainer.spec.ts`.

**Files:**
- Create: `x-pack/solutions/security/plugins/security_solution/test/scout/entity_analytics/api/tests/maintainers/workday_supervises_maintainer.spec.ts`

**Interfaces:**
- Consumes: `seedLogDocument` (Task 4); the `workday` config (Task 2); the `workday` namespace (Task 1). Existing helpers from `../../fixtures/maintainers/helpers`: `clearEntityStoreIndices`, `seedUserEntity`, `triggerMaintainerRun`, `waitForRelationshipIds`, `waitForEntityStoreRunning`, `getRelationshipIds`, `assertNoRelationshipId`. Constants from `../../fixtures/maintainers/constants`: `PUBLIC_HEADERS`, `INTERNAL_HEADERS`, `ENTITY_STORE_ROUTES`, `ENTITY_STORE_TAGS`.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Read the reference suite's lifecycle scaffolding**

Run:
```bash
sed -n '80,160p' x-pack/solutions/security/plugins/security_solution/test/scout/entity_analytics/api/tests/maintainers/log_inverted_relationship_maintainer.spec.ts
```

Copy its `beforeAll` / `afterAll` structure verbatim in spirit: `asInteractiveUser('admin')`, `clearEntityStoreIndices`, `deleteByQuery` on the log index, install, `waitForEntityStoreRunning`, then maintainer init. These are load-bearing — the `running` status flips before the latest alias is ready, and the install route needs admin privileges.

- [ ] **Step 2: Write the suite**

Create the file with this content:

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
  seedLogDocument,
  triggerMaintainerRun,
  waitForRelationshipIds,
  waitForEntityStoreRunning,
  getRelationshipIds,
  assertNoRelationshipId,
} from '../../fixtures/maintainers/helpers';

const LOG_INDEX = 'logs-workday.user-default';
const NAMESPACE = 'workday';
const ENTITY_SOURCE = 'workday';
const RELATIONSHIP_KEY = 'supervises';
const MAINTAINER_ID = 'supervises';

/** Workday's ingest pipeline sets @timestamp from Hire_Date, so it is deliberately stale. */
const HIRE_DATE = '2024-03-19T00:00:00.000Z';

interface WorkdayRow {
  userEmail: string;
  managerEmail?: string;
  managerId?: string;
}

const seedWorkdayRow = async (
  esClient: Parameters<typeof seedLogDocument>[0],
  { userEmail, managerEmail, managerId }: WorkdayRow
) =>
  seedLogDocument(esClient, {
    index: LOG_INDEX,
    timestamp: HIRE_DATE,
    eventIngested: new Date(Date.now() - 5 * 60_000).toISOString(),
    event: { kind: 'asset', category: ['iam'], type: ['user'] },
    integrationFields: {
      user: { email: userEmail },
      data_stream: { dataset: 'workday.user' },
      workday: {
        user: {
          ...(managerEmail !== undefined && { Manager_Email: managerEmail }),
          ...(managerId !== undefined && { Manager_ID: managerId }),
          // Display name, never a resolvable identity — seeded to prove it is ignored.
          Worker_s_Manager: 'Alex Manager (000687)',
        },
      },
    },
  });

apiTest.describe(
  'Entity Store supervises maintainer (workday, log-inverted)',
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
        index: LOG_INDEX,
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

      const initResponse = await apiClient.post(
        ENTITY_STORE_ROUTES.internal.ENTITY_MAINTAINERS_INIT,
        { headers: internalHeaders, responseType: 'json', body: {} }
      );
      expect([200, 201]).toContain(initResponse.statusCode);
    });

    apiTest.afterAll(async ({ apiClient, esClient }) => {
      await esClient
        .deleteByQuery({
          index: LOG_INDEX,
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
      'writes one report onto the manager entity',
      async ({ apiClient, esClient }) => {
        const runId = randomUUID().slice(0, 8);
        const managerEmail = `bob.${runId}@example.com`;
        const reportEmail = `alice.${runId}@example.com`;
        const managerEntityId = `user:${managerEmail}@${NAMESPACE}`;
        const reportEntityId = `user:${reportEmail}@${NAMESPACE}`;

        await seedUserEntity(esClient, {
          entityId: managerEntityId,
          namespace: NAMESPACE,
          email: managerEmail,
          entitySource: ENTITY_SOURCE,
        });
        await seedUserEntity(esClient, {
          entityId: reportEntityId,
          namespace: NAMESPACE,
          email: reportEmail,
          entitySource: ENTITY_SOURCE,
        });
        await seedWorkdayRow(esClient, { userEmail: reportEmail, managerEmail });

        await triggerMaintainerRun(apiClient, internalHeaders, MAINTAINER_ID, { sync: true });

        await waitForRelationshipIds(esClient, RELATIONSHIP_KEY, managerEntityId, reportEntityId);
        const ids = await getRelationshipIds(esClient, RELATIONSHIP_KEY, managerEntityId);
        expect(ids).toStrictEqual([reportEntityId]);
      }
    );

    apiTest(
      'collapses a shared manager into one actor write with both reports',
      async ({ apiClient, esClient }) => {
        const runId = randomUUID().slice(0, 8);
        const managerEmail = `shared.${runId}@example.com`;
        const firstReport = `first.${runId}@example.com`;
        const secondReport = `second.${runId}@example.com`;
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
        await waitForRelationshipIds(esClient, RELATIONSHIP_KEY, managerEntityId, secondEntityId);
        const ids = await getRelationshipIds(esClient, RELATIONSHIP_KEY, managerEntityId);
        expect(ids.sort()).toStrictEqual([firstEntityId, secondEntityId].sort());
      }
    );

    apiTest(
      'writes nothing for a worker with no manager fields',
      async ({ apiClient, esClient }) => {
        const runId = randomUUID().slice(0, 8);
        const loneEmail = `lone.${runId}@example.com`;
        const loneEntityId = `user:${loneEmail}@${NAMESPACE}`;

        await seedUserEntity(esClient, {
          entityId: loneEntityId,
          namespace: NAMESPACE,
          email: loneEmail,
          entitySource: ENTITY_SOURCE,
        });
        await seedWorkdayRow(esClient, { userEmail: loneEmail });

        await triggerMaintainerRun(apiClient, internalHeaders, MAINTAINER_ID, { sync: true });

        const ids = await getRelationshipIds(esClient, RELATIONSHIP_KEY, loneEntityId);
        expect(ids).toStrictEqual([]);
      }
    );

    apiTest(
      'drops the edge when the manager is not in the entity store',
      async ({ apiClient, esClient }) => {
        const runId = randomUUID().slice(0, 8);
        const reportEmail = `orphan.${runId}@example.com`;
        const absentManagerEmail = `absent.${runId}@example.com`;
        const reportEntityId = `user:${reportEmail}@${NAMESPACE}`;
        const absentManagerEntityId = `user:${absentManagerEmail}@${NAMESPACE}`;

        // Only the report exists; the manager is deliberately never seeded.
        await seedUserEntity(esClient, {
          entityId: reportEntityId,
          namespace: NAMESPACE,
          email: reportEmail,
          entitySource: ENTITY_SOURCE,
        });
        await seedWorkdayRow(esClient, {
          userEmail: reportEmail,
          managerEmail: absentManagerEmail,
        });

        await triggerMaintainerRun(apiClient, internalHeaders, MAINTAINER_ID, { sync: true });

        // The write 404s rather than minting a manager entity from a foreign key.
        await assertNoRelationshipId(
          esClient,
          RELATIONSHIP_KEY,
          absentManagerEntityId,
          reportEntityId
        );
      }
    );

    apiTest(
      'resolves a worker whose Hire_Date is years old but whose event.ingested is recent',
      async ({ apiClient, esClient }) => {
        // Regression guard for the Hire_Date trap: if the config ever falls back
        // to the engine's @timestamp lookback, this row is excluded and no edge
        // is written.
        const runId = randomUUID().slice(0, 8);
        const managerEmail = `tenured.mgr.${runId}@example.com`;
        const reportEmail = `tenured.${runId}@example.com`;
        const managerEntityId = `user:${managerEmail}@${NAMESPACE}`;
        const reportEntityId = `user:${reportEmail}@${NAMESPACE}`;

        await seedUserEntity(esClient, {
          entityId: managerEntityId,
          namespace: NAMESPACE,
          email: managerEmail,
          entitySource: ENTITY_SOURCE,
        });
        await seedUserEntity(esClient, {
          entityId: reportEntityId,
          namespace: NAMESPACE,
          email: reportEmail,
          entitySource: ENTITY_SOURCE,
        });
        // HIRE_DATE is 2024; event.ingested is minutes ago.
        await seedWorkdayRow(esClient, { userEmail: reportEmail, managerEmail });

        await triggerMaintainerRun(apiClient, internalHeaders, MAINTAINER_ID, { sync: true });

        await waitForRelationshipIds(esClient, RELATIONSHIP_KEY, managerEntityId, reportEntityId);
      }
    );
  }
);
```

- [ ] **Step 3: Type check and lint**

Run:
```bash
node scripts/type_check --project x-pack/solutions/security/plugins/security_solution/tsconfig.json
node scripts/eslint x-pack/solutions/security/plugins/security_solution/test/scout/entity_analytics/api/tests/maintainers/workday_supervises_maintainer.spec.ts
```

Expected: no errors. If `seedUserEntity`'s option names differ from those used here, read its interface in `helpers.ts` and adapt the call sites — do not change the helper.

- [ ] **Step 4: Start a Scout stack once**

Run (leave running in a separate terminal):
```bash
node scripts/scout start-server --arch stateful --domain classic
```

- [ ] **Step 5: Run the suite against the running stack**

Run:
```bash
node scripts/scout run-tests --arch stateful --domain classic \
  --testFiles x-pack/solutions/security/plugins/security_solution/test/scout/entity_analytics/api/tests/maintainers/workday_supervises_maintainer.spec.ts
```

Expected: 5 passing tests.

Debugging notes if tests fail:
- **All tests write no relationships** → most likely the `workday` namespace mapping (Task 1) is not in effect, so seeded entities key as `@unknown` while the maintainer emits `@workday`. Verify by querying a seeded entity's `entity.id` in the latest index.
- **The Hire_Date test alone fails** → the `@timestamp` lookback is being applied; confirm `disableLookbackWindow: true` is on the Workday config.
- **`index_not_found_exception` on the log index** → the first `seedLogDocument` creates the data stream; ensure `beforeAll` used `ignore_unavailable: true` on the pre-clean.

- [ ] **Step 6: Commit**

```bash
git add x-pack/solutions/security/plugins/security_solution/test/scout/entity_analytics/api/tests/maintainers/workday_supervises_maintainer.spec.ts
git commit -m "$(cat <<'EOF'
test(entity-analytics): Scout coverage for Workday supervises maintainer

Covers no manager, one report, shared manager, manager absent from the store,
and a stale-Hire_Date row with recent event.ingested as a regression guard
against the @timestamp lookback.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Full-scope validation

**Files:** none modified.

**Interfaces:** consumes everything above.

- [ ] **Step 1: Run the repo's scoped check**

Run:
```bash
node scripts/check.js --scope=branch
```
Expected: PASS (Jest, types, lint over the branch's changes).

- [ ] **Step 2: Confirm the Entra ID owns suite is unbroken**

Task 4 changed a shared Scout helper. Run:
```bash
node scripts/scout run-tests --arch stateful --domain classic \
  --testFiles x-pack/solutions/security/plugins/security_solution/test/scout/entity_analytics/api/tests/maintainers/log_inverted_relationship_maintainer.spec.ts
```
Expected: PASS, unchanged.

- [ ] **Step 3: Verify the spec's DoD**

Re-read the ticket's Definition of Done and confirm each item:
- [ ] Workday `supervises.ids` populated on the **manager** entity (Task 5, test 1)
- [ ] One manager with N reports → one actor write with N targets (Task 5, test 2)
- [ ] `Worker_s_Manager` unused (Task 2 assertion) and the 30d `@timestamp` lookback not applied (Task 2 assertion + Task 5, test 5)
- [ ] Explicit `workday` namespace mapping (Task 1)
- [ ] Unit tests (config + ES|QL snapshot) (Tasks 2–3); Scout coverage for no manager, one report, shared manager, manager missing from store (Task 5)
- [ ] Okta/Entra `supervises` behaviour unchanged (Task 3, Step 1 + Step 3 snapshot review)

- [ ] **Step 4: Commit any fixes**

If steps 1–3 required changes, commit them with a descriptive message. If nothing changed, skip.

---

## Notes carried from the spec

- **Additive writes.** A worker outside the incremental window keeps their edge; nothing is retracted by non-observation. Stale edges on departure are a known, accepted limitation tracked in [kibana#292358](https://github.com/elastic/kibana/issues/292358). Do not attempt retraction here.
- **`matchExistingTargetIds` is an unbounded terms query.** Pre-existing engine risk that `validateTargetIds: true` exercises. Not in scope, but do not make it worse.
- **`event.ingested` is mapped via the managed `ecs@mappings` component template**, not declared in the Workday package's `fields/*.yml`. That is standard for package-spec 3.x. If the incremental path ever silently matches nothing in a real deployment, check this first.
