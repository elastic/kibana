/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { StepExecutionRuntime } from '../../../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../../../workflow_context_manager/workflow_execution_runtime_manager';
import type { NodeImplementation } from '../../node_implementation';

export class ExitTryBlockNodeImpl implements NodeImplementation {
  constructor(
    private stepExecutionRuntime: StepExecutionRuntime,
    private wfExecutionRuntimeManager: WorkflowExecutionRuntimeManager
  ) {}

  public async run(): Promise<void> {
    const stepState = this.stepExecutionRuntime.getCurrentStepState() || {};

    if (stepState.error) {
      // if error is in state, that means failure path was executed
      // and we have to throw error
      this.stepExecutionRuntime.failStep(stepState.error);
      this.wfExecutionRuntimeManager.setWorkflowError(stepState.error);
      return;
    }

    this.stepExecutionRuntime.finishStep();
    this.wfExecutionRuntimeManager.navigateToNextNode();
  }
}
