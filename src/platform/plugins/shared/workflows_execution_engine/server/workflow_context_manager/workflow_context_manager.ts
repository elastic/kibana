/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { graphlib } from '@dagrejs/dagre';
import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { WorkflowSchema } from '@kbn/workflows';
import { z } from '@kbn/zod';
import {
  IWorkflowEventLogger,
  WorkflowEventLogger,
  WorkflowLogEvent,
} from '../workflow_event_logger/workflow_event_logger';
import { WorkflowExecutionRuntimeManager } from './workflow_execution_runtime_manager';

export interface ContextManagerInit {
  workflowRunId: string;
  workflow: z.infer<typeof WorkflowSchema>;
  event: any;
  // New properties for logging
  logger?: Logger;
  workflowEventLoggerIndex?: string;
  esClient?: ElasticsearchClient;
  enableConsoleLogging?: boolean;
  workflowExecutionGraph: graphlib.Graph;
  workflowExecutionRuntime: WorkflowExecutionRuntimeManager;
}

export class WorkflowContextManager {
  private context: Record<string, any>; // Make it strongly typed
  private workflowExecutionGraph: graphlib.Graph;
  private workflowExecutionRuntime: WorkflowExecutionRuntimeManager;
  private workflowLogger: IWorkflowEventLogger | null = null;

  constructor(init: ContextManagerInit) {
    this.context = {
      workflowRunId: init.workflowRunId,
      workflow: init.workflow,
      event: init.event,
    };

    this.workflowExecutionGraph = init.workflowExecutionGraph;
    this.workflowExecutionRuntime = init.workflowExecutionRuntime;

    // Initialize workflow event logger if provided
    if (init.logger && init.workflowEventLoggerIndex && init.esClient) {
      this.workflowLogger = new WorkflowEventLogger(
        init.esClient,
        init.logger,
        init.workflowEventLoggerIndex,
        {
          workflowId: init.workflowRunId,
          workflowName: init.workflow.name,
          executionId: init.workflowRunId,
        },
        {
          enableConsoleLogging: init.enableConsoleLogging || false,
        }
      );
    }
  }

  public getContext(): Record<string, any> {
    const stepContex: Record<string, any> = {
      ...this.context,
      steps: {},
    };

    const visited = new Set<string>();
    const collectPredecessors = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      stepContex.steps[nodeId] = {};
      const stepResult = this.workflowExecutionRuntime.getStepResult(nodeId);
      if (stepResult) {
        stepContex.steps[nodeId] = stepResult.output;
      }

      const stepState = this.workflowExecutionRuntime.getStepState(nodeId);
      if (stepState) {
        stepContex.steps[nodeId] = stepState;
      }

      const preds = this.workflowExecutionGraph.predecessors(nodeId) || [];
      preds.forEach((predId) => collectPredecessors(predId));
    };

    const currentNode = this.workflowExecutionRuntime.getCurrentStep();
    const currentNodeId = currentNode?.id ?? currentNode?.name;
    const directPredecessors = this.workflowExecutionGraph.predecessors(currentNodeId) || [];
    directPredecessors.forEach((nodeId) => collectPredecessors(nodeId));

    return stepContex;
  }

  public getContextKey(key: string): any {
    return this.context[key];
  }

  // ======================
  // Workflow Event Logging Methods
  // ======================

  /**
   * Get the workflow-level logger (execution scoped)
   */
  public get logger(): IWorkflowEventLogger | null {
    return this.workflowLogger;
  }

  /**
   * Convenience logging methods that automatically include workflow/execution/step context
   */
  public logInfo(message: string, additionalData?: Partial<WorkflowLogEvent>): void {
    this.workflowLogger?.logInfo(message, additionalData);
  }

  public logError(
    message: string,
    error?: Error,
    additionalData?: Partial<WorkflowLogEvent>
  ): void {
    this.workflowLogger?.logError(message, error, additionalData);
  }

  public logWarn(message: string, additionalData?: Partial<WorkflowLogEvent>): void {
    this.workflowLogger?.logWarn(message, additionalData);
  }

  public logDebug(message: string, additionalData?: Partial<WorkflowLogEvent>): void {
    this.workflowLogger?.logDebug(message, additionalData);
  }

  public startTiming(event: WorkflowLogEvent): void {
    this.workflowLogger?.startTiming(event);
  }

  public stopTiming(event: WorkflowLogEvent): void {
    this.workflowLogger?.stopTiming(event);
  }

  /**
   * Log workflow execution start
   */
  public logWorkflowStart(): void {
    this.workflowLogger?.logInfo('Workflow execution started', {
      event: { action: 'workflow-start', category: ['workflow'] },
      tags: ['workflow', 'execution', 'start'],
    });
  }

  /**
   * Log workflow execution completion
   */
  public logWorkflowComplete(success: boolean = true): void {
    this.workflowLogger?.logInfo(
      `Workflow execution ${success ? 'completed successfully' : 'failed'}`,
      {
        event: {
          action: 'workflow-complete',
          category: ['workflow'],
          outcome: success ? 'success' : 'failure',
        },
        tags: ['workflow', 'execution', 'complete'],
      }
    );
  }

  /**
   * Log step execution start
   */
  public logStepStart(stepId: string, stepName?: string): void {
    this.workflowLogger?.logInfo(`Step '${stepName || stepId}' started`, {
      event: { action: 'step-start', category: ['workflow', 'step'] },
      tags: ['workflow', 'step', 'start'],
    });
  }

  /**
   * Log step execution completion
   */
  public logStepComplete(stepId: string, stepName?: string, success: boolean = true): void {
    this.workflowLogger?.logInfo(
      `Step '${stepName || stepId}' ${success ? 'completed' : 'failed'}`,
      {
        event: {
          action: 'step-complete',
          category: ['workflow', 'step'],
          outcome: success ? 'success' : 'failure',
        },
        tags: ['workflow', 'step', 'complete'],
      }
    );
  }
}
