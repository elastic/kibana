# Parallel Step — Manual Testing Suite (#17833)

Runnable workflow YAMLs + a checklist to manually verify the dynamic parallel
fan-out step end-to-end in a real Kibana. Each `NN_*.yaml` is a self-contained
workflow you create, run, and inspect.

## Prerequisites

1. Start dev Kibana + ES (`yarn es snapshot` and `yarn start`), or use a running
   instance.
2. Enable the Workflows UI (`kibana.dev.yml`):
   ```yml
   uiSettings.overrides:
     workflows:ui:enabled: true
   ```
3. (Optional, for timeout/concurrency tuning) operator overrides in `kibana.dev.yml`:
   ```yml
   xpack.workflowsExecutionEngine.parallel.defaultConcurrency: 5
   xpack.workflowsExecutionEngine.parallel.maxConcurrency: 20
   xpack.workflowsExecutionEngine.parallel.maxFanOut: 100
   ```

## How to run each test

You can run via the UI (paste YAML into a new workflow → Run) or via the API.

### UI
1. Workflows → Create → paste the YAML.
2. Watch the editor for validation markers (MT-11).
3. Click **Run** (or **Test**), then open the execution to inspect per-step
   status, the parallel step's `output`, and per-branch step executions.

### API (test an unsaved draft)
```bash
export KIBANA_URL="http://localhost:5601"
EXEC=$(curl -s -u elastic:changeme -X POST "$KIBANA_URL/api/workflows/test" \
  -H 'kbn-xsrf: true' -H 'Content-Type: application/json' \
  --data "$(jq -Rs '{workflowYaml: .}' < 01_basic_fan_out.yaml)" | jq -r .workflowExecutionId)
echo "$EXEC"
```

### Inspect an execution
```bash
node ~/.cursor/skills/workflows-api/scripts/workflows-api.js get-execution "$EXEC" --include-input --include-output
# per-step output of the parallel step:
node ~/.cursor/skills/workflows-api/scripts/workflows-api.js get-step "$EXEC" fan_out --field output
```

Read `status`, `stepExecutions[*].status`, and the `fan_out` step `output`
(`total`, `succeeded`, `failed`, `status`, `results[]`).

---

## Checklist

Mark each row PASS/FAIL. "Aggregate" = the `fan_out` step's `output`.

### MT-01 · Basic fan-out (happy path) — `01_basic_fan_out.yaml`
- [ ] Workflow status: `completed`.
- [ ] Exactly 3 `process_item` step executions (one per item).
- [ ] Logs show `index=0 item=alpha`, `index=1 item=beta`, `index=2 item=gamma`.
- [ ] Aggregate: `total=3, succeeded=3, failed=0, status=completed`.
- [ ] `results[]` length 3, every `status=completed`, indices `[0,1,2]`.

### MT-02 · Dynamic foreach from a previous step — `02_dynamic_foreach.yaml`
- [ ] Workflow status: `completed`.
- [ ] One `process_hit` execution per search hit (4).
- [ ] Each branch log shows the doc name from `foreach.item._source.name`.
- [ ] Aggregate `total=4, succeeded=4, status=completed`.

### MT-03 · Concurrency window (max 2) — `03_concurrency_window.yaml`
Requires `https://postman-echo.com/delay/N` reachable from Kibana.
- [ ] Workflow status: `completed`.
- [ ] Wall-clock duration ≈ **15s** (10 items / 2 lanes × 3s), not ~3s and not ~30s.
- [ ] All 10 `slow_branch` executions completed.
  > Tip: read `duration` on the execution, or watch the UI timer.

### MT-04 · Long-running branches run concurrently — `04_long_running_branches.yaml`
Requires `https://postman-echo.com/delay/N` reachable from Kibana.
- [ ] Workflow status: `completed`.
- [ ] Wall-clock duration ≈ **8s** (3 branches × ~8s **overlapping**, max=3),
      NOT ~24s. This proves branches run concurrently instead of serializing.
- [ ] 3 `long_branch` executions completed.

### MT-05 · fail-fast (default) — `05_fail_fast.yaml`
- [ ] Aggregate `status=failed`.
- [ ] `results[]` statuses = `['failed','skipped','skipped','skipped']`.
- [ ] Only 1 `always_fail` branch execution actually ran (others skipped).

