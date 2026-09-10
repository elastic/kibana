# v3 migration — type-level testing plan

> **Status:** Plan only. No type tests implemented yet.  
> **Verification command:** `node scripts/type_check --project src/core/packages/saved-objects/migration-server-internal/tsconfig.json`  
> **Sibling docs:** [`README.md`](./README.md) (architecture), [`STRESS_TEST_REPORT.md`](./STRESS_TEST_REPORT.md) (pressure points)

---

## 1. Why

The v3 saved-object migration runner is a mission-critical control-flow algorithm: a wrong transition can corrupt indices, lose data, or wedge an upgrade. The POC’s central bet is that **the static type system is part of the production contract**, not documentation — the same list as README § “Static — the type system”: transitions cannot return states outside `SUCCESSORS`; `transitionTo` cannot omit required target fields or smuggle unknown ones; response handling stays exhaustive; `STEPS` and `SUCCESSORS` stay complete as the graph grows. Those guarantees are enforced today by `Step<Successors, …>`, `transitionTo`, `satisfies` on `SUCCESSORS` / `STEPS`, and per-step compilation — but nothing **locks** them: a refactor can widen a return type to `State`, drop a `satisfies` annotation, or “fix” a step with a cast and silently defeat the exhaustiveness story. Type-level tests are regression harnesses for the **type graph itself**: they fail `tsc` when someone weakens a constraint, independent of runtime tests (`run_v3_migration.test.ts`, PBT, invariants). Runtime semantics, graph reachability, and `assertInvariants` clauses are out of scope here (see §7).

---

## 2. Claims under test

Each claim below is something the v3 code **already** relies on. For every claim: a one-line **assertion shape** (not a full test body). Implementations live in the files named in §6.

### 2.1 Structural / derivation claims

| ID | Claim | Assertion shape |
|----|-------|-----------------|
| S1 | `State` is a discriminated union keyed by `name` | `Expect<Equals<State['name'], StateName>>` plus per-member `Expect<Equals<StateOf<'INIT'>['name'], typeof INIT.Name>>` (repeat for each control point or a generated `AllNames` table) |
| S2 | `StateName` equals the literal union of every step module’s `Name` | Build `type AllExportedNames = typeof INIT.Name \| typeof WAIT_FOR_MIGRATION_COMPLETION.Name \| … \| typeof FATAL.Name`; `Expect<Equals<StateName, AllExportedNames>>` |
| S3 | `NonTerminalState` = `Exclude<State, DONE.State \| FATAL.State>` | `Expect<Equals<NonTerminalState, Exclude<State, DONE.State \| FATAL.State>>>` |
| S4 | `TerminalState` = `DONE.State \| FATAL.State` | `Expect<Equals<TerminalState, DONE.State \| FATAL.State>>` |
| S5 | `StateOf<'X'>` is exactly the unique variant with `name === 'X'` | For representative `X`: `Expect<Equals<StateOf<'INIT'>, INIT.State>>`, `Expect<Equals<StateOf<'REFRESH_SOURCE'>, REFRESH_SOURCE.State>>`, `Expect<Equals<StateOf<'DONE'>, DONE.State>>` |
| S6 | `SuccessorsOf<'X'>` is exactly the union of literals in `SUCCESSORS['X']` | `Expect<Equals<SuccessorsOf<'INIT'>, (typeof SUCCESSORS)[typeof INIT.Name][number]>>` (and at least one non-init row, e.g. `REFRESH_SOURCE`) |
| S7 | `TransitionExtras<TFrom, TTo>` = `Omit<StateOf<TTo>, keyof TFrom \| 'name'>` | `Expect<Equals<TransitionExtras<INIT.State, 'WAIT_FOR_YELLOW_SOURCE'>, Omit<StateOf<'WAIT_FOR_YELLOW_SOURCE'>, keyof INIT.State \| 'name'>>>` plus one `PostInitState` → `FATAL` case |

### 2.2 Coverage claims (`satisfies` in production code)

