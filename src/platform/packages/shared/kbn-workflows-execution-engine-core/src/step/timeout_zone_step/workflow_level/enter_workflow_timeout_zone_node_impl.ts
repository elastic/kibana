/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EnterTimeoutZoneNode } from '@kbn/workflows/graph';
import { ExecutionError } from '@kbn/workflows/server';
import { parseDuration } from '@kbn/workflows-execution-engine-utils';
import type { IStepExecutionRuntime } from '@kbn/workflows-execution-engine-core';
import type { IStepExecutionRuntimeFactory } from '@kbn/workflows-execution-engine-core';
import type { IWorkflowExecutionRuntimeManager } from '@kbn/workflows-execution-engine-core';
import type { IMonitorableNode, INodeImplementation } from '@kbn/workflows-execution-engine-core';

export class EnterWorkflowTimeoutZoneNodeImpl implements INodeImplementation, IMonitorableNode {
  constructor(
    private node: EnterTimeoutZoneNode,
    private wfExecutionRuntimeManager: IWorkflowExecutionRuntimeManager,
    private stepExecutionRuntimeFactory: IStepExecutionRuntimeFactory
  ) {}

  public async run(): Promise<void> {
    this.wfExecutionRuntimeManager.navigateToNextNode();
  }

  public monitor(monitoredStepExecutionRuntime: IStepExecutionRuntime): void {
    const timeoutMs = parseDuration(this.node.timeout);
    const whenStepStartedTime = new Date(
      this.wfExecutionRuntimeManager.getWorkflowExecution().startedAt
    ).getTime();
    const currentTimeMs = new Date().getTime();
    const currentStepDuration = currentTimeMs - whenStepStartedTime;

    if (currentStepDuration > timeoutMs) {
      const timeoutError = new ExecutionError({
        type: 'TimeoutError',
        message: 'Failed due to workflow timeout',
      });
      monitoredStepExecutionRuntime.abortController.abort();
      monitoredStepExecutionRuntime.failStep(timeoutError);

      let stack = monitoredStepExecutionRuntime.scopeStack;

      while (!stack.isEmpty()) {
        const currentScope = stack.getCurrentScope();
        stack = stack.exitScope();
        const scopeStepExecutionRuntime =
          this.stepExecutionRuntimeFactory.createStepExecutionRuntime({
            nodeId: currentScope.nodeId,
            stackFrames: stack.stackFrames,
          });

        if (scopeStepExecutionRuntime.stepExecution) {
          scopeStepExecutionRuntime.failStep(timeoutError);
        }
      }

      // Errase error because otherwise execution will be marked "failed"
      this.wfExecutionRuntimeManager.setWorkflowError(undefined);
      this.wfExecutionRuntimeManager.markWorkflowTimeouted();
    }
  }
}
