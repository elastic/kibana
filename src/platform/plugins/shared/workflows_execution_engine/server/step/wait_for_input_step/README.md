# Wait For Input Step

## Overview

The `waitForInput` step type enables Human-in-the-Loop (HITL) workflows by pausing execution and waiting for external input to be provided through the resume API or UI.

## Usage

```yaml
steps:
  - name: fetch_data
    type: http
    with:
      url: https://api.example.com/data
      method: GET

  - name: wait_for_approval
    type: waitForInput
    with:
      message: "Please review the fetched data and approve or reject"

  - name: process_result
    type: http
    with:
      url: https://api.example.com/process
      method: POST
      body:
        approved: "{{ steps.wait_for_approval.output.approved }}"
        comments: "{{ steps.wait_for_approval.output.comments }}"
```

## Configuration

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `message` | string | No | User-facing message displayed when waiting for input. Default: "Workflow paused - waiting for user input" |

## Behavior

### First Execution
When the step is first executed:
1. Workflow status is set to `WAITING`
2. Step status is set to `WAITING`
3. Execution pauses (does not advance to next step)
4. The workflow remains paused until input is provided via resume API

### On Resume
When input is provided via the resume API:
1. The step receives the input from `context.resumeInput`
2. The input becomes the step's output
3. The `resumeInput` is cleared from context
4. Execution continues to the next step

## Output

The step's output is the JSON object provided by the human user. Subsequent steps can reference this output using template expressions:

```yaml
- name: next_step
  type: http
  with:
    body:
      # Access any field from the human-provided input
      approved: "{{ steps.wait_for_approval.output.approved }}"
      reason: "{{ steps.wait_for_approval.output.reason }}"
```

## Resume API

To resume a paused workflow:

```http
POST /api/workflows/executions/{executionId}/resume
Content-Type: application/json

{
  "input": {
    "approved": true,
    "comments": "Looks good!"
  }
}
```

## Use Cases

- **Approval Workflows**: Pause for human approval before taking sensitive actions
- **Review Workflows**: Allow humans to review AI-generated content
- **Data Validation**: Pause for manual data verification or correction
- **Turn-based Interactions**: Implement back-and-forth human-AI workflows

## Implementation Details

- Uses existing `WAITING` status (same as `wait` step for delays)
- No new workflow-level metadata - configuration lives in YAML
- Input is temporarily stored in `context.resumeInput` during resume
- Works inside `foreach` loops for iterative HITL scenarios
