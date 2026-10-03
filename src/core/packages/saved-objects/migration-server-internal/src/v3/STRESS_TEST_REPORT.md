# V3 migration state machine — architectural stress test report

Branch: `so/migration-v3-state-machine-poc` (not committed). Scope: **legacy V2 only** (non-ZDT), no runtime wiring, tests skipped.

---

## Inventory

### V2 states ported (26 total)

| # | Control state | Step file |
|---|---------------|-----------|
| 1 | `INIT` | `steps/init.ts` |
| 2 | `WAIT_FOR_MIGRATION_COMPLETION` | `steps/wait_for_migration_completion.ts` |
| 3 | `WAIT_FOR_YELLOW_SOURCE` | `steps/wait_for_yellow_source.ts` |
| 4 | `UPDATE_SOURCE_MAPPINGS_PROPERTIES` | `steps/update_source_mappings_properties.ts` |
| 5 | `COMPATIBLE_UPDATE_CHECK_CLUSTER_ROUTING_ALLOCATION` | `steps/compatible_update_check_cluster_routing_allocation.ts` |
| 6 | `CLEANUP_UNKNOWN_AND_EXCLUDED` | `steps/cleanup_unknown_and_excluded.ts` |
| 7 | `CLEANUP_UNKNOWN_AND_EXCLUDED_WAIT_FOR_TASK` | `steps/cleanup_unknown_and_excluded_wait_for_task.ts` |
| 8 | `PREPARE_COMPATIBLE_MIGRATION` | `steps/prepare_compatible_migration.ts` |
| 9 | `REFRESH_SOURCE` | `steps/refresh_source.ts` |
| 10 | `CREATE_INDEX_CHECK_CLUSTER_ROUTING_ALLOCATION` | `steps/create_index_check_cluster_routing_allocation.ts` |
| 11 | `CREATE_NEW_TARGET` | `steps/create_new_target.ts` |
| 12 | `CHECK_TARGET_MAPPINGS` | `steps/check_target_mappings.ts` |
| 13 | `UPDATE_TARGET_MAPPINGS_PROPERTIES` | `steps/update_target_mappings_properties.ts` |
| 14 | `UPDATE_TARGET_MAPPINGS_PROPERTIES_WAIT_FOR_TASK` | `steps/update_target_mappings_properties_wait_for_task.ts` |
| 15 | `UPDATE_TARGET_MAPPINGS_META` | `steps/update_target_mappings_meta.ts` |
| 16 | `CHECK_VERSION_INDEX_READY_ACTIONS` | `steps/check_version_index_ready_actions.ts` |
| 17 | `OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT` | `steps/outdated_documents_search_open_pit.ts` |
| 18 | `OUTDATED_DOCUMENTS_SEARCH_READ` | `steps/outdated_documents_search_read.ts` |
| 19 | `OUTDATED_DOCUMENTS_TRANSFORM` | `steps/outdated_documents_transform.ts` |
| 20 | `TRANSFORMED_DOCUMENTS_BULK_INDEX` | `steps/transformed_documents_bulk_index.ts` |
| 21 | `OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT` | `steps/outdated_documents_search_close_pit.ts` |
| 22 | `OUTDATED_DOCUMENTS_REFRESH` | `steps/outdated_documents_refresh.ts` |
| 23 | `MARK_VERSION_INDEX_READY` | `steps/mark_version_index_ready.ts` |
| 24 | `MARK_VERSION_INDEX_READY_CONFLICT` | `steps/mark_version_index_ready_conflict.ts` |
| 25 | `DONE` | `steps/done.ts` (terminal) |
| 26 | `FATAL` | `steps/fatal.ts` (terminal) |

**Count:** 26 states, 24 with `step` factories, 2 terminal.

### Deliberately omitted