| ID | Claim | Assertion shape |
|----|-------|-----------------|
| C1 | `SUCCESSORS` has a row for every `StateName` | `type SuccessorKeys = keyof typeof SUCCESSORS`; `Expect<Extends<StateName, SuccessorKeys>>` and `Expect<Extends<SuccessorKeys, StateName>>` |
| C2 | `STEPS` has an entry for every `NonTerminalState['name']` | `type StepKeys = keyof typeof STEPS`; `Expect<Extends<NonTerminalState['name'], StepKeys>>` and `Expect<Extends<StepKeys, NonTerminalState['name']>>` |
| C3 | Every member of `State` uses its module’s `Name` literal as the `name` discriminant | For each `StateOf<'X'>`, `Expect<Equals<StateOf<'X'>['name'], typeof X.Name>>` via a single mapped helper or explicit grid for all 26 names |
| C4 | `SUCCESSORS` values are `readonly StateName[]` with literal tuple precision for `SuccessorsOf` | `Expect<Equals<SuccessorsOf<'INIT'>, 'WAIT_FOR_MIGRATION_COMPLETION' \| 'WAIT_FOR_YELLOW_SOURCE' \| …>>` (full literal union, not `StateName`) |

### 2.3 Transition / `Step` claims

| ID | Claim | Assertion shape |
|----|-------|-----------------|
| T1 | `Step<TNext, TResponse>['transition']` returns `StateOf<TNext>`, not `State` | Inline object typed `Step<'FATAL', { type: 'fatal' }>`; assign `transition` return to `StateOf<'FATAL'>` — positive; assign to `State` — anti-claim (§2.5) |
| T2 | A step’s `transition` cannot return a state name absent from its `Successors` | Inline `Step<SuccessorsOf<'REFRESH_SOURCE'>, …>` returning `transitionTo(…, 'INIT', …)` — anti-claim |
| T3 | `transitionTo(from, to, extras)` returns `StateOf<to>` | `const _: StateOf<'FATAL'> = transitionTo(initState, FATAL.Name, { reason: '…' })` with well-typed `from` / `extras` |
| T4 | `transitionTo` requires exactly the delta as `extras` (per `TransitionExtras`) | Missing required field in `extras` — anti-claim; excess field in `extras` — anti-claim |
| T5 | `runStep` preserves per-step typing: `Promise<StateOf<TNext>>` | `Expect<Equals<Awaited<ReturnType<typeof runStep<typeof INIT.Name, InitResponse>>>, StateOf<SuccessorsOf<'INIT'>>>` or infer from a concrete `Step<…>` variable |

### 2.4 Narrowing claims

| ID | Claim | Assertion shape |
|----|-------|-----------------|
| N1 | `state.name === 'X'` narrows `state` to `StateOf<'X'>` | Wrapper function `(state: State) => { if (state.name === 'INIT') { Expect<Equals<typeof state, INIT.State>>; } }` |
| N2 | Inside a `case 'variant'`, `response` narrows by `type` discriminant | Wrapper on `InitResponse`: `switch (response.type) { case 'fatal': Expect<Equals<typeof response, Extract<InitResponse, { type: 'fatal' }>>; … }` |
| N3 | `assertNever(x)` requires `x: never` | `const exhaust = (x: never) => assertNever(x);` then call with `never` — ok; call with `string` — anti-claim |

### 2.5 Anti-claims (must fail to compile)

Document each in `anti_claims.type_test.ts` with `// @ts-expect-error` on the **line immediately above** the offending expression. Kibana lint allows `@ts-expect-error`; `@ts-ignore` is forbidden.

