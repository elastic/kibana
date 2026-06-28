/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  DEFAULT_WAIT_FOR_INPUT_TIMEOUT,
  HITL_EXTERNAL_RESUME_LINK_CONTEXT_KEY,
} from '@kbn/workflows';
import type { WaitForInputGraphNode } from '@kbn/workflows/graph';
import {
  buildExternalResumeFormUrl,
  createExternalResumeApiKey,
  ExecutionError,
} from '@kbn/workflows/server';
import { resumeHitlWaitStep, shouldSkipHitlWaitEntry, tryEnterHitlWait } from './hitl_wait_helpers';
import type { ConnectorExecutor } from '../../connector_executor';
import { parseDuration } from '../../utils';
import { getKibanaUrl } from '../../utils/get_kibana_url';
import type { StepExecutionRuntime } from '../../workflow_context_manager/step_execution_runtime';
import type { ContextDependencies } from '../../workflow_context_manager/types';
import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../workflow_event_logger';
import type { NodeImplementation } from '../node_implementation';
import { hasExternalHitlChannels } from '../wait_for_approval_step/send_wait_for_approval_notifications';
import { sendWaitForInputNotifications } from '../wait_for_approval_step/send_wait_for_input_notifications';

export class WaitForInputStepImpl implements NodeImplementation {
  constructor(
    private node: WaitForInputGraphNode,
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

    this.workflowLogger.logDebug(`Step '${this.node.stepId}' resuming with human input`, {
      event: { action: 'hitl:resuming' },
    });
    await this.resume();
  }

  private async enterWait(): Promise<void> {
    const withConfig = this.node.configuration?.with;
    const ctx = this.stepExecutionRuntime.contextManager;
    const message =
      withConfig?.message !== undefined
        ? String(ctx.renderValueAccordingToContext(withConfig.message))
        : '';

    if (!withConfig) {
      this.workflowLogger.logDebug(`Step '${this.node.stepId}' is waiting for human input`, {
        event: { action: 'hitl:waiting' },
      });
      return;
    }

    const stepInput: Record<string, unknown> = {
      ...(message.length > 0 && { message }),
      ...(withConfig.schema !== undefined && { schema: withConfig.schema }),
    };

    const channels = withConfig.channels;
    if (hasExternalHitlChannels(channels)) {
      const execution = this.workflowRuntime.getWorkflowExecution();
      const spaceId = this.dependencies.spaceId ?? execution.spaceId;
      if (!spaceId) {
        throw new Error('External input notifications require a space');
      }

      const timeout = this.node.configuration.timeout ?? DEFAULT_WAIT_FOR_INPUT_TIMEOUT;
      const apiKey = await this.mintExternalResumeApiKey({
        execution,
        spaceId,
        timeout,
      });

      stepInput.externalResumeApiKeyId = apiKey.id;

      const formUrl = buildExternalResumeFormUrl({
        kibanaUrl: getKibanaUrl(this.dependencies.coreStart, this.dependencies.cloudSetup),
        spaceId,
        executionId: execution.id,
        apiKey: apiKey.encoded,
      });

      this.setExternalResumeLinkInContext(formUrl);

      await sendWaitForInputNotifications({
        channels,
        stepMessage: message,
        formUrl,
        renderTemplate: (template) => String(ctx.renderValueAccordingToContext(template)),
        connectorExecutor: this.connectorExecutor,
        abortController: this.stepExecutionRuntime.abortController,
      });
    }

    this.stepExecutionRuntime.setInput(stepInput);

    this.workflowLogger.logDebug(`Step '${this.node.stepId}' is waiting for human input`, {
      event: { action: 'hitl:waiting' },
    });
  }

  private setExternalResumeLinkInContext(formUrl: string): void {
    const execution = this.workflowRuntime.getWorkflowExecution();
    const existingContext = (execution.context as Record<string, unknown> | null | undefined) ?? {};
    const existingHitl = (existingContext.hitl as Record<string, unknown> | undefined) ?? {};

    this.stepExecutionRuntime.updateWorkflowExecution({
      context: {
        ...existingContext,
        hitl: {
          ...existingHitl,
          [HITL_EXTERNAL_RESUME_LINK_CONTEXT_KEY]: formUrl,
        },
      },
    });
  }

  private async mintExternalResumeApiKey({
    execution,
    spaceId,
    timeout,
  }: {
    execution: ReturnType<WorkflowExecutionRuntimeManager['getWorkflowExecution']>;
    spaceId: string;
    timeout: string;
  }): Promise<{ id: string; encoded: string }> {
    const esClient = this.stepExecutionRuntime.contextManager.getEsClientAsUser();
    return createExternalResumeApiKey({
      esClient,
      executionId: execution.id,
      stepId: this.node.stepId,
      workflowId: execution.workflowId,
      spaceId,
      expiration: timeout,
    });
  }

  private async resume(): Promise<void> {
    const execution = this.workflowRuntime.getWorkflowExecution();
    const resumeInput = execution.context?.resumeInput as Record<string, unknown> | undefined;

    if (resumeInput == null && this.hasInputWaitExpired()) {
      await this.invalidateExternalResumeApiKeyIfPresent();
      const timeout = this.node.configuration.timeout ?? DEFAULT_WAIT_FOR_INPUT_TIMEOUT;
      this.stepExecutionRuntime.failStep(
        new ExecutionError({
          type: 'TimeoutError',
          message: `Input wait exceeded the configured timeout of ${timeout}.`,
        })
      );
      return;
    }

    await this.invalidateExternalResumeApiKeyIfPresent();

    resumeHitlWaitStep({
      stepExecutionRuntime: this.stepExecutionRuntime,
      workflowRuntime: this.workflowRuntime,
      workflowLogger: this.workflowLogger,
      stepId: this.node.stepId,
    });
  }

  private hasInputWaitExpired(): boolean {
    const startedAt = this.stepExecutionRuntime.stepExecution?.startedAt;
    if (!startedAt) {
      return false;
    }

    const timeout = this.node.configuration.timeout ?? DEFAULT_WAIT_FOR_INPUT_TIMEOUT;
    const deadlineMs = new Date(startedAt).getTime() + parseDuration(timeout);
    return Date.now() >= deadlineMs;
  }

  private async invalidateExternalResumeApiKeyIfPresent(): Promise<void> {
    const input = this.stepExecutionRuntime.stepExecution?.input;
    if (input == null || typeof input !== 'object' || !('externalResumeApiKeyId' in input)) {
      return;
    }

    const apiKeyId = (input as { externalResumeApiKeyId?: unknown }).externalResumeApiKeyId;
    if (typeof apiKeyId !== 'string' || apiKeyId.length === 0) {
      return;
    }

    try {
      await this.dependencies.coreStart.security.authc.apiKeys.invalidateAsInternalUser({
        ids: [apiKeyId],
      });
    } catch (error) {
      this.workflowLogger.logWarn(
        `Failed to invalidate external resume API key (${apiKeyId}): ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
}
