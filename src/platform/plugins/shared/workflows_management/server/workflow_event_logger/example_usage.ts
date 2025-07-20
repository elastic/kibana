/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Example usage of the Workflow Event Logger
 * 
 * This file demonstrates how to use the workflow event logging system
 * for logging workflow execution events with proper context.
 */

import { WorkflowsService } from '../workflows_management/workflows_management_service';

export async function exampleWorkflowExecution(
  workflowsService: WorkflowsService,
  workflowId: string,
  executionId: string
) {
  // 1. Get a workflow-level logger
  const workflowLogger = workflowsService.getWorkflowLogger(workflowId, 'Example Workflow');
  
  // Log workflow-level events
  workflowLogger.logInfo('Workflow execution started', {
    event: { action: 'workflow-start' },
    tags: ['workflow', 'execution'],
  });

  // 2. Get an execution-level logger with context
  const executionLogger = workflowsService.getExecutionLogger(
    workflowId,
    executionId,
    'Example Workflow'
  );

  // Start timing the entire execution
  const executionEvent = {
    event: { action: 'execution' },
    message: 'Workflow execution',
  };
  executionLogger.startTiming(executionEvent);

  try {
    // Log execution progress
    executionLogger.logInfo('Executing workflow steps', {
      event: { action: 'execution-progress' },
    });

    // 3. Create step-specific loggers for individual steps
    await executeStep1(workflowsService, workflowId, executionId);
    await executeStep2(workflowsService, workflowId, executionId);

    // Mark execution as successful
    executionLogger.stopTiming({
      ...executionEvent,
      event: { ...executionEvent.event, outcome: 'success' },
    });

    executionLogger.logInfo('Workflow execution completed successfully', {
      event: { action: 'execution-complete', outcome: 'success' },
    });

  } catch (error) {
    // Log execution failure
    executionLogger.logError('Workflow execution failed', error as Error, {
      event: { action: 'execution-failed', outcome: 'failure' },
    });

    executionLogger.stopTiming({
      ...executionEvent,
      event: { ...executionEvent.event, outcome: 'failure' },
    });

    throw error;
  }
}

async function executeStep1(
  workflowsService: WorkflowsService,
  workflowId: string,
  executionId: string
) {
  // Create a step-specific logger
  const stepLogger = workflowsService.getStepLogger(
    workflowId,
    executionId,
    'step-1',
    'Data Processing Step',
    'data-processor'
  );

  const stepEvent = {
    event: { action: 'step-execution' },
    message: 'Processing data',
  };

  stepLogger.startTiming(stepEvent);

  try {
    stepLogger.logInfo('Step 1: Starting data processing');
    
    // Simulate step work
    stepLogger.logDebug('Processing 100 records', {
      event: { action: 'step-progress' },
      tags: ['data-processing'],
    });

    // Simulate some processing time
    await new Promise(resolve => setTimeout(resolve, 1000));

    stepLogger.logInfo('Step 1: Data processing completed');
    
    stepLogger.stopTiming({
      ...stepEvent,
      event: { ...stepEvent.event, outcome: 'success' },
    });

  } catch (error) {
    stepLogger.logError('Step 1 failed', error as Error, {
      event: { action: 'step-failed' },
    });
    
    stepLogger.stopTiming({
      ...stepEvent,
      event: { ...stepEvent.event, outcome: 'failure' },
    });
    
    throw error;
  }
}

async function executeStep2(
  workflowsService: WorkflowsService,
  workflowId: string,
  executionId: string
) {
  // Create another step-specific logger
  const stepLogger = workflowsService.getStepLogger(
    workflowId,
    executionId,
    'step-2',
    'Notification Step',
    'notifier'
  );

  const stepEvent = {
    event: { action: 'step-execution' },
    message: 'Sending notifications',
  };

  stepLogger.startTiming(stepEvent);

  try {
    stepLogger.logInfo('Step 2: Starting notification send');
    
    stepLogger.logDebug('Sending notification to 5 recipients', {
      event: { action: 'step-progress' },
      tags: ['notifications'],
    });

    // Simulate notification sending
    await new Promise(resolve => setTimeout(resolve, 500));

    stepLogger.logInfo('Step 2: Notifications sent successfully');
    
    stepLogger.stopTiming({
      ...stepEvent,
      event: { ...stepEvent.event, outcome: 'success' },
    });

  } catch (error) {
    stepLogger.logError('Step 2 failed', error as Error, {
      event: { action: 'step-failed' },
    });
    
    stepLogger.stopTiming({
      ...stepEvent,
      event: { ...stepEvent.event, outcome: 'failure' },
    });
    
    throw error;
  }
}

// Example of querying logs
export async function queryWorkflowLogs(
  workflowsService: WorkflowsService,
  executionId: string
) {
  // Get all logs for a specific execution
  const executionLogs = await workflowsService.getExecutionLogs(executionId);
  console.log('Execution logs:', executionLogs);

  // Get logs for a specific step
  const stepLogs = await workflowsService.getStepLogs(executionId, 'step-1');
  console.log('Step 1 logs:', stepLogs);
}

// Example usage in a workflow runner context:
// 
// const workflowId = 'workflow-123';
// const executionId = 'exec-456';
// 
// await exampleWorkflowExecution(workflowsService, workflowId, executionId);
// await queryWorkflowLogs(workflowsService, executionId); 