| ID | Anti-claim | Assertion shape |
|----|------------|-----------------|
| A1 | Returning a non-successor state from a `transition` | Inline `Step<SuccessorsOf<'REFRESH_SOURCE'>, RefreshSourceResponse>` whose `transition` returns `transitionTo(…, INIT.Name, …)` |
| A2 | Adding a state to `State` without a `SUCCESSORS` row | **Not type-testable in isolation** — enforced at `successors.ts` compile site via `satisfies Record<StateName, …>`. Regression = remove row in real table and confirm package `type_check` fails; optional comment in `anti_claims` pointing maintainers at that file |
| A3 | Adding a non-terminal state without a `STEPS` entry | Same pattern as A2: enforced at `STEPS` `satisfies` site in `successors.ts` |
| A4 | `transitionTo` with missing required `extras` | `transitionTo(postInitState, WAIT_FOR_YELLOW_SOURCE.Name, {})` when delta requires `sourceIndex` / mappings / `targetIndex` |
| A5 | `transitionTo` with excess property in `extras` (field already on `from`) | `transitionTo(stateWithSourceIndex, SOME.Name, { sourceIndex: … })` when `sourceIndex` is already on `from` |
| A6 | Forgetting a response variant before `assertNever` | `switch (response.type) { case 'success': … }` then `assertNever(response)` with incomplete cases — anti-claim on `assertNever(response)` |
| A7 | Widening `Step.transition` return to `State` | Annotate transition `(): State => …` on a `Step<SuccessorsOf<'INIT'>, InitResponse>` object |
| A8 | Adding `DONE` / `FATAL` to `STEPS` | Object literal `{ …, [DONE.Name]: … } satisfies Record<NonTerminalState['name'], unknown>` — excess key error |
| A9 | Calling `assertNever` with non-`never` | `assertNever('oops' as string)` or `assertNever(response)` after incomplete narrowing |

---

## 3. Tooling choice

### Options compared

| Approach | Pros | Cons |
|----------|------|------|
| **`@ts-expect-error` only** | Zero helpers; anti-claims are obvious | No positive type equality; unused directive if someone “fixes” the error without removing the test |
| **In-repo `Equals` / `Expect`** | Exact type equality under `node scripts/type_check`; no new deps; files are plain `.ts` included by package `tsconfig` | Anti-claims still need `@ts-expect-error`; no asserted error message text |
| **`tsd` 0.33.0** (`expectType` / `expectError`) | Familiar in Kibana (`kbn-config-schema`, Lens); `expectError` pins diagnostics when run via **tsd CLI** | Extra invocation path; Kibana’s existing usage mixes `expectType` **inside Jest** `describe` blocks — still relies on `tsc` for CI unless a separate `tsd` step is wired; `expectError` does **not** run under `type_check` alone |

### Recommendation: **hybrid — in-repo helpers + `@ts-expect-error`**

**Default:** `type_test_helpers.ts` with `Equals`, `Expect`, `Extends` for all **positive** claims (§2.1–2.4). **`anti_claims.type_test.ts`** catalogues §2.5 with `@ts-expect-error`. Do **not** add a `tsd` CLI step or Jest coupling for v3.

**Why this wins for v3**

1. **Single CI path:** `migration-server-internal/tsconfig.json` already `"include": ["**/*.ts", …]`. Type tests are discovered by the same `node scripts/type_check --project …` every package uses — **no new test runner**.
2. **Zero infrastructure:** No `tsd.json`, no `package.json` script, no “run tsd after jest” drift.
3. **Positive equality:** `Expect<Equals<A,B>>` fails if someone widens `SuccessorsOf` or `StateOf` — `expectType` only checks assignability one direction unless you write many lines.
4. **Anti-claims:** `@ts-expect-error` is the standard Kibana pattern (see `discriminated_union_type.test.ts` in `@kbn/config-schema`). Unused `@ts-expect-error` fails `tsc` when the bug is fixed — good friction.

**When `tsd` would be worth it**

- If we need **stable error message** assertions (refactor-sensitive) or `expectError` batching across files.
- If we adopt a repo-wide `@kbn/type-testing` package with a Buildkite step running `tsd` on globs.

For this POC, that overhead is not justified.

### Helper definitions (canonical — copy into `type_test_helpers.ts`)

```ts
/** True when A and B are mutually assignable (type equality). */
export type Equals<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2)
  ? true
  : false;

/** Assert a compile-time boolean is true. */
export type Expect<T extends true> = T;

/** True when A is assignable to B. */
export type Extends<A, B> = A extends B ? true : false;

/** True when A is not assignable to B. */
export type NotExtends<A, B> = Extends<A, B> extends true ? false : true;
```

