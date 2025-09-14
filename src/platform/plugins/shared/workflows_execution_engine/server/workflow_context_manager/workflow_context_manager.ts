/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { StepContext, WorkflowContext } from '@kbn/workflows';
import type { WorkflowGraph } from '@kbn/workflows/graph';
import type { WorkflowExecutionRuntimeManager } from './workflow_execution_runtime_manager';
import type { WorkflowExecutionState } from './workflow_execution_state';
import type { RunStepResult } from '../step/step_base';

export interface ContextManagerInit {
  // New properties for logging
  workflowExecutionGraph: WorkflowGraph;
  workflowExecutionRuntime: WorkflowExecutionRuntimeManager;
  workflowExecutionState: WorkflowExecutionState;
}

export class WorkflowContextManager {
  private workflowExecutionGraph: WorkflowGraph;
  private workflowExecutionRuntime: WorkflowExecutionRuntimeManager;
  private workflowExecutionState: WorkflowExecutionState;

  constructor(init: ContextManagerInit) {
    this.workflowExecutionGraph = init.workflowExecutionGraph;
    this.workflowExecutionRuntime = init.workflowExecutionRuntime;
    this.workflowExecutionState = init.workflowExecutionState;
  }

  public getContext(): StepContext {
    const stepContext: StepContext = {
      ...this.buildWorkflowContext(),
      steps: {},
    };

    const currentNode = this.workflowExecutionRuntime.getCurrentNode();
    const currentNodeId = currentNode.id;

    const allPredecessors = this.workflowExecutionGraph.getAllPredecessors(currentNodeId);
    allPredecessors.forEach((node) => {
      const stepId = node.stepId;
      stepContext.steps[stepId] = {};
      const stepResult = this.getStepResult(stepId);
      if (stepResult) {
        stepContext.steps[stepId] = {
          ...stepContext.steps[stepId],
          ...stepResult,
        };
      }

      const stepState = this.getStepState(stepId);
      if (stepState) {
        stepContext.steps[stepId] = {
          ...stepContext.steps[stepId],
          ...stepState,
        };
      }
    });

    this.enrichStepContextAccordingToStepScope(stepContext);
    return stepContext;
  }

  public readContextPath(propertyPath: string): { pathExists: boolean; value: any } {
    const propertyPathSegments = propertyPath.split('.');
    let result: any = this.getContext();

    for (const segment of propertyPathSegments) {
      if (!(segment in result)) {
        return { pathExists: false, value: undefined }; // Path not found in context
      }

      result = result[segment];
    }

    return { pathExists: true, value: result };
  }

  private buildWorkflowContext(): WorkflowContext {
    const workflowExecution = this.workflowExecutionState.getWorkflowExecution();

    return {
      execution: {
        id: workflowExecution.id,
        isTestRun: !!workflowExecution.isTestRun,
        startedAt: new Date(workflowExecution.startedAt),
      },
      workflow: {
        id: workflowExecution.workflowId,
        name: workflowExecution.workflowDefinition.name,
        enabled: workflowExecution.workflowDefinition.enabled,
        spaceId: workflowExecution.spaceId,
      },
      consts: workflowExecution.workflowDefinition.consts || {},
      event: workflowExecution.context?.event,
      inputs: workflowExecution.context?.inputs,
    };
  }

  private enrichStepContextAccordingToStepScope(stepContext: StepContext): void {
    for (const stepId of this.workflowExecutionState.getWorkflowExecution().stack) {
      if (!this.workflowExecutionGraph.hasStep(stepId)) {
        continue;
      }

      const stepExecution = this.workflowExecutionState.getLatestStepExecution(stepId);

      if (!stepExecution) {
        continue;
      }

      switch (stepExecution.stepType) {
        case 'foreach':
          stepContext.foreach = this.getStepState(stepExecution.stepId) as any;
          break;
      }
    }
  }

  private getStepState(stepId: string): Record<string, any> | undefined {
    return this.workflowExecutionState.getLatestStepExecution(stepId)?.state;
  }

  private getStepResult(stepId: string): RunStepResult {
    const latestStepExecution = this.workflowExecutionState.getLatestStepExecution(stepId)!;
    return {
      input: latestStepExecution.input || {},
      output: latestStepExecution.output || {},
      error: latestStepExecution.error,
    };
  }
}
