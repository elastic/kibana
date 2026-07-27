# Parallel Step — Design & Execution Reference

> Reference for the `parallel` step in the Workflows execution engine — both the
> dynamic `foreach` fan-out mode and the static `branches` scatter-gather mode
> (see §1b). Read this before reviewing/attacking the PoC PR. It captures the
> architecture, the durable-tick execution model, every nuance and sharp edge we
> found, and worked "bits & bytes" traces of real executions.

---

## 1. Context

### Tickets
- **#17833** — Parallel step manual-testing suite + known v1 scope (nested
  flow-control / `waitForInput` rejected at compile time). See
  `workflows_management/common/examples/parallel_manual_tests/README.md`.
- **#17835** — Per-branch result correlation (`key` on each `results[]` entry),
  surfaced in the execution view.

### Source of truth (code)
| Concern | File |
| --- | --- |
| Durable-tick executor | `workflows_execution_engine/server/step/parallel_step/enter_parallel_node_impl.ts` |
| Exit node | `…/parallel_step/exit_parallel_node_impl.ts` |
| State / output types | `…/parallel_step/types.ts` |
| Graph build (enter/body/exit, rejections) | `kbn-workflows/graph/build_execution_graph/build_execution_graph.ts` + `tests/parallel_step_graph.test.ts` |
| Schema + ceilings | `kbn-workflows/spec/schema.ts` (`DEFAULT_PARALLEL_*`) |
| Engine config (operator overrides) | `workflows_execution_engine/server/config.ts` |
| Editor validation (graph-build marker) | `workflows_management/public/features/validate_workflow_yaml/lib/validate_graph_build.ts` |
| Fan-out authoring validation | `…/validate_workflow_yaml/lib/validate_parallel_fan_out.ts` |

### Glossary
- **Fan-out** — expanding `foreach` into N independent **branches**, one per item.
- **Branch** — one instance of the branch body for one fan-out item. Identified
  by its `index` (also its `scopeId`).
- **Tick** — one invocation of `EnterParallelNodeImpl.run()`. A parallel step may
  span many ticks across Task Manager resumes, or finish in a single tick.
- **Durable tick / poll pattern** — every non-terminal tick re-enters a wait
  (`enterWaitUntil`) and schedules a resume; every terminal tick finishes the
  step and writes results. State lives on the step execution, not in memory.
- **Run-to-completion step** — a step whose `handler` awaits its work and returns
  a terminal status in one call (e.g. `ai.agent`, `http`, `slack`). Contrast with
  a **poll step** that parks itself and resumes across ticks.
- **Slot / concurrency window** — at most `concurrency.max` branches occupy slots
  at once. `count-waiting` decides whether a parked branch keeps holding its slot.
- **Scope / stack frames** — the variable context a step renders against
  (e.g. `{{ foreach.item }}`). Each branch derives a distinct scope from a stable
  base via `scopeId = index`.

### Defaults & ceilings (`kbn-workflows/spec/schema.ts`)
| Constant | Value | Meaning |
| --- | --- | --- |
| `DEFAULT_PARALLEL_CONCURRENCY` | `5` | concurrency when `concurrency` omitted |
| `DEFAULT_PARALLEL_MAX_CONCURRENCY` | `20` | hard ceiling; schema rejects above, runtime clamps |
| `DEFAULT_PARALLEL_MAX_FAN_OUT` | `100` | max branches; exceeding throws at init |

These ceilings are currently fixed constants in `@kbn/workflows`; there are no
operator config overrides yet.

---

## 1b. Two modes: dynamic fan-out vs static branches

The `parallel` step has two **mutually exclusive** modes (enforced by a schema
refinement — exactly one must be present):

### Dynamic fan-out (`foreach` + `steps`)
Run the **same** branch body once per item in a runtime list, concurrently. The
number of branches is only known at runtime; every branch is the same shape.

```yaml
- name: fanOut
  type: parallel
  foreach: '{{ steps.list.output }}'
  steps:
    - name: branchStep
      type: slack
      with: { message: 'item:{{ foreach.item }}' }
```

