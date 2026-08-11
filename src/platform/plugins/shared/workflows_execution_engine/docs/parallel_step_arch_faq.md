# Parallel step — architecture FAQ

A Q&A walkthrough of how the `parallel` step works, aimed at reviewers and future
maintainers. Line references point at the implementation as of the static
`branches` PR.

Key files:

- Schema: `src/platform/packages/shared/kbn-workflows/spec/schema.ts`
- Graph build: `src/platform/packages/shared/kbn-workflows/graph/build_execution_graph/build_execution_graph.ts`
- Executor: `src/platform/plugins/shared/workflows_execution_engine/server/step/parallel_step/enter_parallel_node_impl.ts`

---

## Schema & the two modes

### Q1. What are the two modes, and how is each one selected?

- **Dynamic fan-out** (`foreach` + `steps`): ONE branch body, run **once per runtime
  list item**. The number of branches is unknown at author time — it depends on
  what `foreach` resolves to at execution time (e.g. Elasticsearch search hits).
  Every branch runs the *same* steps. Inside a branch, the item is available as
  `{{ foreach.item }}` / `{{ foreach.index }}`.
- **Static branches** (`branches:` — a list of `{ name, steps }`): a **fixed set of
  named, heterogeneous** branches known at author time. Each branch runs
  *different* steps. Classic scatter-gather.

Selection: `foreach` present → dynamic; `branches` present → static. They are
**mutually exclusive**, enforced by `parallelModeRefinement` (schema.ts):

- exactly one of `foreach` / `branches` must be present,
- dynamic **must** provide top-level `steps`,
- static **must not** provide top-level `steps`.

### Q2. Why is mode-exclusivity a Zod `.refine()`, and why keep a base vs refined schema?

1. **Why `.refine()`:** Zod cannot express "exactly one of two optional fields is
   present" via object structure alone. The cross-field XOR rule
   (`foreach` XOR `branches`, plus the `steps` constraints) is expressed as a
   predicate over the parsed object.
2. **Why base vs refined:** `.refine()` returns a `ZodEffects`, and **`ZodEffects`
   has no `.extend()`**. The runtime-aware schema (`getParallelStepSchema`) must
   `.extend()` the base to inject the resolved per-connector step schema into
   `steps` / `branches[].steps`. So the code keeps `ParallelStepObjectSchema`
   (plain, extendable `ZodObject`) and applies `.refine()` only at the very end to
   produce `ParallelStepSchema`.

> Note: the refinement is applied in two places (`ParallelStepSchema` and
> `getParallelStepSchema`) with the same predicate — a drift risk (see red flags).

### Q3. What does "loose" validation mode do, and why is it needed?

Loose mode is used for **live editor validation while typing**. It does
`schema.partial().required({ type: true })`:

- `.partial()` makes every field optional and **drops the `.refine()`**,
- only `type` stays required so the discriminated union still routes
  `type: parallel` for autocomplete/hover.

Necessary because a half-typed step (e.g. `foreach:` typed but `steps:` not yet)
would otherwise raise spurious "must provide steps" errors on every keystroke.
Strict validation (with the refinement) runs on the saved/submitted workflow.

---

## Graph build (the hang-prevention layer)

### Q4. Why compile each branch body into a real subgraph instead of storing raw YAML?

1. **Uniformity:** branch steps become real graph nodes (via the shared
   `createStepsSequence`), so they get the same execution machinery, step-execution
   records, context, and telemetry as any other step — no special-casing.
2. **Forward-compatibility:** the body is already a full subgraph, so adding
   nested flow-control (if/switch) inside a branch later is "an executor change,
   not a graph change" — the graph representation already supports it.

`createParallelGraph` builds one body subgraph per branch and inserts each between
the shared `enter-parallel` and `exit-parallel` nodes via `insertGraphBetweenNodes`.

### Q5. What does `buildParallelBranchBody` reject at compile time, and what runtime bug does that prevent?

Three categories are rejected:

1. **Branching nodes** (`outEdges > 1`) — nested `if`/`switch`/`foreach`/`while`.
2. **Any `enter-*` / `exit-*` wrapper node** — catches `on-failure` handlers
   (retry/continue/fallback), step-level `timeout` zones, and nested flow-control.
3. **`waitForInput`** steps (see Q6).

**Bug prevented:** the executor walks a branch body as a **straight line**
(`getBranchSuccessor` follows the single outgoing edge). If a branch contained an
`enter-*` wrapper node it could not drive, the branch would never reach a terminal
state → the parallel step parks in `waiting` forever, re-ticking endlessly (the
"stuck in waiting" bug). Rejecting at compile/save time turns a silent infinite
runtime hang into a **loud, actionable error**.

### Q6. Why is a timer `wait` allowed inside a branch but `waitForInput` is not?

The parallel step is its own scheduler — it can only drive children whose resume
condition it can **observe and re-tick on**.

- A timer **`wait`** parks with a self-contained **`resumeAt` timestamp**. The
  executor collects the earliest `resumeAt` across waiting branches
  (`computeResumeAt`) and schedules its own re-tick for then. Drivable.
