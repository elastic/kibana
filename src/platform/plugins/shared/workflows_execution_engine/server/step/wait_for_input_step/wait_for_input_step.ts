/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExecutionStatus } from '@kbn/workflows';
import type { WaitForInputGraphNode } from '@kbn/workflows/graph';
import type { StepExecutionRuntime } from '../../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../workflow_event_logger';
import type { NodeImplementation } from '../node_implementation';

/** 100 years in the future — effectively indefinite until a human provides input. */
const FAR_FUTURE_MS = 100 * 365 * 24 * 60 * 60 * 1000;

export class WaitForInputStepImpl implements NodeImplementation {
  constructor(
    private node: WaitForInputGraphNode,
    private stepExecutionRuntime: StepExecutionRuntime,
    private workflowRuntime: WorkflowExecutionRuntimeManager,
    private workflowLogger: IWorkflowEventLogger
  ) {}

  async run(): Promise<void> {
    const farFuture = new Date(Date.now() + FAR_FUTURE_MS);

    if (this.stepExecutionRuntime.tryEnterWaitUntil(farFuture, ExecutionStatus.WAITING_FOR_INPUT)) {
      this.workflowLogger.logDebug(`Step '${this.node.stepId}' is waiting for human input`, {
        event: { action: 'hitl:waiting' },
      });
      return;
    }

    this.workflowLogger.logDebug(`Step '${this.node.stepId}' resuming with human input`, {
      event: { action: 'hitl:resuming' },
    });
    this.resume();
  }

  private resume(): void {
    const context = this.workflowRuntime.getWorkflowExecution().context;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const resumeInput = context?.resumeInput as Record<string, any> | undefined;

    this.stepExecutionRuntime.finishStep(resumeInput);

    // Clear resumeInput so subsequent waitForInput steps are not auto-completed.
    const { resumeInput: _cleared, ...restContext } = context ?? {};
    this.stepExecutionRuntime.updateWorkflowExecution({ context: restContext });

    this.workflowLogger.logDebug(`Step '${this.node.stepId}' resumed with human input`, {
      event: { action: 'hitl:resumed' },
    });

    this.workflowRuntime.navigateToNextNode();
  }
}