- Branch `key` = the snapshotted `foreach` item (per #17835).
- Per-branch context exposes `{{ foreach.item }}` / `{{ foreach.index }}`.
- Subject to `DEFAULT_PARALLEL_MAX_FAN_OUT`.

### Static branches (`branches`)
Run a **fixed set of named, heterogeneous** branches concurrently
(scatter-gather). The set is known at author time, so each branch compiles to
its **own real subgraph** with its own body.

```yaml
- name: enrich
  type: parallel
  branches:
    - name: virustotal
      steps:
        - name: scan_hash
          type: virustotal.scanFileHash
          with: { hash: '{{ inputs.file_hash }}' }
    - name: geoip
      steps:
        - name: geo_lookup
          type: http
          with: { url: 'http://ip-api.com/json/{{ inputs.source_ip }}' }
```

- Branch `key` = the branch **name** (used in `results[]` correlation).
- No `foreach` context; each branch reads the shared workflow scope directly
  (`{{ inputs.* }}`, `{{ consts.* }}`, `{{ steps.* }}` all resolve normally) and
  exposes its steps downstream by their normal step ids (e.g.
  `steps.scan_hash.output.*`).
- `branches` and `foreach`/`steps` cannot be combined; `branches` must omit
  top-level `steps`.

> #### Gotcha: `consts` are not recursively rendered (mode-independent)
> A `const` whose **value** is itself a template (e.g.
> `consts.alert.file_hash: '{{ inputs.file_hash }}'`) is surfaced to a step as
> the **literal** string `{{ inputs.file_hash }}` — template rendering is a
> single pass, so `{{ consts.alert.file_hash }}` substitutes the raw const value
> and does not re-render it. This is **not** specific to parallel/branches; it
> applies everywhere. Reference `{{ inputs.* }}` (or `{{ steps.* }}`) **directly**
> in the step instead of laundering it through a const.

### What's shared vs different
Both modes share the **same durable-tick executor, concurrency window, timeouts,
abort handling, and aggregate output shape**. The only differences:

| Concern | Dynamic (`foreach`) | Static (`branches`) |
| --- | --- | --- |
| Branch count | runtime list length | fixed `branches.length` |
| Branch bodies | one shared body | one body per branch (heterogeneous) |
| Graph | single body subgraph, run per item | N body subgraphs wired enter→…→exit |
| Enter node | `branchStartNodeId` | `branches[]` (name + per-branch `startNodeId`) |
| Branch `key` | snapshotted item | branch name |
| Start node lookup | shared start node | `branches[index].startNodeId` |

Because static branches are fully known at compile time, the graph builder emits
one chain per branch (`createParallelGraph` → `buildParallelBranchBody` per
branch) and the executor just walks each branch's own start node. The v1
branch-body constraints (straight-line only; no `waitForInput`) apply per branch
in both modes.

---

## 2. Problem statement

Author a single step that **fans out over a dynamic list and runs each item's
work concurrently**, then aggregates results **index-aligned** with the input —
all within the workflow engine's **durable, resumable** execution model (state in
Elasticsearch, driven by Task Manager), so a parallel step survives worker
restarts and long-running branches without holding everything purely in memory.

Constraints this creates:
- Branches must run **concurrently** for I/O-bound bodies (overlap HTTP/LLM
  calls), not serialize.
- Branch context (`foreach.item`) must be **isolated** — concurrent branches must
  not clobber each other's scope.
- Progress (which branch is done/pending) must be **durably persisted** so a
  resume re-enters the parallel correctly.
- Per-branch and overall **timeouts** must actually interrupt in-flight work.
- Results must be **stable and correlatable** (`index` + `key`) for downstream
  steps.

---

## 3. Nuances & sharp edges (everything we discussed)

### Execution model
- **`ai.agent` is run-to-completion** (`createServerStepDefinition`, not
  `createPollServerStepDefinition`). Its handler awaits the whole agent event
  stream (`firstValueFrom(events$.pipe(toArray()))`) and returns when done. It
  **does not** yield/park itself across ticks.
- Consequence: branches whose body is run-to-completion **block inside the tick**.
  `tick()` does `await Promise.all(advanceBranch …)`, so the Task Manager task
  holds its worker for the duration of the slowest branch (up to `branch-timeout`).
  **This is not new and not worse than today:** a single long `ai.agent` step
  already blocks one worker for its whole duration — that's `ai.agent`'s
  run-to-completion nature, independent of `parallel`. Parallel does **not** extend
  any single call's blocking time. In fact it **consolidates**: N agents run
  concurrently on **one** worker for ≈ the slowest agent's duration, instead of
  serializing (≈ sum) or spreading across N workers. The genuinely new axis is
  **concurrent outbound calls / in-flight responses from a single task**, bounded
  by `concurrency.max` (default 5, ceiling 20) and `maxFanOut` (100) — a
  connector-throughput / memory consideration, not TM-pool starvation.
- If **fan-out ≤ concurrency.max** and all branches are run-to-completion, the
  whole step completes in **one tick** — no park, no resume, no Task Manager
  round-trip. (This is the 3-prompt/`max:3` case in §5.A.)
- Multi-tick only happens when (a) fan-out > concurrency (waves) or (b) a branch
  body actually parks (poll/`wait`). (§5.B.)

### Concurrency & scope isolation
- The base scope is captured **once, synchronously**, before any branch runs
  (`baseScope = getCurrentNodeScope()`), so concurrent branches all derive from a
  stable base — never a base a sibling's `withBranchScope` temporarily mutated.
