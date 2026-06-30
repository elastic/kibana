# Parallel step — red flags / things to fix

Concrete issues surfaced while reviewing the static `branches` PR. Ordered by
severity. Each item: what, where, why it matters, suggested fix.

Legend: **[MUST]** block merge / correctness or test-integrity · **[SHOULD]**
fix soon / maintainability · **[NICE]** polish.

---

## [RESOLVED] 1. Manual-test YAMLs 05/06 don't actually test fail-fast vs settled

- **Where:** `common/examples/parallel_manual_tests/05_fail_fast.yaml`,
  `06_settled_mode.yaml`.
- **What:** Both use `type: workflow.fail` inside the branch body to "fail" a
  branch. But `workflow.fail` is transformed to `workflow.output` and trips a
  **workflow-level** failure — it terminates the whole workflow globally at the
  first branch, regardless of mode. The branch step itself is recorded
  `COMPLETED`, not `FAILED`.
- **Why it mattered:** These files were presented as the proof of mode behaviour,
  but in both modes the workflow dies at branch 0 — they demonstrate nothing
  about fail-fast vs settled. A reviewer running them gets a false signal.
- **Fix (done):** The mode behaviour is now proven by integration tests that fail
  branches with a **local step failure** (`FakeConnectors.constantlyFailing`),
  not `workflow.fail` (see item 2). Investigating this also surfaced a deeper
  correctness bug — see the **containment fix** below — which is the real reason
  `workflow.fail` masked everything: any branch failure was escalating to a
  whole-workflow abort.
  - **Containment fix (the headline):** a failing branch step calls `failStep`,
    which sets the **workflow-level** error as a side effect; the execution loop's
    `catchError` then failed the whole workflow the instant the parallel parked —
    so `settled` never ran past branch 0 and a failed parallel produced a `null`
    aggregate. The executor now **clears that leaked workflow error after each
    tick** (it owns branch-failure accounting via `state.branches` + the
    aggregate). Net: branch failures never fail the workflow on their own; the
    parallel `COMPLETED`s with a `status:'failed'` aggregate and a downstream step
    decides via `steps.<id>.output`. Verified e2e (settled runs all; fail-fast
    skips remaining) and by the `failure modes` integration tests.

---

## [RESOLVED] 2. No automated coverage for failure modes

- **Where:** `integration_tests/tests/parallel.test.ts`.
- **What:** The integration suite covered happy paths, concurrency windows, waits,
  static branches, and `{{ inputs.* }}` rendering — but **not** the fail-fast vs
  settled branch-scheduling behaviour, which is core semantics.
- **Why it mattered:** The most behaviour-defining config (`mode`) was untested at
  the engine level. Regressions here would be silent.
- **Fix (done):** Added a `failure modes` describe block with both scenarios using
  `FakeConnectors.constantlyFailing`, driving resumes to terminal and asserting:
  fail-fast runs < N branches with `skipped` entries and a `failed` aggregate;
  settled runs all N with `failed == total` and no skips; both keep the parallel
  step `COMPLETED` and the workflow continuing (containment). 44/44 parallel
  integration tests pass.

---

## [SHOULD] 3. No coverage for `count-waiting: false`

- **Where:** executor `slotsInUse` (`count-waiting` slot accounting); tests in
  `parallel.test.ts` (none) and unit tests (only 2 incidental references).
- **What:** The `count-waiting: false` path (waiting branch frees its slot) is
  documented and implemented but not exercised by an integration test.
- **Why it matters:** The slot predicate `countWaiting || !b.started` is subtle;
  the `!b.started` term is easy to break in a refactor, silently changing
  throughput/back-pressure semantics.
- **Fix:** Add a test: `max` small, more branches than slots, branches that park
  in a timer wait, `count-waiting: false` → assert more branches start (run)
  concurrently than `max` would allow under the default `true`.

---

## [RESOLVED] 4. Mode-exclusivity refinement is duplicated (drift risk)

