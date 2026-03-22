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
- **`with.message`**: Message displayed to the human reviewer (required)

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

### Collect structured data

```yaml
steps:
  - name: get-ticket-number
    type: waitForInput
    with:
      message: "Enter the incident ticket number to attach to this action"

  - name: log-ticket
    type: console
    with:
      message: "Ticket: {{ steps.get-ticket-number.output.ticketNumber }}"
```

## Implementation Details

**Status detection:** `tryEnterWaitUntil(undefined, ExecutionStatus.WAITING_FOR_INPUT)` — returns `true` on first call (enter wait), `false` on resume call (exit wait).

**Resume input:** Stored in `workflowExecution.context.resumeInput` by the resume API handler and cleared by the step after reading it, so subsequent `waitForInput` steps are not auto-completed.

**Resume API:** [`post_resume_workflow_execution.ts`](../../../../workflows_management/server/workflows_management/routes/post_resume_workflow_execution.ts)