**Minimal set:** `Equals`, `Expect`, `Extends`. Add `NotExtends` only if a test wants `Expect<NotExtends<Wrong, State>>` instead of an anti-claim file entry.

**Optional ergonomics**

```ts
/** Shorthand for Expect<Equals<A, B>> */
export type AssertEquals<A, B> = Expect<Equals<A, B>>;
```

No runtime exports required. Files may use `export {}` or only `import type` to stay side-effect free.

**Copyright header:** Match other files in `migration-server-internal` (Elastic License 2.0 block).

---

## 4. File layout

```
src/core/packages/saved-objects/migration-server-internal/src/v3/
└── __type_tests__/
    ├── type_test_helpers.ts
    ├── state_derivations.type_test.ts   ← S1–S7, C3
    ├── graph.type_test.ts               ← C1, C4, S6
    ├── dispatch.type_test.ts            ← C2
    ├── transitions.type_test.ts         ← T1–T5
    ├── narrowing.type_test.ts           ← N1–N3
    └── anti_claims.type_test.ts         ← A1, A4–A9 (+ A2/A3 notes)
```

### Directory name

`__type_tests__` mirrors Jest’s `__tests__` convention but signals **compile-only** checks. Keeps type assertions out of `steps/` and out of runtime `*.test.ts` files.

### `tsconfig` discovery

`migration-server-internal/tsconfig.json`:

```json
"include": ["**/*.ts", "src/hash_to_version_map.json"]
```

All `src/v3/__type_tests__/*.ts` paths are **already included**. **No tsconfig change required** unless we later add a dedicated project for faster iteration (not recommended initially).

### Jest interaction

`jest.config.js` roots this package with `@kbn/test/jest_node`. Jest’s default test match picks `*.test.ts` / `*.test.tsx` / `__tests__/**` — **not** `*.type_test.ts`. These files should:

- Contain **no** `describe` / `it` / `test`.
- Use only type aliases, `const` type assertions, and helper `Expect<…>` assignments (or empty functions for narrowing).
- Avoid top-level runtime side effects.

If someone renames to `foo.test.ts`, Jest will execute empty suites — harmless but noisy. **Lint:** do not use `@ts-ignore` (forbidden); `@ts-expect-error` is allowed with intent.

### Imports

Import production types from sibling modules (`../state`, `../successors`, `../types`, `../steps/init`, …). Use `import type` for type-only step symbols. Value imports (`INIT.Name`, `FATAL.Name`) are required for literal indexing and `transitionTo` calls — acceptable in type-test files.

### Maintenance hook

Add one sentence to `README.md` § “Correctness apparatus” (when implementing): “Type-level regression tests live in `__type_tests__/`; run package `type_check` after graph or `State` union edits.”

### `AllExportedNames` boilerplate (S2 / C3)

When implementing `state_derivations.type_test.ts`, define the union once and reuse for S2 and C3:

```ts
import * as INIT from '../steps/init';
import * as WAIT_FOR_MIGRATION_COMPLETION from '../steps/wait_for_migration_completion';
// … import every steps/*.ts module that exports Name (26 total)
import * as DONE from '../steps/done';
import * as FATAL from '../steps/fatal';

/** Literal union of every control-point discriminant exported from steps/. */
type AllExportedNames =
  | typeof INIT.Name
  | typeof WAIT_FOR_MIGRATION_COMPLETION.Name
  | typeof WAIT_FOR_YELLOW_SOURCE.Name
  | typeof UPDATE_SOURCE_MAPPINGS_PROPERTIES.Name
  | typeof COMPATIBLE_UPDATE_CHECK_CLUSTER_ROUTING_ALLOCATION.Name
  | typeof CLEANUP_UNKNOWN_AND_EXCLUDED.Name
  | typeof CLEANUP_UNKNOWN_AND_EXCLUDED_WAIT_FOR_TASK.Name
  | typeof PREPARE_COMPATIBLE_MIGRATION.Name
  | typeof REFRESH_SOURCE.Name
  | typeof CREATE_INDEX_CHECK_CLUSTER_ROUTING_ALLOCATION.Name
  | typeof CREATE_NEW_TARGET.Name
  | typeof CHECK_TARGET_MAPPINGS.Name
  | typeof UPDATE_TARGET_MAPPINGS_PROPERTIES.Name
  | typeof UPDATE_TARGET_MAPPINGS_PROPERTIES_WAIT_FOR_TASK.Name
  | typeof UPDATE_TARGET_MAPPINGS_META.Name
  | typeof CHECK_VERSION_INDEX_READY_ACTIONS.Name
  | typeof OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT.Name
  | typeof OUTDATED_DOCUMENTS_SEARCH_READ.Name
  | typeof OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT.Name
  | typeof OUTDATED_DOCUMENTS_REFRESH.Name
  | typeof OUTDATED_DOCUMENTS_TRANSFORM.Name
  | typeof TRANSFORMED_DOCUMENTS_BULK_INDEX.Name
  | typeof MARK_VERSION_INDEX_READY.Name
  | typeof MARK_VERSION_INDEX_READY_CONFLICT.Name
  | typeof DONE.Name
  | typeof FATAL.Name;

type _stateNameEqualsAllExports = Expect<Equals<StateName, AllExportedNames>>;
```

Adding a step without updating this list breaks S2 immediately — by design.

---

## 5. Worked examples

Full snippets a implementer can paste and adapt. All use existing exports.

### 5.1 `SuccessorsOf<'INIT'>` literal precision (graph.type_test.ts)

```ts
import type { Expect, Equals } from './type_test_helpers';
import type { SuccessorsOf } from '../types';
import { SUCCESSORS } from '../successors';
import * as INIT from '../steps/init';

type InitSuccessorsFromTable = (typeof SUCCESSORS)[typeof INIT.Name][number];

// Literal union from SUCCESSORS row — not widened to StateName
type ExpectedInitSuccessors =
  | 'WAIT_FOR_MIGRATION_COMPLETION'
  | 'WAIT_FOR_YELLOW_SOURCE'
  | 'CREATE_INDEX_CHECK_CLUSTER_ROUTING_ALLOCATION'
  | 'INIT'
  | 'FATAL';

type _initSuccessorsMatchTable = Expect<Equals<SuccessorsOf<typeof INIT.Name>, InitSuccessorsFromTable>>;
type _initSuccessorsAreLiterals = Expect<Equals<SuccessorsOf<typeof INIT.Name>, ExpectedInitSuccessors>>;
```

### 5.2 Inline `Step` returning illegal successor (`anti_claims.type_test.ts`)

```ts
import type { Step, SuccessorsOf } from '../types';
import type { RefreshSourceResponse } from '../io';
import { transitionTo } from '../state';
import * as INIT from '../steps/init';
import * as REFRESH_SOURCE from '../steps/refresh_source';

declare const state: REFRESH_SOURCE.State;
declare const response: RefreshSourceResponse;

const badStep: Step<SuccessorsOf<typeof REFRESH_SOURCE.Name>, RefreshSourceResponse> = {
  action: async () => response,
  transition: () =>
    // @ts-expect-error INIT is not in SUCCESSORS[REFRESH_SOURCE]
    transitionTo(state, INIT.Name, { reason: 'illegal jump' }),
};
```

(Exact excess/missing fields on `INIT` transition may vary; the error must be “not assignable to `StateOf<Successors>`”.)

### 5.3 `transitionTo` missing extras (`anti_claims.type_test.ts`)

```ts
import { transitionTo } from '../state';
import * as INIT from '../steps/init';
import * as WAIT_FOR_YELLOW_SOURCE from '../steps/wait_for_yellow_source';
import type { PostInitState } from '../migration_state';

declare const postInit: PostInitState;

// @ts-expect-error post-init fields required in extras when not already on from
transitionTo(postInit, WAIT_FOR_YELLOW_SOURCE.Name, {});
```