- `withBranchScope` installs a branch's scope, runs the step's **synchronous
  prefix** (where `getInput()` renders templates like `{{ foreach.item }}`), then
  **restores scope the instant `run()` returns its promise** — before any awaited
  I/O. **Invariant:** a branch step MUST read all scope-dependent values in its
  synchronous prefix. If any step reads workflow scope *after* an `await`, it can
  read a sibling branch's `foreach.item` → silently wrong input, no error. There
  is no runtime guard; this is a contract for step authors.
- Each branch runs against its **own `StepExecutionRuntime`** with deterministic
  `stepExecutionId` derived from `scopeId = index`. `computeResumeAt` and
  `finish` **rebuild** that same id to read branch state/results — implicit
  coupling across three methods; changing scope-frame construction silently
  breaks branch output retrieval.

### Timeouts
- `branch-timeout` and overall `timeout` fire an **AbortController**; the branch
  step wires its `abortSignal` into downstream I/O. Abort is **best-effort** — it
  cancels the awaited promise, but only actually stops the work (and LLM token
  spend) if the downstream connector honors the signal. Must be verified e2e.
- A timed-out branch is counted as **failed** in the aggregate
  (`failed > 0 ⇒ status:'failed'`), even in `settled` mode.

### Re-tick / resume
- When non-terminal but nothing has a real `resumeAt`, `computeResumeAt` returns
  `now + IMMEDIATE_RETICK_MS (1ms)` and parks with `forceTaskSchedule=true`. With
  Task Manager poll latency this is a tight resume loop, each tick re-loading full
  state from ES. **Open item: back this off** (see §6).
- Before parking, the executor **reclaims the cursor** onto the parallel enter
  node (`navigateToNode(this.node.id)`). Branch-body steps run on the shared
  workflow runtime and advance its cursor; without reclaiming, a resume would
  re-enter a leaked branch-body node and the step would "complete" early with
  unrun branches.

### foreach / results
- `getItems()` is evaluated at **init** (to size branches) and again at **finish**
  (via `safeGetItems`, for `key`). If `foreach` resolves to a **non-stable** value
  (e.g. a step output mutated between ticks), counts and keys can diverge.
  **Contract: `foreach` must resolve to a stable array.** `consts.*` is safe.
- Empty list → step completes immediately with `total:0, status:'completed'`,
  empty `results[]`; downstream still runs.
- Fan-out > `DEFAULT_PARALLEL_MAX_FAN_OUT` **throws at init** (runtime), not at
  save time — even when the list is a literal const knowable statically.

### Branch body shape (v1 scope, enforced at graph-build)
- ✅ Straight-line sequence of atomic steps (e.g. two HTTP steps in a row).
- ✅ Timer-based **`wait`** step (and `wait` followed by another step).
- ❌ **Nested flow-control** (`if`/`switch`/`foreach`/`while`) → rejected:
  `/nested flow-control/`.
- ❌ **`waitForInput`** → rejected: `/not supported inside a parallel branch/`
  (depends on the main-loop delay mechanism the parallel executor doesn't run).
- ❌ **Step-level `on-failure`** (`retry` / `continue` / `fallback`) on a branch
  step → rejected: `/unsupported flow-control \("enter-continue"\)/`. See the
  limitation note below.
- ❌ **Step-level `timeout`** on a branch step → rejected (wraps the step in a
  timeout-zone subgraph). Use the parallel step's `branch-timeout` instead.
- Graph-build failures surface as a **precise editor marker** anchored to the
  offending step's `type:` line (`validate_graph_build.ts`,
  owner `graph-build-validation`); `performComputation` is non-fatal on
  graph-build failure so the editor shows the real message, not a Ln 0 fallback.

> #### Limitation: per-branch `on-failure` / `timeout` not supported (v1)
> Putting `on-failure` (or a step-level `timeout`) on a step **inside** a branch
> does not just attach a property — the graph compiler **wraps the step in a
> flow-control subgraph** (`enter-continue → enter-try-block → enter-normal-path
> → <step> → … → exit-continue`). The parallel executor walks a branch body as a
> **straight line of atomic nodes** and cannot drive those wrapper nodes, so the
> branch would park on `enter-continue` with status `running` and **re-tick
> forever** (the `RETICK_FLOOR_MS` floor makes it a ~1s busy-loop rather than a
> tight one, but it never completes). We turn this silent infinite hang into a
> **loud compile-time rejection** in `buildParallelBranchBody` (any `enter-*` /
> `exit-*` node in the branch body is rejected).
>
> **What works instead today:**
> - **Branch isolation is built in** — a failed branch is marked `failed` and
>   siblings still run (`mode: settled` runs all regardless; `fail-fast` skips
>   not-yet-started ones). The aggregate `results[]` carries each branch's
>   `status`/`error`, so handle failures in a step **after** the parallel via
>   `steps.<id>.output.results` / `.failed` / `.status`.
> - **`branch-timeout`** (on the parallel step) bounds + aborts each branch.
>
> **Future work (executor change, not a graph change):** teach the parallel
> executor to drive flow-control wrapper nodes (`enter-continue` / `enter-retry`
> / try-block) inside a branch body so per-branch `on-failure` / `timeout` can be
> supported. This is non-trivial because each wrapper node has its own tick/state
> semantics that must compose with the parallel's per-branch cursor + scope.

