# Parallel step — nested flow-control & per-step `on-failure`: the tradeoff

This doc explains **why** a parallel branch body is currently restricted to a
straight line of atomic steps (gaps **A** and **B** in `parallel_step_gaps.md`),
what it would take to lift that restriction, and — importantly — **how far you can
get today** using the parallel step's own control/metadata knobs (`mode`,
`concurrency`, `timeout`, `branch-timeout`, the aggregate output) instead of
nesting flow-control inside a branch.

Audience: reviewers deciding whether A/B must land in phase 1, and authors who hit
the "branch body must be a straight-line sequence of steps" error.

---

## 1. What is restricted, exactly

A parallel branch body (both dynamic `foreach`+`steps` and static `branches[].steps`)
must be a **straight-line sequence of atomic/connector/`wait` steps**. The graph
builder rejects, at compile time:

- Nested **flow-control**: `if`, `switch`, `foreach`, `while` (gap **A**).
- Per-step **`on-failure`** handlers: `retry`, `continue`, `fallback` (gap **B**).
- Step-level **`timeout`** zones.
- **`waitForInput`** (indefinite, externally-resumed wait).

Supported inside a branch: any number of atomic/connector steps in sequence, and
timer-based **`wait`** (a branch parks across ticks and the step re-ticks at the
earliest branch `resumeAt`).

The rejection is deliberate and loud — see
`kbn-workflows/graph/build_execution_graph/build_execution_graph.ts`
(`buildParallelBranchBody`). The alternative (silently running one `if` path, or a
branch hanging forever) is worse than a clear compile error.

---

## 2. Why it's restricted — the single-cursor execution model

The whole engine advances on **one global cursor**. The main loop is literally:

```ts
// workflow_execution_loop/execution_flow_loop.ts
while (workflowRuntime.getWorkflowExecutionStatus() === RUNNING) {
  await runNode(params);
}
```

`runNode` reads/writes a single `workflowExecution.currentNodeId`
(`workflow_execution_runtime_manager.ts`). Flow-control works by pushing
`enter-*`/`exit-*` nodes onto a stack and walking it **with that one cursor**:
`enter-if` evaluates a condition and jumps; `enter-retry`/`enter-fallback` drive
the `on-failure` protocol; each `exit-*` pops the scope.

A parallel step needs **N cursors advancing concurrently within one tick** — one
per in-flight branch. That doesn't fit the single-cursor loop, so the parallel
executor (`enter_parallel_node_impl.ts`) drives branches **itself**, with a
per-branch cursor:

```ts
// advanceBranch(): a straight-line walk, one successor at a time
const nextNodeId = this.getBranchSuccessor(currentNodeId); // successors[0]
```

`getBranchSuccessor` takes `successors[0]`. That assumption breaks for exactly the
rejected constructs:

- `enter-if`/`enter-switch` have **multiple** successors → `successors[0]` would
  silently pick one path and drop the rest (**wrong results**, not just a hang).
- `enter-*`/`exit-*` need the loop's stack machinery (condition eval, scope
  push/pop, the enter→…→exit protocol, retry/fallback resumption). The branch
  walker runs a single node impl per step; it does **not** drive that protocol, so
  a wrapped body would **hang** at runtime.

So: it's not that nesting is conceptually impossible — it's that the branch walker
is a deliberately-simple straight-line driver, and the real flow-control driver
(the main loop) is single-cursor.

---

## 3. What lifting the restriction actually costs

Two implementation shapes. Only the first is the "right" fix.

### Option 1 — make the loop re-entrant per branch (correct, larger)

Refactor `runNode` and the flow-control node impls to operate on an **injected
cursor + scope** instead of the single global `currentNodeId`. The parallel
executor then runs one **mini-loop per branch**, each with its own cursor,
parking/resuming across parallel ticks. Nested flow-control and `on-failure` come
**for free**, because you reuse the real impls.

Cost / risk:

