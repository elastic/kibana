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
import { graphlib } from '@dagrejs/dagre';
import { RunStepResult } from '../step/step_base';
import { WorkflowExecutionRuntimeManager } from './workflow_execution_runtime_manager';

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
  workflowExecutionGraph: graphlib.Graph;
  workflowState: WorkflowExecutionRuntimeManager;
}

export class WorkflowContextManager {
  private context: Record<string, any>; // Make it strongly typed
  private esClient: IScopedClusterClient;
  private workflowExecutionGraph: graphlib.Graph;
  private workflowState: WorkflowExecutionRuntimeManager;

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
    this.workflowExecutionGraph = init.workflowExecutionGraph;
    this.workflowState = init.workflowState;
  }

  private createEsClient(apiKey: string): IScopedClusterClient {
    return {} as IScopedClusterClient; // Placeholder
  }

  public getEsClient(): IScopedClusterClient {
    return this.esClient;
  }

  public getContext(): Record<string, any> {
    const stepContex: Record<string, any> = {
      ...this.context,
    };

    const visited = new Set<string>();
    const collectPredecessors = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      stepContex[nodeId] = {};
      const stepResult = this.workflowState.getStepResult(nodeId);
      if (stepResult) {
        stepContex[nodeId] = stepResult.output;
      }

      const stepState = this.workflowState.getStepState(nodeId);
      if (stepState) {
        stepContex[nodeId] = stepState;
      }

      const preds = this.workflowExecutionGraph.predecessors(nodeId) || [];
      preds.forEach((predId) => collectPredecessors(predId));
    };

    const currentNodeId = this.workflowState.getCurrentStep()?.id;
    const directPredecessors = this.workflowExecutionGraph.predecessors(currentNodeId) || [];
    directPredecessors.forEach((nodeId) => collectPredecessors(nodeId));

    return stepContex;
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
}