### `count-waiting` & `mode`
- `count-waiting: true` (default) — a parked/waiting branch keeps its slot.
  `false` — a branch parked in a durable wait frees its slot so new branches can
  start (used for poll-style branches that mostly sleep); actively-running
  branches still count against `max`.
- `mode: 'fail-fast'` (default) — once a branch fails/times out, stop scheduling
  **not-yet-started** branches (let in-flight drain), then mark the rest
  `skipped`. `mode: 'settled'` — run every branch regardless; aggregate is still
  `failed` if any failed.

---

## 3b. Configuration reference (every property, every value)

All knobs live directly on the `parallel` step. Status legend:
**✅ implemented** · **🟡 partial** · **❌ not implemented**.
Source of truth: `enter_parallel_node_impl.ts` (executor) and `schema.ts`
(validation + defaults).

```yaml
- name: enrich
  type: parallel
  # --- one mode (mutually exclusive) ---
  foreach: '{{ steps.list.output }}'   # dynamic fan-out
  steps: [ ... ]                       # body for dynamic mode
  # branches: [ ... ]                  # OR static branches
  # --- concurrency / failure / timeouts ---
  concurrency: { max: 5, count-waiting: true }
  mode: fail-fast
  branch-timeout: 30s
  timeout: 2m
```

### `concurrency` — max in-flight branches ✅ implemented
Accepts **a bare number** (shorthand for `{ max: N }`) or an **object**
`{ max, count-waiting }`.

| Value | Behaviour |
| --- | --- |
| *(omitted)* | `max` defaults to **`DEFAULT_PARALLEL_CONCURRENCY = 5`**, `count-waiting: true`. |
| `concurrency: 3` | At most 3 branches run at once; the rest wait for a free slot, started across re-ticks. |
| `concurrency: { max: 8 }` | Same, object form. |
| `concurrency: { max: 8, count-waiting: false }` | See `count-waiting` below. |
| `max` > **`DEFAULT_PARALLEL_MAX_CONCURRENCY = 20`** | **Rejected at schema validation** (`"max" cannot exceed 20`). |
| `max` ≤ 0 / non-int | **Rejected at schema validation** (`.int().positive()`). |

- **Runtime clamp (defense-in-depth):** even if a malformed/legacy definition
  slips through, the executor clamps to `[1, 20]` (`clampConcurrency`), so a
  worker can never be pinned with unbounded lanes.
- A branch occupies a slot from the tick it is **started** until it reaches a
  terminal state (`completed`/`failed`/`timed_out`/`skipped`).
- **Static branches**: `concurrency` still applies (bounds how many named
  branches run at once), but the editor **does not warn** about a missing
  `concurrency` for static branches (the branch count is fixed/known), unlike
  dynamic fan-out where an unbounded runtime list can fan out widely.

### `count-waiting` — slot accounting for parked branches ✅ implemented
Only meaningful in the object form of `concurrency`. Controls whether a branch
that is **waiting/polling** (durable `wait`, poll step) keeps holding its slot.

| Value | Behaviour |
| --- | --- |
| `count-waiting: true` (default) | A waiting/parked branch **keeps** its slot. Conservative: total in-flight ≤ `max` at all times. |
| `count-waiting: false` | A branch **parked in a durable wait** frees its slot so a not-yet-started branch can start. Actively-running branches still count, so `max` bounds concurrent work. Use for poll-style branches that mostly sleep, so sleeping lanes don't starve the window. |

- Slot math (`slotsInUse`): a `running` branch counts against the window when
  `count-waiting` is true **or** the branch is not parked in a wait
  (`waiting !== true`). A branch parked in a durable wait is flagged `waiting`
  and, under `count-waiting: false`, frees its slot.
- Terminal branches never count.

### `mode` — failure policy (fail-fast vs settled) ✅ implemented
Default **`fail-fast`**.

