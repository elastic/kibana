/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WaitForApprovalStep } from '@kbn/workflows';
import type { WaitForApprovalGraphNode } from '@kbn/workflows/graph';
import type { ExecutionError } from '@kbn/workflows/server';
import { WaitForApprovalStepImpl } from './wait_for_approval_step';
import type { ConnectorExecutor } from '../../connector_executor';
import type { StepExecutionRuntime } from '../../workflow_context_manager/step_execution_runtime';
import type { ContextDependencies } from '../../workflow_context_manager/types';
import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../workflow_event_logger';
import { hasExternalHitlChannels } from '../hitl_notifications/has_external_hitl_channels';
import {
  buildWaitForApprovalResumeLinks,
  sendWaitForApprovalNotifications,
} from '../hitl_notifications/send_wait_for_approval_notifications';

jest.mock('../wait_for_input_step/hitl_external_resume_helpers', () => ({
  invalidateHitlExternalResumeTokenIfPresent: jest.fn(),
  mintHitlExternalResumeToken: jest.fn().mockReturnValue({
    token: 'resume-token',
    tokenHash: 'resume-token-hash',
    expiresAt: '2999-01-01T00:00:00.000Z',
  }),
}));

const mockMintHitlExternalResumeToken = jest.requireMock(
  '../wait_for_input_step/hitl_external_resume_helpers'
).mintHitlExternalResumeToken as jest.Mock;
const mockInvalidateHitlExternalResumeTokenIfPresent = jest.requireMock(
  '../wait_for_input_step/hitl_external_resume_helpers'
).invalidateHitlExternalResumeTokenIfPresent as jest.Mock;

jest.mock('../hitl_notifications/has_external_hitl_channels', () => ({
  hasExternalHitlChannels: jest.fn().mockReturnValue(false),
}));

jest.mock('../hitl_notifications/send_wait_for_approval_notifications', () => ({
  buildWaitForApprovalResumeLinks: jest.fn().mockReturnValue({
    approveUrl: 'https://kibana/approve',
    rejectUrl: 'https://kibana/reject',
  }),
  sendWaitForApprovalNotifications: jest.fn(),
}));

const mockHasExternalHitlChannels = jest.mocked(hasExternalHitlChannels);
const mockBuildWaitForApprovalResumeLinks = buildWaitForApprovalResumeLinks as jest.Mock;
const mockSendWaitForApprovalNotifications = sendWaitForApprovalNotifications as jest.Mock;

