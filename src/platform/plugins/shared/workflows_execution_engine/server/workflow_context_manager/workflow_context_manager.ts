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

export interface ContextManagerInit {
  // New properties for logging
  workflowExecutionGraph: WorkflowGraph;
  workflowExecutionRuntime: WorkflowExecutionRuntimeManager;
  // New properties for internal actions
  esClient: ElasticsearchClient; // ES client (user-scoped if available, fallback otherwise)
  fakeRequest?: KibanaRequest;
  coreStart?: CoreStart; // For using Kibana's internal HTTP client
}

export class WorkflowContextManager {
  private workflowExecutionGraph: WorkflowGraph;
  private workflowExecutionRuntime: WorkflowExecutionRuntimeManager;
  private esClient: ElasticsearchClient;
  private fakeRequest?: KibanaRequest;
  private coreStart?: CoreStart;

  constructor(init: ContextManagerInit) {
    this.workflowExecutionGraph = init.workflowExecutionGraph;
    this.workflowExecutionRuntime = init.workflowExecutionRuntime;
    this.esClient = init.esClient;
    this.fakeRequest = init.fakeRequest;
    this.coreStart = init.coreStart;
  }

  public getContext(): StepContext {
    const stepContext: StepContext = {
      ...this.buildWorkflowContext(),
      steps: {},
    };

    const currentNode = this.workflowExecutionRuntime.getCurrentStep();
    const currentNodeId = currentNode.id;

    const allPredecessors = this.workflowExecutionGraph.getAllPredecessors(currentNodeId);
    allPredecessors.forEach((node) => {
      const nodeId = node.id;
      stepContext.steps[nodeId] = {};
      const stepResult = this.workflowExecutionRuntime.getStepResult(nodeId);
      if (stepResult) {
        stepContext.steps[nodeId] = {
          ...stepContext.steps[nodeId],
          ...stepResult,
        };
      }

      const stepState = this.workflowExecutionRuntime.getStepState(nodeId);
      if (stepState) {
        stepContext.steps[nodeId] = {
          ...stepContext.steps[nodeId],
          ...stepState,
        };
      }
    });

    this.enrichStepContextAccordingToStepScope(stepContext);
    this.enrichStepContextWithMockedData(stepContext);
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
          stepContext.foreach = this.workflowExecutionRuntime.getStepState(nodeId) as any;
          break;
      }
    }
  }

  private enrichStepContextWithMockedData(stepContext: StepContext): void {
    const stepContextMock: StepContext | undefined =
      this.workflowExecutionRuntime.getWorkflowExecution().context?.stepContextMock;

    if (stepContextMock) {
      stepContextMock.execution = {
        ...stepContextMock.execution,
        ...(stepContextMock.execution || {}),
      };

      stepContextMock.workflow = {
        ...stepContextMock.workflow,
        ...(stepContextMock.workflow || {}),
      };

      if (!stepContextMock.foreach) {
        stepContextMock.foreach = stepContextMock.foreach;
      }

      Object.entries(stepContextMock.steps || {}).forEach(([stepId, stepData]) => {
        if (!stepContext.steps[stepId]) {
          stepContext.steps[stepId] = stepData;
        }
      });
    }
  }
}