Adjust `postInit` typing so `sourceIndex` / `sourceIndexMappings` / `targetIndex` are genuinely required deltas per `TransitionExtras<PostInitState, 'WAIT_FOR_YELLOW_SOURCE'>`.

### 5.4 Discriminant narrowing inside a function (`narrowing.type_test.ts`)

```ts
import type { Expect, Equals } from './type_test_helpers';
import type { State, StateOf } from '../state';
import * as INIT from '../steps/init';

const assertInitNarrowing = (state: State): void => {
  if (state.name === 'INIT') {
    type _narrowed = Expect<Equals<typeof state, StateOf<'INIT'>>>;
    const _check: INIT.State = state;
  }
};
```

TypeScript only distributes narrowing inside control-flow branches (hence the wrapper). Exporting `assertInitNarrowing` avoids “unused” lint if configured; otherwise assign to `void` or prefix with `_`.

### 5.5 `runStep` return type (transitions.type_test.ts)

```ts
import type { Expect, Equals } from './type_test_helpers';
import type { StateOf } from '../state';
import { runStep, type Step, type SuccessorsOf } from '../types';
import type { InitResponse } from '../io';

type InitNext = SuccessorsOf<'INIT'>;

declare const initStep: Step<InitNext, InitResponse>;

type RunInitResult = ReturnType<typeof runStep<InitNext, InitResponse>> extends Promise<infer R>
  ? R
  : never;

type _runStepPreservesNext = Expect<Equals<RunInitResult, StateOf<InitNext>>>;
```

---

## 6. Coverage matrix

| Claim ID | Test file |
|----------|-----------|
| S1 | `state_derivations.type_test.ts` |
| S2 | `state_derivations.type_test.ts` |
| S3 | `state_derivations.type_test.ts` |
| S4 | `state_derivations.type_test.ts` |
| S5 | `state_derivations.type_test.ts` |
| S6 | `graph.type_test.ts` |
| S7 | `state_derivations.type_test.ts` |
| C1 | `graph.type_test.ts` |
| C2 | `dispatch.type_test.ts` |
| C3 | `state_derivations.type_test.ts` |
| C4 | `graph.type_test.ts` |
| T1 | `transitions.type_test.ts` |
| T2 | `anti_claims.type_test.ts` (A1) |
| T3 | `transitions.type_test.ts` |
| T4 | `anti_claims.type_test.ts` (A4, A5) |
| T5 | `transitions.type_test.ts` |
| N1 | `narrowing.type_test.ts` |
| N2 | `narrowing.type_test.ts` |
| N3 | `narrowing.type_test.ts` + `anti_claims.type_test.ts` (A9) |
| A1 | `anti_claims.type_test.ts` |
| A2 | Documented in `anti_claims.type_test.ts` (enforced in `successors.ts`) |
| A3 | Documented in `anti_claims.type_test.ts` (enforced in `successors.ts`) |
| A4 | `anti_claims.type_test.ts` |
| A5 | `anti_claims.type_test.ts` |
| A6 | `anti_claims.type_test.ts` |
| A7 | `anti_claims.type_test.ts` |
| A8 | `anti_claims.type_test.ts` |
| A9 | `anti_claims.type_test.ts` |

---

## 7. Maintenance rules

### New non-terminal state `MY_STEP`

| Area | What happens |
|------|----------------|
| `state.ts` union | **Must** add `MY_STEP.State` — S2, S5, C3 fail until `AllExportedNames` / grids updated |
| `successors.ts` `SUCCESSORS` | `satisfies Record<StateName, …>` fails until row added — C1; S6 for that name |
| `successors.ts` `STEPS` | `satisfies Record<NonTerminalState['name'], …>` fails until factory added — C2 |
| `graph.type_test.ts` | Add literal `SuccessorsOf<'MY_STEP'>` expectation if spot-checking rows |
| `anti_claims` | No change unless new illegal transition pattern |
| Step file `Step<Successors, Response>` | Production compile still primary; optional per-step type test **not** in default layout |

### New terminal-only tweak

Terminal states have no `STEPS` row by design. Only S4, C1 row with `[]`, and C3 for `DONE` / `FATAL`.

