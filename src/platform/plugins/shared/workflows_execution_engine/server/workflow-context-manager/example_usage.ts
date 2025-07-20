/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Example usage of the enhanced WorkflowContextManager with integrated logging
 * 
 * This demonstrates how the context manager provides automatic workflow/execution/step
 * context for logging without requiring manual parameter passing.
 */

import { Logger } from '@kbn/core/server';
import { WorkflowContextManager } from './workflow-context-manager';
import { StepBase } from '../step/step-base';
import { ConnectorExecutor } from '../connector-executor';

// Example: Enhanced workflow execution with integrated logging
export async function exampleWorkflowExecutionWithContext(
  logger: Logger,
  workflowEventLoggerIndex: string
) {
  const workflowRunId = 'execution-123';
  
  // Create context manager with logger integration
  const contextManager = new WorkflowContextManager({
    workflowRunId,
    workflow: {
      name: 'Example Security Workflow',
      enabled: true,
      triggers: [],
      steps: [],
      settings: {},
    },
    stepResults: {},
    event: {
      type: 'detection-rule',
      ruleName: 'Suspicious Login Activity',
      severity: 'high',
    },
    esApiKey: 'mock-api-key',
    // Enhanced with logging
    logger,
    workflowEventLoggerIndex,
  });

  // Now all logging is automatic with proper context!
  
  // 1. Log workflow start
  contextManager.logWorkflowStart();
  
  // 2. Log workflow-level events with automatic context
  contextManager.logInfo('Processing security event', {
    event: { action: 'event-processing' },
    tags: ['security', 'processing'],
  });

  try {
    // 3. Execute steps with automatic step context
    await executeStepWithContext(contextManager, 'analyze-event', 'Analyze Security Event', 'analyzer');
    await executeStepWithContext(contextManager, 'enrich-data', 'Enrich Event Data', 'enricher');
    await executeStepWithContext(contextManager, 'send-alert', 'Send Alert', 'notifier');

    // 4. Log successful completion
    contextManager.logWorkflowComplete(true);

  } catch (error) {
    // 5. Log workflow failure
    contextManager.logError('Workflow execution failed', error as Error);
    contextManager.logWorkflowComplete(false);
    throw error;
  }
}

// Example: Enhanced step implementation with context manager logging
async function executeStepWithContext(
  contextManager: WorkflowContextManager,
  stepId: string,
  stepName: string,
  stepType: string
) {
  // Set current step for logging context
  contextManager.setCurrentStep(stepId, stepName, stepType);
  
  // Now all logs automatically include step context
  contextManager.logStepStart(stepId, stepName);
  
  const stepEvent = {
    event: { action: 'step-execution' },
    message: `Executing ${stepName}`,
  };
  
  // Start timing the step
  contextManager.startTiming(stepEvent);

  try {
    // Step work with automatic logging context
    contextManager.logDebug('Step initialization complete');
    
    // Simulate step work
    contextManager.logInfo(`Processing ${stepName}`, {
      event: { action: 'step-processing' },
      tags: [stepType, 'processing'],
    });
    
    // Simulate some work
    await new Promise(resolve => setTimeout(resolve, 100));
    
    contextManager.logInfo('Step processing completed successfully');
    
    // Stop timing with success outcome
    contextManager.stopTiming({
      ...stepEvent,
      event: { ...stepEvent.event, outcome: 'success' },
    });
    
    contextManager.logStepComplete(stepId, stepName, true);

  } catch (error) {
    // Log step failure with automatic context
    contextManager.logError(`Step ${stepName} failed`, error as Error, {
      event: { action: 'step-failed' },
    });
    
    contextManager.stopTiming({
      ...stepEvent,
      event: { ...stepEvent.event, outcome: 'failure' },
    });
    
    contextManager.logStepComplete(stepId, stepName, false);
    throw error;
  } finally {
    // Clear step context
    contextManager.clearCurrentStep();
  }
}

// Example: Enhanced step class using context manager
export class ExampleAnalysisStep extends StepBase<any> {
  
  protected async _run() {
    const stepName = this.getName();
    
    // Set step context in the context manager
    this.contextManager.setCurrentStep(stepName, 'Security Analysis', 'analyzer');
    
    try {
      // All logging now has automatic context!
      this.contextManager.logInfo('Starting security analysis');
      
      const event = this.contextManager.getContextKey('event');
      
      if (event.severity === 'high') {
        this.contextManager.logWarn('High severity event detected', {
          event: { action: 'high-severity-detected' },
          tags: ['security', 'high-severity'],
        });
      }
      
      // Simulate analysis work
      this.contextManager.logDebug('Analyzing event patterns');
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const analysisResult = {
        riskScore: 8.5,
        indicators: ['unusual-location', 'off-hours-access'],
        recommendation: 'immediate-investigation',
      };
      
      this.contextManager.logInfo('Analysis completed', {
        event: { action: 'analysis-complete' },
        tags: ['analysis', 'complete'],
      });
      
      return {
        output: analysisResult,
        error: undefined,
      };
      
    } catch (error) {
      this.contextManager.logError('Analysis failed', error as Error);
      return {
        output: undefined,
        error: error instanceof Error ? error.message : String(error),
      };
    } finally {
      this.contextManager.clearCurrentStep();
    }
  }
}

// Example: How the execution engine would initialize the enhanced context manager
export function createEnhancedContextManager(
  workflowRunId: string,
  workflow: any,
  event: any,
  logger: Logger,
  workflowEventLoggerIndex: string
): WorkflowContextManager {
  return new WorkflowContextManager({
    workflowRunId,
    workflow,
    stepResults: {},
    event,
    esApiKey: 'mock-api-key',
    // Pass logger and index for automatic logging integration
    logger,
    workflowEventLoggerIndex,
  });
}

// Example: Querying logs for a specific execution
export async function queryExecutionLogs(
  contextManager: WorkflowContextManager,
  executionId: string
) {
  // The logger is integrated into the context manager
  const logger = contextManager.logger;
  
  if (logger) {
    // Since we have access through context manager, we could potentially
    // add search methods to the context manager itself for convenience
    console.log(`Logs for execution ${executionId} would be queried from the dedicated index`);
  }
} 