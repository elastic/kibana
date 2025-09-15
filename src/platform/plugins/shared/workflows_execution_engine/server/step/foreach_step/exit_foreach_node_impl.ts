/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ExitForeachNode } from '@kbn/workflows/graph';
import type { StepImplementation } from '../step_base';
import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../workflow_event_logger/workflow_event_logger';

export class ExitForeachNodeImpl implements StepImplementation {
  constructor(
    private node: ExitForeachNode,
    private wfExecutionRuntimeManager: WorkflowExecutionRuntimeManager,
    private workflowLogger: IWorkflowEventLogger
  ) {}

  public async run(): Promise<void> {
    const foreachState = this.wfExecutionRuntimeManager.getCurrentStepState();

    if (!foreachState) {
      throw new Error(`Foreach state for step ${this.node.stepId} not found`);
    }
    // Exit the scope of the current iteration
    this.wfExecutionRuntimeManager.exitScope();

    if (foreachState.items[foreachState.index + 1]) {
      this.wfExecutionRuntimeManager.navigateToNode(this.node.startNodeId);
      return;
    }
    // All items have been processed, exit the foreach scope
    this.wfExecutionRuntimeManager.exitScope();
    await this.wfExecutionRuntimeManager.finishStep();
    this.workflowLogger.logDebug(
      `Exiting foreach step ${this.node.stepId} after processing all items.`,
      {
        workflow: { step_id: this.node.stepId },
      }
    );
    this.wfExecutionRuntimeManager.navigateToNextNode();
  }
}
