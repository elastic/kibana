/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  DEFAULT_WAIT_FOR_APPROVAL_APPROVE_LABEL,
  DEFAULT_WAIT_FOR_APPROVAL_REJECT_LABEL,
  WAIT_FOR_APPROVAL_RESPONSE_SCHEMA,
} from '@kbn/workflows';
import type { WaitForApprovalGraphNode } from '@kbn/workflows/graph';
import type { StepExecutionRuntime } from '../../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../workflow_event_logger';
import type { NodeImplementation } from '../node_implementation';
import {
  resumeHitlWaitStep,
  shouldSkipHitlWaitEntry,
  tryEnterHitlWait,
} from '../wait_for_input_step/hitl_wait_helpers';

export class WaitForApprovalStepImpl implements NodeImplementation {
  constructor(
    private node: WaitForApprovalGraphNode,
    private stepExecutionRuntime: StepExecutionRuntime,
    private workflowRuntime: WorkflowExecutionRuntimeManager,
    private workflowLogger: IWorkflowEventLogger
  ) {}

  async run(): Promise<void> {
    if (shouldSkipHitlWaitEntry(this.stepExecutionRuntime)) {
      this.workflowLogger.logDebug(
        `Step '${this.node.stepId}' run aborted before wait-entry; skipping`,
        { event: { action: 'hitl:aborted' } }
      );
      return;
    }

    if (tryEnterHitlWait(this.stepExecutionRuntime)) {
      await this.enterWait();
      return;
    }

    this.workflowLogger.logDebug(`Step '${this.node.stepId}' resuming with approval input`, {
      event: { action: 'hitl:resuming' },
    });
    this.resume();
  }

  private async enterWait(): Promise<void> {
    const withConfig = this.node.configuration?.with;
    const ctx = this.stepExecutionRuntime.contextManager;
    const approveLabel =
      withConfig?.approveLabel !== undefined
        ? ctx.renderValueAccordingToContext(withConfig.approveLabel)
        : DEFAULT_WAIT_FOR_APPROVAL_APPROVE_LABEL;
    const rejectLabel =
      withConfig?.rejectLabel !== undefined
        ? ctx.renderValueAccordingToContext(withConfig.rejectLabel)
        : DEFAULT_WAIT_FOR_APPROVAL_REJECT_LABEL;

    this.stepExecutionRuntime.setInput({
      ...(withConfig?.message !== undefined && {
        message: ctx.renderValueAccordingToContext(withConfig.message),
      }),
      approveLabel,
      rejectLabel,
      schema: WAIT_FOR_APPROVAL_RESPONSE_SCHEMA,
    });

    this.workflowLogger.logDebug(`Step '${this.node.stepId}' is waiting for approval`, {
      event: { action: 'hitl:waiting' },
    });
  }

  private resume(): void {
    resumeHitlWaitStep({
      stepExecutionRuntime: this.stepExecutionRuntime,
      workflowRuntime: this.workflowRuntime,
      workflowLogger: this.workflowLogger,
      stepId: this.node.stepId,
      transformResumeInput: (resumeInput, respondedBy) => {
        const approved = resumeInput?.approved;
        return {
          response: { approved: approved === true },
          respondedBy,
        };
      },
    });
  }
}
