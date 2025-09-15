/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ExitRetryNode } from '@kbn/workflows/graph';
import type { StepImplementation } from '../../step_base';
import type { WorkflowExecutionRuntimeManager } from '../../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../../workflow_event_logger/workflow_event_logger';

export class ExitRetryNodeImpl implements StepImplementation {
  constructor(
    private node: ExitRetryNode,
    private workflowRuntime: WorkflowExecutionRuntimeManager,
    private workflowLogger: IWorkflowEventLogger
  ) {}

  public async run(): Promise<void> {
    this.workflowRuntime.exitScope();
    await this.workflowRuntime.finishStep();
    const retryState = this.workflowRuntime.getCurrentStepState()!;
    this.workflowLogger.logDebug(
      `Exiting retry step ${this.node.stepId} after ${retryState.attempt} attempts.`
    );
    await this.workflowRuntime.setCurrentStepState(undefined);
    this.workflowRuntime.navigateToNextNode();
  }
}
