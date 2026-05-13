/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ExitRetryNode } from '@kbn/workflows/graph';
import type { RetryStepState } from './types';
import type { IStepExecutionRuntime } from '@kbn/workflows-execution-engine-core';
import type { IWorkflowExecutionRuntimeManager } from '@kbn/workflows-execution-engine-core';
import type { IWorkflowEventLogger } from '@kbn/workflows-execution-engine-core';
import type { INodeImplementation } from '@kbn/workflows-execution-engine-core';

export class ExitRetryNodeImpl implements INodeImplementation {
  constructor(
    private node: ExitRetryNode,
    private stepExecutionRuntime: IStepExecutionRuntime,
    private workflowRuntime: IWorkflowExecutionRuntimeManager,
    private workflowLogger: IWorkflowEventLogger
  ) {}

  public async run(): Promise<void> {
    this.stepExecutionRuntime.finishStep();
    const retryState = this.stepExecutionRuntime.getCurrentStepState() as
      | RetryStepState
      | undefined;

    if (retryState) {
      this.workflowLogger.logDebug(
        `Exiting retry step ${this.node.stepId} after ${retryState.attempt} attempts.`
      );
    }

    this.stepExecutionRuntime.setCurrentStepState(undefined);
    this.workflowRuntime.navigateToNextNode();
  }
}
