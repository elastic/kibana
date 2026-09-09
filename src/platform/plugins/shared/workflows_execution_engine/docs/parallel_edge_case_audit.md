# Parallel execution edge-case audit

This audit compares branch execution with the existing sequential engine and checks persisted step records as well as workflow outputs. The workflows in [parallel_audit](../examples/parallel_audit) were saved and executed on a dedicated Kibana instance with real Elasticsearch and Task Manager. HTTP failure cases deliberately request a local Elasticsearch endpoint without credentials; change that URL to an endpoint returning an error when running elsewhere.

## Findings fixed

- **Deadlines while parked:** branch deadlines, enclosing step timeout, and workflow timeout must wake the root execution before a later descendant wait. Previously a 2-second deadline could remain parked behind a 30-second timer. Timeout enforcement remains subject to Task Manager polling and queue latency.
- **Handler schema loss:** parallel validation silently discarded `on-failure`. Both the base schema and connector-aware schema now preserve it, including fallback step inputs. Tests distinguish retry/fallback failure from explicit continue.
- **Loop control escaping its branch:** graph construction could resolve break/continue against a parent loop outside parallel. Validation now confines loop targets to the current branch, including nested parallel scopes.
- **Unbounded parked cleanup:** reconstructed parked nodes bypassed the cancellation helper. Active and parked nodes now share the bounded cleanup lifetime, and delayed cleanup cannot mutate execution state after it expires.
- **Phantom running switch records:** case/default entry markers were treated as durable operations although they only navigate. They now use the navigation-marker path, avoiding unfinishable step records.

- **Fail-fast wake-up churn:** pending branches blocked by an existing failure cannot make the parent runnable. The parent waits for its already-started sibling or deadline instead of scheduling repeated one-second ticks.

## Review workflows

| Example | Expected behavior |
| --- | --- |
| [07: loop control and switch](../examples/parallel_audit/07_loop_control.yml) | Each branch emits foreach and while values 0,2; case/default select independently; all switch records finish. |
| [08: parallel inside foreach](../examples/parallel_audit/08_parallel_in_foreach.yml) | Two joins return A:1,A:2 then B:1,B:2 with separate cursors. |
| [09: empty and skipped paths](../examples/parallel_audit/09_empty_and_skipped.yml) | Empty fan-out launches no body; empty foreach and skipped final condition still join. |
| [10: branch deadline](../examples/parallel_audit/10_deadline_before_wait.yml) | Two outer branch deadlines terminate four nested waits; no after_wait records. |
| [11: released admission](../examples/parallel_audit/11_wait_admission.yml) | All three branches finish both waits exactly once with concurrency one/count-waiting false. |
| [12: fail-fast queue](../examples/parallel_audit/12_fail_fast_queue.yml) | Fails; already-started sibling drains; queued branch and after_join never run. |
| [13: nested cancellation](../examples/parallel_audit/13_nested_cancellation.yml) | Cancel after four waits park; root becomes cancelled and every descendant becomes terminal. |
| [14: child helper](../examples/parallel_audit/14_child.yml), [15: synchronous joins](../examples/parallel_audit/15_child_joins.yml) | Two children return distinct owner values; parent launches each once. |
| [16: restart/resume](../examples/parallel_audit/16_restart_resume.yml) | Restart Kibana while parked; four pre-wait records retain their IDs/timestamps/output and four post-wait records complete. |
| [17: parent retry/fallback](../examples/parallel_audit/17_parent_retry.yml) | Four failed operations over two attempts; fallback runs once and failure propagates. |
| [18: sequential baseline](../examples/parallel_audit/18_sequential_baseline.yml) | Foreach/break/wait/retry/continue and workflow.output return done. |
| [19: parent handler with continue](../examples/parallel_audit/19_parent_retry_continue.yml) | Same retries/fallback as 17, then parent_after runs and workflow completes. |
| [20: child cancellation](../examples/parallel_audit/20_child_cancellation.yml), [21: slow child helper](../examples/parallel_audit/21_slow_child.yml) | Branch deadlines cancel both real child executions; no result step runs. |
| [22: overall step timeout](../examples/parallel_audit/22_overall_timeout.yml) | All nested waits terminate; parent fallback and continue recover. |
| [23: workflow timeout](../examples/parallel_audit/23_workflow_timeout.yml) | Root is timed_out; all nested waits terminate without executing after_wait. |
| [24: fail-fast with a long wait](../examples/parallel_audit/24_fail_fast_long_wait.yml) | Fails after the started sibling drains; permanently blocked queued work does not cause periodic re-ticks. |

| [25: unequal waits](../examples/parallel_audit/25_unequal_waits.yml) | The 1-second branch finishes while the 3-second branch stays parked; join runs once after both. |
| [26: timed-out scopes](../examples/parallel_audit/26_timeout_scopes.yml) | The deadline unwinds foreach, while and retry records; fallback does not run. |
| [27: workflow.output](../examples/parallel_audit/27_workflow_termination.yml) | First return wins, sibling waits are cleaned up, later returns and after_join cannot change the result. |
| [28: workflow.fail](../examples/parallel_audit/28_workflow_termination.yml) | Explicit workflow failure bypasses the parent's retry/fallback and terminates siblings. |

## V4 hardening

V4 adds an execution-wide fatal path for checkpoint, rehydration, event persistence, and cancellation-status read failures. Cleanup failures and operations that ignore abort beyond a five-second grace period stop the workflow and queued admission. The limit-one regression verifies that the queued operation never starts, including after the abandoned operation eventually returns. Cleanup hooks run at most once per step per task.

Recovery tests now include two sibling fallback checkpoints with disjoint ancestor records, and an accepted workflow termination recovered before sibling cleanup. Rollout tests cover both flag directions while a workflow is parked: the persisted engine selection remains unchanged. The flag defaults off; the dedicated review instance opts in. Sequential workflows continue through the V1 driver.

Dark Watch is intentionally deferred at the user's request.

## Automated coverage

The full engine integration suite covers sequential cancellation, foreach/while/loop control, conditional steps, polling, input waits, workflow output/fail, single-step execution, retries/fallback/continue, step/workflow timeouts, payload limits, output eviction, and variables. `parallel_edge_cases.test.ts` runs the same example definitions for local control flow and handlers. `parallel_reliability.test.ts` additionally injects persistence failures and cancellation races, tests workflow-wide operation/fan-out caps and transition yields, and checks checkpoint recovery before parent/scope publication. Graph and schema tests cover rejected constructs and handler preservation.

```sh
node scripts/jest_integration --config src/platform/plugins/shared/workflows_execution_engine/integration_tests/jest.integration.config.js --runInBand
node scripts/check.js --scope=local
```

## Evidence limits

The local checks are regression evidence, not proof that every possible connector or interleaving is safe. Restart testing used persisted parked cursors; exact commit-window failures are injected through repository mocks. A multi-Kibana lease takeover during an Elasticsearch partition, sustained load/soak testing, and every external connector's abort/idempotency behavior were not exercised by this audit. External delivery remains at least once. Child workflows have independent execution budgets. HITL inside branches and branch-local timeout zones remain explicitly unsupported. Whole-workflow terminators are supported by V4.

Cancellation currently records the root workflow as cancelled and interrupted parallel descendants as timed_out; the audit checks that none remain running/waiting. These labels do not imply an external effect can be undone.