| Value | Behaviour |
| --- | --- |
| `mode: fail-fast` (default) | On the first branch `failed`/`timed_out`: stop scheduling **not-yet-started** branches, let already-in-flight branches **drain** to terminal, then mark the never-started ones **`skipped`**. The aggregate ends `failed`. |
| `mode: settled` | Run **every** branch to a terminal state regardless of failures (no short-circuit). The step still reports `failed` in the aggregate if any branch failed, but every branch gets a real result. |

- Both modes always produce a per-branch `results[]`; the difference is only
  whether not-yet-started branches are short-circuited to `skipped`.
- "Drain" means fail-fast does **not** abort in-flight siblings — see
  abort/cancellation below.

### `branch-timeout` — per-branch deadline 🟡 partial
A `DurationSchema` string (`500ms`, `30s`, `2m`, …). Bounds **each branch
independently**. Default: **none** (a branch can run as long as the overall
`timeout` and worker allow).

| Scenario | Behaviour |
| --- | --- |
| Branch body has a real in-flight step (e.g. `http`) | When the deadline elapses mid-run, the branch's **`AbortController` is fired** (cancels the wired I/O) and the branch is marked **`timed_out`**. ✅ |
| Poll/`wait` branch parked across ticks | The in-tick deadline race doesn't apply while parked, so there is a **cross-tick sweep**: on each tick, a still-`running` branch whose `now - startedAt > branch-timeout` is marked `timed_out`. ✅ |
| Atomic step that ignores the abort signal | The branch is still marked `timed_out` for accounting, but a step that doesn't honor its `abortSignal` may keep running to completion in the background. 🟡 (best-effort cancellation; depends on the step honoring the signal). |

### `timeout` — overall step deadline 🟡 partial
A `DurationSchema` string bounding the **whole parallel step** (all branches),
measured from when the parallel step started. Default: **none**.

| Scenario | Behaviour |
| --- | --- |
| Overall deadline elapses | The step stops, branches still in flight are aborted via their `AbortController`, and `finish()` is called with whatever branch states exist. ✅ |
| Interaction with `branch-timeout` | Each branch's effective deadline is `min(overallDeadline, branchDeadline)` (`minDefined`). ✅ |
| Step that ignores its `abortSignal` | Same best-effort caveat as `branch-timeout`. 🟡 |

> **Re-tick floor:** when the step parks waiting for slow/parked branches it
> re-schedules itself no sooner than `RETICK_FLOOR_MS = 1000ms` (or the earliest
> branch `resumeAt`, whichever is later), to avoid a tight resume loop.

### Abort / cancellation of in-flight siblings 🟡 partial
- **Per-branch abort on timeout:** ✅ each branch runs against its **own**
  `AbortController` (`branchRuntime.abortController`); when its deadline (branch
  or overall) elapses, that controller is `abort()`ed and any I/O wired to the
  signal (e.g. an `http` request) is cancelled.
- **Sibling cancellation on failure:** ❌ **not implemented.** `fail-fast` does
  **not** abort already-running siblings — it only stops *starting* new ones and
  lets in-flight branches **drain**. There is currently no "first failure
  cancels the rest" behaviour. (`settled` likewise never cancels.)
- **Best-effort:** abort only takes effect if the underlying step honors its
  `abortSignal`. Steps that don't may finish in the background after the branch
  is marked terminal. 🟡

### Aggregate output shape ✅ implemented
The parallel step's `output` (readable as `{{ steps.<id>.output }}`):

```jsonc
{
  "results": [
    {
      "index": 0,                 // branch position (0-based), always present
      "key": "virustotal",        // branch name (static) OR snapshotted foreach item (dynamic); omitted if none
      "status": "completed",      // completed | failed | timed_out | skipped
      "startedAt": 1718900000000, // epoch ms, present once the branch started
      "finishedAt": 1718900001432,
      "durationMs": 1432,         // present when both timestamps exist
      "output": { /* ... */ },    // terminal step output (completed branches)
      "error": { "type": "...", "message": "..." } // failed/timed_out branches
    }
    // ... one entry per branch, index-aligned
  ],
  "total": 4,        // results.length
  "succeeded": 3,    // status === 'completed'
  "failed": 1,       // status === 'failed' OR 'timed_out' (timeouts count as failures)
  "status": "failed" // 'failed' if failed > 0, else 'completed'
}
```

| Field | Notes |
| --- | --- |
| `results[].index` | Always present; stable correlation handle (`#17835`). |
| `results[].key` | **Static**: the branch `name`. **Dynamic**: the **snapshotted** `foreach` item captured at init (not re-resolved). Omitted if neither. |
| `results[].status` | `completed` / `failed` / `timed_out` / `skipped`. `skipped` = never started (fail-fast short-circuit); carries no `output`/`error`. |
| `results[].output` / `error` | Pulled from the **last node the branch ran**; `timed_out` branches synthesize a `TimeoutError`. |
| `succeeded` / `failed` | Counts; **timeouts are counted as failures**. |
| `status` | Aggregate `failed` if any branch failed/timed out, else `completed`. |

