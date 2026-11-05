# Wait For Input Step

The `waitForInput` step pauses workflow execution until an external caller submits input via the resume API (human-in-the-loop).

## Syntax

```yaml
steps:
  - name: approve-action
    type: waitForInput
    with:
      message: "Please approve before the host is isolated"
```

## Configuration

- **`type`**: Must be `"waitForInput"`
- **`with.message`**: Message displayed to the human reviewer (optional)
- **`with.schema`**: JSON Schema describing the expected input payload (optional). When provided, the resume UI renders validation and autocomplete from the schema, and default values are pre-filled
- **`resume-as`**: Identity the steps after the answer run as (optional, literal): `inherit` (default) keeps the execution identity, such as its service account, and `responder` runs them as the person who answered. `waitForApproval` takes it too; see [Identity after the answer](#identity-after-the-answer)

## Execution Flow

### Entering the wait

1. Step runs for the first time
2. Step status is set to `WAITING_FOR_INPUT`
3. Workflow status is propagated to `WAITING_FOR_INPUT`
4. Execution loop exits; the task ends cleanly

### Resuming

1. Caller posts to `POST /api/workflowExecutions/{executionId}/resume` with optional `input`
2. A resume task is scheduled via Task Manager
3. The workflow execution loop restarts at the `waitForInput` node
4. `tryEnterWaitUntil` detects the existing `WAITING_FOR_INPUT` status and exits the wait
5. The submitted `input` is read from `context.resumeInput`, passed as step output, then cleared
6. Execution continues to the next step

If the resume cannot be handed to Task Manager, the request retries the handoff a few times. When
it still fails and no resume is already under way, the response is removed from
`context.resumeInput` again and the request fails with `WorkflowResumeNotAppliedError`. The
resume API then releases its claim on the step, so the step can be answered again.

Before applying a stored response, the runner marks it as taken (`context.resumeInputTakenFor`)
with a conditional update on its `resumedBy`/`resumedAt` stamp, and the revert above uses the same
stamp. A response is therefore either taken back or applied, never both; a runner that finds its
response gone reloads the execution instead of applying the copy it loaded.

### Identity after the answer

An execution that runs as a service account is re-scoped to it on every task run, including the run that applies an answer. With `resume-as: responder`, the steps after the answer run as the person who answered instead, until the execution's next HITL wait or its end, across the resumes in between (timers, child workflows).

- Every wait entry rewrites `context.resumeAs`: the step's choice, or `null`. That is what ends a scope.
- An in-app answer re-keys the resume task with the responder's API key. The run that applies the answer acts as the responder only when its own identity is the answer's `resumedBy`, which is not the case for an answer through an external link, an answer that landed while the resume task was running, or an execution whose tasks run as the service account itself. The step then fails with `ResumeAsResponderError` and consumes the answer, so `on-failure` decides what happens next. Timeouts are not answers and fail as before.
- Applying the answer stores the responder in `context.resumeAs`, so later runs keep acting as them. A later run without the responder's credentials fails the execution with `ResumeAsResponderError`.
- While acting as the responder, children with `run-as-mode: default` run as the responder, and `run-as-mode: inherit` is refused.

## Statuses

| Status | Description |
|---|---|
| `WAITING_FOR_INPUT` | Paused, waiting for human input via the resume API |
| `COMPLETED` | Input received; step output contains the submitted payload |

## Step Output

After resumption the step output is the `input` body sent to the resume API. Downstream steps can reference it via `{{ steps.<name>.output }}`.

## Examples

### Approval gate

```yaml
steps:
  - name: request-approval
    type: waitForInput
    with:
      message: "Approve host isolation for {{ inputs.hostname }}?"

  - name: isolate-host
    type: http
    with:
      url: "https://edr.internal/api/isolate"
      method: POST
      body:
        hostname: "{{ inputs.hostname }}"
        approvedBy: "{{ steps.request-approval.output.approvedBy }}"
```

### Typed input with schema

```yaml
steps:
  - name: get-ticket-info
    type: waitForInput
    with:
      message: "Provide ticket details"
      schema:
        properties:
          ticketNumber:
            type: string
          severity:
            type: string
            enum: [low, medium, high]
            default: medium
        required:
          - ticketNumber

  - name: log-ticket
    type: console
    with:
      message: "Ticket: {{ steps.get-ticket-info.output.ticketNumber }} ({{ steps.get-ticket-info.output.severity }})"
```

## Implementation Details

**Resume input:** Stored in `workflowExecution.context.resumeInput` by the resume API handler and cleared by the step after reading it, so subsequent `waitForInput` steps are not auto-completed.

**Resume API:** [`post_resume_workflow_execution.ts`](../../../../workflows_management/server/workflows_management/routes/post_resume_workflow_execution.ts)
