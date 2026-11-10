# Workflows Execution Engine Telemetry: execution lineage

The engine reports its event-based telemetry (EBT) through `WorkflowExecutionTelemetryClient`
(`server/lib/telemetry/workflow_execution_telemetry_client.ts`). Each field's `_meta.description` in
`server/lib/telemetry/events/workflows_execution/index.ts` is the field-level reference. This document covers only the
execution lineage fields and how to join a sub-workflow chain with them.

## Lineage fields

`workflows_execution_workflow_completed`, `_failed` and `_cancelled` carry one optional lineage field, `executionChain`,
next to the composition fields `compositionDepth`, `parentWorkflowId` and `parentWorkflowInvocation`.
`workflows_event_driven_execution_suppressed` never carries any of them.

| Field | Description |
|---|---|
| `executionChain` | Every ancestor of a sub-workflow run (`triggerType: workflow-step`), root first and direct parent last. Each hop is `{ executionId, workflowId, invocation }`, where `invocation` is how that ancestor started the next run down: `sync` (`workflow.execute`) or `async` (`workflow.executeAsync`). The last hop's `workflowId` and `invocation` equal `parentWorkflowId` and `parentWorkflowInvocation`, and the length equals `compositionDepth`. Absent for a top-level run, and for a sub-workflow run whose chain started before this change (see below). It has at most `maxWorkflowDepth` hops (`workflowsExecutionEngine.maxWorkflowDepth`, 10 by default). |

The chain doesn't follow every link between runs:

- **Chains that started before this change.** A child started by a sub-workflow run that itself started before the
  chain was recorded has no `executionChain`, and neither do its own descendants. The chain is never partial, so a run
  either has every ancestor or no `executionChain`. A top-level run that started before the change still gives its
  later children a chain.
- **Event triggers.** A run started by an event trigger is a new top-level run with no chain, even when another run
  emitted the event.
- **Directly scheduled runs.** A run that a step or plugin code starts through `scheduleWorkflow` or `runWorkflow`,
  rather than through `workflow.execute` or `workflow.executeAsync`, is a new top-level run too. For example, the
  `attack-discovery.run` step schedules its generation workflow with `scheduleWorkflow` (`invoke_generation_workflow.ts`
  in `kbn-discoveries`), so the Worker run that started those generation runs is not in their chains.

A run is top level when a parent workflow step did not start it: its `triggeredBy` is not `WORKFLOW_STEP_TRIGGER_SOURCE`
(`workflow-step`), which `workflow.execute` and `workflow.executeAsync` set. `isTopLevelWorkflowExecution` in
`@kbn/workflows` makes that check where the chain is started and where it is reported. The engine decides that a child
runs in its own task with `isWorkflowStepTriggered`, the same check on `triggeredBy`.

## Join rule

- **All events of run R are the events with `executionChain.executionId: R`, plus R's own event
  (`workflowExecutionId: R`).** This covers every run under R at any depth, but only through the links listed above,
  so a Worker's events don't include runs it started through a scheduled link.
- **The direct children of run X are the events whose `executionChain` contains X and whose `compositionDepth` is X's
  depth + 1.** X's depth is its own `compositionDepth`, or 0 when it has none.
- **Top-level runs are the events with no `compositionDepth`.**
- **Don't group many runs with a terms aggregation on `executionChain.executionId`.** It counts an event once for every
  ancestor, and a query can't address one position in the array. To group many runs at once, use a run id the
  reporting plugin sends with its own events (for example AlertZero's `run_id`).
- **Compute a run's outcome over every event under it.** Don't read it from the root's own event alone. With
  `workflow.executeAsync`, the root can finish while its children are still running or waiting, sometimes for days.
  For example, a Worker that dispatches its sweep with `workflow.executeAsync` can complete before the sweep does.
- **An outcome computed over a chain is a lower bound.** Nothing reports how many children a run started, so a child
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
- **A missing `executionChain` on a child means its ancestors are unknown, never "top level".** A child always has
  `compositionDepth`, and the engine never guesses a chain.
- **The root workflow id is the first hop's `workflowId`.** A top-level run reports it as its own `workflowId`.
- **Older data lacks these fields.** Runs from releases that predate this change report no `executionChain`. Runs from
  releases that also predate the fix that keeps the stored context on the terminal save report `compositionDepth: 1`
  for every child and omit `parentWorkflowId` and `parentWorkflowInvocation`.
- **`parentWorkflowId` now ships on child runs.** Since the terminal save keeps the stored parent keys, child events
  carry `parentWorkflowId`. It is the same kind of id as the `workflowId` every event already carries: for customer
  workflows it is usually built from the workflow name (`generateWorkflowId` in
  `workflows_management/common/lib/import/index.ts`).

## Where the lineage is stored

`workflow.execute` and `workflow.executeAsync` write `executionChain` into the child's execution context bag, next to
the existing `parentWorkflowExecutionId` and `parentWorkflowId` keys. Each child copies its parent's chain and appends
the parent as the last hop. These keys are not exposed to workflow authors: Liquid templates, step context and
autocomplete do not see them, and `parent` still describes only the direct parent. They are visible through
`WorkflowExecutionDto.context` and the executions API. Nothing outside the engine reads `executionChain`.
