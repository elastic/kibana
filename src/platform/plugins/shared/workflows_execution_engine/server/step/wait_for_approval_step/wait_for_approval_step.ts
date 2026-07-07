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
  DEFAULT_WAIT_FOR_APPROVAL_TIMEOUT,
  HITL_TOKEN_EXPIRES_AT_INPUT_FIELD,
  HITL_TOKEN_HASH_INPUT_FIELD,
  isHitlExternalResumeEnabled,
  WAIT_FOR_APPROVAL_RESPONSE_SCHEMA,
} from '@kbn/workflows';
import type { WaitForApprovalGraphNode } from '@kbn/workflows/graph';
import { ExecutionError } from '@kbn/workflows/server';
import type { ConnectorExecutor } from '../../connector_executor';
import { getKibanaUrl } from '../../utils/get_kibana_url';
import type { StepExecutionRuntime } from '../../workflow_context_manager/step_execution_runtime';
import type { ContextDependencies } from '../../workflow_context_manager/types';
import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../workflow_event_logger';
import { hasExternalHitlChannels } from '../hitl_notifications/has_external_hitl_channels';
import {
  buildWaitForApprovalResumeLinks,
  sendWaitForApprovalNotifications,
} from '../hitl_notifications/send_wait_for_approval_notifications';
import type { CancellableNode, NodeImplementation } from '../node_implementation';
import {
  invalidateHitlExternalResumeTokenIfPresent,
  mintHitlExternalResumeToken,
} from '../wait_for_input_step/hitl_external_resume_helpers';
import { hasHitlWaitExpired } from '../wait_for_input_step/hitl_timeout_helpers';
import {
  resumeHitlWaitStep,
  shouldSkipHitlWaitEntry,
  tryEnterHitlWait,
} from '../wait_for_input_step/hitl_wait_helpers';

export class WaitForApprovalStepImpl implements NodeImplementation, CancellableNode {
  constructor(
    private node: WaitForApprovalGraphNode,
    private stepExecutionRuntime: StepExecutionRuntime,
    private workflowRuntime: WorkflowExecutionRuntimeManager,
    private workflowLogger: IWorkflowEventLogger,
    private connectorExecutor: ConnectorExecutor,
    private dependencies: ContextDependencies
  ) {}

  async onCancel(): Promise<void> {
    invalidateHitlExternalResumeTokenIfPresent(this.stepExecutionRuntime);
  }

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
    await this.resume();
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
    const message =
      withConfig?.message !== undefined
        ? String(ctx.renderValueAccordingToContext(withConfig.message))
        : '';

    const stepInput: Record<string, unknown> = {
      ...(message.length > 0 && { message }),
      approveLabel,
      rejectLabel,
      schema: WAIT_FOR_APPROVAL_RESPONSE_SCHEMA,
    };

    const channels = withConfig?.channels;
    if (
      hasExternalHitlChannels(channels) &&
      isHitlExternalResumeEnabled(this.dependencies.config?.hitlExternalResume?.enabled)
    ) {
      const execution = this.workflowRuntime.getWorkflowExecution();
      const spaceId = this.dependencies.spaceId ?? execution.spaceId;
      if (!spaceId) {
        throw new Error('External approval notifications require a space');
      }

      const timeout = this.node.configuration.timeout ?? DEFAULT_WAIT_FOR_APPROVAL_TIMEOUT;
      const resumeToken = mintHitlExternalResumeToken({
        stepExecutionRuntime: this.stepExecutionRuntime,
        execution,
        timeout,
      });

      stepInput[HITL_TOKEN_HASH_INPUT_FIELD] = resumeToken.tokenHash;
      stepInput[HITL_TOKEN_EXPIRES_AT_INPUT_FIELD] = resumeToken.expiresAt;
      this.stepExecutionRuntime.setInput(stepInput);

      await this.sendExternalNotifications({
        channels,
        message,
        approveLabel,
        rejectLabel,
        token: resumeToken.token,
        execution,
        spaceId,
      });
    }

    this.stepExecutionRuntime.setInput(stepInput);

    this.workflowLogger.logDebug(`Step '${this.node.stepId}' is waiting for approval`, {
      event: { action: 'hitl:waiting' },
    });
  }

  private async sendExternalNotifications({
    channels,
    message,
    approveLabel,
    rejectLabel,
    token,
    execution,
    spaceId,
  }: {
    channels: NonNullable<
      NonNullable<WaitForApprovalGraphNode['configuration']['with']>['channels']
    >;
    message: string;
    approveLabel: string;
    rejectLabel: string;
    token: string;
    execution: ReturnType<WorkflowExecutionRuntimeManager['getWorkflowExecution']>;
    spaceId: string;
  }): Promise<void> {
    const resumeLinks = buildWaitForApprovalResumeLinks({
      kibanaUrl: getKibanaUrl(this.dependencies.coreStart, this.dependencies.cloudSetup),
      spaceId,
      executionId: execution.id,
      stepId: this.stepExecutionRuntime.stepExecutionId,
      token,
    });

    await sendWaitForApprovalNotifications({
      channels,
      message,
      approveLabel,
      rejectLabel,
      resumeLinks,
      connectorExecutor: this.connectorExecutor,
      abortController: this.stepExecutionRuntime.abortController,
    });
  }

  private async resume(): Promise<void> {
    const execution = this.workflowRuntime.getWorkflowExecution();
    const resumeInput = execution.context?.resumeInput as Record<string, unknown> | undefined;

    const timeout = this.node.configuration.timeout ?? DEFAULT_WAIT_FOR_APPROVAL_TIMEOUT;
    const startedAt = this.stepExecutionRuntime.stepExecution?.startedAt;

    if (resumeInput == null && hasHitlWaitExpired(startedAt, timeout)) {
      invalidateHitlExternalResumeTokenIfPresent(this.stepExecutionRuntime);
      this.stepExecutionRuntime.failStep(
        new ExecutionError({
          type: 'TimeoutError',
          message: `Approval wait exceeded the configured timeout of ${timeout}.`,
        })
      );
      return;
    }

    invalidateHitlExternalResumeTokenIfPresent(this.stepExecutionRuntime);

    resumeHitlWaitStep({
      stepExecutionRuntime: this.stepExecutionRuntime,
      workflowRuntime: this.workflowRuntime,
      workflowLogger: this.workflowLogger,
      stepId: this.node.stepId,
      transformResumeInput: (input, respondedBy) => {
        const approved = input?.approved;
        return {
          response: { approved: approved === true },
          respondedBy,
        };
      },
    });
  }
}
