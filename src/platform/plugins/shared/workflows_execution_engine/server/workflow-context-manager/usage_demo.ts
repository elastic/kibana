/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * DEMONSTRATION: Actual logging integration in workflow execution
 * 
 * This shows how the logging now works automatically through the context manager
 * in actual workflow execution scenarios.
 */

// ✅ NOW IMPLEMENTED: Logging integration in the workflow execution engine

/*

WORKFLOW EXECUTION FLOW WITH INTEGRATED LOGGING:

1. 📋 **Workflow Execution Engine** (plugin.ts):
   ```typescript
   const contextManager = new WorkflowContextManager({
     workflowRunId,
     workflow,
     // ... other params
     logger: this.logger,                           // ✅ ADDED
     workflowEventLoggerIndex: '.workflows-execution-logs',  // ✅ ADDED
   });

   contextManager.logWorkflowStart();               // ✅ ADDED
   ```

2. 🔄 **Step Base Class** (step-base.ts):
   ```typescript
   public async run(): Promise<RunStepResult> {
     const stepName = this.getName();
     
     // ✅ ADDED: Set step context for logging
     this.contextManager.setCurrentStep(stepName, stepName, this.step.type);
     
     // ✅ ADDED: Log step start with timing
     this.contextManager.logStepStart(stepName);
     this.contextManager.startTiming({...});
     
     try {
       const result = await this._run();
       
       // ✅ ADDED: Log success
       this.contextManager.stopTiming({...});
       this.contextManager.logStepComplete(stepName, stepName, true);
       
       return result;
     } catch (error) {
       // ✅ ADDED: Log failure
       this.contextManager.logError(`Step ${stepName} failed`, error);
       this.contextManager.logStepComplete(stepName, stepName, false);
       
       throw error;
     }
   }
   ```

3. 🔌 **Connector Step Implementation** (connector-step.ts):
   ```typescript
   public async _run(): Promise<RunStepResult> {
     // ✅ ADDED: Step-specific logging with automatic context
     this.contextManager.logInfo(`Starting connector step: ${step.type}`);
     
     if (!shouldRun) {
       this.contextManager.logInfo('Step skipped due to condition evaluation');
       return { output: undefined, error: undefined };
     }
     
     this.contextManager.logDebug('Rendering step inputs');
     this.contextManager.logInfo(`Executing connector: ${step.type}`);
     
     // Execute connector...
     
     this.contextManager.logInfo('Connector execution completed successfully');
     return { output, error: undefined };
   }
   ```

4. ✅ **Workflow Completion** (plugin.ts):
   ```typescript
   try {
     // ... execute steps
     workflowExecutionStatus = ExecutionStatus.COMPLETED;
     contextManager.logWorkflowComplete(true);        // ✅ ADDED
   } catch (error) {
     workflowExecutionStatus = ExecutionStatus.FAILED;
     contextManager.logError('Workflow execution failed', error);  // ✅ ADDED
     contextManager.logWorkflowComplete(false);       // ✅ ADDED
   }
   ```

EXAMPLE LOGS THAT WILL BE GENERATED:

📋 Workflow Level:
{
  "@timestamp": "2024-01-15T10:30:00.000Z",
  "message": "Workflow execution started",
  "level": "info",
  "workflow": {
    "id": "execution-123",
    "name": "Security Alert Processing",
    "execution_id": "execution-123"
  },
  "event": {
    "action": "workflow-start",
    "category": ["workflow"],
    "provider": "workflow-engine"
  },
  "tags": ["workflow", "execution", "start"]
}

🔄 Step Level:
{
  "@timestamp": "2024-01-15T10:30:05.000Z", 
  "message": "Starting connector step: slack.sendMessage",
  "level": "info",
  "workflow": {
    "id": "execution-123",
    "name": "Security Alert Processing", 
    "execution_id": "execution-123",
    "step_id": "send-alert",
    "step_name": "send-alert",
    "step_type": "slack.sendMessage"
  },
  "event": {
    "action": "connector-step-start",
    "category": ["workflow", "step"],
    "provider": "workflow-engine"
  },
  "tags": ["connector", "slack.sendMessage"]
}

🎯 BENEFITS ACHIEVED:

✅ **Zero Configuration**: Steps just use `this.contextManager.logInfo()` 
✅ **Automatic Context**: All logs include workflow/execution/step IDs
✅ **Structured Events**: ECS-compatible with searchable fields
✅ **Dedicated Index**: `.workflows-execution-logs` 
✅ **Custom ES Client**: Uses workflow engine's scoped client
✅ **Performance Timing**: Built-in start/stop timing for steps
✅ **Error Handling**: Automatic error logging with stack traces
✅ **Query-Friendly**: Easy to find logs by execution ID, step ID, etc.

QUERYING LOGS:

// Get all logs for a workflow execution
GET .workflows-execution-logs/_search
{
  "query": {
    "term": { "workflow.execution_id": "execution-123" }
  }
}

// Get logs for a specific step
GET .workflows-execution-logs/_search  
{
  "query": {
    "bool": {
      "must": [
        { "term": { "workflow.execution_id": "execution-123" } },
        { "term": { "workflow.step_id": "send-alert" } }
      ]
    }
  }
}

// Get error logs only
GET .workflows-execution-logs/_search
{
  "query": {
    "bool": {
      "must": [
        { "term": { "workflow.execution_id": "execution-123" } },
        { "term": { "level": "error" } }
      ]
    }
  }
}

*/

export const WORKFLOW_LOGGING_INTEGRATION_COMPLETE = true; 