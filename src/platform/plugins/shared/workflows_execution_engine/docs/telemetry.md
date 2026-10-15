# Workflows Execution Engine Telemetry: execution lineage

The engine reports its event-based telemetry (EBT) through `WorkflowExecutionTelemetryClient`
(`server/lib/telemetry/workflow_execution_telemetry_client.ts`). Each field's `_meta.description` in
`server/lib/telemetry/events/workflows_execution/index.ts` is the field-level reference. This document covers only the
execution lineage fields and how to join a sub-workflow chain with them.

## Lineage fields

`workflows_execution_workflow_completed`, `_failed` and `_cancelled` carry three optional lineage fields.
`workflows_event_driven_execution_suppressed` never carries them.

| Field | Description |
|---|---|
| `parentWorkflowExecutionId` | The execution id of the parent run that started this run. Present for every sub-workflow run (`triggerType: workflow-step`), absent for a top-level run. |
| `rootWorkflowExecutionId` | The execution id of the top-level run at the root of the chain. A top-level run reports its own `workflowExecutionId`. A sub-workflow run reports the id of the top-level run that started its chain through `workflow.execute` or `workflow.executeAsync`, at any depth, with the exceptions below. |
| `executionChain` | Every ancestor of a sub-workflow run, root first and direct parent last. Each hop is `{ executionId, workflowId, invocation }`, where `invocation` is how that ancestor started the next run down: `sync` (`workflow.execute`) or `async` (`workflow.executeAsync`). The first hop's `executionId` equals `rootWorkflowExecutionId`, the last hop equals `parentWorkflowExecutionId`, `parentWorkflowId` and `parentWorkflowInvocation`, and the length equals `compositionDepth`. Absent for a top-level run, and with the same exceptions as the root id. It has at most `maxWorkflowDepth` hops (`workflowsExecutionEngine.maxWorkflowDepth`, 10 by default). |

The root id doesn't follow every link between runs:

- **Chains that started before this change.** A child started by a sub-workflow run that itself started before the
  root was recorded has `parentWorkflowExecutionId` but no `rootWorkflowExecutionId`, and so do its own descendants. A
  top-level run that started before the change still gives its later children a root. The chain follows the same rule:
  it is never partial, so a run either has every ancestor or no `executionChain`.
- **Event triggers.** A run started by an event trigger is a new top-level run with its own root, even when another run
  emitted the event.
- **Directly scheduled runs.** A run that a step or plugin code starts through `scheduleWorkflow` or `runWorkflow`,
  rather than through `workflow.execute` or `workflow.executeAsync`, is a new top-level run too. For example, the
  `attack-discovery.run` step schedules its generation workflow with `scheduleWorkflow` (`invoke_generation_workflow.ts`
  in `kbn-discoveries`), so those generation runs are not in the group of the Worker run that started them.

A run is top level when a parent workflow step did not start it: its `triggeredBy` is not `WORKFLOW_STEP_TRIGGER_SOURCE`
(`workflow-step`), which `workflow.execute` and `workflow.executeAsync` set. `isTopLevelWorkflowExecution` in
`@kbn/workflows` makes that check where the root is stored, where it is reported, and where the engine decides that a
child runs in its own task.

## Join rule

- **Group a chain by `rootWorkflowExecutionId`.** Every event in the group belongs to the same top-level run. A group
  only covers the links listed above, so a Worker's group doesn't include runs it started through a scheduled link.
- **Don't group by `executionChain`.** A terms aggregation on `executionChain.executionId` counts an event once for every
  ancestor, and a query can't address one position in the array. The flat `rootWorkflowExecutionId` (the first hop) and
  the parent fields (the last hop) exist so grouping and direct-children queries don't need the array.
- **Use the chain for traces and subtrees.** Everything under run X, at any depth, is the events with
  `executionChain.executionId: X`, plus X's own event (`workflowExecutionId: X`). Its direct children are the events with
  `parentWorkflowExecutionId: X`. Only top-level runs are the events with no `executionChain` and no
  `parentWorkflowExecutionId`.
- **Compute a chain's outcome over every event in its group.** Don't read it from the root's own event alone. With
  `workflow.executeAsync`, the root can finish while its children are still running or waiting, sometimes for days.
  For example, a Worker that dispatches its sweep with `workflow.executeAsync` can complete before the sweep does.
- **An outcome computed over a group is a lower bound.** Nothing reports how many children a run started, so a child
  that never sent an event can't be told apart from a child that never existed.
- **Dedupe by `workflowExecutionId`.** A run normally reports one terminal event (`_completed`, `_failed` or
  `_cancelled`), and some runs report none. Count each `workflowExecutionId` once in case a retry reports twice.
- **A missing event means the outcome is unknown.** A run with no terminal event, root or not, may still be running or
  waiting, its event may have been lost, or it may have ended outside the runtime. For example, the engine ends these
  runs in storage without a terminal event (not an exhaustive list):
  - a service account that can't be used before the first step (`ServiceAccountExecutionError`);
  - an access-control denial (`WorkflowAccessDeniedError`);
  - a graph that can't be built (`GraphBuildError`), or inputs that fail validation (`InputValidationError`);
  - a run created without a known user;
  - task recovery (`TaskRecoveryError`);
  - a concurrency rule that drops the run, lets its queue wait run out, or can't start it from the queue;
  - a cancellation before the run started;
  - an event-driven run the operator turned off, which reports `workflows_event_driven_execution_suppressed` instead.
- **A missing `rootWorkflowExecutionId` means the root is unknown, never "top level".** The engine never guesses a
  root.
- **The root workflow id is the first hop's `workflowId`.** A top-level run reports it as its own `workflowId`.
- **Older data lacks these fields.** Runs from releases that predate this change report none of the lineage fields. Runs from
  releases that also predate the fix that keeps the stored context on the terminal save report `compositionDepth: 1`
  for every child and omit `parentWorkflowId` and `parentWorkflowInvocation`.
- **`parentWorkflowId` now ships on child runs.** Since the terminal save keeps the stored parent keys, child events
  carry `parentWorkflowId`. It is the same kind of id as the `workflowId` every event already carries: for customer
  workflows it is usually built from the workflow name (`generateWorkflowId` in
  `workflows_management/common/lib/import/index.ts`).

## Where the lineage is stored

`workflow.execute` and `workflow.executeAsync` write `rootWorkflowExecutionId` and `executionChain` into the child's
execution context bag, next to `parentWorkflowExecutionId` and `parentWorkflowId`. Each child copies its parent's chain
and appends the parent as the last hop. These keys are not exposed to workflow authors: Liquid
templates, step context and autocomplete do not see them, and `parent` still describes only the direct parent. They are
visible through `WorkflowExecutionDto.context` and the executions API. Nothing outside the engine reads them.