- **`waitForInput`** is an **indefinite, externally-resumed** wait with no
  `resumeAt`; the resume signal targets the waiting step from outside and does not
  route through the parallel's re-tick. So the branch would hang forever → it is
  rejected at compile time.

---

## Executor: scope safety & concurrency

### Q7. The workflow scope is a single mutable slot shared by all branches running concurrently via `Promise.all`. How does each branch's `{{ foreach.item }}` stay correct?

Two parts:

**A — Per-branch frames from one stable base.** Before any branch runs, the
executor snapshots the base scope **once** (`const baseScope = ...
getCurrentNodeScope()`), then each branch builds its own `branchStackFrames`
(encoding its own `scopeId`) from that same base — never from the live, mutating
global. So no branch reads a base a sibling has mutated.

**B — A synchronous-only scope window (`withBranchScope`).** When a branch needs
the global slot set (because a step's template rendering reads it), `withBranchScope`
**sets the slot, runs the function, and restores it — all synchronously, with no
`await` in between**. Because JS is single-threaded, code runs uninterrupted until
the first `await`:

1. set global slot to branch N's frames (sync),
2. call `branchImpl.run()` — it synchronously renders `{{ foreach.item }}` from the
   correct slot, then returns a promise at its first `await` (the I/O),
3. restore the previous slot (sync, in `finally`) — before any other branch's code
   can run, since nothing yielded,
4. the awaited I/O afterward does not read the global slot, so a sibling's window
   coming and going is safe.

The slot is only ever "branch N's" for a tiny synchronous window no other branch
can interleave into → concurrent `{{ foreach.item }}` is correct.

### Q8. What is the `branchScopeActive` re-entrancy guard for? When does it throw, and why throw?

`withBranchScope` sets `branchScopeActive = true` on entry and `false` in `finally`.
If it's already true on entry, two windows overlap → it **throws**.

This only happens if the Q7 invariant is violated: a branch step reads workflow
scope **after an `await`**. By then its own window has closed and a sibling's may be
open, so it would read the **wrong branch's** `foreach.item`.

**Why throw:** the alternative is a silent, non-deterministic data-corruption bug
(a branch occasionally processes a sibling's item depending on timing). The guard
converts latent corruption into a loud, deterministic failure pointing the step
author at the mistake.

### Q9. fail-fast vs settled with `concurrency.max = 1` and 4 branches that all fail — how many branch bodies run, and what is the aggregate?

- **fail-fast (default):** branch 0 starts and fails; `hasFailure` then blocks any
  *unstarted* branch (`blockedByFailFast`). Since `max=1`, branches 1–3 never
  started → marked **skipped**. **1 body runs.** Aggregate: `total=4`, `failed=1`,
  `succeeded=0`, 3 `skipped`, `status='failed'`.
- **settled:** `failFast` is false, so unstarted branches are never blocked. With
  `max=1` they run one-by-one across re-ticks until all 4 fail. **4 bodies run.**
  Aggregate: `total=4`, `failed=4`, `succeeded=0`, 0 skipped, `status='failed'`.

Aggregate status is `failed > 0 ? 'failed' : 'completed'` in both modes; timed-out
branches count as failures. The contrast: fail-fast minimizes wasted work; settled
maximizes information (run everything, report every outcome).

> Footgun: `type: workflow.fail` terminates the **whole workflow globally** (it is
> transformed to `workflow.output` and trips a workflow-level failure), so it does
> NOT produce a branch-level FAILED status. Manual-test YAMLs `05_fail_fast` /
> `06_settled_mode` use it and therefore do not actually demonstrate the mode
> difference (the workflow dies at branch 0 in both). Per-mode behaviour must be
> proven with a step that fails *locally* (e.g. a failing connector) — that is what
> the integration tests should use.

---

## Aggregate output & concurrency accounting

### Q10. The aggregate `results[]` carry an `index` and a `key`. For dynamic mode, `key` is the `foreach` item, snapshotted at init. Why snapshot instead of re-reading at finish?

`foreach` is a Liquid expression (e.g. `{{ steps.search.output.hits.hits }}`).
Between init and finish, the step re-ticks across durable Task Manager resumes. If
`finish` re-evaluated `foreach` to label results and the underlying data changed
(eviction/rehydration differences, reordering, a re-run search), the index→item
correlation would **drift** — branch 2's result could be reported against a
different item. Snapshotting `key` at init guarantees `finish` reports the exact
item each branch ran on. (For static mode, `key` is the branch name — trivially
stable.)

### Q11. `count-waiting` (default true): with `max=2` and a branch parked in a timer wait, does it hold or free its slot? What does `count-waiting: false` change?

- `count-waiting: true` (default): a branch parked in a wait is still `running` and
  **holds its slot** — it bounds *total in-flight branches*.
- `count-waiting: false`: a started, non-terminal (waiting) branch **frees its slot**
  so other branches can start — it bounds *actively-executing branches* while letting
  many sit parked in waits.

Slot accounting: a `running` branch counts as in-use when `countWaiting || !b.started`.
The `!b.started` term lets a branch reserve its slot during the same tick it is
launched, even when `countWaiting` is false.
