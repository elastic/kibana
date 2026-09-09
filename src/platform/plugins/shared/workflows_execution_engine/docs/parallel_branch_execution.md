# Parallel branch execution

Parallel branches can contain conditions, sequential foreach/while loops, switch, nested parallel steps, and retry/continue/fallback handlers. Each branch owns a cursor and isolated variable scope. The workflow still uses one execution document and the existing Task Manager resume path.

## Example

Run [parallel alert processing](../examples/parallel_branch_execution.yml). It chooses a different condition path for two alerts, accumulates enrichment items in a sequential loop, and suspends/resumes within the loop. The results contain:

```json
{"owner":"a","selected":"left","values":[1,2]}
{"owner":"b","selected":"right","values":[1,2]}
```

The parent variables stay `{"owner":"parent","values":[]}`. Branch writes do not merge into the parent. Read branch results through the parallel aggregate. Step references select the latest execution within the current branch and its ancestors, excluding siblings. Loop-source pins are owned by the branch scope; one branch finishing its loop cannot evict another branch’s latest loop output.

## Execution ownership

`EnterParallelNodeImpl` manages branch admission and aggregation. `BranchExecutor` owns branch cursors and runs each node through the same `runNode` lifecycle used by the root cursor: context hydration, tracing, stack monitoring, error handling, event-log flushing, and read-pin release. The nearest parallel node bounds branch error handling and monitoring. Ancestor monitors and cancellation polling remain with the parent cursor.

A node invocation has a revocable write lifetime. Parent abort propagates to the actual child runtime and all descendants. The coordinator registers live instances before invoking them. Cancellation uses their actual abort controllers and hooks; reconstruction is reserved for parked nodes. Node and cleanup writes are rejected after their respective lifetimes end. External cancellation hooks have a revocable, one-second cleanup lifetime. Parallel coordinators join those bounded descendant cleanups. Cleanup is invoked at most once per step execution per task. Synchronous child-workflow cleanup waits for an in-flight start response before cancelling its returned execution ID, under the same cleanup deadline. A response arriving after the deadline is still cancelled when it arrives, but the parent has already failed; its step state cannot be written late. After cleanup, an aborted operation has five seconds to settle; exceeding that grace period fails the entire execution without releasing capacity to queued work. Aborting cannot undo a request already accepted by an external service.

## Concurrency and suspension

There are separate limits for local branch admission and workflow-wide active operations. Joining parallel nodes consume no operation permit, allowing nested joins to complete with a global limit of one. The shared operation queue admits work in FIFO order. A resumed branch reacquires local admission when `count-waiting: false`; rotating admission prevents a frequently waking branch from starving queued work.

The next resume is bounded by branch deadlines and enclosing step/workflow timeouts, even when a descendant timer is later. Expired admission-blocked timers retain the re-tick floor. A durable timer or external wait sets `waiting: true`. Exhausting the transition budget leaves the branch ready with `waiting: false`, retaining its local admission slot. A nested join with runnable descendants propagates a yield instead of claiming to be durably blocked.

The following server settings apply to one workflow execution, including every nested parallel scope:

```yaml
workflowsExecutionEngine.parallel:
  cursorExecutionEnabled: true # opt in; defaults to false
  maxConcurrentOperations: 20
  maxOutstandingBranches: 100
  maxTransitionsPerTick: 1000
```

The numeric values are the defaults and upper bounds; administrators can lower them. Local YAML `concurrency.max` remains a separate branch limit. Fan-out beyond the workflow-wide outstanding-branch limit fails with a specific error before launching the extra branches. These limits do not combine independent workflow executions or child workflows into one budget.

## Persistence and delivery guarantees

Every branch transition carries a monotonic sequence, next node, scope frames, suspension disposition, and the scope updates needed to recover error handling. The node result and its transition are saved in the same step document. Periodic persistence holds that node's writes until its transition is ready. The coordinator commits this document before releasing ancestor scope writes, then saves the parallel branch position before executing another node. Node records are made discoverable through the workflow's step IDs before execution starts. Pure navigation markers need only a parent cursor checkpoint because replaying them has no step-state or external effect. Flushes are serialized to prevent older requests overwriting newer checkpoints; a failed flush stops subsequent work in that task.

On resume, a matching committed transition takes precedence over a stale parent position. Recovery reapplies its scope updates, including retry/fallback state, and advances without invoking the completed operation again. Sequence numbers distinguish recovery from legitimate visits to the same control node. Nested parallel coordination records remain available for child progress checkpoints while the join runs.

