# Wait For Input Step

The `waitForInput` step pauses workflow execution until external input is provided via the resume API, enabling human-in-the-loop workflows.

## Configuration

```yaml
- name: my_wait_step
  type: waitForInput
  with:
    timeout: 30m           # Optional: Duration to wait for input (e.g., '5s', '1m', '30m')
    inputSchema:           # Optional: JSON Schema for expected input validation
      move:
        type: string
    message: "Please provide your move"  # Optional: Message to display to the user
```

## Behavior

1. **Enter Wait State**: When the step executes, it marks the workflow with `WAITING_FOR_INPUT` status
2. **Wait for Resume**: The workflow pauses until either:
   - The resume API is called with input data
   - The timeout expires (if configured)
3. **Resume**: Once input is received or timeout occurs:
   - Input is available as `{{ steps.<step_name>.output.input }}`
   - Timeout is indicated by `{{ steps.<step_name>.output.timedOut }}`

## Resume API

To resume a waiting workflow:

```
POST /api/workflowExecutions/{executionId}/resume
Content-Type: application/json

{
  "input": {
    "move": "e2e4"
  }
}
```

## Multi-Resume (Yielding)

For workflows that need multiple human interactions (like a chess game), use `waitForInput` inside a `foreach` loop:

```yaml
- name: game_loop
  type: foreach
  foreach: "{{ range(1, 100) }}"
  steps:
    - name: ai_turn
      type: ai.prompt
      # ... AI calculates move
    - name: wait_for_human
      type: waitForInput
      with:
        timeout: 30m
    - name: apply_move
      type: data.set
      with:
        board: "{{ steps.wait_for_human.output.input.board }}"
```

Each iteration will pause and wait for human input before continuing.

## Timeout Handling

If a timeout is configured:

1. A Task Manager task is scheduled to trigger after the timeout duration
2. If input is received before timeout, the task is cancelled
3. If timeout occurs first:
   - `output.timedOut` is set to `true`
   - Workflow continues (does not fail)

Check for timeout in subsequent steps:

```yaml
- name: check_timeout
  type: if
  condition: "{{ steps.wait_for_human.output.timedOut == true }}"
  steps:
    - name: handle_timeout
      type: console
      with:
        message: "Human did not respond in time"
```
