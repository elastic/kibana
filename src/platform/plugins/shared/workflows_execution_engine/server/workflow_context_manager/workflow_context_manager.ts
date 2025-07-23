/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ElasticsearchClient, IScopedClusterClient, Logger } from '@kbn/core/server';
import { WorkflowSchema } from '@kbn/workflows';
import { z } from '@kbn/zod';
import { RunStepResult } from '../step/step_base';

export interface ContextManagerInit {
  workflowRunId: string;
  workflow: z.infer<typeof WorkflowSchema>;
  previousExecution?: Record<string, any>;
  connectorSecrets?: Record<string, any>;
  stepResults: Record<string, RunStepResult>;
  event: any;
  esApiKey: string;
  // New properties for logging
  logger?: Logger;
  workflowEventLoggerIndex?: string;
  esClient?: ElasticsearchClient;
}

export class WorkflowContextManager {
  private context: Record<string, any>; // Make it strongly typed
  private esClient: IScopedClusterClient;
  // private workflowLogger: IWorkflowEventLogger | null = null;
  // private currentStepId: string | null = null;
  // // Store original parameters for recreating logger
  // private originalEsClient: ElasticsearchClient | null = null;
  // private originalLogger: Logger | null = null;
  // private originalIndexName: string | null = null;

  constructor(init: ContextManagerInit) {
    this.context = {
      workflowRunId: init.workflowRunId,
      workflow: init.workflow,
      previousExecution: init.previousExecution ?? {},
      connectorSecrets: init.connectorSecrets ?? {},
      stepResults: init.stepResults ?? {}, // we might start from previous execution with some results
      event: init.event,
    };

    this.esClient = this.createEsClient(init.esApiKey);

    // Store original parameters for recreating logger
    // this.originalEsClient = init.esClient || null;
    // this.originalLogger = init.logger || null;
    // this.originalIndexName = init.workflowEventLoggerIndex || null;

    // Initialize workflow event logger if provided
    // if (init.logger && init.workflowEventLoggerIndex && init.esClient) {
    //   this.workflowLogger = new WorkflowEventLogger(
    //     init.esClient,
    //     init.logger,
    //     init.workflowEventLoggerIndex,
    //     {
    //       workflowId: init.workflowRunId,
    //       workflowName: init.workflow.name,
    //       executionId: init.workflowRunId,
    //     }
    //   );
    // }
  }

  private createEsClient(apiKey: string): IScopedClusterClient {
    return {} as IScopedClusterClient; // Placeholder
  }

  public getEsClient(): IScopedClusterClient {
    return this.esClient;
  }

  public getContext(): Record<string, any> {
    return { ...this.context };
  }

  public updateContext(updates: Record<string, any>): void {
    Object.assign(this.context, updates);
  }

  public appendStepResult(stepId: string, result: RunStepResult): void {
    this.context.stepResults[stepId] = result;
  }

  public getContextKey(key: string): any {
    return this.context[key];
  }

  public getStepResults(): { [stepId: string]: RunStepResult } {
    return this.context.stepResults;
  }

  // ======================
  // Workflow Event Logging Methods
  // ======================

  /**
   * Get the workflow-level logger (execution scoped)
   */
  // public get logger(): IWorkflowEventLogger | null {
  //   return this.workflowLogger;
  // }

  /**
   * Set the current step context for logging
   * Call this when entering a step to get step-specific logging
   */
  public setCurrentStep(stepId: string, stepName?: string, stepType?: string): void {
    // this.currentStepId = stepId;
    // if (this.workflowLogger) {
    //   // Create a new step-specific logger
    //   this.workflowLogger = this.workflowLogger.createStepLogger(stepId, stepName, stepType);
    // }
  }

  /**
   * Clear the current step context (back to execution-level logging)
   */
  public clearCurrentStep(): void {
    // this.currentStepId = null;
    // if (
    //   this.workflowLogger &&
    //   this.originalEsClient &&
    //   this.originalLogger &&
    //   this.originalIndexName
    // ) {
    //   // Reset to execution-level logger using original parameters
    //   this.workflowLogger = new WorkflowEventLogger(
    //     this.originalEsClient,
    //     this.originalLogger,
    //     this.originalIndexName,
    //     {
    //       workflowId: this.context.workflowRunId,
    //       workflowName: this.context.workflow.name,
    //       executionId: this.context.workflowRunId,
    //     }
    //   );
    // }
  }

  /**
   * Convenience logging methods that automatically include workflow/execution/step context
   */
  // public logInfo(message: string, additionalData?: Partial<WorkflowLogEvent>): void {
  //   this.workflowLogger?.logInfo(message, additionalData);
  // }

  // public logError(
  //   message: string,
  //   error?: Error,
  //   additionalData?: Partial<WorkflowLogEvent>
  // ): void {
  //   this.workflowLogger?.logError(message, error, additionalData);
  // }

  // public logWarn(message: string, additionalData?: Partial<WorkflowLogEvent>): void {
  //   this.workflowLogger?.logWarn(message, additionalData);
  // }

  // public logDebug(message: string, additionalData?: Partial<WorkflowLogEvent>): void {
  //   this.workflowLogger?.logDebug(message, additionalData);
  // }

  // public startTiming(event: WorkflowLogEvent): void {
  //   this.workflowLogger?.startTiming(event);
  // }

  // public stopTiming(event: WorkflowLogEvent): void {
  //   this.workflowLogger?.stopTiming(event);
  // }

  /**
   * Log workflow execution start
   */
  public logWorkflowStart(): void {
    // this.logInfo('Workflow execution started', {
    //   event: { action: 'workflow-start', category: ['workflow'] },
    //   tags: ['workflow', 'execution', 'start'],
    // });
  }

  /**
   * Log workflow execution completion
   */
  public logWorkflowComplete(success: boolean = true): void {
    // this.logInfo(`Workflow execution ${success ? 'completed successfully' : 'failed'}`, {
    //   event: {
    //     action: 'workflow-complete',
    //     category: ['workflow'],
    //     outcome: success ? 'success' : 'failure',
    //   },
    //   tags: ['workflow', 'execution', 'complete'],
    // });
  }

  /**
   * Log step execution start
   */
  public logStepStart(stepId: string, stepName?: string): void {
    // this.logInfo(`Step '${stepName || stepId}' started`, {
    //   event: { action: 'step-start', category: ['workflow', 'step'] },
    //   tags: ['workflow', 'step', 'start'],
    // });
  }

  /**
   * Log step execution completion
   */
  public logStepComplete(stepId: string, stepName?: string, success: boolean = true): void {
    // this.logInfo(`Step '${stepName || stepId}' ${success ? 'completed' : 'failed'}`, {
    //   event: {
    //     action: 'step-complete',
    //     category: ['workflow', 'step'],
    //     outcome: success ? 'success' : 'failure',
    //   },
    //   tags: ['workflow', 'step', 'complete'],
    // });
  }
}