| Item | Reason |
|------|--------|
| **ZDT** (`zdt/*`) | Task scope: legacy V2 only |
| **`LEGACY_*` control states** | **Not present** in current `src/.../state.ts`. Comments in V2 `model.ts` refer to removed reindex/ZDT steps (`LEGACY_DELETE`, `LEGACY_CREATE_REINDEX_TARGET`), not live control tags |
| **~40 states** | Task brief assumed a larger graph; actual legacy union is **26** states today (post PR #260815-style pruning) |
| **Exhaustive invariants** | Only load-bearing clauses (FATAL reason, task IDs, pitId, versionIndexReadyActions) |
| **Tests** | `describe.skip` on `run_v3_migration.test.ts`; `successor_graph.test.ts` main suite active (transition-cases `describe.skip` + `it.todo` for PBT); `invariants.test.ts` active (~31 cases) |

### Supporting files (stress-test additions)

- `migration_state.ts` — `MigrationBaseState`, `PostInitState`, `SourceExistsState`
- `io_helpers.ts` — TaskEither → Promise + `retryable_failure` mapping
- `io.ts` + `createIO()` — V2 action adapters
- `retry.ts` — self-loop / `delayRetryTransition` / `handleRetryableFailure` / `clusterRoutingRetryMessage`

---

## Architectural decisions (7 questions)

### 1. TaskEither vs v3 `IO` — choice **(a)** with trade-off documented

**Choice:** Adapter layer in `io.ts` / `io_helpers.ts`: V2 actions stay `TaskEither`; `IO` methods return `Promise<DiscriminatedResponse>`.

**Glue volume:** ~600 lines in `io.ts` for `createIO()`, plus ~50 lines in `io_helpers.ts`. Each action needs:
- A response union (often 3–7 variants + `retryable_failure`)
- `mapRetryableFailure` / `adaptEither` wrapping
- Left-type narrowing (`isTypeof` or manual `left.type` checks)

**Duplication vs V2:** Response shapes **duplicate** V2’s `Either` left/right tags (e.g. `index_mappings_incomplete`, `types_changed`) as string literal `type` fields. We did not duplicate business logic — transitions still call `getMigrationType`, `getAliases`, `createBatches`, etc. from V2 `model/`.

**Trade-off:** Preserves v3’s `switch (response.type)` + `assertNever` story, but maintaining **two representations** of the same outcome algebra (fp-ts tags in actions, discriminated unions in v3) is ongoing cost. Alternative **(b)** (Step accepts `TaskEither`) would remove ~half the io.ts noise at the cost of fp-ts leaking into every step file.

### 2. BaseState scope — choice **(c)** (`MigrationBaseState` + `PostInitState`)

**Layers:**
- `BaseState` — retry + `logs` (`MigrationLog[]`, not `string[]` — POC toy used strings; V2 port required structured logs)
- `MigrationBaseState` — all V2 `BaseState` fields from `state.ts` (aliases, batch sizes, doc links, etc.)
- `PostInitState` — `aliases`, `sourceIndex`, `sourceIndexMappings`, `targetIndex`, `versionIndexReadyActions`
- `SourceExistsState` — `Option.Some` source + mappings

**Universal vs mostly-shared:**
- **Truly universal (after INIT):** retry fields, `logs`, index prefix/aliases, `targetIndex`, mappings metadata — live on `MigrationBaseState` or `PostInitState`
- **Exceptions:** `INIT` only has `MigrationBaseState`; `FATAL` drops post-init fields; `DONE` keeps post-init; pipeline states add 1–7 step-specific fields (`pitId`, `bulkOperationBatches`, `preTransformDocsActions`, …)

**Honesty:** Putting everything in a single `BaseState` would lie about `INIT`/`FATAL`. The layered model matches V2’s `BaseState` / `PostInitState` / `SourceExistsState` split.

### 3. Retry shape — self-loops via `incrementRetry` / `delayRetryTransition`

Ported `delayRetryState` into `retry.ts` as `delayRetryTransition` + `handleRetryableFailure` (maps `retryable_failure` from IO).

**Strained cases:**
- **`WAIT_FOR_MIGRATION_COMPLETION`** — V2 does not increment `retryCount`; it sets `retryDelay: 2000` and re-enters. v3 uses self-loop with **fixed delay in carry**, not `incrementRetry` — mixing two retry idioms.
- **`CLEANUP_UNKNOWN_AND_EXCLUDED_WAIT_FOR_TASK`** — on task failure, V2 jumps back to **`CLEANUP_UNKNOWN_AND_EXCLUDED`** (different state), not a pure self-loop. Modeled as successor edge + custom retry (not `handleRetryableFailure`).
- **`UPDATE_TARGET_MAPPINGS_PROPERTIES_WAIT_FOR_TASK`** — `task_completed_with_retriable_error` resets to **`UPDATE_TARGET_MAPPINGS_PROPERTIES`** with `skipRetryReset: true` — self-loop pattern breaks; needs **cross-state retry** with retry budget semantics.
- **Infinite polls** — `Number.MAX_SAFE_INTEGER` max attempts for delete-by-query / pickup-mappings waits; v3 `delayRetryTransition` supports it but **`retryCount <= retryAttempts` invariant** is wrong for those states (invariant omits them intentionally).

### 4. `transitionTo` field baggage

`transitionTo(carry, name, extras)` types `extras` as `Omit<StateOf<TName>, keyof BaseState | 'name'>`.

**Mitigation used:** `carry` is spread (full prior state), `extras` override deltas. Many transitions pass `{}` when only `name` changes.

**Still awkward:** First transition into `PostInitState` from `INIT` must supply **all** post-init fields in one bag (`postInit` on `InitResponse`). Example from `steps/init.ts`:

```ts
return transitionTo(base, WAIT_FOR_YELLOW_SOURCE.Name, {
  sourceIndex: postInit.sourceIndex,
  sourceIndexMappings: postInit.sourceIndexMappings,
  targetIndex: postInit.targetIndex,
});
```

`OUTDATED_DOCUMENTS_SEARCH_READ` self-loop on batch halving must re-list **six** step-specific fields in `extras` even though `carry` already has them — TypeScript still requires the explicit bag for the self-loop target type.

**Verdict:** At 26 states, `transitionTo` is **usable but tedious** on self-loops and pipeline hand-offs. A `carryStepFields(state)` helper (typed per state) would help — **cost: small, payoff: high**.

### 5. `SUCCESSORS` table — grouped sub-tables

Implemented as `INIT_SUCCESSORS`, `COMPATIBLE_SUCCESSORS`, `CREATE_INDEX_SUCCESSORS`, `OUTDATED_DOCUMENTS_SUCCESSORS`, `TARGET_MAPPINGS_SUCCESSORS`, `FINALIZE_SUCCESSORS` merged into `SUCCESSORS`.

**Verdict:** **Readable at 26 rows.** Reviewers can scan by phase. Would scale to ~40 if ZDT/Legacy reindex states return. Risk: **duplicate keys** if two groups define the same state (caught by `satisfies Record<StateName, …>`).

### 6. `next.ts` switch — ~70 lines

Still **linear and grep-friendly**. A `STEPS: Record<NonTerminalStateName, StepFactory>` lookup is attractive mainly for **tree-shaking / codegen**, not readability at this size.

**Verdict:** Switch is fine at 26; consider lookup table only if dispatch exceeds ~50 cases **and** step registration becomes generated.

### 7. Response unions + `assertNever` — 5–7 variants

Steps with large unions (`ReadWithPitResponse`, `CleanupWaitForTaskResponse`, `InitResponse`) remain **readable** when transition logic lives in one function.

**Problem:** When transition + action + response types must align, TypeScript errors explode (see typecheck). Inlining transitions per step file did **not** blow up file size: largest step is ~103 lines (`outdated_documents_search_read.ts`), still readable.

---

## What scaled cleanly

- **One file per state** — `Name`, `State`, `step` colocated; grep-by-state still works
- **Phase-grouped `SUCCESSORS`** — reviewable graph
- **`next.ts` dispatch** — exhaustive `assertNever` on `NonTerminalState`
- **Import V2 actions** — no reimplementation of ES calls
- **Terminal states** — still only `Name` + `State`
- **Self-loop as explicit edges** — retry visible in `SUCCESSORS` (e.g. `CREATE_NEW_TARGET → CREATE_NEW_TARGET`)

---

## What started feeling awkward

### A. IO adapter duplication (decision 1 fallout)

`io.ts` re-tags every V2 left type. Example mismatch that drove errors: `adaptEither` return type vs `WaitForYellowSourceResponse` (must return union, not single success type).

### B. `transitionTo` + `Step<Successors, Response>` coupling

Many errors are of the form: `transition` returns `State` but `Step` expects `StateOf<Successors>` because a branch returns a state outside the successor row (or `{}` extras omit required fields).

### C. `createInitialState` signature change

POC `createInitialState(retryAttempts: number)` → V2-shaped `createInitialState(params: Omit<INIT.State, 'name'>)` breaks toy tests (`test_helpers.ts`) — expected.

### D. `MigrationLog` vs string logs

POC README/examples use `string[]` logs; V2 uses `{ level, message }[]`. Porting without migrating README creates **narrative drift**.

---

## Suggested redesigns

| Issue | Proposal | Cost | Payoff |
|-------|----------|------|--------|
| `transitionTo` re-listing fields on self-loops | `reenter(state)` / `carryFields(state, pick…)` typed per step | small | high |
| IO response duplication | Generic `adaptAction<Left, Right>(te, handlers)` + inferred union | medium | high |
| Retry cross-state (cleanup wait → cleanup) | Model as **two edges** in SUCCESSORS (already) + `retry.ts` helper `retryVia(otherState)` | small | medium |
| Infinite poll vs `retryCount <= retryAttempts` | Separate `pollCount` or exempt states in invariants | small | medium |
| `next.ts` switch growth | Generated `STEPS` from `SUCCESSORS` keys | large | low (at 26 states) |
| TaskEither in Step (option b) | `action: () => TaskEither<…>` + shared `runStepEither` | medium | medium |

---

## README changes recommended

1. **State count / V2 alignment** — Document that production V2 is **~26** legacy states, not 6 toy states; ZDT is a separate machine.
2. **BaseState layering** — Document `MigrationBaseState` / `PostInitState` explicitly; warn that `transitionTo({}, …)` only works after `carry` includes post-init fields.
3. **Logs type** — Use `MigrationLog[]` in examples, not `string[]`.
4. **IO adapters** — New section: “Wrapping V2 TaskEither actions” with `retryable_failure` convention and expected glue size (~15–25 lines per action).
5. **Retry taxonomy** — Document three patterns: (1) `retryable_failure` self-loop, (2) fixed-delay wait loop, (3) cross-state retry — all must appear in `SUCCESSORS`.

---

## Typecheck pass (2026-05-30)

**Command:** `node scripts/type_check --project src/core/packages/saved-objects/migration-server-internal/tsconfig.json`

**Result:** **exit 0** (was **224** errors in `v3/` at the post-`SUCCESSORS` split baseline).

### What the pass revealed about robustness

- **`transitionTo` carry-forward is the right default.** Requiring `extras: Omit<StateOf<TTo>, keyof TFrom | 'name'>` eliminated ~50% of errors instantly; overrides belong in the `from` spread (e.g. `mustRefresh`, `progress`), not in `extras` when the key already exists on the source state.
- **Self-edges in `SUCCESSORS` align the graph with the actual transition relation.** A retryable failure is, in Lamport's terms, a self-loop transition `<X, action, X'>` where `X'` differs only in `retryCount`/`retryDelay`/`logs`. Adding `X → X` for every state that calls `handleRetryableFailure`/`delayRetryTransition` made the graph match the code's semantics. As a side effect, `handleRetryableFailure<typeof Name>` (returning `StateOf<Name> | FATAL`) is now structurally `StateOf<Successors>` everywhere, and **every `as StateOf<Successors>` cast in step files was removed (~25 casts gone)** without weakening any guarantees. Bonus: PBT/snapshot tests on `SUCCESSORS` now exercise the retry topology too.
- **V2 glue stays the fragile layer, not the step files.** Most remaining friction was `io.ts` (`Option.None`/`Some` on `InitResponse`, `mapRetryableFailure<R>` preserving `TaskEither` rights, casts into `getPrepareCompatibleMigrationStateProperties`) and stale 6-state tests — not transition logic size. Step files stayed small after fixes; the architecture scales structurally even when adapters need per-action typing care.

---

## Tests

| File | Action |
|------|--------|
| `run_v3_migration.test.ts` | `describe.skip` + TODO |
| `successor_graph.test.ts` | Main suite active; transition-cases `describe.skip` + `it.todo` for PBT |
| `invariants.test.ts` | Active (~31 cases); per-state invariants in `steps/*.ts`, dispatched via `STATE_INVARIANTS` in `successors.ts`; graph checks in `successor_graph.test.ts` |

---

## Summary

The v3 **file-per-state + SUCCESSORS + typed transitions** pattern **fits the real V2 graph (26 states)** structurally: dispatch, graph data, and IO boundaries hold. The stress test exposed **pressure points** at:

1. **Dual response representations** (TaskEither tags vs v3 unions),
2. **`transitionTo` ergonomics** on self-loops and post-init bootstrap,

**Follow-up (post-report):** An initial `step_transitions.ts` shortcut was walked back — all transition bodies are inlined in their step files. **Per-file pattern verified at V2 scale:** non-terminal step files are **33 / 52 / 103** lines (min / median / max); largest is `outdated_documents_search_read.ts` (~103 lines), well within “everything answerable from the step’s own file.”

The POC is **architecturally representative** and **compile-clean** on the package typecheck after the `transitionTo` rework and `io.ts` adapter pass. ZDT / removed LEGACY reindex steps were not in scope; adding them would likely push the graph toward the task’s original “~40 states” and stress **SUCCESSORS** grouping further.
