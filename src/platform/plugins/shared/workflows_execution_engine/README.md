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
  4. Execute step via step factory
  5. Store step outputs in context
  6. Save step execution record
  7. Emit step events
  8. Continue to next step
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
   */
  executeWorkflow(
    workflow: WorkflowExecutionEngineModel,
    spaceId: string,
    inputs: Record<string, unknown>,
    executionType?: ExecutionType
  ): Promise<string>; // Returns workflow execution ID

  /**
   * Get workflow execution status
   */
  getWorkflowExecution(
    executionId: string,
    spaceId: string
  ): Promise<EsWorkflowExecution | null>;

  /**
   * Cancel a running workflow execution
   */
  cancelWorkflowExecution(
    executionId: string,
    spaceId: string
  ): Promise<void>;

  /**
   * Get execution logs for a workflow
   */
  getExecutionLogs(
    executionId: string,
    spaceId: string,
    options?: PaginationOptions
  ): Promise<ExecutionLogs>;

  /**
   * Get step execution details
   */
  getStepExecution(
    executionId: string,
    stepId: string,
    spaceId: string
  ): Promise<StepExecution | null>;
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
const executionId = await workflowsExecutionEngine.executeWorkflow(
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
  'default', // space ID
  { userId: '123' } // inputs
);

// Check execution status
const execution = await workflowsExecutionEngine.getWorkflowExecution(
  executionId,
  'default'
);

console.log(`Execution status: ${execution.status}`);
```

---

## Data Storage

The plugin stores data in Elasticsearch using the following indices:

### Workflow Executions Index

**Index Pattern**: `.kibana-workflows-executions-*`

**Document Structure**:
```json
{
  "id": "execution-id",
  "workflowId": "workflow-id",
  "spaceId": "default",
  "status": "running",
  "startTime": "2024-01-01T00:00:00Z",
  "endTime": null,
  "inputs": {...},
  "outputs": {...},
  "error": null,
  "executionType": "manual"
}
```

---

### Step Executions Index

**Index Pattern**: `.kibana-workflows-step-executions-*`

**Document Structure**:
```json
{
  "id": "step-execution-id",
  "workflowExecutionId": "execution-id",
  "stepId": "step-1",
  "status": "completed",
  "startTime": "2024-01-01T00:00:00Z",
  "endTime": "2024-01-01T00:00:05Z",
  "inputs": {...},
  "outputs": {...},
  "error": null
}
```

---

### Execution Logs Index

**Index Pattern**: `.kibana-workflows-logs-*`

**Document Structure**:
```json
{
  "timestamp": "2024-01-01T00:00:00Z",
  "workflowExecutionId": "execution-id",
  "stepId": "step-1",
  "level": "info",
  "message": "Step completed successfully",
  "metadata": {...}
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

### Conditional Step

Execute steps based on conditions.

```yaml
- id: step2
  name: Check Status
  type: condition
  condition: "${{ workflow.inputs.status == 'active' }}"
  then:
    - id: step2a
      name: Process Active
      type: action
      action: .email
  else:
    - id: step2b
      name: Process Inactive
      type: action
      action: .webhook
```

### Loop Step

Iterate over a collection.

```yaml
- id: step3
  name: Process Items
  type: loop
  items: "${{ workflow.inputs.items }}"
  step:
    id: process_item
    name: Process Single Item
    type: action
    action: .index
```

---

## Dependencies

### Required Plugins

| Plugin | Purpose |
|--------|---------|
| `taskManager` | Scheduled and long-running workflow execution |
| `actions` | Connector execution for action steps |

### Optional Plugins

| Plugin | Purpose |
|--------|---------|
| `cloud` | Cloud-specific configuration and features |

---

## Configuration

The plugin can be configured via `kibana.yml`:

```yaml
workflowsExecutionEngine:
  # Enable/disable the plugin
  enabled: true
  
  # Default workflow execution timeout
  defaultTimeout: "1h"
  
  # Maximum workflow execution timeout
  maxTimeout: "24h"
  
  # Enable detailed execution logging
  verboseLogging: false
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
GET .kibana-workflows-logs-*/_search
{
  "query": {
    "match": {
      "workflowExecutionId": "your-execution-id"
    }
  },
  "sort": [
    { "timestamp": "asc" }
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
  inputs: [{ name: 'date', type: 'string', required: true }]
  },
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

const executionId = await workflowsExecutionEngine.executeWorkflow(
  {
    id: 'daily-report-workflow',
    name: 'Daily Report',
    enabled: true,
    definition: workflowDefinition
  },
  'default',
  { date: '2024-01-01' }
);
```

### Example 2: Monitor Execution Progress

```typescript
// Poll for execution status
const checkStatus = async (executionId: string) => {
  const execution = await workflowsExecutionEngine.getWorkflowExecution(
    executionId,
    'default'
  );
  
  if (execution.status === 'running') {
    console.log('Workflow is still running...');
    setTimeout(() => checkStatus(executionId), 5000);
  } else if (execution.status === 'completed') {
    console.log('Workflow completed successfully!');
    console.log('Outputs:', execution.outputs);
  } else if (execution.status === 'failed') {
    console.error('Workflow failed:', execution.error);
  }
};

checkStatus(executionId);
```

---

## Additional Resources

- [Workflows Management Plugin](../workflows_management/README.md) - Management UI and API
- [Kibana Task Manager](https://www.elastic.co/guide/en/kibana/current/task-manager.html)
- [Kibana Actions & Connectors](https://www.elastic.co/guide/en/kibana/current/action-types.html)

---

**Plugin Owner**: `@elastic/workflows-eng`