- The cursor is **global state** read in many places (`getCurrentNode`,
  `navigateToNode`, `goToNextNode`, the stack monitor, `catchError`). Threading an
  explicit cursor through all of them is a **cross-cutting core-engine refactor**,
  not a parallel-local change — it touches every step type's execution path.
- It interacts with the **failure-containment fix** (the parallel executor clears
  the leaked workflow-level error after a branch fails). With nested `on-failure`,
  failures would be absorbed/transformed **inside** the branch sub-loop (more
  correct), which moves *where* containment happens and must be re-validated.
- `branch-timeout`/overall `timeout` semantics must compose with nested
  step-level `timeout` zones.

This is the only path that delivers **B** (`on-failure`), because `on-failure`
*is* the retry/continue/fallback enter/exit protocol — there's no shortcut.

### Option 2 — recurse over enter/exit spans inside the parallel walker (smaller, not recommended)

Teach the branch walker to treat `enter-X … exit-X` as a nested span (evaluate the
condition, jump to the chosen sub-branch, run to its `exit`, continue). Medium
effort, parallel-local, no global-cursor change — **but** it re-implements the main
loop's flow-control logic and you maintain **two copies forever** (the exact drift
the codebase avoids). It also doesn't cleanly get `on-failure` (retry/fallback have
their own resumption semantics). Avoid.

### Disposition options (a lead/product call, not a default)

1. **Implement now via Option 1** — keeps phase 1 whole; accept a larger PR + core
   re-entrancy refactor + re-validating containment under nested `on-failure`.
2. **Split, same phase** — land dynamic+static+containment first (independently
   reviewable), then A/B as a second phase-1 PR via Option 1. Delivers phase 1
   complete without cramming a core refactor into the feature PR. **Recommended.**
3. **Descope with explicit sign-off** — only if product agrees nested
   flow-control / per-step `on-failure` can slip; then open a tracked issue and
   uncheck the Must-Have boxes so the trackers reflect reality.

What we should **not** do: silently descope a Must-Have via a doc note, or take
Option 2 (cheap now, expensive forever).

---

## 4. Mitigations available **today** with the parallel step's own knobs

Most things authors reach for nested flow-control to do can be expressed with the
parallel step's existing **control** (`mode`, `concurrency`, `timeout`,
`branch-timeout`) and **metadata** (the aggregate `output`) plus a downstream step.
The pattern is: **move the control-flow OUT of the branch and AROUND the parallel
step.**

### 4.1 "I want per-step retry inside a branch" → use a retrying connector or wrap the parallel step

