<!-- To regenerate, run: node scripts/generate workflow-trigger-docs -->

# Workflows event triggers

Triggers in the Workflows category.

## Workflow failed

Emitted when a workflow run fails. The event includes `workflow` (id, name, spaceId, isErrorHandler), `execution` (id, startedAt, failedAt), and `error` (message, stepId, stepName, stepExecutionId). Use KQL in `on.condition` to filter by workflow name, failed step, or exclude error-handler workflows to avoid infinite loops.

### Event payload

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `error` | object | Yes | Details of the failure. |
| `execution` | object | Yes | Details of the failed execution. |
| `spaceId` | string | Yes | The Kibana space where the event was emitted. |
| `timestamp` | string | Yes | When the event occurred (ISO 8601 format). |
| `workflow` | object | Yes | Details of the workflow that failed. |

### Minimal configuration

When using `workflows.failed`, we recommend using the following minimal configuration:

```yaml
triggers:
  - type: workflows.failed
    on:
      condition: 'not event.workflow.isErrorHandler:true'
```

### Examples

#### Log all workflow failures
```yaml
triggers:
  - type: workflows.failed
steps:
  - name: log_to_index
    type: elasticsearch.index
    with:
      index: workflow-errors
      body:
        workflow_id: "{{event.workflow.id}}"
        error: "{{event.error.message}}"
        timestamp: "{{event.execution.failedAt}}"
```

#### Filter by workflow name
```yaml
triggers:
  - type: workflows.failed
    on:
      condition: event.workflow.name: critical*
```

#### Exclude error-handler workflows (prevent loops)
```yaml
triggers:
  - type: workflows.failed
    on:
      condition: not event.workflow.isErrorHandler:true
```
