/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreStart, KibanaRequest } from '@kbn/core/server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { StackFrame } from '@kbn/workflows';
import type { WorkflowGraph } from '@kbn/workflows/graph';
import { StepExecutionRuntime } from './step_execution_runtime';
import type { ContextDependencies } from './types';
import { WorkflowContextManager } from './workflow_context_manager';
import type { WorkflowExecutionState } from './workflow_execution_state';
import { WorkflowTemplatingEngine } from '../templating_engine';
import { buildStepExecutionId } from '../utils';
import type { IWorkflowEventLogger } from '../workflow_event_logger/workflow_event_logger';

/**
 * Factory class responsible for creating StepExecutionRuntime instances.
 *
 * This class separates the step execution runtime initialization logic from the
 * step execution runtime itself, providing a clean abstraction for runtime creation.
 * It encapsulates the complex setup required for step execution including workflow state,
 * graph navigation, logging, and context management.
 *
 * @example
 * ```typescript
 * const factory = new StepExecutionRuntimeFactory({
 *   workflowExecutionState,
 *   workflowExecutionGraph,
 *   workflowLogger,
 *   esClient,
 *   fakeRequest,
 *   coreStart
 * });
 *
 * const runtime = factory.createStepExecutionRuntime({
 *   node: graphNode,
 *   stackFrames: currentStackFrames
 * });
 * ```
 */
export class StepExecutionRuntimeFactory {
  constructor(
    private params: {
      workflowExecutionState: WorkflowExecutionState;
      workflowExecutionGraph: WorkflowGraph;
      workflowLogger: IWorkflowEventLogger;
      esClient: ElasticsearchClient; // ES client (user-scoped if available, fallback otherwise)
      fakeRequest?: KibanaRequest;
      coreStart?: CoreStart;
      dependencies: ContextDependencies;
    }
  ) {}

  createStepExecutionRuntime({
    nodeId,
    stackFrames,
  }: {
    nodeId: string;
    stackFrames: StackFrame[];
  }): StepExecutionRuntime {
    const node = this.params.workflowExecutionGraph.getNode(nodeId);
    const workflowExecution = this.params.workflowExecutionState.getWorkflowExecution();
    const stepExecutionId = buildStepExecutionId(workflowExecution.id, node.stepId, stackFrames);

    const stepLogger = this.params.workflowLogger.createStepLogger(
      stepExecutionId,
      node.stepId,
      node.stepId,
      node.stepType
    );
    const contextManager = new WorkflowContextManager({
      templateEngine: new WorkflowTemplatingEngine(),
      workflowExecutionGraph: this.params.workflowExecutionGraph,
      workflowExecutionState: this.params.workflowExecutionState,
      node,
      stackFrames,
      esClient: this.params.esClient,
      fakeRequest: this.params.fakeRequest,
      coreStart: this.params.coreStart,
      dependencies: this.params.dependencies,
    });
    return new StepExecutionRuntime({
      stepExecutionId,
      workflowExecutionGraph: this.params.workflowExecutionGraph,
      workflowExecutionState: this.params.workflowExecutionState,
      stepLogger,
      stackFrames,
      node,
      contextManager,
    });
  }
}
