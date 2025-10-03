/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { GraphNodeUnion, WorkflowGraph } from '@kbn/workflows/graph';
import type { CoreStart } from '@kbn/core/server';
import type { KibanaRequest } from '@kbn/core/server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { StackFrame } from '@kbn/workflows';
import { buildStepExecutionId } from '../utils';
import { StepExecutionRuntime } from './step_execution_runtime';
import type { WorkflowExecutionState } from './workflow_execution_state';
import type { IWorkflowEventLogger } from '../workflow_event_logger/workflow_event_logger';
import { WorkflowContextManager } from './workflow_context_manager';

export function createStepExecutionRuntime({
  node,
  stackFrames,
  workflowExecutionGraph,
  workflowExecutionState,
  workflowLogger,
  esClient,
  fakeRequest,
  coreStart,
}: {
  node: GraphNodeUnion;
  stackFrames: StackFrame[];
  workflowExecutionState: WorkflowExecutionState;
  workflowExecutionGraph: WorkflowGraph;
  workflowLogger: IWorkflowEventLogger;
  esClient: ElasticsearchClient; // ES client (user-scoped if available, fallback otherwise)
  fakeRequest?: KibanaRequest;
  coreStart?: CoreStart; // For using Kibana's internal HTTP client
}): StepExecutionRuntime {
  const workflowExecution = workflowExecutionState.getWorkflowExecution();
  const stepExecutionId = buildStepExecutionId(workflowExecution.id, node.stepId, stackFrames);

  const stepLogger = workflowLogger.createStepLogger(
    stepExecutionId,
    node.stepId,
    node.stepId,
    node.stepType
  );
  const contextManager = new WorkflowContextManager({
    workflowExecutionGraph,
    workflowExecutionState,
    node,
    stackFrames,
    esClient,
    fakeRequest,
    coreStart,
  });
  return new StepExecutionRuntime({
    stepExecutionId,
    workflowExecutionGraph,
    workflowExecutionState,
    stepLogger,
    stackFrames,
    node,
    contextManager,
  });
}