### MT-06 · settled mode — `06_settled_mode.yaml`
- [ ] Aggregate `status=failed` but **no** skipped branches.
- [ ] `results[]` statuses = `['failed','failed','failed','failed']`.
- [ ] All 4 branches reached a terminal `failed` state.

### MT-07 · Overall step timeout — `07_overall_timeout.yaml`
Requires `https://postman-echo.com/delay/N` reachable from Kibana.
- [ ] Step terminates ~3s after starting (the configured `timeout`), NOT after
      the ~10s the branches would otherwise take. The in-flight HTTP calls are
      aborted at the deadline.
- [ ] In-flight branches reported as `timed_out`; aggregate `status=failed`.
- [ ] Each timed-out `results[]` entry carries a `TimeoutError`-style reason.

### MT-08 · Per-branch timeout — `08_branch_timeout.yaml`
Requires `https://postman-echo.com/delay/N` reachable from Kibana.
- [ ] Step terminates ~3s after starting (the `branch-timeout`), NOT after ~10s.
- [ ] Each branch is independently aborted and marked `timed_out`.
- [ ] `results[]` statuses all `timed_out`; aggregate `status=failed`.

### MT-09 · Empty fan-out list — `09_empty_list.yaml`
- [ ] Workflow status: `completed`.
- [ ] `never_runs` branch body has **zero** executions.
- [ ] Aggregate `total=0, status=completed`, `results[]` empty.
- [ ] `report` step still runs.

### MT-10 · Results correlation & downstream consumption — `10_results_correlation.yaml`
- [ ] Workflow status: `completed`.
- [ ] `assert_shape` log shows `first_index=0`, `first_key=red`, `last_key=blue`.
- [ ] Each `results[]` entry has `index`, `key`, and timing
      (`startedAt`/`finishedAt`/`durationMs`).

### MT-11 · Authoring validation (editor-only) — `11_authoring_validation.yaml`
Paste into the YAML editor (do not run). Uncomment blocks one at a time.
- [ ] (A) Block A: a **warning** marker on `type: parallel` about a missing
      `concurrency` cap (unbounded fan-out).
- [ ] (B) `concurrency.max: 999` → **error** (exceeds ceiling of 20).
- [ ] (C) `steps: []` → **error** (branch body must have at least one step).
- [ ] (D) `mode: whenever` → **error** (invalid mode).
- [ ] (E) `branch-timeout: soon` → **error** (invalid duration).
- [ ] Quick Action / snippet for `parallel` inserts `foreach`, `concurrency`, `steps`.

---

## Cleanup

MT-02 creates the index `.parallel-mt-fruits`; it self-deletes on the next run,
or remove manually:
```bash
curl -s -u elastic:changeme -X DELETE "$ELASTICSEARCH_URL/.parallel-mt-fruits"
```

## Notes / known v1 scope

- A branch body may be a **straight-line sequence of steps** (e.g. two HTTP/Slack
  steps in a row). **Nested control-flow** inside a branch (`if`/`switch`/
  `foreach`/`while`) is **not** supported yet and is rejected at save/compile
  time with a clear error (lands in a follow-up; see #17833).
- The built-in **`wait`** and **`waitForInput`** steps are **not supported inside
  a parallel branch** (they depend on the main-loop delay mechanism the parallel
  executor does not run). They are rejected at compile time. To exercise durable
  poll-style branches, use a custom poll step.
- **Concurrency is real for I/O-bound branches**: eligible branches advance
  together within a tick, so their async I/O (HTTP/connector calls) overlaps up
  to `concurrency.max`. CPU-bound work still shares the single Node thread.
- **Timeouts interrupt in-flight branches**: when the overall `timeout` or a
  `branch-timeout` elapses, the branch's in-flight work is aborted (the step's
  abort signal is fired) and the branch is marked `timed_out`.
- Timing-based checks (MT-03/04/07/08) are wall-clock approximate — allow a few
  seconds of slack on a busy machine — and require the postman-echo endpoint to
  be reachable from the Kibana host.
- **`ai.agent` branches must not share a `conversation_id`.** Concurrent branches
  pointing at the same conversation race on a single conversation document. Let
  each branch create/own its own conversation (omit a shared `conversation_id`),
  so the fan-out stays independent and index-aligned.