Downstream steps read both the aggregate and individual branch steps directly
(e.g. `{{ steps.enrich.output.succeeded }}`, `{{ steps.scan_hash.output.* }}`).

### At a glance

| Property | Values | Default | Status |
| --- | --- | --- | --- |
| `concurrency` | number \| `{ max, count-waiting }` | `{ max: 5, count-waiting: true }` | ✅ implemented |
| `concurrency.count-waiting` | `true` \| `false` | `true` | ✅ implemented |
| `mode` | `fail-fast` \| `settled` | `fail-fast` | ✅ implemented |
| `branch-timeout` | duration string | none | 🟡 partial (best-effort abort) |
| `timeout` | duration string | none | 🟡 partial (best-effort abort) |
| Aggregate output | `results[]` + `total`/`succeeded`/`failed`/`status` | — | ✅ implemented |
| Abort in-flight **siblings on failure** | — | — | ❌ not implemented |
| Abort in-flight branch **on its own timeout** | — | — | ✅ implemented (best-effort) |

---

## 4. Implementation architecture

### Compiled graph
```
… → enterParallel_<step> → <branch body start> … → exitParallel_<step> → …
```
Build (`build_execution_graph.ts`):
- Enter node carries `configuration` (`foreach`, `concurrency`, `mode`,
  timeouts), `exitNodeId`, `branchStartNodeId`. `steps` are dropped from config
  (they become the body subgraph).
- Exit node points back at the enter node (`startNodeId`).
- A `timeout` wraps the block in a timeout zone
  (`enterTimeoutZone_* … exitTimeoutZone_*`).
- Rejects nested flow-control and `waitForInput` inside the body at build time.

### Durable-tick executor (`EnterParallelNodeImpl`)
`run()`: no state ⇒ `initParallel()`; else ⇒ `tick(state)`.

`initParallel()`:
1. `startStep()`; persist `foreach` **expression** as input (re-evaluable later).
2. `getItems()` → resolve list; throw if > max fan-out; empty ⇒ `finish([])`.
3. Build `branches: [{index, status:'pending', started:false}, …]`;
   `state = { total, branches, startedAt }`; `setCurrentStepState(state)`.
4. Fall into `tick(state)`.

`tick(state)`:
1. **Overall timeout** — if exceeded, mark all non-terminal branches
   `timed_out`, `finish()`.
2. **Select eligible branches** — not terminal, not blocked by concurrency
   (`slotsInUse() >= max`), not blocked by fail-fast; mark them `running`/
   `started` up-front so the slot count is correct.
3. **Advance concurrently** — capture `baseScope` once; `Promise.all` over
   `advanceBranch(index, branchStackFrames, cursor, deadline)` where
   `deadline = min(overallDeadline, branchDeadline)`.
4. **Apply statuses synchronously** (no await between read and write); set
   `finishedAt` for newly-terminal branches; catch parked branches that blew
   their branch-timeout across ticks.
5. **fail-fast skip** — if a failure exists and nothing is in flight, mark
   never-started branches `skipped`.
6. `setCurrentStepState(state)`. If **all terminal** ⇒ `finish()`. Else reclaim
   cursor to the parallel node, `computeResumeAt`, `enterWaitUntil(resumeAt, …,
   true)`.

`advanceBranch()`: walk the branch body from its cursor, running run-to-completion
nodes in a row until it **waits** (keep cursor, status `running`), **fails**,
**times out**, or reaches the **exit** (status `completed`). A per-tick `visited`
set bounds against cycles.

`runBranchNode()`: build the branch's own `StepExecutionRuntime` (scope =
`scopeId index`), `ensureContextReady()`, run the node's synchronous prefix under
`withBranchScope`, await the rest under `runWithDeadline`. Map runtime status →
`completed | failed | waiting | timed_out`.

`finish(branches)`: rebuild each branch runtime by index, read
`getCurrentStepResult()` for `output`/`error`, attach `index`, `key`, timing;
compute `succeeded`/`failed`; write `ParallelStepOutput`; navigate to exit node.

### State & output shapes (`types.ts`)
```ts
ParallelBranchState  { index, status, started, currentNodeId?, startedAt?, finishedAt?, timedOut? }
ParallelStepState    { total, branches: ParallelBranchState[], startedAt }
ParallelBranchResult { index, key?, status, output?, error?, startedAt?, finishedAt?, durationMs? }
ParallelStepOutput   { results: ParallelBranchResult[], total, succeeded, failed, status }
```

### What lives where
- **Durably persisted (ES):** `ParallelStepState` (the `branches[]` progress
  array) on the parallel step execution; each branch's `output`/`error` as its
  own step-execution record via `StepIoService`; the final aggregate as the
  parallel step's own output. Flushed by the persistence loop (~500ms).
