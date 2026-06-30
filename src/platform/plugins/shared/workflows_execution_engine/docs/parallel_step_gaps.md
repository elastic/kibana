# Parallel step — gaps vs the epic & stories

What the PR does **not** deliver against the actual tickets. This is the
"acceptance criteria not met" list, separate from `parallel_step_red_flags.md`
(which is about code/test quality issues we found and mostly fixed).

Source of truth (read these, not the citations in `parallel_step.md`):

- Epic **#16372** — Parallel execution step (`elastic/security-team`).
- Story **#17833** — Dynamic parallel fan-out (must-have, build first).
- Story **#17834** — Static parallel branches (should-have).
- Design **#17835** — Parallel execution-view representation (DESIGN task — not an
  engineering acceptance gate).

> **Doc bug to fix:** `parallel_step.md` mislabels the tickets ("#17833 =
> manual-testing suite", "#17835 = per-branch correlation"). Correct to: #17833 =
> dynamic story, #17834 = static story, #17835 = exec-view design task.

Severity legend: **[BLOCKER]** a Must-Have acceptance criterion is unmet and not
yet formally descoped · **[CONTRACT]** output/validation contract differs from the
ticket · **[DOC]** documentation inaccurate.

---

## A. [BLOCKER] Nested flow-control inside a branch is rejected

- **Ticket scenario (#17833 *and* #17834, Must Have):**
  > Given a branch body contains `if`, `switch`, `foreach`, `while`, or connector
  > steps — those steps execute normally within each branch, subject to the
  > configured nesting-depth cap.
  > (Epic §5 repeats this.)
- **Current behavior:** `buildParallelBranchBody` rejects any branching / `enter-*`
  node at compile time. Only a straight-line body is allowed.
- **Why it's a gap:** This is an explicit Must-Have of the build-first story, not a
  should-have. `parallel_step.md` frames it as "v1 scope deferred", but a PR cannot
  unilaterally descope a Must-Have via a doc note.
- **Decision / action:** Get explicit product sign-off (@tinnytintin10) to split
  nested flow-control into a tracked follow-up (and reflect it on the story), **or**
  implement it. Until one of those happens, the stories' Must-Have boxes cannot be
  checked.

## B. [BLOCKER] Per-step `on-failure` inside a branch is rejected

- **Ticket scenario (#17833 *and* #17834, Must Have — the fail-fast model):**
  > Branch steps each retain their own `on-failure` handling … a branch only fails
  > if a step fails and its own `on-failure` did not absorb it.
  > (Epic §2: "Failure behavior layers on existing per-step `on-failure`.")
- **Current behavior:** `on-failure` inside a branch is rejected at compile time
  (the `enter-*` / `exit-*` rejection).
- **Why it's a gap:** The epic's layered-failure model — `mode` governs only
  sibling/aggregate behavior *on top of* per-step `on-failure` — is not
  implementable in v1, because per-step `on-failure` can't exist in a branch at all.
- **Decision / action:** Same as A — explicit descope sign-off + follow-up, or
  implement.

## C. [RESOLVED] Static result shape differs from the ticket

- **Ticket scenario (#17834, Must Have):**
  > `steps.<p>.branches.<name>` exposes each branch's `{ status, output, error }`.
- **Was:** Static mode produced only the index-aligned `results[]` (with
  `key = branch name`); there was no `.branches.<name>` accessor, so authors
  following the ticket (`steps.enrich.output.branches.geo.output`) hit nothing.
- **Fix (done):** The static aggregate now **also** emits a keyed projection
  `output.branches: { <name>: { status, output, error } }`, co-existing with
  `results[]`. Built in `enter_parallel_node_impl.ts` (`buildNamedBranchProjection`),
  typed as `ParallelNamedBranchResult`, populated **only in static mode** (dynamic
  `foreach` keeps `results[]` since its keys are items, not unique names). Covered by
  integration tests (keyed shape + downstream `{{ ...output.branches.scan.status }}`).

## D. [RESOLVED] Static-branch validation requires ≥2 branches

- **Ticket scenario (#17834, Must Have):**
  > Requires at least two branches, unique branch names, and a non-empty `steps`
  > array per branch.
- **Was:** `branches` was `.min(1)` (allowed ONE).
- **Fix (done):** `branches` is now `.min(2)` with a clear message in both schema
  variants (`ParallelStepObjectSchema` and `getParallelStepSchema`). Unique names ✅
  and per-branch `steps.min(1)` ✅ were already enforced. Covered by `schema.test.ts`
  (rejects single-branch).

## E. [RESOLVED] Manual-test README was inaccurate

- **MT-05 / MT-06** (fixed): the checklist now points at the authoritative
  `failure modes` integration tests and carries an explicit ⚠️ that `workflow.fail`
  triggers a workflow-level abort (not a branch-local failure), so those YAMLs are
  illustrative-only and a branch must fail via a local step failure.
- **"known v1 scope"** (fixed): corrected to say timer `wait` **is** supported
  inside a branch (parks across ticks); only `waitForInput` is rejected. Also
  expanded to note per-step `on-failure` and step-level `timeout` are rejected, and
  links the tradeoff doc.

---

## Scorecard

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
| Cancellation/timeout with clear reason (#17833/#17834) | ⚠️ partial (overall `timeout` gap — red_flags item 8) |
| **Nested flow-control inside branches (#17833/#17834)** | ❌ **rejected — gap A** |
| **Per-step `on-failure` inside branches (#17833/#17834)** | ❌ **rejected — gap B** |
| Static: run named branches concurrently (#17834) | ✅ met |
| Static: result keyed by branch name (#17834) | ✅ met (gap C fixed — `output.branches.<name>`) |
| Static: validation ≥2 branches (#17834) | ✅ met (gap D fixed — `min(2)`) |
| Static: unique branch names (#17834) | ✅ met |
| Static: non-empty steps per branch (#17834) | ✅ met |
| Exec-view representation (#17835) | n/a — design task, not an eng gate |

## Recommended dispositions

- **A, B** — escalate for a product scope decision before sign-off. Full analysis +
  options (and today's mitigations via `mode`/`concurrency`/`timeout`/aggregate) are
  in `parallel_step_nested_flow_control_tradeoff.md`. If descoped, open follow-up
  issues and uncheck the corresponding Must-Have boxes on the stories so the
  trackers reflect reality. **They are NOT fixed in this PR.**
- **C, D** — ✅ fixed in this PR (`output.branches.<name>` projection; `min(2)`).
- **E** — ✅ fixed in this PR (doc-only).
