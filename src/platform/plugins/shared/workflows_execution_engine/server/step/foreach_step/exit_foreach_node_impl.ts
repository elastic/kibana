/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ExitForeachNode } from '@kbn/workflows';
import type { StepImplementation } from '../step_base';
import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../workflow_event_logger/workflow_event_logger';

export class ExitForeachNodeImpl implements StepImplementation {
  constructor(
    private step: ExitForeachNode,
    private wfExecutionRuntimeManager: WorkflowExecutionRuntimeManager,
    private workflowLogger: IWorkflowEventLogger
  ) {}

  public async run(): Promise<void> {
    const foreachState = this.wfExecutionRuntimeManager.getStepState(this.step.startNodeId);

    if (!foreachState) {
      throw new Error(`Foreach state for step ${this.step.startNodeId} not found`);
    }
    // Exit the scope of the current iteration
    this.wfExecutionRuntimeManager.exitScope();

    if (foreachState.items[foreachState.index + 1]) {
      this.wfExecutionRuntimeManager.goToStep(this.step.startNodeId);
      return;
    }
    // All items have been processed, exit the foreach scope
    this.wfExecutionRuntimeManager.exitScope();
    await this.wfExecutionRuntimeManager.setStepState(this.step.startNodeId, undefined);
    await this.wfExecutionRuntimeManager.finishStep(this.step.startNodeId);
    this.workflowLogger.logDebug(
      `Exiting foreach step ${this.step.startNodeId} after processing all items.`,
      {
        workflow: { step_id: this.step.startNodeId },
      }
    );
    this.wfExecutionRuntimeManager.goToNextStep();
  }
}
