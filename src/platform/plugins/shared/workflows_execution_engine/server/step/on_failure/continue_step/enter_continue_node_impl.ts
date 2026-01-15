/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EnterContinueNode } from '@kbn/workflows/graph';
import type { StepExecutionRuntime } from '../../../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../../workflow_event_logger';
import type { NodeImplementation, NodeWithErrorCatching } from '../../node_implementation';

export class EnterContinueNodeImpl implements NodeImplementation, NodeWithErrorCatching {
  constructor(
    private node: EnterContinueNode,
    private workflowRuntime: WorkflowExecutionRuntimeManager,
    private workflowLogger: IWorkflowEventLogger
  ) {}

  public run(): void {
    this.workflowRuntime.navigateToNextNode();
  }

  public catchError(failedContext: StepExecutionRuntime): void {
    const shouldContinue = failedContext.contextManager.evaluateBooleanExpressionInContext(
      this.node.configuration.condition,
      {
        error: failedContext.stepExecution?.error,
      }
    );

    if (!shouldContinue) {
      this.workflowLogger.logDebug(`Condition for continue step not met, propagating error.`);
      return;
    }

    this.workflowLogger.logDebug(`Error caught, continuing execution.`);
    // Continue step should always go to exit continue node to continue execution
    // regardless of any errors that occurred within its scope
    this.workflowRuntime.navigateToNode(this.node.exitNodeId);
    this.workflowRuntime.setWorkflowError(undefined);
  }
}
