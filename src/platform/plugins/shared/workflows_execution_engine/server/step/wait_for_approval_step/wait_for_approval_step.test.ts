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
import { WaitForApprovalStepImpl } from './wait_for_approval_step';
import type { ConnectorExecutor } from '../../connector_executor';
import type { StepExecutionRuntime } from '../../workflow_context_manager/step_execution_runtime';
import type { ContextDependencies } from '../../workflow_context_manager/types';
import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../workflow_event_logger';

jest.mock('./send_wait_for_approval_notifications', () => ({
  hasExternalApprovalChannels: jest.fn().mockReturnValue(false),
  buildWaitForApprovalResumeLinks: jest.fn(),
  sendWaitForApprovalNotifications: jest.fn(),
}));

describe('WaitForApprovalStepImpl', () => {
  let underTest: WaitForApprovalStepImpl;
  let node: WaitForApprovalGraphNode;
  let mockStepExecutionRuntime: jest.Mocked<StepExecutionRuntime>;
  let mockWorkflowRuntime: jest.Mocked<WorkflowExecutionRuntimeManager>;
  let workflowLogger: IWorkflowEventLogger;
  let connectorExecutor: ConnectorExecutor;
  let dependencies: ContextDependencies;

  beforeEach(() => {
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
      setInput: jest.fn(),
      updateWorkflowExecution: jest.fn(),
      stepExecutionId: 'test-step-exec-id',
      abortController: new AbortController(),
      contextManager: {
        renderValueAccordingToContext: jest.fn(<T>(v: T): T => v),
      },
    } as unknown as jest.Mocked<StepExecutionRuntime>;

    mockWorkflowRuntime = {
      navigateToNextNode: jest.fn(),
      getWorkflowExecution: jest.fn().mockReturnValue({ id: 'exec-abc', context: {} }),
    } as unknown as jest.Mocked<WorkflowExecutionRuntimeManager>;

    workflowLogger = {
      logDebug: jest.fn(),
    } as unknown as IWorkflowEventLogger;

    connectorExecutor = { execute: jest.fn() } as unknown as ConnectorExecutor;
    dependencies = {
      externalResumeSigningKey: 'test-signing-key-with-at-least-32-characters',
      spaceId: 'default',
    } as ContextDependencies;

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

  it('finishes with approval output shape on resume', async () => {
    mockStepExecutionRuntime.tryEnterWaitUntil.mockReturnValue(false);
    mockWorkflowRuntime.getWorkflowExecution.mockReturnValue({
      id: 'exec-abc',
      context: { resumeInput: { approved: true }, resumedBy: 'user-1' },
    });

    await underTest.run();

    expect(mockStepExecutionRuntime.finishStep).toHaveBeenCalledWith({
      response: { approved: true },
      respondedBy: 'user-1',
    });
    expect(mockWorkflowRuntime.navigateToNextNode).toHaveBeenCalled();
  });
});