External effects have **at-least-once delivery**, not exactly-once delivery. If a destination accepts a request and the process dies before recording its result, recovery can repeat that request. Use destination-supported idempotency keys derived from the workflow execution and logical step execution for operations that must deduplicate. This change does not add cross-system transactions or change Task Manager ownership guarantees. New executions persist `executionMode` before starting any step. Only new parallel executions admitted with `cursorExecutionEnabled: true` select `parallel_v4`. Sequential workflows, flag-disabled executions, and existing executions without a mode use `legacy`. Resumes retain the stored mode even when the rollout flag changes. Pre-release branch-cursor executions without a mode require an explicit migration; they must not be silently reinterpreted.

## Fatal failures and termination

Checkpoint, context-rehydration, and event persistence failures stop the entire V4 execution. They bypass workflow retry/fallback, abort active runtimes, reject queued admission, and fence late node writes. Cleanup errors and operations that exceed cancellation grace use the same path. Connector/business failures continue through normal workflow handlers.

Join-time branch result rehydration also uses the fatal path, so an unavailable result cannot trigger parent retry/fallback and repeat completed effects. Strict event logging checks both transport errors and partial bulk failures. Root and step loggers share a serialized event buffer for cursor executions, including reconstructed cleanup/termination runtimes; legacy logging remains best effort.

Both drivers are joined before terminal persistence. If a failed persistence queue cannot be reused, the engine attempts a direct terminal workflow update. For queued concurrency groups, that write uses `refresh: 'wait_for'`, matching normal terminal persistence before the queue drainer searches. When Elasticsearch cannot accept that update, the task rejects: stopping locally is not proof that a durable failure record exists. The engine cannot forcibly kill an external operation that ignores abort, and the local write fence is not a distributed ownership fence. Lease takeover, Elasticsearch outage, and connector idempotency soak tests remain required before broad enablement.

`workflow.output` returns a result and terminates the whole workflow. `workflow.fail` does the same with failed status. Inside parallel, the first accepted terminator stores a `pendingTermination` decision and stops sibling admission. Sibling cleanup completes before final status is published. A restart with a pending decision completes cleanup using that decision, so another branch cannot replace the result. The winning node and its exact enclosing scopes complete with cleared error/checkpoint fields before sibling cancellation, including during recovery. Interrupted sibling scopes are cancelled, not timed out. Failed cleanup overrides successful termination with an engine failure. Ordinary branch step outputs still contribute to the parallel aggregate without terminating the workflow.

The V1 node driver and flat parallel implementation are preserved in `run_v1_node.ts` and `enter_v1_parallel_node_impl.ts` from the pre-cursor implementation (`3019ed58ee1a^`). The disabled path does not instantiate branch cursors or use serialized checkpoint queues. Retaining these implementations is a rollout compatibility boundary; removing them requires a separate migration decision. Shared context/IO helpers still require the existing sequential and flat-parallel regression suites.

## Supported boundary

Branch-local timeout zones and HITL input/approval waits remain rejected by graph validation. Use the parallel step's overall/branch timeout and its aggregate result. Timeout cleanup unwinds active foreach/while/retry/fallback records up to the owning parallel boundary. Loop break/continue must target a loop within the same parallel branch; they cannot escape into an enclosing parent loop. These exclusions are explicit supported-scope limits, not silent changes to workflow-wide behavior.

A parallel step can have its own retry/fallback/continue handler. Retrying the join creates new attempt scopes for every branch. As in the sequential engine, fallback preserves the original failure; `continue: true` is required to proceed after the handler.

## Validation

The integration tests exercise real graph compilation, node implementations, scoped variables, persistence and resume with mocked repositories and connectors. Reliability cases cover nested execution at global limit one, active cancellation with an ignored abort, repeated transition yields, fan-out admission, holding results until checkpoint publication, recovery after node commit but before parent/scope updates, persistence failure, and unequal branch loops with aggressive output eviction. Existing parallel and sequential engine tests remain required.

```sh
node scripts/jest_integration 'src/platform/plugins/shared/workflows_execution_engine/integration_tests/tests/parallel' --runInBand
node scripts/check.js --scope=local
```

See [the edge-case audit](parallel_edge_case_audit.md) for saved-workflow examples, regression coverage, and validation limits.
