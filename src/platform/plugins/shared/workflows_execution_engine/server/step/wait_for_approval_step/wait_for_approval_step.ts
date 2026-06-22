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
  WAIT_FOR_APPROVAL_RESPONSE_SCHEMA,
} from '@kbn/workflows';
import type { WaitForApprovalGraphNode } from '@kbn/workflows/graph';
import { createExternalResumeApiKey } from '@kbn/workflows/server';
import {
  buildWaitForApprovalResumeLinks,
  hasExternalApprovalChannels,
  sendWaitForApprovalNotifications,
} from './send_wait_for_approval_notifications';
import type { ConnectorExecutor } from '../../connector_executor';
import { getKibanaUrl } from '../../utils/get_kibana_url';
import type { StepExecutionRuntime } from '../../workflow_context_manager/step_execution_runtime';
import type { ContextDependencies } from '../../workflow_context_manager/types';
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
    private workflowLogger: IWorkflowEventLogger,
    private connectorExecutor: ConnectorExecutor,
    private dependencies: ContextDependencies
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
    const message =
      withConfig?.message !== undefined
        ? String(ctx.renderValueAccordingToContext(withConfig.message))
        : '';

    this.stepExecutionRuntime.setInput({
      ...(message.length > 0 && { message }),
      approveLabel,
      rejectLabel,
      schema: WAIT_FOR_APPROVAL_RESPONSE_SCHEMA,
    });

    const signingKey = this.dependencies.externalResumeSigningKey;
    const execution = this.workflowRuntime.getWorkflowExecution();
    const spaceId = this.dependencies.spaceId ?? execution.spaceId;
    const timeout = this.node.configuration.timeout ?? DEFAULT_WAIT_FOR_APPROVAL_TIMEOUT;

    let apiKeyId: string | undefined;
    if (signingKey && spaceId) {
      apiKeyId = await this.mintExternalResumeApiKey({
        message,
        approveLabel,
        rejectLabel,
        execution,
        spaceId,
        timeout,
      });
    }

    const channels = withConfig?.channels;
    if (hasExternalApprovalChannels(channels)) {
      if (!signingKey || !spaceId || !apiKeyId) {
        throw new Error(
          'External approval notifications require a configured signing key and space'
        );
      }

      await this.sendExternalNotifications({
        channels,
        message,
        approveLabel,
        rejectLabel,
        apiKeyId,
        signingKey,
        timeout,
        execution,
        spaceId,
      });
    }

    this.workflowLogger.logDebug(`Step '${this.node.stepId}' is waiting for approval`, {
      event: { action: 'hitl:waiting' },
    });
  }

  private async mintExternalResumeApiKey({
    message,
    approveLabel,
    rejectLabel,
    execution,
    spaceId,
    timeout,
  }: {
    message: string;
    approveLabel: string;
    rejectLabel: string;
    execution: ReturnType<WorkflowExecutionRuntimeManager['getWorkflowExecution']>;
    spaceId: string;
    timeout: string;
  }): Promise<string> {
    const esClient = this.stepExecutionRuntime.contextManager.getEsClientAsUser();
    const apiKey = await createExternalResumeApiKey({
      esClient,
      executionId: execution.id,
      stepId: this.node.stepId,
      workflowId: execution.workflowId,
      spaceId,
      expiration: timeout,
    });

    this.stepExecutionRuntime.setInput({
      ...(message.length > 0 && { message }),
      approveLabel,
      rejectLabel,
      schema: WAIT_FOR_APPROVAL_RESPONSE_SCHEMA,
      externalResumeEncodedApiKey: apiKey.encoded,
    });

    return apiKey.id;
  }

  private async sendExternalNotifications({
    channels,
    message,
    approveLabel,
    rejectLabel,
    apiKeyId,
    signingKey,
    timeout,
    execution,
    spaceId,
  }: {
    channels: NonNullable<
      NonNullable<WaitForApprovalGraphNode['configuration']['with']>['channels']
    >;
    message: string;
    approveLabel: string;
    rejectLabel: string;
    apiKeyId: string;
    signingKey: string;
    timeout: string;
    execution: ReturnType<WorkflowExecutionRuntimeManager['getWorkflowExecution']>;
    spaceId: string;
  }): Promise<void> {
    const resumeLinks = buildWaitForApprovalResumeLinks({
      kibanaUrl: getKibanaUrl(this.dependencies.coreStart, this.dependencies.cloudSetup),
      spaceId,
      executionId: execution.id,
      stepId: this.node.stepId,
      timeout,
      signingKey,
      apiKeyId,
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
