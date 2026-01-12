# Workflows Execution Engine Plugin

Stateless execution engine for workflows.

The workflows execution engine is the core runtime component responsible for executing workflow definitions and managing their lifecycle. It provides a robust execution framework for processing workflow steps, managing state, and handling the complete execution flow.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Core Components](#core-components)
- [Workflow Execution Flow](#workflow-execution-flow)
- [Public API](#public-api)
- [Data Storage](#data-storage)
- [Step Types](#step-types)
- [Dependencies](#dependencies)
- [Configuration](#configuration)
- [Development](#development)

---

## Overview

The workflows execution engine plugin provides:

- **Workflow Execution Runtime**: Core engine for executing workflow definitions
- **Step Execution Management**: Individual step execution with state tracking
- **Context Management**: Runtime context and variable management across steps
- **Event Logging**: Comprehensive execution logging and monitoring
- **Repository Layer**: Persistence for executions, step data, and logs
- **Task Manager Integration**: Handles both immediate and scheduled workflow execution

### Key Capabilities

✅ Execute workflow based on topological order (DAG) 
✅ Support for various step types (actions, conditions, loops, etc.)
✅ Manage execution state throughout the workflow lifecycle
✅ Execute individual step
✅ Track step-by-step execution progress
✅ Log all execution events for debugging and monitoring
✅ Handle workflow cancellation and error recovery
✅ Support for long-running workflows with timeout management
✅ Template engine for dynamic value substitution

---

## Architecture

The execution engine follows a modular, stateless architecture designed for scalability and reliability:

```
┌────────────────────────────────────────────────┐
│         Workflows Management Plugin            │
│          (triggers workflow execution)         │
└────────────────────────────────────────────────┘
                      ↓
┌────────────────────────────────────────────────┐
│          Workflow Task Manager                 │
│     (schedules and orchestrates execution)     │
└────────────────────────────────────────────────┘
                      ↓
┌────────────────────────────────────────────────┐
│        Workflow Execution Loop                 │
│    (main execution control flow)               │
└────────────────────────────────────────────────┘
                      ↓
         ┌────────────────────────┐
         │  Context Manager       │
         │  (execution state)     │
         └────────────────────────┘
                      ↓
         ┌────────────────────────┐
         │   Step Factory         │
         │  (creates step runners)│
         └────────────────────────┘
                      ↓
         ┌────────────────────────┐
         │  Step Execution        │
         │  (executes individual  │
         │   steps)               │
         └────────────────────────┘
                      ↓
    ┌──────────────────────────────────┐
    │  Repositories & Event Logger     │
    │  (persist state and logs)        │
    └──────────────────────────────────┘
```

### Architecture Principles

- **Stateless Design**: Each execution step is stateless; state is persisted to Elasticsearch
- **Modular Components**: Clear separation of concerns between execution, context, logging, and persistence
- **Fault Tolerance**: Execution can be resumed after failures using persisted state
- **Scalability**: Long-running workflows handled via Task Manager with configurable timeouts

---

## Core Components

### 1. Workflow Task Manager

**Location**: `server/workflow_task_manager/`

Integrates with Kibana's Task Manager to schedule and execute workflows.

**Responsibilities**:
- Register task definitions for workflow execution
- Start immediate workflow executions
- Resume paused or failed executions
- Manage workflow execution timeouts

**Task Types**:
- `workflow:run` - Execute a workflow immediately or on schedule
- `workflow:resume` - Resume a paused or failed workflow execution

---

### 2. Workflow Execution Loop

**Location**: `server/workflow_execution_loop/`

The main execution control flow that processes workflow steps sequentially.

**Responsibilities**:
- Execute workflow steps in order
- Handle conditional logic and branching
- Manage step retries and error handling
- Coordinate with context manager for state updates
- Emit execution events via event logger

---

### 3. Context Manager

**Location**: `server/workflow_context_manager/`

Manages the runtime execution context for workflows and steps.

**Key Classes**:
- `WorkflowContextManager`: Main context management interface
- `WorkflowExecutionRuntimeManager`: Manages workflow-level execution state
- `StepExecutionRuntime`: Manages individual step execution context
- `WorkflowScopeStack`: Handles variable scoping across nested steps

**Responsibilities**:
- Maintain workflow execution state
- Provide variable scoping and resolution
- Track step inputs and outputs
- Manage execution metadata

---

### 4. Step Factory & Execution

**Location**: `server/step/`

Factory pattern for creating and executing different types of workflow steps.

**Responsibilities**:
- Create step execution instances based on step type
- Execute individual steps with proper context
- Handle step-specific logic (actions, conditions, loops, etc.)
- Validate step configurations

**Supported Step Types**:
- Action steps (connector execution)
- Conditional steps
- Loop, wait, timeout, and failure handling steps

---

### 5. Event Logger

**Location**: `server/workflow_event_logger/`

Logs all workflow execution events to Elasticsearch for monitoring and debugging.

**Responsibilities**:
- Log workflow start/stop/error events
- Log step execution events
- Track execution timeline
- Provide structured logging for analysis

**Event Types**:
- `workflow.started`
- `workflow.completed`
- `workflow.failed`
- `workflow.cancelled`
- `step.started`
- `step.completed`
- `step.failed`

---

### 6. Repositories

**Location**: `server/repositories/`

Data persistence layer for workflow executions and logs.

**Key Repositories**:

#### Workflow Execution Repository
- Store and retrieve workflow execution records
- Update execution status and metadata
- Query executions by status, workflow ID, etc.

#### Step Execution Repository
- Store step execution details
- Track step status and outputs
- Enable step-level debugging

#### Logs Repository
- Store detailed execution logs
- Support pagination and filtering
- Enable log analysis and debugging

---

### 7. Templating Engine

**Location**: `server/templating_engine.ts`

Provides dynamic value substitution in workflow definitions.

**Capabilities**:
- Variable interpolation using `{{ variable }}` syntax
- Access to workflow context and step outputs
- Expression evaluation
- Safe templating with error handling

**Example**:
```yaml
- name: send_message
  action: slack.postMessage
  params:
    message: "Hello {{ workflow.inputs.userName }}"
```

---

### 8. Connector Executor

**Location**: `server/connector_executor.ts`

Interfaces with Kibana's Actions plugin to execute connector-based steps.

**Responsibilities**:
- Execute actions via Kibana connectors
- Handle connector authentication and configuration
- Process action results
- Manage connector errors

---

## Workflow Execution Flow

### 1. Workflow Start

```
1. Workflow execution request received
2. Create workflow execution record in Elasticsearch
3. Initialize execution context with inputs
4. Schedule execution via Task Manager
5. Emit 'workflow.started' event
```

### 2. Step Execution

```
For each step in workflow definition:
  1. Load step definition
  2. Create step execution context
  3. Resolve step inputs using templating engine
  4. Store resolved inputs for persistency
  5. Execute step via step factory
  6. Store step outputs in context
  7. Save step execution record
  8. Emit step events
  9. Continue to next step, if any```
```

### 3. Workflow Completion

```
1. Process final step results
2. Update workflow execution status (completed/failed)
3. Store final outputs
4. Emit 'workflow.completed' or 'workflow.failed' event
5. Clean up execution context
```

### 4. Error Handling

```
If step fails:
  1. Log error details
  2. Check step-level retry configuration
  3. Retry step or fail workflow
  4. Update execution status
  5. Emit error events
```

---

## Public API

The plugin exposes the following public API for use by other plugins (primarily workflows_management):

### Plugin Setup API

```typescript
interface WorkflowsExecutionEnginePluginSetup {
  // No public setup methods currently
}
```

### Plugin Start API

```typescript
interface WorkflowsExecutionEnginePluginStart {
  /**
   * Start execution of a workflow
   * @param workflow - The workflow definition to execute
   * @param context - Execution context containing spaceId, inputs, triggeredBy, etc.
   * @param request - Kibana request object for authentication context
   * @returns Promise resolving to execution response with workflowExecutionId
   */
  executeWorkflow(
    workflow: WorkflowExecutionEngineModel,
    context: Record<string, any>,
    request: KibanaRequest
  ): Promise<ExecuteWorkflowResponse>;

  /**
   * Execute a single step from a workflow
   * @param workflow - The workflow definition
   * @param stepId - The ID of the step to execute
   * @param contextOverride - Context values to override for this execution
   * @returns Promise resolving to execution response with workflowExecutionId
   */
  executeWorkflowStep(
    workflow: WorkflowExecutionEngineModel,
    stepId: string,
    contextOverride: Record<string, any>
  ): Promise<ExecuteWorkflowStepResponse>;

  /**
   * Cancel a running workflow execution
   * @param workflowExecutionId - The ID of the execution to cancel
   * @param spaceId - The space ID where the execution exists
   */
  cancelWorkflowExecution(
    workflowExecutionId: string,
    spaceId: string
  ): Promise<void>;
}

interface ExecuteWorkflowResponse {
  workflowExecutionId: string;
}

interface ExecuteWorkflowStepResponse {
  workflowExecutionId: string;
}
```

### Workflow Model

```typescript
interface WorkflowExecutionEngineModel {
  id: string;
  name: string;
  enabled: boolean;
  definition: WorkflowDefinition;
  yaml?: string;
  spaceId?: string;
  isTestRun?: boolean;
}

interface WorkflowDefinition {
  name: string;
  description?: string;
  inputs?: Record<string, InputDefinition>;
  steps: StepDefinition[];
  timeout?: string; // e.g., "5m", "1h"
}
```

### Usage Example

```typescript
// In a plugin's start lifecycle
const { workflowsExecutionEngine } = plugins;

// Execute a workflow
const response = await workflowsExecutionEngine.executeWorkflow(
  {
    id: 'my-workflow-id',
    name: 'My Workflow',
    enabled: true,
    definition: {
      steps: [
        {
          name: 'Send Notification',
          type: 'action',
          action: 'slack.postMessage',
          params: {
            message: 'Hello from workflow!'
          }
        }
      ]
    }
  },
  {
    spaceId: 'default',
    inputs: { userId: '123' },
    triggeredBy: 'manual'
  },
  request // KibanaRequest object
);
```

---

## Data Storage

The plugin stores data in Elasticsearch using the following indices:

### Workflow Executions Index

**Index Name**: `.workflows-executions`

**Document Structure**:
```json
{
  "id": "execution-id",
  "workflowId": "workflow-id",
  "spaceId": "default",
  "status": "running",
  "createdAt": "2024-01-01T00:00:00Z",
  "startedAt": "2024-01-01T00:00:00Z",
  "finishedAt": null,
  "duration": null,
  "triggeredBy": "manual",
  "isTestRun": false,
  "createdBy": "user-id",
  "workflowDefinition": {...},
  "yaml": "...",
  "context": {...}
}
```

---

### Step Executions Index

**Index Name**: `.workflows-step-executions`

**Document Structure**:
```json
{
  "id": "step-execution-id",
  "workflowRunId": "execution-id",
  "workflowId": "workflow-id",
  "stepId": "step-1",
  "spaceId": "default",
  "status": "completed",
  "startedAt": "2024-01-01T00:00:00Z",
  "finishedAt": "2024-01-01T00:00:05Z",
  "duration": 5000
}
```

---

### Execution Logs Index

**Index Name**: `.workflows-execution-logs`

**Document Structure**:
```json
{
  "@timestamp": "2024-01-01T00:00:00Z",
  "spaceId": "default",
  "message": "Step completed successfully",
  "level": "info",
  "workflow": {
    "id": "workflow-id",
    "name": "My Workflow",
    "execution_id": "execution-id",
    "step_id": "step-1",
    "step_name": "Step Name",
    "step_type": "action"
  },
  "event": {
    "action": "step.completed",
    "category": "workflow",
    "type": "info",
    "provider": "workflowsExecutionEngine",
    "outcome": "success",
    "duration": 5000,
    "start": "2024-01-01T00:00:00Z",
    "end": "2024-01-01T00:00:05Z"
  },
  "error": null,
  "tags": []
}
```

---

## Step Types

The engine supports various step types for different workflow operations:

### Action Step

Execute a Kibana connector action.

```yaml
- id: step1
  name: Send Slack Message
  type: action
  action: .slack
  params:
    message: "Workflow started"
```

### HTTP Step

Make HTTP requests to external services.

```yaml
- id: step2
  name: Call API
  type: http
  with:
    url: "https://api.example.com/endpoint"
    method: "POST"
    headers:
      Content-Type: "application/json"
    body:
      message: "Hello"
```

### Conditional Step (If)

Execute steps based on conditions.

```yaml
- id: step3
  name: Check Status
  type: if
  if: "${{ workflow.inputs.status == 'active' }}"
  then:
    - id: step3a
      name: Process Active
      type: action
      action: .email
  else:
    - id: step3b
      name: Process Inactive
      type: action
      action: .webhook
```

### Loop Step (ForEach)

Iterate over a collection.

```yaml
- id: step4
  name: Process Items
  type: foreach
  foreach: "${{ workflow.inputs.items }}"
  step:
    id: process_item
    name: Process Single Item
    type: action
    action: .index
```

### Wait Step

Pause execution for a specified duration.

```yaml
- id: step5
  name: Wait
  type: wait
  with:
    duration: "5m"
```

### On Failure Handlers

Steps can include error handling:

#### Retry

Retry a step on failure.

```yaml
- id: step6
  name: Retryable Action
  type: action
  action: .webhook
  on_failure:
    retry:
      attempts: 3
      delay: "10s"
```

#### Continue

Continue execution even if step fails.

```yaml
- id: step7
  name: Optional Action
  type: action
  action: .email
  on_failure:
    continue: true
```

#### Fallback

Execute alternative steps on failure.

```yaml
- id: step8
  name: Primary Action
  type: action
  action: .webhook
  on_failure:
    fallback:
      - id: step8a
        name: Fallback Action
        type: action
        action: .email
```

### Timeout Zones

Steps and workflows can have timeout configurations:

```yaml
- id: step9
  name: Timeout Protected Step
  type: action
  action: .webhook
  timeout: "30s"
```

---

## Dependencies

### Required Plugins

| Plugin | Purpose |
|--------|---------|
| `taskManager` | Scheduled and long-running workflow execution |
| `actions` | Connector execution for action steps |
| `cloud` | Cloud-specific configuration and features |

---

## Configuration

The plugin can be configured via `kibana.yml`:

```yaml
workflowsExecutionEngine:
  # Enable/disable the plugin
  enabled: true
  
  # Enable console logging for debugging
  logging:
    console: false
  
  # Configure allowed hosts for HTTP steps
  http:
    allowedHosts: ['*']  # Use specific hosts in production
```

---

## Development

### Plugin Structure

```
workflows_execution_engine/
├── common/                         # Shared utilities
│   ├── create_indexes.ts          # Index creation utilities
│   └── mappings.ts                # Elasticsearch mappings
├── server/                         # Server-side code
│   ├── plugin.ts                  # Main plugin class
│   ├── config.ts                  # Configuration schema
│   ├── types.ts                   # TypeScript types
│   ├── execution_functions/       # Workflow execution functions
│   │   ├── run_workflow.ts       # Start workflow execution
│   │   └── resume_workflow.ts    # Resume paused execution
│   ├── workflow_execution_loop/   # Main execution loop
│   ├── workflow_context_manager/  # Context management
│   ├── workflow_event_logger/     # Event logging
│   ├── workflow_task_manager/     # Task Manager integration
│   ├── step/                      # Step factory and execution
│   ├── repositories/              # Data persistence layer
│   ├── templating_engine.ts       # Template processing
│   └── connector_executor.ts      # Connector execution
└── README.md                      # This file
```

### Local Development

```bash
# Run unit tests
yarn test:jest src/platform/plugins/shared/workflows_execution_engine

# Run integration tests
yarn test:jest_integration src/platform/plugins/shared/workflows_execution_engine

# Run with watch mode for development
yarn test:jest --watch src/platform/plugins/shared/workflows_execution_engine
```

### Debugging

Enable verbose logging:

```yaml
# kibana.dev.yml
logging:
  loggers:
    - name: plugins.workflowsExecutionEngine
      level: debug
```

View execution logs:

```bash
# Query execution logs via Dev Tools
GET .workflows-execution-logs/_search
{
  "query": {
    "bool": {
      "must": [
        {
          "term": {
            "workflow.execution_id": "your-execution-id"
          }
        }
      ]
    }
  },
  "sort": [
    { "@timestamp": "asc" }
  ]
}
```

---

## Integration Examples

### Example 1: Execute a Simple Workflow

```typescript
const workflowDefinition = {
  name: 'Daily Report',
  description: 'Generate and send daily report',
  inputs: [{ name: 'date', type: 'string', required: true }],
  steps: [
    {
      id: 'generate_report',
      name: 'Generate Report',
      type: 'action',
      action: '.index',
      params: {
        index: 'reports',
        document: {
          date: '${{ workflow.inputs.date }}',
          status: 'generated'
        }
      }
    },
    {
      id: 'send_email',
      name: 'Send Email',
      type: 'action',
      action: '.email',
      params: {
        to: 'team@example.com',
        subject: 'Daily Report - ${{ workflow.inputs.date }}',
        body: 'Report generated successfully'
      }
    }
  ]
};

const response = await workflowsExecutionEngine.executeWorkflow(
  {
    id: 'daily-report-workflow',
    name: 'Daily Report',
    enabled: true,
    definition: workflowDefinition
  },
  {
    spaceId: 'default',
    inputs: { date: '2024-01-01' },
    triggeredBy: 'manual'
  },
  request // KibanaRequest object
);
```

### Example 2: Execute a Single Step

```typescript
const response = await workflowsExecutionEngine.executeWorkflowStep(
  workflow,
  'step-1',
  {
    spaceId: 'default',
    inputs: { customValue: 'test' }
  }
);
```

### Example 3: Cancel a Workflow

```typescript
await workflowsExecutionEngine.cancelWorkflowExecution(
  'execution-id',
  'default'
);
```

**Note**: To retrieve workflow execution status and logs, use the workflows_management plugin's API. The execution engine plugin focuses on execution control and does not expose query methods in its public API.

---

## Additional Resources

- [Workflows Management Plugin](../workflows_management/README.md) - Management UI and API
- [Kibana Task Manager](https://www.elastic.co/guide/en/kibana/current/task-manager.html)
- [Kibana Actions & Connectors](https://www.elastic.co/guide/en/kibana/current/action-types.html)

---

**Plugin Owner**: `@elastic/workflows-eng`
