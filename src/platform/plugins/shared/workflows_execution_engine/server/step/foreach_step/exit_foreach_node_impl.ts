/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ExitForeachNode } from '@kbn/workflows/graph';
import type { ForeachStepState } from './types';
import type { StepExecutionRuntime } from '../../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../workflow_event_logger';
import type { NodeImplementation } from '../node_implementation';

export class ExitForeachNodeImpl implements NodeImplementation {
  constructor(
    private node: ExitForeachNode,
    private stepExecutionRuntime: StepExecutionRuntime,
    private wfExecutionRuntimeManager: WorkflowExecutionRuntimeManager,
    private workflowLogger: IWorkflowEventLogger
  ) {}

  public run(): void {
    const foreachState = this.stepExecutionRuntime.getCurrentStepState() as
      | ForeachStepState
      | undefined;

    if (!foreachState) {
      throw new Error(`Foreach state for step ${this.node.stepId} not found`);
    }

    const nextIndex = foreachState.index + 1;
    const hasMoreItems = nextIndex < foreachState.total;
    const maxReached =
      this.node.maxIterations !== undefined && nextIndex >= this.node.maxIterations;

    if (hasMoreItems && !maxReached) {
      this.wfExecutionRuntimeManager.navigateToNode(this.node.startNodeId);
      return;
    }

    if (maxReached && hasMoreItems && this.node.onLimit === 'fail') {
      throw new Error(
        `Foreach step "${this.node.stepId}" exceeded max-iterations limit of ${this.node.maxIterations}. ` +
          `Processed ${nextIndex} of ${foreachState.total} items.`
      );
    }

    this.stepExecutionRuntime.finishStep();

    const reason =
      maxReached && hasMoreItems
        ? `reached max-iterations limit of ${this.node.maxIterations}`
        : 'processing all items';
    this.workflowLogger.logDebug(
      `Exiting foreach step "${this.node.stepId}" after ${reason}. ` +
        `Processed ${nextIndex} of ${foreachState.total} items.`,
      { workflow: { step_id: this.node.stepId } }
    );
    this.wfExecutionRuntimeManager.navigateToNextNode();
  }
}
