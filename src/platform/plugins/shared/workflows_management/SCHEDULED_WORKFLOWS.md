# Scheduled Workflows Implementation

This document describes the implementation of interval-based workflows in the Kibana Workflows Management plugin, following the same pattern used by alerting rules and detection rules.

## Overview

The implementation adds support for scheduled triggers to workflows, allowing them to execute automatically at specified intervals. This follows the same architectural pattern as Kibana's alerting system, using the Task Manager plugin for scheduling and execution.

## Architecture

### Key Components

1. **Schedule Utils** (`lib/schedule_utils.ts`)
   - Converts workflow scheduled triggers to task manager schedule format
   - Supports both interval-based (`every: '5', unit: 'minute'`) and cron-based scheduling
   - Provides utilities to check for and filter scheduled triggers

2. **Workflow Task Runner** (`tasks/workflow_task_runner.ts`)
   - Executes workflows when triggered by the task manager
   - Handles workflow retrieval and execution via the workflows execution engine
   - Manages task state and error handling

3. **Workflow Task Scheduler** (`tasks/workflow_task_scheduler.ts`)
   - Manages the lifecycle of scheduled workflow tasks
   - Schedules, unschedules, and updates tasks when workflows change
   - Integrates with the Task Manager plugin

4. **Enhanced Workflow Creation** (`lib/create_workflow.ts`)
   - Automatically schedules tasks when workflows with scheduled triggers are created
   - Integrates task scheduling into the workflow creation flow

## Usage

### Creating a Scheduled Workflow

```typescript
import { CreateWorkflowCommand, WorkflowStatus } from '@kbn/workflows';

const scheduledWorkflow: CreateWorkflowCommand = {
  name: 'Scheduled Data Processing',
  description: 'Processes data every 5 minutes',
  status: WorkflowStatus.ACTIVE,
  triggers: [
    {
      id: 'scheduled-trigger',
      type: 'schedule',
      enabled: true,
      config: {
        every: '5',
        unit: 'minute',
      },
    },
  ],
  steps: [
    {
      id: 'process-data',
      connectorType: 'console',
      connectorName: 'console',
      inputs: {
        message: 'Processing data at {{now}}',
      },
    },
  ],
  tags: ['scheduled'],
  yaml: '...',
};
```

### Supported Schedule Formats

#### Interval-based Scheduling
```typescript
config: {
  every: '5',
  unit: 'minute', // 'second', 'minute', 'hour', 'day'
}
```

#### Cron-based Scheduling
```typescript
config: {
  cron: '0 9 * * *', // Every day at 9 AM
}
```

## Implementation Details

### Task Manager Integration

The implementation registers a custom task type `'workflow:scheduled'` with the Task Manager plugin:

```typescript
taskManager.registerTaskDefinitions({
  'workflow:scheduled': {
    title: 'Scheduled Workflow Execution',
    description: 'Executes workflows on a scheduled basis',
    timeout: '5m',
    maxAttempts: 3,
    createTaskRunner: ({ taskInstance }) => {
      // Task execution logic
    },
  },
});
```

### Workflow Lifecycle Management

1. **Creation**: When a workflow with scheduled triggers is created, tasks are automatically scheduled
2. **Updates**: When a workflow is updated:
   - If it has scheduled triggers, existing tasks are unscheduled and new ones are created
   - If it no longer has scheduled triggers, existing tasks are unscheduled
3. **Deletion**: When a workflow is deleted, all associated scheduled tasks are removed

### Error Handling

- Task scheduling failures don't prevent workflow creation
- Failed task executions are logged and retried according to the maxAttempts configuration
- Task state tracks execution history and error information

## Configuration

### Task Manager Settings

- **Timeout**: 5 minutes (configurable)
- **Max Attempts**: 3 (configurable)
- **Scope**: `['workflows']` for proper task isolation

### Schedule Validation

The system validates schedule configurations:
- Interval-based schedules require both `every` and `unit` properties
- Cron schedules require a valid cron expression
- Invalid schedules throw descriptive error messages

## Monitoring and Debugging

### Task State

Each scheduled task maintains state information:
- `lastRunAt`: Timestamp of the last execution
- `lastRunStatus`: 'success' or 'failed'
- `lastRunError`: Error message if the last run failed

### Logging

The implementation provides comprehensive logging:
- Task scheduling events
- Workflow execution results
- Error conditions and retry attempts

## Future Enhancements

1. **Advanced Scheduling**: Support for more complex scheduling patterns
2. **Time Zones**: Support for timezone-aware scheduling
3. **Conditional Execution**: Execute workflows based on conditions
4. **Metrics and Monitoring**: Enhanced observability for scheduled workflows
5. **UI Integration**: Visual workflow scheduler in the Kibana UI

## Testing

The implementation includes:
- Unit tests for schedule utilities
- Integration tests for task scheduling
- Example workflows demonstrating different scheduling patterns

## Migration

Existing workflows without scheduled triggers are unaffected by this implementation. The system gracefully handles workflows with and without scheduled triggers. 