- **In memory (ephemeral, per tick):** the loaded `state`, the per-branch
  `StepExecutionRuntime`s created during `advanceBranch`, the in-flight branch
  promises and their `AbortController`s.

---

## 5. Bits & bytes — worked executions

### 5.A — 3 prompts, `concurrency.max: 3`, run-to-completion `ai.agent`
Workflow: fan out over 3 prompts, each an `ai.agent`, then a `console` summarize.

**Tick 1 — `run()` (no state) → `initParallel()`**
- Persist input `{ foreach: '{{ consts.prompts }}' }` (the expression).
- `getItems()` → 3 items. Build state:
```jsonc
{ total: 3, startedAt: T0, branches: [
  { index:0, status:"pending", started:false },
  { index:1, status:"pending", started:false },
  { index:2, status:"pending", started:false } ] }
```
- Fall into `tick`.

**Tick 1 (same call) — `tick()`**
- Concurrency `{ max:3, countWaiting:true }`; `slotsInUse()=0`. All 3 eligible →
  marked `running`/`started`:
```jsonc
branches: [
  { index:0, status:"running", started:true, startedAt:T1 },
  { index:1, status:"running", started:true, startedAt:T1 },
  { index:2, status:"running", started:true, startedAt:T1 } ]
```
- `baseScope` captured once. `Promise.all` runs all 3 agents **concurrently**.
  Each branch's synchronous prefix renders its own `{{ foreach.item }}`:
  branch 0 → prompt 0, branch 1 → prompt 1, branch 2 → prompt 2. Scope restored
  immediately; awaited LLM I/O overlaps. Wall-clock ≈ slowest agent.
- All 3 settle `COMPLETED` → statuses applied synchronously:
```jsonc
branches: [
  { index:0, status:"completed", started:true, startedAt:T1, finishedAt:T2 },
  { index:1, status:"completed", started:true, startedAt:T1, finishedAt:T2 },
  { index:2, status:"completed", started:true, startedAt:T1, finishedAt:T2 } ]
```
- `allTerminal === true` → `finish()`. Aggregate:
```jsonc
{ total:3, succeeded:3, failed:0, status:"completed",
  results:[
    { index:0, key:"In one sentence…", status:"completed", output:{message:"…"}, startedAt:T1, finishedAt:T2, durationMs:… },
    { index:1, key:"List up to 3 things…", status:"completed", output:{message:"…"}, … },
    { index:2, key:"Summarize your capabilities…", status:"completed", output:{message:"…"}, … } ] }
```
- Navigate to exit → `summarize` reads `steps.agent_sessions.output.*` → done.

**No park, no resume, single task, single tick.**

### 5.B — 5 prompts, `concurrency.max: 3` (waves + resume)
**Tick 1:** start branches 0,1,2 (slots full); 3,4 stay `pending`. All 3 agents
run to completion in-tick → 0,1,2 `completed`. `allTerminal === false` (3,4
pending). No branch has a real `resumeAt` → `computeResumeAt = now + 1ms` →
reclaim cursor, `enterWaitUntil(+1ms, force)`. Persist:
```jsonc
branches: [ {0 completed},{1 completed},{2 completed},
            {index:3,status:"pending",started:false},
            {index:4,status:"pending",started:false} ]
```
**Tick 2 (resume):** `run()` sees state → `tick()`. Slots free (0,1,2 terminal).
Start 3,4; run to completion → all terminal → `finish()` with 5 index-aligned
results.

> The `branches[]` array is the durable memory carrying done-vs-pending across
> the resume. "Second iteration" = a resume tick that launches the next wave.

### 5.C — branch that parks (poll/`wait`)
A run-to-completion branch never returns `waiting`. A poll/`wait` branch does:
Tick 1 it parks with its own `resumeAt`; the parallel's `computeResumeAt` takes
the **earliest** branch `resumeAt` and parks until then; the resume tick re-runs
that node (cursor kept) until it reaches the exit. `ai.agent` never takes this
path.

---

## 6. Open topics (low-hanging fruit + attack surface)

Ordered roughly by how fast a reviewer will flag them.

1. ~~**`IMMEDIATE_RETICK_MS = 1` busy-loop.**~~ **DONE.** Replaced with
   `RETICK_FLOOR_MS = 1000`. The parallel always parks via a durable TM resume
   task (`forceTaskSchedule`), so a sub-second value rounded up to the next TM
   poll anyway *and* removed the only backpressure on a branch that ends a tick
   `RUNNING` without its own `resumeAt`. The floor keeps wave-to-wave resumes
   prompt while preventing a no-timer branch from driving a tight reschedule loop.
   Branches that park with a real `resumeAt` (poll/`wait`) are unaffected — their
   timestamp still wins. Unit suite green (16/16).
