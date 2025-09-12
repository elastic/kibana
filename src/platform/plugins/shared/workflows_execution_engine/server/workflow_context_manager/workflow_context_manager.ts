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

export interface ContextManagerInit {
  // New properties for logging
  workflowExecutionGraph: WorkflowGraph;
  workflowExecutionRuntime: WorkflowExecutionRuntimeManager;
}

export class WorkflowContextManager {
  private workflowExecutionGraph: WorkflowGraph;
  private workflowExecutionRuntime: WorkflowExecutionRuntimeManager;

  constructor(init: ContextManagerInit) {
    this.workflowExecutionGraph = init.workflowExecutionGraph;
    this.workflowExecutionRuntime = init.workflowExecutionRuntime;
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
      const nodeId = node.id;
      stepContext.steps[nodeId] = {};
      const stepResult = this.workflowExecutionRuntime.getCurrentStepResult();
      if (stepResult) {
        stepContext.steps[nodeId] = {
          ...stepContext.steps[nodeId],
          ...stepResult,
        };
      }

      const stepState = this.workflowExecutionRuntime.getCurrentStepState(nodeId);
      if (stepState) {
        stepContext.steps[nodeId] = {
          ...stepContext.steps[nodeId],
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
    const workflowExecution = this.workflowExecutionRuntime.getWorkflowExecution();

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
    for (const nodeId of this.workflowExecutionRuntime.getWorkflowExecution().stack) {
      const node = this.workflowExecutionGraph.getNode(nodeId);
      const nodeType = node?.type;
      switch (nodeType) {
        case 'enter-foreach':
          stepContext.foreach = this.workflowExecutionRuntime.getCurrentStepState(nodeId) as any;
          break;
      }
    }
  }
}