### `TResponse` gains a variant

| Layer | Effect |
|-------|--------|
| Production step | `transition` must handle new `type` or `tsc` fails (if/else exhaustiveness or `assertNever`) |
| N2 | Add narrowing case for the new variant in `narrowing.type_test.ts` if representative |
| A6 | Incomplete `switch` + `assertNever` test documents expected failure mode |

### `transitionTo` signature change (e.g. widening `extras` to `Partial<…>`)

| Tests that catch widening |
|---------------------------|
| T3, T4, S7 | Equality on `TransitionExtras` breaks |
| A4, A5 | May **stop** erroring — remove `@ts-expect-error` and tests go red via unused directive |

### Someone uses `@ts-ignore`

Forbidden by Kibana ESLint. Type tests should use `@ts-expect-error` only. Code review + lint CI.

### `SUCCESSORS` literal edits

C4 and S6 assertions are **intentionally brittle** — updating expected literal unions is the point (same spirit as snapshot tests in `successor_graph.test.ts`).

### What we are NOT trying to test

Runtime behavior: IO adapters, Elasticsearch outcomes, retry timing, `assertInvariants` truth on real states, PBT properties (`successor_graph.test.ts`), migration happy paths (`run_v3_migration.test.ts`), or whether the graph is **reachable** / minimal. Type tests do not replace snapshot review of `SUCCESSORS`; they lock TypeScript’s encoding of the table. They also do not prove `next.ts`’s internal cast is sound — only that `STEPS` keys and per-step `Step` types are consistent. Fuzzing, integration tests, and invariant design stay in their own layers.

---

## 8. Implementation order

1. Add `__type_tests__/type_test_helpers.ts` (`Equals`, `Expect`, `Extends`).
2. `state_derivations.type_test.ts` — S1–S5, S7, C3, S2 (`AllExportedNames` list all 26 `Name` exports).
3. `graph.type_test.ts` — C1, C4, S6 (INIT + REFRESH_SOURCE + one complex row e.g. `OUTDATED_DOCUMENTS_SEARCH_READ`).
4. `dispatch.type_test.ts` — C2.
5. `transitions.type_test.ts` — T3, T5, positive T1.
6. `narrowing.type_test.ts` — N1, N2, N3.
7. `anti_claims.type_test.ts` — A1, A4–A9; comment blocks for A2/A3.
8. Run `node scripts/type_check --project src/core/packages/saved-objects/migration-server-internal/tsconfig.json` and fix until exit 0.
9. (Optional) One-line pointer in `README.md` § Static correctness.

---

## 9. Open questions

- **`AllExportedNames` maintenance:** Hand-maintained 26-way union vs.codegen from `steps/` directory listing — hand is fine at 26; codegen if ZDT doubles the graph.
- **Per-step type test files:** Central tests vs. `steps/foo.type_test.ts` colocated — default central-only to avoid 24-file sprawl; colocate only if a step’s `Successors` row is unusually subtle.
- **`@kbn/type-test-helpers` package:** Extract helpers if other packages adopt the same pattern; YAGNI for POC.
- **`tsd` in Jest:** Some Kibana packages run `expectType` inside Jest tests; v3 explicitly avoids coupling type tests to Jest execution — confirm with team.
- **A2/A3 documentation-only:** Whether `anti_claims` should contain a “broken” temporary `SUCCESSORS` fork that must never be committed, or rely on review — prefer comment + production `satisfies` only.
- **`init.ts` exhaustiveness:** Uses `if` + inner `switch` without `assertNever`; TS still flags missing `InitResponse` variants — N2 should use `InitResponse`, not only `assertNever` paths.
- **`next.ts` cast:** No type test planned for dispatch soundness; optional future `Expect` that `STEPS[state.name]` factory input/output matches `StateOf<state.name>` would need conditional types or codegen.
- **ESLint unused locals:** Type-only `type _x = Expect<…>` lines may need `void 0 as unknown as Expect<…>` or explicit eslint policy for `__type_tests__` — check after first file lands.