2. **Run-to-completion branches hold the worker for the tick — pre-existing, not
   worsened.** A long `ai.agent` already blocks one worker for its whole duration
   today; parallel doesn't extend any single call and actually consolidates N
   agents onto one worker (≈ slowest, not the sum). The only new axis is up to
   `concurrency.max` **concurrent outbound calls / in-flight responses from one
   task** — bounded by `concurrency.max` (≤20) and `maxFanOut` (≤100). Frame it in
   the PR as "inherits `ai.agent`'s existing per-step blocking; new dimension is
   bounded concurrent calls," not as TM-pool starvation. Durable per-branch
   suspension (parking while the agent runs) is real future work.
3. ~~**Verify abort actually cancels inference + token spend** end-to-end.~~
   **VERIFIED (no code change).** Full chain traced:
   `runWithDeadline` → `branchRuntime.abortController.abort()` →
   handler `context.abortSignal` (= `stepExecutionRuntime.abortController.signal`,
   `create_base_handler_context.ts`) → `ai.agent` → `executeAgent({ abortSignal })`
   → runner → `run_chat_agent.ts` LangGraph `.stream(..., { signal: abortSignal })`
   and structured `.invoke(messages, { signal })`. LangChain propagates `signal`
   to the inference connector's HTTP request, so abort **stops further token
   generation**. Residual caveat (inherent to LLM streaming, not a workflow bug):
   tokens already streamed before the abort may still be billed by the
   provider — abort prevents *additional* spend, not retroactive.
4. ~~**Sync-scope contract has no runtime guard.**~~ **DONE.** `withBranchScope`
   now has a **re-entrancy guard** (`branchScopeActive`): entering a branch scope
   while one is already active throws a clear, deterministic error instead of
   silently leaking a sibling's `foreach.item`. This catches the failure mode
   where a branch step reads scope after an `await`. The synchronous-window
   invariant is also spelled out in the method doc. (Existing concurrency test
   already proves the windows don't overlap on the natural path.)
5. ~~**`foreach` re-evaluated at init and finish** — diverges if non-stable.~~
   **DONE.** Each branch's `key` is now **snapshotted at init** onto
   `ParallelBranchState.key`; `finish()` reads it back and no longer re-evaluates
   `foreach` (removed `safeGetItems`). Correlation can't drift even if the
   expression resolves differently on a later tick. Regression test added
   ("snapshots keys at init…"). Note: branch *outputs* are still rehydrated by
   rebuilt id in `finish` (that's #8, separate).
6. ~~**Fan-out ceiling enforced at runtime, not save time** for literal lists.~~
   **DONE.** `validate_parallel_fan_out.ts` now also size-checks a **literal**
   `foreach` array against `DEFAULT_PARALLEL_MAX_FAN_OUT` and emits an editor
   **warning** (not a hard error — the ceiling is operator-configurable
   server-side, so we can't know an operator's raised limit on the client).
   Dynamic `{{ … }}` expressions are not size-checked (unknown at author time).
   Tests added. Runtime throw at init still stands as the hard backstop.
7. **`timed_out` ⇒ aggregate `failed`, even in `settled`** — **intentional, no
   change in PoC.** The "any failure ⇒ `status:'failed'`" rule is baked into the
   integration tests and the manual-test README (MT-05/06), so flipping it is a
   deliberate semantics change, not a quick fix. Consumers who want
   "collect-all-answers" can already branch on `output.succeeded > 0` /
   inspect per-branch `results[].status` — the aggregate exposes
   `total`/`succeeded`/`failed`. A first-class `partial`/soft-timeout status is
   tracked as future work, out of scope for the PoC.
8. **Implicit id-rebuild coupling** across `runBranchNode`/`computeResumeAt`/
   `finish` — **partially addressed, rest is a documented trade-off.** The
   `foreach` re-eval coupling is gone (#5). `finish`/`computeResumeAt` still
   rebuild a branch runtime by deterministic id (`scopeId = index`) to read
   branch **outputs**/`resumeAt`, rather than duplicating outputs into
   `ParallelBranchState` (which would bloat the step doc for large outputs, up to
   100 branches). The deterministic-id contract is the intentional mechanism;
   changing scope-frame construction breaks it, so it's covered by tests and
   this note. Storing output *refs* (not values) in branch state is a possible
   future hardening, out of PoC scope.
9. **Shared `conversation_id` across branches** races on one conversation doc.
   **Documented contract:** branches must not share a `conversation_id`; each
   `ai.agent` branch should create/own its own conversation (the PoC workflow
   sets none, so each is independent). Noted in the manual-test README.
```
