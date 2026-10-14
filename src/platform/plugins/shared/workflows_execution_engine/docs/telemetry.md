# Workflows Execution Engine Telemetry: execution lineage

The engine reports its event-based telemetry (EBT) through `WorkflowExecutionTelemetryClient`
(`server/lib/telemetry/workflow_execution_telemetry_client.ts`). Each field's `_meta.description` in
`server/lib/telemetry/events/workflows_execution/index.ts` is the field-level reference. This document covers only the
execution lineage fields and how to join a sub-workflow chain with them.

## Lineage fields

`workflows_execution_workflow_completed`, `_failed` and `_cancelled` carry two optional keyword fields.
`workflows_event_driven_execution_suppressed` never carries them.

| Field | Description |
|---|---|
| `parentWorkflowExecutionId` | The execution id of the parent run that started this run. Present for every sub-workflow run (`triggerType: workflow-step`), absent for a top-level run. |
| `rootWorkflowExecutionId` | The execution id of the top-level run at the root of the chain. A top-level run reports its own `workflowExecutionId`. A sub-workflow run reports the id of the top-level run that started its chain through `workflow.execute` or `workflow.executeAsync`, at any depth, with the exceptions below. |

The root id doesn't follow every link between runs:

- **Chains that started before this change.** A child started by a sub-workflow run that itself started before the
  root was recorded has `parentWorkflowExecutionId` but no `rootWorkflowExecutionId`, and so do its own descendants. A
  top-level run that started before the change still gives its later children a root.
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
- **The root workflow id is not reported.** Read it from the root run's own event (`workflowId`), when there is one.
- **Older data lacks these fields.** Runs from releases that predate this change report neither lineage field. Runs from
  releases that also predate the fix that keeps the stored context on the terminal save report `compositionDepth: 1`
  for every child and omit `parentWorkflowId` and `parentWorkflowInvocation`.
- **`parentWorkflowId` now ships on child runs.** Since the terminal save keeps the stored parent keys, child events
  carry `parentWorkflowId`. It is the same kind of id as the `workflowId` every event already carries: for customer
  workflows it is usually built from the workflow name (`generateWorkflowId` in
  `workflows_management/common/lib/import/index.ts`).

## Where the lineage is stored

`workflow.execute` and `workflow.executeAsync` write `rootWorkflowExecutionId` into the child's execution context bag,
next to `parentWorkflowExecutionId` and `parentWorkflowId`. This key is not exposed to workflow authors: Liquid
templates, step context and autocomplete do not see it, and `parent` still describes only the direct parent. It is
visible through `WorkflowExecutionDto.context` and the executions API. Nothing outside the engine reads it.
