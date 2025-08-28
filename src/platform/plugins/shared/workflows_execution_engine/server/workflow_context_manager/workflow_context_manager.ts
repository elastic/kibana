/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { graphlib } from '@dagrejs/dagre';
import type { WorkflowContext, WorkflowSchema } from '@kbn/workflows';
import type { z } from '@kbn/zod';
import type { ElasticsearchClient } from '@elastic/elasticsearch';
import type { KibanaRequest, CoreStart } from '@kbn/core/server';
import type { WorkflowExecutionRuntimeManager } from './workflow_execution_runtime_manager';

export interface ContextManagerInit {
  spaceId: string;
  workflow: z.infer<typeof WorkflowSchema>;
  event: any;
  // New properties for logging
  workflowExecutionGraph: graphlib.Graph;
  workflowExecutionRuntime: WorkflowExecutionRuntimeManager;
  // New properties for internal actions
  esClient: ElasticsearchClient; // ES client (user-scoped if available, fallback otherwise)
  fakeRequest?: KibanaRequest;
  coreStart?: CoreStart; // For using Kibana's internal HTTP client
}

export class WorkflowContextManager {
  // 'now' will be added by the templating engine
  private context: Omit<WorkflowContext, 'now'>;
  private workflowExecutionGraph: graphlib.Graph;
  private workflowExecutionRuntime: WorkflowExecutionRuntimeManager;
  private esClient: ElasticsearchClient;
  private fakeRequest?: KibanaRequest;
  private coreStart?: CoreStart;

  constructor(init: ContextManagerInit) {
    this.context = {
      spaceId: init.spaceId,
      event: init.event,
      consts: init.workflow.consts || {},
      steps: {},
    } as Partial<typeof this.context> as WorkflowContext;

    this.workflowExecutionGraph = init.workflowExecutionGraph;
    this.workflowExecutionRuntime = init.workflowExecutionRuntime;
    this.esClient = init.esClient;
    this.fakeRequest = init.fakeRequest;
    this.coreStart = init.coreStart;
  }

  public getContext() {
    const stepContext: WorkflowContext = {
      ...this.context,
      workflowRunId: this.workflowExecutionRuntime.getWorkflowExecution().id,
    };

    const visited = new Set<string>();
    const collectPredecessors = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

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

      const preds = this.workflowExecutionGraph.predecessors(nodeId) || [];
      preds.forEach((predId) => collectPredecessors(predId));
    };

    const currentNode = this.workflowExecutionRuntime.getCurrentStep();
    const currentNodeId = currentNode?.id ?? currentNode?.name;
    const directPredecessors = this.workflowExecutionGraph.predecessors(currentNodeId) || [];
    directPredecessors.forEach((nodeId) => collectPredecessors(nodeId));

    return this.enrichContextAccordingToScope(stepContext);
  }

  public getContextKey(key: string): any {
    return this.context[key as keyof typeof this.context];
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

  private enrichContextAccordingToScope(stepContext: WorkflowContext): WorkflowContext {
    for (const nodeId of this.workflowExecutionRuntime.getWorkflowExecution().stack) {
      const node = this.workflowExecutionGraph.node(nodeId) as any;
      const nodeType = node?.type;
      switch (nodeType) {
        case 'enter-foreach':
          stepContext.foreach = this.workflowExecutionRuntime.getStepState(nodeId) as any;
          break;
      }
    }

    return stepContext;
  }
}
