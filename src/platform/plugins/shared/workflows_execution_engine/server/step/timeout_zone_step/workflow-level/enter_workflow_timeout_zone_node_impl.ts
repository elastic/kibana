/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EnterTimeoutZoneNode } from '@kbn/workflows/graph';
import { parseDuration } from '../../../utils';
import type { StepExecutionRuntime } from '../../../workflow_context_manager/step_execution_runtime';
import type { StepExecutionRuntimeFactory } from '../../../workflow_context_manager/step_execution_runtime_factory';
import type { WorkflowExecutionRuntimeManager } from '../../../workflow_context_manager/workflow_execution_runtime_manager';
import type { MonitorableNode, NodeImplementation } from '../../node_implementation';

export class EnterWorkflowTimeoutZoneNodeImpl implements NodeImplementation, MonitorableNode {
  constructor(
    private node: EnterTimeoutZoneNode,
    private wfExecutionRuntimeManager: WorkflowExecutionRuntimeManager,
    private stepExecutionRuntimeFactory: StepExecutionRuntimeFactory
  ) {}

  public async run(): Promise<void> {
    this.wfExecutionRuntimeManager.navigateToNextNode();
  }

  public monitor(monitoredStepExecutionRuntime: StepExecutionRuntime): void {
    const timeoutMs = parseDuration(this.node.timeout);
    const whenStepStartedTime = new Date(
      this.wfExecutionRuntimeManager.getWorkflowExecution().startedAt
    ).getTime();
    const currentTimeMs = new Date().getTime();
    const currentStepDuration = currentTimeMs - whenStepStartedTime;

    if (currentStepDuration > timeoutMs) {
      const timeoutError = new Error('Failed due to workflow timeout');
      monitoredStepExecutionRuntime.abortController.abort();
      monitoredStepExecutionRuntime.failStep(timeoutError);

      let stack = monitoredStepExecutionRuntime.scopeStack;

      while (!stack.isEmpty()) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const currentScope = stack.getCurrentScope()!;
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
