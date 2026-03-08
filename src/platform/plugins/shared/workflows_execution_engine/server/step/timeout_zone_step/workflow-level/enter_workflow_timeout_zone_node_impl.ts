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
import type { IWorkflowEventLogger } from '../../../workflow_event_logger';
import type { MonitorableNode, NodeImplementation } from '../../node_implementation';

export class EnterWorkflowTimeoutZoneNodeImpl implements NodeImplementation, MonitorableNode {
  constructor(
    private node: EnterTimeoutZoneNode,
    private wfExecutionRuntimeManager: WorkflowExecutionRuntimeManager,
    private stepExecutionRuntimeFactory: StepExecutionRuntimeFactory,
    private workflowLogger?: IWorkflowEventLogger
  ) {}

  public async run(): Promise<void> {
    this.wfExecutionRuntimeManager.navigateToNextNode();
  }

  public monitor(monitoredStepExecutionRuntime: StepExecutionRuntime): void {
    const timeoutMs = parseDuration(this.node.timeout);
    const workflowExecution = this.wfExecutionRuntimeManager.getWorkflowExecution();
    const whenStepStartedTime = new Date(workflowExecution.startedAt).getTime();
    const currentTimeMs = new Date().getTime();
    const currentStepDuration = currentTimeMs - whenStepStartedTime;

    if (currentStepDuration > timeoutMs) {
      const elapsedSeconds = Math.round(currentStepDuration / 1000);
      const currentNodeId = monitoredStepExecutionRuntime.node?.id;
      const currentStepId = monitoredStepExecutionRuntime.node?.stepId;

      const timeoutError = new Error(
        `Failed due to workflow timeout: execution exceeded the configured timeout of ${this.node.timeout} ` +
          `(elapsed: ${elapsedSeconds}s). Timed out at step '${currentStepId ?? currentNodeId ?? 'unknown'}' ` +
          `at ${new Date(currentTimeMs).toISOString()}.`
      );

      this.workflowLogger?.logError(
        `Workflow timed out after ${elapsedSeconds}s (configured timeout: ${this.node.timeout})`,
        {
          event: {
            action: 'workflow-timeout',
            category: ['workflow'],
            outcome: 'failure',
          },
          tags: ['workflow', 'execution', 'timeout'],
          workflow: {
            execution_id: workflowExecution.id,
            current_step: currentStepId ?? currentNodeId,
            timeout_configured: this.node.timeout,
            elapsed_seconds: elapsedSeconds,
          },
        }
      );

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

      // Erase error because otherwise execution will be marked "failed"
      this.wfExecutionRuntimeManager.setWorkflowError(undefined);
      this.wfExecutionRuntimeManager.markWorkflowTimeouted();
    }
  }
}
