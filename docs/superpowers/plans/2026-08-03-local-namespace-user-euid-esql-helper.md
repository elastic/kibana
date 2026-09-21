# Local-Namespace User EUID ES|QL Helper Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the hardcoded local-namespace user EUID expression from `buildLocalNamespaceFastPathEsql` into a schema-derived helper `getLocalNamespaceUserEuidEsql` in `euid/esql.ts`, then wire `buildLocalNamespaceFastPathEsql` to call it.

**Architecture:** Add one exported function to `euid/esql.ts` that reads the `userEntityDefinition`'s local-namespace branch to produce the canonical EUID EVAL assignment and the corresponding presence gate — keeping both in sync with the schema definition. `buildLocalNamespaceFastPathEsql` in the maintainer engine replaces its hardcoded `CONCAT` and sort logic with a call to the new helper.

**Tech Stack:** TypeScript, Jest, ES|QL string generation, existing `userEntityDefinition` and `euid/esql.ts` patterns.

## Global Constraints

- No `any` types; no `@ts-ignore` / `@ts-expect-error`; no `eslint-disable`.
- New exports must be added to `euid/index.ts` if they are consumed by cross-plugin callers.
- Jest config: `node scripts/jest x-pack/solutions/security/plugins/entity_store/common/domain/euid/esql.test.ts`
- Jest config for maintainer engine: `node scripts/jest x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/build_targets_per_actor_query.test.ts`
- Type check: `node scripts/type_check --project x-pack/solutions/security/plugins/entity_store/tsconfig.json` and `node scripts/type_check --project x-pack/solutions/security/plugins/security_solution/tsconfig.json`
- Do not reformat unrelated code; follow existing file formatting.

---

## File Map

| File | Change |
|---|---|
| `x-pack/solutions/security/plugins/entity_store/common/domain/euid/esql.ts` | Add `getLocalNamespaceUserEuidEsql` |
| `x-pack/solutions/security/plugins/entity_store/common/domain/euid/index.ts` | Export `getLocalNamespaceUserEuidEsql` |
| `x-pack/solutions/security/plugins/entity_store/common/domain/euid/esql.test.ts` | Add tests for `getLocalNamespaceUserEuidEsql` |
| `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/build_targets_per_actor_query.ts` | Replace hardcoded actor EVAL with `getLocalNamespaceUserEuidEsql` call |

---

## Task 1: Add `getLocalNamespaceUserEuidEsql` to `euid/esql.ts` with tests

