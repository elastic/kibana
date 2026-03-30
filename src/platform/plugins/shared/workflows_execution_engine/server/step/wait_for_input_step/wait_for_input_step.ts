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

export class WaitForInputStepImpl implements NodeImplementation {
  constructor(
    private node: WaitForInputGraphNode,
    private stepExecutionRuntime: StepExecutionRuntime,
    private workflowRuntime: WorkflowExecutionRuntimeManager,
    private workflowLogger: IWorkflowEventLogger
  ) {}

  async run(): Promise<void> {
    if (this.stepExecutionRuntime.tryEnterWaitUntil(undefined, ExecutionStatus.WAITING_FOR_INPUT)) {
      // Store step config as input so the record is self contained
      // consistent with every other step type & readable without a definition lookup
      const withConfig = this.node.configuration?.with;
      if (withConfig) {
        const ctx = this.stepExecutionRuntime.contextManager;
        this.stepExecutionRuntime.setInput({
          ...(withConfig.message !== undefined && {
            message: ctx.renderValueAccordingToContext(withConfig.message),
          }),
          ...(withConfig.schema !== undefined && { schema: withConfig.schema }),
        });
      }
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
    const resumeInput = context?.resumeInput as Record<string, unknown> | undefined;

    this.stepExecutionRuntime.finishStep(resumeInput);

    // Clear resumeInput so subsequent waitForInput steps are not auto-completed.
    if (context != null && typeof context === 'object' && 'resumeInput' in context) {
      const { resumeInput: _cleared, ...restContext } = context as Record<string, unknown>;
      this.stepExecutionRuntime.updateWorkflowExecution({ context: restContext });
    }

    this.workflowLogger.logDebug(`Step '${this.node.stepId}' resumed with human input`, {
      event: { action: 'hitl:resumed' },
    });

    this.workflowRuntime.navigateToNextNode();
  }
}
