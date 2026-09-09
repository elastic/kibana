# Parallel branch cursors: proof of concept

This experiment runs conditions, sequential loops, and error handlers independently inside parallel branches while retaining one workflow execution, one Task Manager resume path, and the existing step implementations. It does introduce multiple execution cursors; it does not introduce a distributed branch scheduler.

Branch: `poc/parallel-branch-cursors` in the `parallel-branch-cursors` worktree. Experimental code, not a production-ready change.

## Try it

Paste [the example YAML](examples/parallel_branch_cursors_poc.yml) into a workflow on this checkout and run it manually. It uses only built-in steps, without connectors. It processes two alert identifiers concurrently, chooses a different condition path for each, accumulates two enrichment items in a sequential foreach, and parks/resumes inside that loop.

The two `result` executions should contain:

```json
{"owner":"a","selected":"left","values":[1,2]}
{"owner":"b","selected":"right","values":[1,2]}
```

`parentResult` should remain `{"owner":"parent","values":[]}`. Branch variable writes do not merge back into the parent. Results remain available through the existing parallel aggregate. The integration test reads this exact YAML file.

Run the experiment without starting Elasticsearch or Kibana:

```sh
nvm use
node scripts/jest_integration 'src/platform/plugins/shared/workflows_execution_engine/integration_tests/tests/(parallel|variables)' --runInBand
```

These tests execute the actual graph compiler, engine, context resolution, and repository save/resume path with mocked repositories and connectors. The separate manual review environment at `http://localhost:5681` runs against an isolated Elasticsearch at `http://localhost:9228`. Six saved examples have also been exercised there and opened in a browser. Crash recovery remains untested.

## What changed

- Each branch owns a `WorkflowExecutionCursor`: current node, pending navigation, scope frames, and error. Navigation is restricted to that branch's reachable graph region plus its join. This restriction matters for static branches: the workflow's global topological order includes sibling bodies.
- `AsyncLocalStorage` selects the current cursor inside the existing runtime manager, including across awaits and nested parallel calls. Existing nodes continue using their runtime methods. The enclosing cursor remains at the parallel node.
- Branch state persists both `currentNodeId` and `stackFrames`. Resume reconstructs the cursor, including foreach iteration and retry attempt scopes. Work is bounded to 1,000 transitions per branch per tick.
- The branch loop reuses the normal error unwinder with a boundary at its owning parallel node. A handled retry/fallback stays in its branch; an unhandled error becomes that branch's result.
- Step-output references and rehydration select the latest execution within the current parallel branch. Joins reload completed branch outputs when needed, and an older in-flight Elasticsearch read cannot overwrite a newly written output.
- `data.set` reads include writes from the current parallel scope and its ancestors, excluding siblings and descendants. Sequential foreach iterations within one branch still share an accumulator. Nested child writes do not leak back after their join.
- The compiler now accepts nested flow control and on-failure wrappers. It explicitly rejects branch-local timeout zones, HITL waits, and `workflow.output`/`workflow.fail`, whose current implementations have workflow-wide effects.

## Demonstrated behavior

The focused integration suite covers conditions and foreach inside parallel, persisted waits inside foreach, branch variables and unchanged parent variables, nested parallel joins across resume, nested variable isolation, delayed retries plus fallback, retry plus continue, and a sibling skipping a step-level condition. Existing static/dynamic parallel tests and sequential variable tests also pass.

The parallel unit suite exercises overlapping asynchronous branch work, concurrency windows, branch timeouts, cancellation hooks, and aggregation. Those existing cancellation cases are shallow; they do not establish correct cancellation of arbitrary nested scopes.

Validation completed: 54 focused integration tests passed. `node scripts/check.js --scope=local` exited successfully, covering 3,943 unit tests (one config run and one cached), type checks for two projects, and lint with four complexity warnings.

## Production work still needed

| Area | Gap and next experiment |
| --- | --- |
| Shared concurrency budget | Current limits apply per parallel block. Nested fan-out multiplies active work; add a workflow-wide budget without deadlocking parents waiting for children. |
| Cancellation and deadlines | Track currently active nested nodes and propagate abort through every branch/scope. Test cancellation during connector calls, retry waits, and nested joins; prevent late writes after timeout. Inner timeout zones remain rejected. |
| Persistence and recovery | Branch positions checkpoint after a wave yields. Test crashes between side effects and checkpoints, task ownership changes, interrupted joins, and old persisted executions. This PoC makes no exactly-once guarantee. |
| Output memory and scope | Stress eviction/rehydration and loop-source pinning with different-length concurrent loops. Some existing IO bookkeeping is keyed by step ID rather than branch execution ID. Small in-memory tests are insufficient here. |
| Author-facing semantics | Decide branch-local return versus whole-workflow termination, explicit aggregate outputs when a branch ends in control flow, and whether any variable merge should be supported. Terminators remain rejected. |
| Scheduling and limits | The wave scheduler and periodic retick remain. Evaluate fairness, long loops, count-waiting behavior across nested blocks, and cancellation latency. |
| Editor and execution UI | Validate schema/editor acceptance and presentation of nested iterations, attempts, waits, and branch errors on a live Kibana instance. No UI changes are included. |
| Additional combinations | Exercise while/switch, workflow.execute children, custom steps, and combinations with workflow-level handlers. Compiler acceptance alone does not prove those combinations. |

The experiment supports a narrower conclusion than “full parallelism is cheap”: the existing cursor abstraction and node implementations make the core functionality practical without replacing the engine. The major remaining cost is making independent execution safe and predictable across cancellation, recovery, resource limits, and every supported step combination.