describe('WaitForApprovalStepImpl', () => {
  let underTest: WaitForApprovalStepImpl;
  let node: WaitForApprovalGraphNode;
  let mockStepExecutionRuntime: jest.Mocked<StepExecutionRuntime>;
  let mockWorkflowRuntime: jest.Mocked<WorkflowExecutionRuntimeManager>;
  let workflowLogger: IWorkflowEventLogger;
  let connectorExecutor: ConnectorExecutor;
  let dependencies: ContextDependencies;

  beforeEach(() => {
    mockHasExternalHitlChannels.mockReturnValue(false);
    mockBuildWaitForApprovalResumeLinks.mockClear();
    mockSendWaitForApprovalNotifications.mockReset();
    mockSendWaitForApprovalNotifications.mockResolvedValue(undefined);
    mockMintHitlExternalResumeToken.mockClear();
    mockInvalidateHitlExternalResumeTokenIfPresent.mockClear();

    node = {
      id: 'request-approval',
      type: 'waitForApproval',
      stepId: 'request-approval',
      stepType: 'waitForApproval',
      configuration: {
        name: 'request-approval',
        type: 'waitForApproval',
        with: {
          message: 'Approve this change?',
          approveLabel: 'Approve',
          rejectLabel: 'Decline',
        },
      } as WaitForApprovalStep,
    };

    mockStepExecutionRuntime = {
      tryEnterWaitUntil: jest.fn().mockReturnValue(true),
      finishStep: jest.fn(),
      failStep: jest.fn(),
      setInput: jest.fn(),
      updateWorkflowExecution: jest.fn(),
      stepExecutionId: 'test-step-exec-id',
      abortController: new AbortController(),
      contextManager: {
        renderValueAccordingToContext: jest.fn(<T>(v: T): T => v),
        getEsClientAsUser: jest.fn().mockReturnValue({ security: { createApiKey: jest.fn() } }),
      },
    } as unknown as jest.Mocked<StepExecutionRuntime>;

    mockWorkflowRuntime = {
      navigateToNextNode: jest.fn(),
      getWorkflowExecution: jest.fn().mockReturnValue({
        id: 'exec-abc',
        workflowId: 'wf-1',
        spaceId: 'default',
        context: {},
      }),
    } as unknown as jest.Mocked<WorkflowExecutionRuntimeManager>;

    workflowLogger = {
      logDebug: jest.fn(),
      logWarn: jest.fn(),
    } as unknown as IWorkflowEventLogger;

    connectorExecutor = { execute: jest.fn() } as unknown as ConnectorExecutor;
    dependencies = {
      spaceId: 'default',
      coreStart: {},
    } as unknown as ContextDependencies;

    underTest = new WaitForApprovalStepImpl(
      node,
      mockStepExecutionRuntime,
      mockWorkflowRuntime,
      workflowLogger,
      connectorExecutor,
      dependencies
    );
  });

  it('stores approval labels and fixed schema on first run', async () => {
    await underTest.run();

    expect(mockStepExecutionRuntime.setInput).toHaveBeenCalledWith({
      message: 'Approve this change?',
      approveLabel: 'Approve',
      rejectLabel: 'Decline',
      schema: expect.objectContaining({
        properties: expect.objectContaining({ approved: expect.any(Object) }),
      }),
    });
  });

  it('does not mint an external resume token without channels', async () => {
    await underTest.run();

    expect(mockMintHitlExternalResumeToken).not.toHaveBeenCalled();
    expect(mockSendWaitForApprovalNotifications).not.toHaveBeenCalled();
  });

  it('mints a resume token and sends notifications when channels are configured', async () => {
    mockHasExternalHitlChannels.mockReturnValue(true);
    node.configuration = {
      ...node.configuration,
      with: {
        ...node.configuration.with,
        channels: {
          slack: { 'connector-id': 'slack-1' },
        },
      },
    } as WaitForApprovalStep;

    await underTest.run();

    expect(mockMintHitlExternalResumeToken).toHaveBeenCalled();
    expect(mockStepExecutionRuntime.setInput).toHaveBeenCalledWith(
      expect.objectContaining({
        _hitlTokenHash: 'resume-token-hash',
        _hitlTokenExpiresAt: '2999-01-01T00:00:00.000Z',
      })
    );
    expect(mockBuildWaitForApprovalResumeLinks).toHaveBeenCalledWith(
      expect.objectContaining({ stepId: 'test-step-exec-id', token: 'resume-token' })
    );
    expect(mockSendWaitForApprovalNotifications).toHaveBeenCalled();
  });

  it('persists the external resume token metadata before sending notifications', async () => {
    mockHasExternalHitlChannels.mockReturnValue(true);
    node.configuration = {
      ...node.configuration,
      with: {
        ...node.configuration.with,
        channels: {
          slack: { 'connector-id': 'slack-1' },
        },
      },
    } as WaitForApprovalStep;

    await underTest.run();

    expect(mockStepExecutionRuntime.setInput).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        _hitlTokenHash: 'resume-token-hash',
        _hitlTokenExpiresAt: '2999-01-01T00:00:00.000Z',
      })
    );
    expect(mockSendWaitForApprovalNotifications).toHaveBeenCalled();
    expect(mockStepExecutionRuntime.setInput).toHaveBeenCalledTimes(2);
  });

  it('persists the external resume token metadata when notification delivery fails', async () => {
    mockHasExternalHitlChannels.mockReturnValue(true);
    mockSendWaitForApprovalNotifications.mockRejectedValue(new Error('Slack connector failed'));
    node.configuration = {
      ...node.configuration,
      with: {
        ...node.configuration.with,
        channels: {
          slack: { 'connector-id': 'slack-1' },
        },
      },
    } as WaitForApprovalStep;

    await expect(underTest.run()).rejects.toThrow('Slack connector failed');

    expect(mockStepExecutionRuntime.setInput).toHaveBeenCalledWith(
      expect.objectContaining({
        _hitlTokenHash: 'resume-token-hash',
        _hitlTokenExpiresAt: '2999-01-01T00:00:00.000Z',
      })
    );
  });

  it('finishes with approval output shape on resume', async () => {
    mockStepExecutionRuntime.tryEnterWaitUntil.mockReturnValue(false);
    mockWorkflowRuntime.getWorkflowExecution.mockReturnValue({
      id: 'exec-abc',
      context: { resumeInput: { approved: true }, resumedBy: 'user-1' },
    } as unknown as ReturnType<WorkflowExecutionRuntimeManager['getWorkflowExecution']>);

    await underTest.run();

    expect(mockStepExecutionRuntime.finishStep).toHaveBeenCalledWith({
      response: { approved: true },
      respondedBy: 'user-1',
    });
    expect(mockWorkflowRuntime.navigateToNextNode).toHaveBeenCalled();
  });

  it('finishes on in-app resume without external token cleanup', async () => {
    mockStepExecutionRuntime.tryEnterWaitUntil.mockReturnValue(false);
    (mockStepExecutionRuntime as { stepExecution?: unknown }).stepExecution = {
      input: { _hitlTokenHash: 'resume-token-hash' },
    };
    mockWorkflowRuntime.getWorkflowExecution.mockReturnValue({
      id: 'exec-abc',
      context: { resumeInput: { approved: true }, resumedBy: 'user-1' },
    } as unknown as ReturnType<WorkflowExecutionRuntimeManager['getWorkflowExecution']>);

    underTest = new WaitForApprovalStepImpl(
      node,
      mockStepExecutionRuntime,
      mockWorkflowRuntime,
      workflowLogger,
      connectorExecutor,
      dependencies
    );

    await underTest.run();

    expect(mockStepExecutionRuntime.finishStep).toHaveBeenCalled();
  });

  it('records external api key responder on resume', async () => {
    mockStepExecutionRuntime.tryEnterWaitUntil.mockReturnValue(false);
    mockWorkflowRuntime.getWorkflowExecution.mockReturnValue({
      id: 'exec-abc',
      context: {
        resumeInput: { approved: false },
        resumedBy: 'external_resume:step-exec-1',
      },
    } as unknown as ReturnType<WorkflowExecutionRuntimeManager['getWorkflowExecution']>);

    await underTest.run();

    expect(mockStepExecutionRuntime.finishStep).toHaveBeenCalledWith({
      response: { approved: false },
      respondedBy: 'external_resume:step-exec-1',
    });
  });

  it('fails with TimeoutError when approval wait expires', async () => {
    jest.useFakeTimers();
    try {
      jest.setSystemTime(new Date('2025-06-01T12:01:00.000Z'));
      node.configuration = {
        ...node.configuration,
        timeout: '30s',
      } as WaitForApprovalStep;

      mockStepExecutionRuntime.tryEnterWaitUntil.mockReturnValue(false);
      (mockStepExecutionRuntime as { stepExecution?: unknown }).stepExecution = {
        startedAt: '2025-06-01T12:00:00.000Z',
        input: { _hitlTokenHash: 'resume-token-hash' },
      };
      mockWorkflowRuntime.getWorkflowExecution.mockReturnValue({
        id: 'exec-abc',
        context: {},
      } as unknown as ReturnType<WorkflowExecutionRuntimeManager['getWorkflowExecution']>);

      underTest = new WaitForApprovalStepImpl(
        node,
        mockStepExecutionRuntime,
        mockWorkflowRuntime,
        workflowLogger,
        connectorExecutor,
        dependencies
      );

      await underTest.run();

      expect(mockStepExecutionRuntime.failStep).toHaveBeenCalledWith(
        expect.objectContaining({
          toSerializableObject: expect.any(Function),
        })
      );
      const timeoutError = (mockStepExecutionRuntime.failStep as jest.Mock).mock
        .calls[0][0] as ExecutionError;
      expect(timeoutError.toSerializableObject()).toEqual({
        type: 'TimeoutError',
        message: 'Approval wait exceeded the configured timeout of 30s.',
      });
      expect(mockStepExecutionRuntime.finishStep).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  it('uses workflow execution spaceId when dependencies.spaceId is missing', async () => {
    mockHasExternalHitlChannels.mockReturnValue(true);
    node.configuration = {
      ...node.configuration,
      with: {
        ...node.configuration.with,
        channels: {
          slack: { 'connector-id': 'slack-1' },
        },
      },
    } as WaitForApprovalStep;
    dependencies = {
      coreStart: {},
    } as unknown as ContextDependencies;
    mockWorkflowRuntime.getWorkflowExecution.mockReturnValue({
      id: 'exec-abc',
      workflowId: 'wf-1',
      spaceId: 'custom-space',
      context: {},
    } as unknown as ReturnType<WorkflowExecutionRuntimeManager['getWorkflowExecution']>);
    underTest = new WaitForApprovalStepImpl(
      node,
      mockStepExecutionRuntime,
      mockWorkflowRuntime,
      workflowLogger,
      connectorExecutor,
      dependencies
    );

    await underTest.run();

    expect(mockBuildWaitForApprovalResumeLinks).toHaveBeenCalledWith(
      expect.objectContaining({ spaceId: 'custom-space' })
    );
  });

  describe('onCancel', () => {
    it('invalidates the external resume token when the step is cancelled', async () => {
      await expect(underTest.onCancel()).resolves.toBeUndefined();
      expect(mockInvalidateHitlExternalResumeTokenIfPresent).toHaveBeenCalledWith(
        mockStepExecutionRuntime
      );
    });
  });
});
