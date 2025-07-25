/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExitForeachNode } from '@kbn/workflows';
import { StepImplementation } from '../step_base';
import { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';

export class ExitForeachNodeImpl implements StepImplementation {
  constructor(
    private step: ExitForeachNode,
    private workflowState: WorkflowExecutionRuntimeManager
  ) {}

  public async run(): Promise<void> {
    const foreachState = this.workflowState.getStepState(this.step.startNodeId);

    if (!foreachState) {
      const error = new Error(`Foreach state for step ${this.step.startNodeId} not found`);
      await this.workflowState.setStepResult(this.step.startNodeId, {
        output: null,
        error,
      });
      await this.workflowState.finishStep(this.step.startNodeId);
      return;
    }

    if (foreachState.items[foreachState.index + 1]) {
      this.workflowState.goToStep(this.step.startNodeId);
      return;
    }

    await this.workflowState.setStepState(this.step.startNodeId, undefined);
    await this.workflowState.finishStep(this.step.startNodeId);
    this.workflowState.goToNextStep();
  }
}
