/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ExitTryBlockNode } from '@kbn/workflows/graph';
import type { StepImplementation } from '../../step_base';
import type { WorkflowExecutionRuntimeManager } from '../../../workflow_context_manager/workflow_execution_runtime_manager';

export class ExitTryBlockNodeImpl implements StepImplementation {
  constructor(
    private node: ExitTryBlockNode,
    private wfExecutionRuntimeManager: WorkflowExecutionRuntimeManager
  ) {}

  public async run(): Promise<void> {
    const stepState = this.wfExecutionRuntimeManager.getCurrentStepState() || {};

    if (stepState.error) {
      // if error is in state, that means failure path was executed
      // and we have to throw error
      await this.wfExecutionRuntimeManager.failStep(stepState.error);
      this.wfExecutionRuntimeManager.setWorkflowError(stepState.error);
      return;
    }

    await this.wfExecutionRuntimeManager.finishStep();
    this.wfExecutionRuntimeManager.exitScope();
    this.wfExecutionRuntimeManager.navigateToNextNode();
  }
}