**Files:**
- Modify: `x-pack/solutions/security/plugins/entity_store/common/domain/euid/esql.ts`
- Modify: `x-pack/solutions/security/plugins/entity_store/common/domain/euid/esql.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  /**
   * Returns the ES|QL EVAL assignment and actor presence gate for a local-namespace user EUID.
   *
   * The EVAL expression is derived from the first (local) branch of `userEntityDefinition.identityField.euidRanking`:
   *   `user:<user.name>@<host.id>@local`
   *
   * @param outputColumn - Name of the EVAL output column (e.g. `"actorUserId"`)
   * @param presenceFields - Fields to include in the OR presence gate (e.g. `['user.email', 'user.name']`).
   *   `user.name` is always placed first in the COALESCE regardless of order here,
   *   because the canonical local EUID uses `user.name` as its primary identifier.
   *   `user.email` (if present) serves as a presence gate only — never as the primary EUID field.
   * @returns `{ evalAssignment: string; presenceGate: string }`
   *   - `evalAssignment` — bare RHS to use in `| EVAL <outputColumn> = <evalAssignment>`,
   *     e.g. `CONCAT("user:", COALESCE(TO_STRING(\`user.name\`), TO_STRING(\`user.email\`)), "@", TO_STRING(\`host.id\`), "@local")`
   *   - `presenceGate` — OR-joined IS NOT NULL / != "" checks for `presenceFields`,
   *     e.g. `(\`user.name\` IS NOT NULL AND \`user.name\` != "") OR (\`user.email\` IS NOT NULL AND \`user.email\` != "")`
   */
  export function getLocalNamespaceUserEuidEsql(
    outputColumn: string,
    presenceFields: string[]
  ): { evalAssignment: string; presenceGate: string }
  ```

**Implementation notes:**
- The local-namespace branch of `userEntityDefinition.identityField.euidRanking.branches[0]` has ranking `[user.name, @, host.id, @, entity.namespace]`.
- No runtime drift guard. If the user definition's local branch changes, the unit tests in this task break loudly at CI time — that is the correct feedback loop. A throw inside a query builder adds a failure mode at query-build time for zero benefit.
- `user.name` must always be first in the COALESCE, regardless of `presenceFields` order.
- `host.id` is part of the canonical local EUID — not a caller parameter.
- `@local` comes from `USER_ENTITY_NAMESPACE.Local` so the literal is not duplicated.

- [ ] **Step 1: Write the failing tests**

Add a new `describe('getLocalNamespaceUserEuidEsql', ...)` block at the bottom of `esql.test.ts`:

```typescript
import {
  getEuidEsqlEvaluation,
  getEuidEsqlDocumentsContainsIdFilter,
  getEuidEsqlFilterBasedOnDocument,
  getFieldEvaluationsEsql,
  getFieldEvaluationsEsqlFromDefinition,
  collectRankingFields,
  buildRankingCaseEsql,
  buildSourcePickerEsql,
  buildDestinationFieldEsql,
  buildOneFieldEvaluationEsql,
  getLocalNamespaceUserEuidEsql,  // ADD THIS
} from './esql';
```

```typescript
describe('getLocalNamespaceUserEuidEsql', () => {
  describe('evalAssignment', () => {
    it('emits CONCAT with user.name first when only user.name provided', () => {
      const { evalAssignment } = getLocalNamespaceUserEuidEsql('actorUserId', ['user.name']);
      expect(evalAssignment).toBe(
        'CONCAT("user:", COALESCE(TO_STRING(`user.name`)), "@", TO_STRING(`host.id`), "@local")'
      );
    });

    it('emits COALESCE(user.name, user.email) when both provided in any order', () => {
      const { evalAssignment: a } = getLocalNamespaceUserEuidEsql('actorUserId', ['user.email', 'user.name']);
      const { evalAssignment: b } = getLocalNamespaceUserEuidEsql('actorUserId', ['user.name', 'user.email']);
      const expected =
        'CONCAT("user:", COALESCE(TO_STRING(`user.name`), TO_STRING(`user.email`)), "@", TO_STRING(`host.id`), "@local")';
      expect(a).toBe(expected);
      expect(b).toBe(expected);
    });

    it('wraps in EVAL assignment using the supplied outputColumn', () => {
      const { evalAssignment } = getLocalNamespaceUserEuidEsql('myActor', ['user.name']);
      expect(evalAssignment).toContain('CONCAT("user:"');
    });
  });

  describe('presenceGate', () => {
    it('emits single IS NOT NULL check for one field', () => {
      const { presenceGate } = getLocalNamespaceUserEuidEsql('actorUserId', ['user.name']);
      expect(presenceGate).toBe(
        '(`user.name` IS NOT NULL AND `user.name` != "")'
      );
    });

    it('emits OR-joined checks for two fields preserving caller order in gate', () => {
      const { presenceGate } = getLocalNamespaceUserEuidEsql('actorUserId', ['user.email', 'user.name']);
      expect(presenceGate).toBe(
        '(`user.email` IS NOT NULL AND `user.email` != "") OR (`user.name` IS NOT NULL AND `user.name` != "")'
      );
    });
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
node scripts/jest x-pack/solutions/security/plugins/entity_store/common/domain/euid/esql.test.ts --testNamePattern="getLocalNamespaceUserEuidEsql"
```

Expected: FAIL — `getLocalNamespaceUserEuidEsql is not a function`

- [ ] **Step 3: Implement `getLocalNamespaceUserEuidEsql` in `esql.ts`**

Add after the existing `getFieldEvaluationsEsql` function, before the file ends. Import `USER_ENTITY_NAMESPACE` and `userEntityDefinition` at the top of the file:

```typescript
import { USER_ENTITY_NAMESPACE } from '../definitions/user_entity_constants';
import { userEntityDefinition } from '../definitions/user';
```

Then add the function:

```typescript
/**
 * Returns the ES|QL EVAL assignment and actor presence gate for the canonical
 * local-namespace user EUID: `user:<user.name>@<host.id>@local`.
 *
 * Derived from the first (local) branch of `userEntityDefinition.identityField.euidRanking`
 * so it stays in sync with the entity store's user identity definition. A runtime
 * guard throws if the definition's local branch structure has drifted from the
 * expected `[user.name, @, host.id, @, entity.namespace]` shape.
 *
 * @param outputColumn - Name of the EVAL output column (e.g. `"actorUserId"`).
 * @param presenceFields - Fields for the OR presence gate (e.g. `['user.email', 'user.name']`).
 *   `user.name` is always sorted first in the COALESCE — the canonical local EUID
 *   uses `user.name` as primary; `user.email` is presence-only.
 * @returns `{ evalAssignment, presenceGate }`
 */
export function getLocalNamespaceUserEuidEsql(
  outputColumn: string,
  presenceFields: readonly string[]
): { evalAssignment: string; presenceGate: string } {
  // Verify the local branch is still [user.name, @, host.id, @, entity.namespace].
  const identityField = userEntityDefinition.identityField;
  if ('singleField' in identityField) {
    throw new Error('getLocalNamespaceUserEuidEsql: userEntityDefinition uses singleField identity — expected euidRanking');
  }
  const localBranch = identityField.euidRanking.branches[0];
  const localRanking = localBranch?.ranking?.[0];
  const expectedFields = ['user.name', 'host.id', 'entity.namespace'];
  const actualEuidFields = localRanking
    ?.filter((a): a is { field: string } => 'field' in a)
    .map((a) => a.field);
  if (
    !actualEuidFields ||
    expectedFields.some((f, i) => actualEuidFields[i] !== f)
  ) {
    throw new Error(
      `getLocalNamespaceUserEuidEsql: local branch ranking has drifted from expected ` +
        `[user.name, host.id, entity.namespace]. Got: ${JSON.stringify(actualEuidFields)}. ` +
        `Update this function to match the new definition.`
    );
  }

  // user.name must always be first in COALESCE — canonical local EUID is
  // user:<user.name>@<host.id>@local. user.email (if present) is a presence gate
  // field only; placing it first would produce user:email@host@local and cause 404s.
  const sortedFields = [...presenceFields].sort((a, b) =>
    a === 'user.name' ? -1 : b === 'user.name' ? 1 : 0
  );

  const coalesceArgs = sortedFields.map((f) => `TO_STRING(\`${f}\`)`).join(', ');
  const coalesce = sortedFields.length === 1 ? `TO_STRING(\`${sortedFields[0]}\`)` : `COALESCE(${coalesceArgs})`;
  const evalAssignment = `CONCAT("user:", ${coalesce}, "@", TO_STRING(\`host.id\`), "@${USER_ENTITY_NAMESPACE.Local}")`;

  const presenceGate = presenceFields
    .map((f) => `(\`${f}\` IS NOT NULL AND \`${f}\` != "")`)
    .join(' OR ');

  return { evalAssignment, presenceGate };
}
```

- [ ] **Step 4: Export from `euid/index.ts`**

```typescript
export {
  getEuidEsqlDocumentsContainsIdFilter,
  getEuidEsqlEvaluation,
  getEuidEsqlFilterBasedOnDocument,
  getFieldEvaluationsEsql,
  getLocalNamespaceUserEuidEsql,  // ADD THIS
} from './esql';
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
node scripts/jest x-pack/solutions/security/plugins/entity_store/common/domain/euid/esql.test.ts --testNamePattern="getLocalNamespaceUserEuidEsql"
```

Expected: PASS (all `getLocalNamespaceUserEuidEsql` tests green)

- [ ] **Step 6: Run full esql.test.ts to confirm no regressions**

```bash
node scripts/jest x-pack/solutions/security/plugins/entity_store/common/domain/euid/esql.test.ts
```

Expected: all tests pass (including pre-existing snapshot tests)

- [ ] **Step 7: Type-check entity_store**

```bash
node scripts/type_check --project x-pack/solutions/security/plugins/entity_store/tsconfig.json
```

Expected: no errors

- [ ] **Step 8: Commit**

```bash
git add \
  x-pack/solutions/security/plugins/entity_store/common/domain/euid/esql.ts \
  x-pack/solutions/security/plugins/entity_store/common/domain/euid/index.ts \
  x-pack/solutions/security/plugins/entity_store/common/domain/euid/esql.test.ts
git commit -m "feat(entity-store): add getLocalNamespaceUserEuidEsql helper to euid/esql"
```

---

## Task 2: Wire `buildLocalNamespaceFastPathEsql` to use the new helper

**Files:**
- Modify: `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/build_targets_per_actor_query.ts`

**Interfaces:**
- Consumes: `getLocalNamespaceUserEuidEsql(outputColumn: string, presenceFields: readonly string[]): { evalAssignment: string; presenceGate: string }` from `@kbn/entity-store/common/euid_helpers` (via the `euid` re-export) or directly from `@kbn/entity-store/common/domain/euid`.

Check how `esql.ts` exports are currently consumed in this file:

```typescript
import { euid } from '@kbn/entity-store/common/euid_helpers';
```

`getLocalNamespaceUserEuidEsql` needs to be available on `euid.esql` or imported directly. Check `euid_helpers.ts` to confirm:

```bash
grep -n "getLocalNamespaceUserEuidEsql\|euid_helpers" \
  x-pack/solutions/security/plugins/entity_store/common/euid_helpers.ts | head -20
```

If `euid_helpers.ts` re-exports from `./domain/euid`, the new export propagates automatically. If not, add it. Either way, the import in `build_targets_per_actor_query.ts` will be:

```typescript
import { getLocalNamespaceUserEuidEsql } from '@kbn/entity-store/common/domain/euid';
```

- [ ] **Step 1: Check how `euid_helpers.ts` is structured**

```bash
grep -n "getLocalNamespaceUserEuidEsql\|esql\|from.*domain/euid" \
  x-pack/solutions/security/plugins/entity_store/common/euid_helpers.ts | head -30
```

If `euid.esql.getLocalNamespaceUserEuidEsql` is not exposed, add a direct import in `build_targets_per_actor_query.ts`:

```typescript
import { getLocalNamespaceUserEuidEsql } from '@kbn/entity-store/common/domain/euid';
```

- [ ] **Step 2: Replace the hardcoded actor EVAL block in `buildLocalNamespaceFastPathEsql`**

Current code to replace (lines 146–168):

```typescript
const actorFields = config.customActor?.fields ?? ['user.name'];

const actorPresenceGate = actorFields
  .map((f) => `(\`${f}\` IS NOT NULL AND \`${f}\` != "")`)
  .join(' OR ');

// ...

const eidFields = [...actorFields].sort((a, b) =>
  a === 'user.name' ? -1 : b === 'user.name' ? 1 : 0
);
const coalesceArgs = eidFields.map((f) => `TO_STRING(\`${f}\`)`).join(', ');
const actorEval = `| EVAL ${ENGINE_COLUMNS.actor} = CONCAT("user:", COALESCE(${coalesceArgs}), "@", TO_STRING(\`host.id\`), "@local")`;
```

Replace with:

```typescript
const actorFields = config.customActor?.fields ?? ['user.name'];

const { evalAssignment: actorEvalAssignment, presenceGate: actorPresenceGate } =
  getLocalNamespaceUserEuidEsql(ENGINE_COLUMNS.actor, actorFields);
const actorEval = `| EVAL ${ENGINE_COLUMNS.actor} = ${actorEvalAssignment}`;
```

The `targetGate`, `targetEval`, `statsClause`, and the returned template string remain unchanged.

Also remove the now-unused comment block about field ordering (lines 159–163) since that reasoning now lives in the JSDoc of `getLocalNamespaceUserEuidEsql`.

- [ ] **Step 3: Run the existing `build_targets_per_actor_query` tests**

```bash
node scripts/jest x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/build_targets_per_actor_query.test.ts
```

Expected: all tests pass (snapshot tests will auto-match since the output is unchanged)

- [ ] **Step 4: Run the maintainer engine snapshot tests**

If there are snapshot files for `build_targets_per_actor_query`, confirm they are unchanged:

```bash
node scripts/jest x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers --testNamePattern="buildTargetsPerActorQuery"
```

Expected: pass with no snapshot diffs

- [ ] **Step 5: Type-check security_solution**

```bash
node scripts/type_check --project x-pack/solutions/security/plugins/security_solution/tsconfig.json
```

Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add \
  x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/engine/build_targets_per_actor_query.ts
git commit -m "refactor(maintainers): use getLocalNamespaceUserEuidEsql in fast-path builder"
```
