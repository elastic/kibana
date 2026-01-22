# Chess Workflow Example

This example plugin demonstrates the **human-in-the-loop** workflow functionality using the `waitForInput` step type.

## Overview

The plugin creates a simple chess game interface that interacts with a workflow. The workflow:
1. AI calculates its move using an `ai.prompt` step
2. Waits for human input using `waitForInput` step
3. Processes the human's move
4. Loops back for the next turn

## Key Features Demonstrated

### waitForInput Step

The `waitForInput` step pauses workflow execution until external input is provided:

```yaml
- name: wait_for_human
  type: waitForInput
  with:
    timeout: 30m
    message: "Please make your move"
    inputSchema:
      move:
        type: string
```

### Resume API

When the human makes a move, the UI calls the resume API:

```
POST /api/workflowExecutions/{executionId}/resume
{
  "input": {
    "move": "e2e4"
  }
}
```

### Multi-Resume with foreach

For turn-based games, use `waitForInput` inside a `foreach` loop:

```yaml
- name: game_loop
  type: foreach
  foreach: "{{ range(1, 100) }}"
  steps:
    - name: ai_turn
      type: ai.prompt
      # ...
    - name: wait_for_human
      type: waitForInput
      with:
        timeout: 30m
    - name: apply_move
      type: data.set
      # ...
```

## Example Workflow

See the `workflows/chess-game-main.yaml` file for a complete example workflow definition.

## Running the Example

1. Start Kibana with the example plugins:
   ```bash
   yarn start --run-examples
   ```

2. Navigate to Developer Examples in Kibana
3. Find "Chess Workflow Example"
4. Create a workflow using the example YAML
5. Click "Start Game vs AI" to begin

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌────────────────┐
│   Chess UI     │────▶│  Main Workflow   │────▶│   AI Agent     │
│   (React)      │◀────│  (waitForInput)  │◀────│  (ai.prompt)   │
└─────────────────┘     └──────────────────┘     └────────────────┘
        │                        │
        │                        │
        ▼                        ▼
   Resume API            Workflow Engine
```

## API Reference

### Start Workflow
```
POST /api/workflows/{workflowId}/run
Body: { "inputs": { "initialBoard": "fen-string" } }
Response: { "workflowExecutionId": "uuid" }
```

### Resume Workflow
```
POST /api/workflowExecutions/{executionId}/resume
Body: { "input": { "move": "e2e4", ... } }
Response: 200 OK
```

### Poll Execution Status
```
GET /api/workflowExecutions/{executionId}
Response: { "id": "...", "status": "waiting_for_input", "stepExecutions": [...] }
```
