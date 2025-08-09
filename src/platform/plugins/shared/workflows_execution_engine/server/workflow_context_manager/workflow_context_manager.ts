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
import { WorkflowExecutionRuntimeManager } from './workflow_execution_runtime_manager';

export interface ContextManagerInit {
  workflowRunId: string;
  workflow: z.infer<typeof WorkflowSchema>;
  event: any;
  // New properties for logging
  logger?: Logger;
  workflowEventLoggerIndex?: string;
  esClient?: ElasticsearchClient;
  workflowExecutionGraph: graphlib.Graph;
  workflowExecutionRuntime: WorkflowExecutionRuntimeManager;
}

export class WorkflowContextManager {
  private context: Record<string, any>; // Make it strongly typed
  private workflowExecutionGraph: graphlib.Graph;
  private workflowExecutionRuntime: WorkflowExecutionRuntimeManager;

  constructor(init: ContextManagerInit) {
    this.context = {
      workflowRunId: init.workflowRunId,
      workflow: init.workflow,
      event: init.event,
      consts: init.workflow.consts || {},
    };

    this.workflowExecutionGraph = init.workflowExecutionGraph;
    this.workflowExecutionRuntime = init.workflowExecutionRuntime;
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
}