- **Where:** `kbn-workflows/spec/schema.ts` — `parallelModeRefinement` was applied
  (with its message) in both `ParallelStepSchema` and `getParallelStepSchema`.
- **What:** The same predicate + message string were wired in two places. The base
  vs refined split is necessary (ZodEffects can't `.extend()`), but the
  refinement application was copy-pasted.
- **Why it mattered:** A future change to the rule (or message) in one place and
  not the other → static vs runtime-connector schema diverge, with confusing,
  mode-dependent validation.
- **Fix (done):** Extracted a single `applyParallelModeRefinement(schema)` helper
  that attaches the predicate + `PARALLEL_MODE_REFINEMENT_MESSAGE` from one place;
  both `ParallelStepSchema` and `getParallelStepSchema` now route through it. The
  predicate accepts `unknown` and narrows internally so it applies to any
  parallel-step schema variant. Verified by the existing 67 `schema.test.ts` cases
  (full mode-exclusivity matrix still passes).

---

## [SHOULD] 5. UI: a completed step can transiently render as "running"

- **Where:** workflow execution UI (live polling); observed on `scanFileHash`
  during a real run (step had `executionTimeMs` set yet showed a spinner).
- **What:** During live polling, a step can briefly show `running` even though it
  already has `executionTimeMs` / `finishedAt`, because the status flip lags the
  duration flush in the polled snapshot. Not an engine data bug (persisted state
  is `completed`).
- **Why it matters:** Looks like a stuck/hung step to users reviewing parallel
  runs (where many steps update near-simultaneously), eroding trust.
- **Fix (UI polish):** Treat presence of `executionTimeMs` / `finishedAt` as
  terminal for rendering — suppress the running spinner when either is set.

---

## [RESOLVED] 6. `getItems` JSON-string fallback can mask author errors

- **Where:** executor `getItems` — if `foreach` renders to a string it
  `JSON.parse`s it; on failure it used to throw "Unable to parse rendered parallel
  foreach value".
- **What:** A `foreach` that renders to a non-JSON string (e.g. a stray template
  result) produced a parse error rather than a "must evaluate to an array"
  message, which is less obvious to authors.
- **Why it mattered:** Minor DX; the two error paths gave different messages for
  what is conceptually the same mistake (foreach isn't an array).
- **Fix (done):** Both the JSON-parse failure and the non-array result now funnel
  into the **same** message that names the offending expression:
  `… foreach expression must evaluate to an array, but "<expr>" did not. Provide a
  literal array or an expression that resolves to one.` Covered by a unit test in
  `enter_parallel_node_impl.test.ts`.

---

## [RESOLVED] 7. Static `branches[].name` uniqueness is not enforced

- **Where:** `ParallelBranchSchema` (`name` is `string().min(1)`); aggregate
  output uses `name` as the result `key`.
- **What:** Two branches with the same `name` were allowed; the aggregate would
  then have two results sharing a `key`, making name-keyed correlation ambiguous.
- **Why it mattered:** Downstream consumers reading results by `key` could pick the
  wrong branch. Low likelihood, but cheap to prevent.
- **Fix (done):** Added a `parallelBranchNamesUniqueRefinement` (with
  `PARALLEL_BRANCH_NAMES_UNIQUE_MESSAGE`) chained into
  `applyParallelModeRefinement`, so both schema variants reject duplicate branch
  names. Covered by `schema.test.ts` (rejects duplicates, accepts distinct) and
  verified e2e (a duplicate-name workflow is rejected at validation, HTTP 400).

---

## [SHOULD] 8. Overall `timeout` is shadowed by the generic step-timeout monitor

- **Where:** executor `tick()` overall-timeout branch + `run_node.ts` /
  `run_stack_monitor` (generic step timeout).
- **What:** The parallel executor has an internal tick-time overall-timeout check
  that marks in-flight branches `timed_out` and calls `finish()` to produce the
  aggregate. But the generic step-timeout monitor reads the **same** `timeout` and,
  when all branches park in-flight, fires **first** — failing the whole workflow
  with `"Step execution exceeded the configured timeout"` and **no aggregate**.
- **Why it matters:** Inconsistent with `branch-timeout` (which is contained inside
  the executor and produces an aggregate, workflow continues). Authors expecting
  overall `timeout` to behave like `branch-timeout` get a hard failure instead.
  Confirmed e2e.
- **Fix:** Make the parallel step opt out of the generic monitor's timeout for its
  own `timeout` config so the executor's contained `finish()` path wins. Until
  then, prefer `branch-timeout`. Documented as a "Known gap" in `parallel_step.md`.

---

## Verification checklist before sign-off

- [x] Item 1 + 2: fail-fast vs settled proven by integration tests using a
      locally-failing step (`FakeConnectors.constantlyFailing`), not
      `workflow.fail`; surfaced + fixed the branch-failure containment bug.
- [ ] Item 3: `count-waiting: false` exercised by an **integration** test (covered
      e2e in the correctness campaign, but not yet an in-repo integration test).
- [x] Item 4: single source of truth for the mode refinement (`applyParallelModeRefinement`).
- [ ] Item 5: UI transient "running" — triaged as UI polish; file a follow-up issue
      (different plugin, out of scope for this PR).
- [x] Item 6: unified non-array `foreach` error message (+ unit test).
- [x] Item 7: unique static branch names enforced (+ schema test, verified e2e).
- [ ] Item 8: overall `timeout` vs generic monitor — documented as a known gap;
      fix or file a follow-up issue.
- [ ] Re-run `node scripts/check.js --scope=branch` after fixes.

---

# Ticket alignment (epic vs implementation)

Checked against the **actual** epic and stories, not the doc's citations:

- Epic **#16372** — Parallel execution step (`elastic/security-team`).
- Story **#17833** — Dynamic parallel fan-out (must-have, build first).
- Story **#17834** — Static parallel branches (should-have).
- Design **#17835** — Parallel execution-view representation (DESIGN task, not an
  engineering gate).

> Doc bug: `parallel_step.md` mislabels these — it says "#17833 = manual-testing
> suite" and "#17835 = per-branch correlation". Correct them: #17833 = dynamic
> story, #17834 = static story, #17835 = exec-view design.

## [MUST / SCOPE DECISION] A. Nested flow-control inside a branch is a Must-Have we reject

- **Tickets:** #17833 **and** #17834 both list as **Must Have**:
  *"a branch body contains `if`, `switch`, `foreach`, `while`, or connector steps …
  those steps execute normally within each branch, subject to the nesting-depth
  cap."* Epic §5 repeats it.
- **Implementation:** `buildParallelBranchBody` **rejects** any branching/`enter-*`
  node at compile time → only a straight-line body is allowed.
- **Gap:** This is an explicitly required scenario of the build-first story, not a
  should-have. `parallel_step.md` frames it as "v1 scope deferred", but a PR author
  cannot unilaterally descope a Must-Have via a doc note.
- **Action:** Either (a) get explicit product sign-off (@tinnytintin10) to split
  nested flow-control into a tracked follow-up and reflect that on the stories, or
  (b) implement it. Until then the stories' Must-Have boxes cannot be checked.

## [MUST / SCOPE DECISION] B. Per-step `on-failure` inside a branch is required by the failure model

- **Tickets:** Both stories' fail-fast scenario is **built on** per-step
  `on-failure`: *"branch steps each retain their own `on-failure` handling … a
  branch only fails if a step fails and its own `on-failure` did not absorb it."*
  Epic §2: *"Failure behavior layers on existing per-step `on-failure`."*
- **Implementation:** `on-failure` inside a branch is **rejected** at compile time
  (the `enter-*`/`exit-*` rejection).
- **Gap:** The layered-failure model the epic describes (mode governs sibling/
  aggregate behaviour *on top of* per-step on-failure) is not implementable in v1,
  because per-step on-failure can't exist in a branch at all.
- **Action:** Same as A — explicit descope sign-off + follow-up, or implement.

## [MUST] C. Static result contract mismatch: epic wants `steps.<p>.branches.<name>`

- **Ticket #17834 Must Have:** *"`steps.<p>.branches.<name>` exposes each branch's
  `{ status, output, error }`"* (name-keyed map).
- **Implementation:** static mode produces the **same index-aligned `results[]`**
  as dynamic (with `key = branch name`). There is no `.branches.<name>` accessor.
- **Gap:** Authors following the ticket write `steps.enrich.branches.geo.output` —
  which does not exist. Contract mismatch on a Must-Have.
- **Note:** Dynamic contract (#17833: index-aligned `results[]` + aggregates) is
  matched **exactly** ✅, and a *keyed map for dynamic* is correctly deferred
  (epic out-of-scope #3). It's the **static** keyed-by-name map that is Must-Have
  and missing.
- **Action:** Add a `branches: { <name>: { status, output, error } }` projection to
  the static aggregate output (can co-exist with `results[]`), or get the contract
  change agreed on #17834.

## [MUST] D. Static-branch validation is incomplete

- **Ticket #17834 Must Have:** *"requires **at least two branches**, **unique branch
  names**, and a non-empty `steps` array per branch."*
- **Implementation:** `branches` is `.min(1)` (allows ONE). Unique names now
  enforced (red-flag item 7, fixed). Per-branch `steps.min(1)` ✅.
- **Gap:** `min(1)` should be `min(2)` per the ticket (a single-branch "parallel"
  is degenerate).
- **Action:** Change `branches` to `.min(2)` with a clear message, or get the
  single-branch allowance agreed on #17834.

## [CONFIRMED] E. Manual-test acceptance + wait-scope doc mismatch

- **MT-05/MT-06** (the #17833 manual README) acceptance can never pass with
  `workflow.fail` (see red-flag item 1 — fixed via integration tests + the
  containment bug). The **README checklist** still states the old expectations and
  should be updated to match the locally-failing approach.
- **README "known v1 scope"** says **both** `wait` and `waitForInput` are rejected
  inside a branch. The code rejects only `waitForInput`; timer `wait` is
  **supported** (integration test: "timer-based wait inside a branch body"). Fix
  the README wording.

## Alignment scorecard

| Requirement (story) | Status |
| --- | --- |
| Dynamic fan-out + `foreach.item/index` (#17833) | ✅ met |
| Continue when all done; duration = slowest (#17833) | ✅ met |
| Concurrency cap + batch-drain + finite default (#17833) | ✅ met |
| Concurrency ceiling at validation (#17833) | ✅ met |
| Total fan-out cap (#17833) | ✅ met |
| Dynamic index-aligned `results[]` + aggregates (#17833) | ✅ met |
| fail-fast drains in-flight, then fails (#17833/#17834) | ✅ met (after containment fix) |
| settled runs all, reports per-branch (#17833/#17834) | ✅ met (after containment fix) |
| Cancellation/timeout with clear reason (#17833/#17834) | ⚠️ partial (overall `timeout` gap, item 8) |
| **Nested flow-control inside branches (#17833/#17834)** | ❌ **rejected (A)** |
| **Per-step `on-failure` inside branches (#17833/#17834)** | ❌ **rejected (B)** |
| Static: run named branches concurrently (#17834) | ✅ met |
| **Static: result keyed by branch name `steps.<p>.branches.<name>` (#17834)** | ❌ **mismatch (C)** |
| **Static: validation ≥2 branches (#17834)** | ❌ **min(1) (D)** |
| Static: unique branch names (#17834) | ✅ met (item 7) |
| Static: non-empty steps per branch (#17834) | ✅ met |
| Exec-view representation (#17835) | n/a — design task, not an eng gate |
