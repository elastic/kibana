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
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { KibanaRequest, CoreStart } from '@kbn/core/server';
import type { WorkflowExecutionRuntimeManager } from './workflow_execution_runtime_manager';
import type { WorkflowExecutionState } from './workflow_execution_state';
import type { RunStepResult } from '../step/node_implementation';
import { buildStepExecutionId } from '../utils';
import { WorkflowScopeStack } from './workflow_scope_stack';

export interface ContextManagerInit {
  // New properties for logging
  workflowExecutionGraph: WorkflowGraph;
  workflowExecutionRuntime: WorkflowExecutionRuntimeManager;
  workflowExecutionState: WorkflowExecutionState;
  // New properties for internal actions
  esClient: ElasticsearchClient; // ES client (user-scoped if available, fallback otherwise)
  fakeRequest?: KibanaRequest;
  coreStart?: CoreStart; // For using Kibana's internal HTTP client
}

export class WorkflowContextManager {
  private workflowExecutionGraph: WorkflowGraph;
  private workflowExecutionRuntime: WorkflowExecutionRuntimeManager;
  private workflowExecutionState: WorkflowExecutionState;
  private esClient: ElasticsearchClient;
  private fakeRequest?: KibanaRequest;
  private coreStart?: CoreStart;

  constructor(init: ContextManagerInit) {
    this.workflowExecutionGraph = init.workflowExecutionGraph;
    this.workflowExecutionRuntime = init.workflowExecutionRuntime;
    this.workflowExecutionState = init.workflowExecutionState;
    this.esClient = init.esClient;
    this.fakeRequest = init.fakeRequest;
    this.coreStart = init.coreStart;
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
      const stepData = this.getStepData(stepId);

      if (stepData) {
        stepContext.steps[stepId] = {};
        if (stepData.runStepResult) {
          stepContext.steps[stepId] = {
            ...stepContext.steps[stepId],
            ...stepData.runStepResult,
          };
        }

        if (stepData.stepState) {
          stepContext.steps[stepId] = {
            ...stepContext.steps[stepId],
            ...stepData.stepState,
          };
        }
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

  /**
   * Get the Elasticsearch client for internal actions
   * This client is already user-scoped if fakeRequest was available during initialization
   */
  public getEsClientAsUser(): ElasticsearchClient {
    return this.esClient;
  }

  /**
   * Get the fake request from task manager for Kibana API authentication
   */
  public getFakeRequest(): KibanaRequest | undefined {
    return this.fakeRequest;
  }

  /**
   * Get CoreStart for accessing Kibana's internal services
   */
  public getCoreStart(): CoreStart | undefined {
    return this.coreStart;
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
    let scopeStack = WorkflowScopeStack.fromStackFrames(
      this.workflowExecutionState.getWorkflowExecution().scopeStack
    );

    while (!scopeStack.isEmpty()) {
      const topFrame = scopeStack.getCurrentScope()!;
      scopeStack = scopeStack.exitScope();
      const stepExecution = this.workflowExecutionState.getStepExecution(
        buildStepExecutionId(
          this.workflowExecutionState.getWorkflowExecution().id,
          topFrame.stepId,
          scopeStack.stackFrames
        )
      );

      if (stepExecution) {
        switch (stepExecution.stepType) {
          case 'foreach':
            if (!stepContext.foreach) {
              stepContext.foreach = stepExecution.state as StepContext['foreach'];
            }
            break;
        }
      }
    }
  }

  private getStepData(stepId: string):
    | {
        runStepResult: RunStepResult;
        stepState: Record<string, any> | undefined;
      }
    | undefined {
    const latestStepExecution = this.workflowExecutionState.getLatestStepExecution(stepId);
    if (!latestStepExecution) {
      return;
    }

    return {
      runStepResult: {
        input: latestStepExecution?.input,
        output: latestStepExecution?.output,
        error: latestStepExecution?.error,
      },
      stepState: latestStepExecution.state,
    };
  }
}
