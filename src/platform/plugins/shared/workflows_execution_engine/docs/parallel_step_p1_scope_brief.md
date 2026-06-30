# Brief: relaxing nested flow-control & per-step `on-failure` for parallel P1

**Audience:** PM / tech lead deciding P1 scope for the parallel step (#16372 / #17833 / #17834).
**Ask:** Ship P1 **without** in-branch nested flow-control (gap A) and in-branch
per-step `on-failure` (gap B); track them as a fast-follow. **Nothing else in the
stories is descoped.**
**TL;DR:** Both gaps have first-class workarounds using the parallel step's own
**control** (`mode`, `concurrency`, `timeout`, `branch-timeout`) and **metadata**
(the aggregate `output`). Implementing them properly is a core-engine re-entrancy
refactor (see `parallel_step_nested_flow_control_tradeoff.md`) that shouldn't be
rushed into the feature PR.

---

## What we're proposing to relax (and only this)

A parallel **branch body** must be a straight line of steps. Not allowed *inside a
branch* in P1:

- **A** — nested `if` / `switch` / `foreach` / `while`
- **B** — per-step `on-failure` (retry / continue / fallback) and step-level `timeout`

Everything else ships: dynamic fan-out, static named branches, concurrency caps,
fail-fast/settled, branch-timeout, the aggregate output, validation. (`on-failure`
and `timeout` on the **parallel step itself** are allowed — the limit is only
*inside* a branch.)

---

## Why this is safe to relax: the user stories still work

For each thing an author would reach into a branch for, here's the P1 path using
the step's own controls.

### Story 1 — "If a branch fails, I don't want it to kill everything."
**Don't need in-branch error handling — use `mode`.**
- `mode: settled` runs every branch to terminal and reports each one.
- `mode: fail-fast` (default) stops scheduling after the first failure, drains
  in-flight, then reports.
- In **both**, a branch failure is **contained** — the parallel step `COMPLETED`s
  and **never fails the workflow on its own**. ✔ verified e2e + integration tests.

### Story 2 — "Based on what the branches returned, do X or Y."
**Don't need an `if` inside a branch — branch DOWNSTREAM on the aggregate.**
```yaml
- name: enrich
  type: parallel
  mode: settled
  branches: [ { name: scan, steps: [...] }, { name: geo, steps: [...] } ]
- name: handle
  type: if                                   # normal, fully-supported step
  condition: '{{ steps.enrich.output.failed > 0 }}'
  steps: [ ... ]
```
The **metadata** to route on is rich:
`output.status` / `total` / `succeeded` / `failed`, `output.results[]`
(`{index,key,status,output,error,timing}`), and **static mode** adds
`output.branches.<name>.{status,output,error}`.

### Story 3 — "A branch step is flaky; retry it."
**Don't need in-branch `on-failure` — use connector retry, or retry the fan-out.**
- Most HTTP/connector steps have their own retry/backoff config (that's step
  *config*, not flow-control — allowed inside a branch).
- To retry the whole scatter-gather, put `on-failure` on the **parallel step
  itself** (allowed).

### Story 4 — "Each branch should give up after N seconds."
**Don't need an in-branch step `timeout` — use `branch-timeout`.**
`branch-timeout: 30s` marks each over-budget branch `timed_out`, still produces
the aggregate, and the workflow continues — **contained**. ✔ verified e2e.

### Story 5 — "Limit how many run at once / don't hammer a downstream."
**`concurrency: { max: N, count-waiting: false }`** — first-class back-pressure.

---

## What genuinely has NO P1 workaround (be honest)

Two narrow cases. We should name them as the explicit follow-up scope:

1. **Intra-branch loop/conditional** — a branch that itself fans out (`foreach`/
   `while`) or decides between *its own* steps (`if`/`switch`). Partial workaround:
   split into separate named branches, or move the decision downstream — but a true
   per-branch loop is gap A.
2. **Intra-branch local recovery** — a branch step that *recovers via its own
   `on-failure`* so the branch **succeeds despite** a transient error. `mode`
   governs sibling/aggregate behavior, not intra-branch recovery — that's gap B.

Impact assessment: these are advanced authoring patterns. The common 80% (fan out,
run concurrently, handle failures, time out, route on results) is fully covered by
Stories 1–5. The 20% can wait for the fast-follow.

---

## Why not just implement them now?

Because doing it **correctly** is a core-engine change, not a parallel-local one.
The engine advances on a **single global cursor**; the parallel step hand-walks
each branch as a straight line and can't drive the `enter-*/exit-*` stack protocol
that `if`/`on-failure`/etc. require. The right fix makes the execution loop
re-entrant per branch (one sub-loop per branch with its own cursor), which touches
every step type's execution path and interacts with the branch-failure containment
logic we just landed. Full analysis + options:
`parallel_step_nested_flow_control_tradeoff.md`.

Cramming that into the feature PR risks the (tested, working) P1 surface right
before sign-off.

---

## Recommendation

1. **Ship P1** as-is (dynamic + static + containment + concurrency/timeout +
   aggregate, incl. the `branches.<name>` contract).
2. **Open ONE tracked follow-up** — "Nested flow-control + per-step `on-failure`
   inside parallel branches" — and **uncheck those Must-Have boxes** on
   #17833/#17834 so the trackers reflect reality (no silent descope via a doc note).
3. Implement the follow-up via the re-entrant-loop approach as a **separate,
   reviewable PR** (ideally still within the P1 milestone if capacity allows).

**Decision needed:** approve relaxing A & B to a tracked fast-follow (with the boxes
unchecked), or require them in the feature PR.