- Many connectors/HTTP steps support their own retry/backoff config — prefer that
  *inside* the branch (it's not flow-control, just step config).
- For retrying the **whole** fan-out, put the `on-failure` (retry/fallback) on the
  **parallel step itself** (that's allowed — the restriction is only *inside* a
  branch), or wrap it in an outer construct.

### 4.2 "I want fail-fast vs keep-going" → that's exactly `mode`

You don't need `if`/error-handling inside a branch to control failure behavior:

```yaml
- name: enrich
  type: parallel
  mode: settled        # run EVERY branch to terminal, report per-branch (default: fail-fast)
  branches: [ ... ]
```

- `fail-fast` (default): stop scheduling not-yet-started branches after the first
  failure, let in-flight ones drain, then the aggregate is `status: failed`.
- `settled`: every branch runs to a terminal state; the parallel step still
  `COMPLETED`s and the aggregate reports each branch.

In **both** modes a branch failure is **contained** — it does not fail the
workflow. The parallel step always `COMPLETED`s with a `status` aggregate; a
**downstream** step decides what to do.

### 4.3 "I want to branch on a result" → branch DOWNSTREAM on the aggregate output

Instead of an `if` inside a branch, read the aggregate after the parallel step:

```yaml
- name: enrich
  type: parallel
  mode: settled
  branches:
    - name: scan
      steps: [ ... ]
    - name: geo
      steps: [ ... ]

# Downstream if-step on the aggregate (this is a normal step, fully supported):
- name: handle_failures
  type: if
  condition: '{{ steps.enrich.output.failed > 0 }}'
  steps:
    - name: alert
      type: slack
      with: { message: 'parallel had {{ steps.enrich.output.failed }} failures' }
```

The aggregate gives you everything to route on:

| Field | Meaning |
| --- | --- |
| `steps.<p>.output.status` | `completed` \| `failed` (failed if any branch failed/timed out) |
| `steps.<p>.output.total` / `succeeded` / `failed` | counts |
| `steps.<p>.output.results[]` | index-aligned `{ index, key, status, output, error, timing }` |
| `steps.<p>.output.branches.<name>` | **static mode**: per-branch `{ status, output, error }` keyed by name |

Example reading a single named branch downstream:

```yaml
condition: '{{ steps.enrich.output.branches.geo.status == "failed" }}'
# or consume a branch's output:
message: 'geo says {{ steps.enrich.output.branches.geo.output.country }}'
```

> Note: the keyed `branches.<name>` map is **static-mode only** (names are unique
> and schema-guaranteed). In dynamic `foreach` mode use the index-aligned
> `results[]` (its keys are items, which need not be unique).

### 4.4 "I want a timeout/cancellation" → use `branch-timeout` (preferred) or `timeout`

You don't need a step-level `timeout` zone inside a branch:

```yaml
- name: enrich
  type: parallel
  branch-timeout: 30s   # per-branch deadline, enforced INSIDE the executor
  timeout: 2m           # overall deadline for the whole parallel step
  branches: [ ... ]
```

- **`branch-timeout`** is contained: each over-budget branch is marked
  `timed_out` (its in-flight work aborted), `finish()` still produces the
  aggregate, and the workflow continues. **Prefer this.**
- **`timeout`** (overall) currently has a known gap: the generic step-timeout
  monitor can win the race and hard-fail the workflow with no aggregate (see
  `parallel_step_red_flags.md` item 8). Use `branch-timeout` when you want a
  contained, aggregate-producing timeout.

### 4.5 "I want back-pressure / not to hammer a downstream" → `concurrency`

```yaml
concurrency:
  max: 3              # at most 3 branches run at once (ceiling enforced at validation)
  count-waiting: false # a parked/polling branch frees its slot so others can start
```

### 4.6 What you genuinely **cannot** express today (needs A/B)

- A branch whose body itself **fans out again** (`foreach`/`while` *inside* a
  branch) or makes an **intra-branch decision** (`if`/`switch` between two of the
  branch's own steps). Workaround: split into separate named branches, or move the
  decision downstream (4.3) — but a true per-branch loop/conditional is the A gap.
- A branch step that **recovers locally** via its own `on-failure` (retry/continue/
  fallback) so the branch *succeeds despite a transient step error*. `mode` governs
  sibling/aggregate behavior, not intra-branch recovery — this is the B gap.
  Partial workaround: a connector with built-in retry, or accept the branch failure
  and handle it downstream (4.3).

---

## 5. Summary

- The restriction exists because the engine is **single-cursor** and the parallel
  branch walker is a deliberately-simple straight-line driver. Lifting it correctly
  (**Option 1**) is a **core-engine re-entrancy refactor**, which is why it's a
  scope decision rather than a quick add.
- A large fraction of real use cases don't need nested flow-control: use
  **`mode`** for failure policy, **downstream `if` on the aggregate** for routing,
  **`branch-timeout`** for contained deadlines, **`concurrency`** for back-pressure,
  and the **`branches.<name>` / `results[]`** metadata to drive what comes next.
- The two cases with **no** good workaround are **intra-branch loops/conditionals**
  (A) and **intra-branch local recovery via per-step `on-failure`** (B). Those are
  the items to consciously implement (Option 1) or descope with sign-off.
