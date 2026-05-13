/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EnterTryBlockNode } from '@kbn/workflows/graph';
import type { IStepExecutionRuntime } from '@kbn/workflows-execution-engine-core';
import type { IWorkflowExecutionRuntimeManager } from '@kbn/workflows-execution-engine-core';
import type { INodeImplementation, INodeWithErrorCatching } from '@kbn/workflows-execution-engine-core';

export class EnterTryBlockNodeImpl implements INodeImplementation, INodeWithErrorCatching {
  constructor(
    private node: EnterTryBlockNode,
    private stepExecutionRuntime: IStepExecutionRuntime,
    private wfExecutionRuntimeManager: IWorkflowExecutionRuntimeManager
  ) {}

  public run(): void {
    this.stepExecutionRuntime.startStep();
    this.wfExecutionRuntimeManager.navigateToNode(this.node.enterNormalPathNodeId);
  }

  catchError(): void {
    this.stepExecutionRuntime.stepLogger.logError(
      'Error caught by the OnFailure zone. Redirecting to the fallback path'
    );
    const stepState = this.stepExecutionRuntime.getCurrentStepState() || {};

    if (!stepState.isFallbackExecuted) {
      this.stepExecutionRuntime.setCurrentStepState({
        ...stepState,
        isFallbackExecuted: true,
        error: this.wfExecutionRuntimeManager.getWorkflowExecution().error, // save error to the state of the enter node
      });
      this.wfExecutionRuntimeManager.setWorkflowError(undefined); // clear workflow error to let run go
      this.wfExecutionRuntimeManager.navigateToNode(this.node.enterFallbackPathNodeId);
    }
  }
}
