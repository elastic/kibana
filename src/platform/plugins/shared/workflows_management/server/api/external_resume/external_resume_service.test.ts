/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExecutionStatus } from '@kbn/workflows';
import type { WorkflowExecutionDto, WorkflowStepExecutionDto } from '@kbn/workflows';
import { createExternalResumeTokenPayload, signExternalResumeToken } from '@kbn/workflows/server';
import type { WorkflowsExecutionEnginePluginStart } from '@kbn/workflows-execution-engine/server';
import { ExternalResumeError } from './external_resume_error';
import {
  parseApprovedQueryParam,
  resumeWorkflowExecutionExternally,
} from './external_resume_service';
import type { WorkflowsService } from '../workflows_management_service';

const SIGNING_KEY = 'test-signing-key-with-at-least-32-characters';

describe('resumeWorkflowExecutionExternally', () => {
  const workflowsService = {
    getWorkflowExecution: jest.fn(),
    getWorkflowsExecutionEngine: jest.fn(),
  } as unknown as jest.Mocked<WorkflowsService>;

  const token = signExternalResumeToken(
    createExternalResumeTokenPayload({
      spaceId: 'default',
      executionId: 'exec-1',
      stepId: 'request-approval',
      ttlMs: 60_000,
      jti: 'token-jti',
    }),
    SIGNING_KEY
  );

  beforeEach(() => {
    jest.clearAllMocks();
    workflowsService.getWorkflowExecution.mockResolvedValue({
      id: 'exec-1',
      status: ExecutionStatus.WAITING_FOR_INPUT,
      stepExecutions: [
        {
          workflowRunId: 'exec-1',
          stepId: 'request-approval',
          stepType: 'waitForInput',
          status: ExecutionStatus.WAITING_FOR_INPUT,
        } as unknown as WorkflowStepExecutionDto,
      ],
    } as unknown as WorkflowExecutionDto);
    workflowsService.getWorkflowsExecutionEngine.mockResolvedValue({
      resumeWorkflowExecution: jest
        .fn()
        .mockResolvedValue({ resumedBy: 'external_resume:token-jti' }),
    } as unknown as WorkflowsExecutionEnginePluginStart);
  });

  it('resumes a waiting step when the signed token matches', async () => {
    await resumeWorkflowExecutionExternally(workflowsService, {
      approved: true,
      executionId: 'exec-1',
      signingKey: SIGNING_KEY,
      spaceId: 'default',
      token,
    });

    const engine = await workflowsService.getWorkflowsExecutionEngine();
    expect(engine.resumeWorkflowExecution).toHaveBeenCalledWith(
      'exec-1',
      'default',
      { approved: true },
      expect.any(Object),
      { resumedBy: 'external_resume:token-jti' }
    );
  });

  it('throws when the token does not match the execution id', async () => {
    await expect(
      resumeWorkflowExecutionExternally(workflowsService, {
        approved: true,
        executionId: 'other-exec',
        signingKey: SIGNING_KEY,
        spaceId: 'default',
        token,
      })
    ).rejects.toEqual(
      new ExternalResumeError('Resume token does not match this workflow execution', 403)
    );
  });

  it('throws when no waiting step matches the token step id', async () => {
    workflowsService.getWorkflowExecution.mockResolvedValue({
      id: 'exec-1',
      status: ExecutionStatus.WAITING_FOR_INPUT,
      stepExecutions: [
        {
          workflowRunId: 'exec-1',
          stepId: 'different-step',
          stepType: 'waitForInput',
          status: ExecutionStatus.WAITING_FOR_INPUT,
        } as unknown as WorkflowStepExecutionDto,
      ],
    } as unknown as WorkflowExecutionDto);

    await expect(
      resumeWorkflowExecutionExternally(workflowsService, {
        approved: false,
        executionId: 'exec-1',
        signingKey: SIGNING_KEY,
        spaceId: 'default',
        token,
      })
    ).rejects.toEqual(
      new ExternalResumeError('Workflow execution is not waiting for external input', 409)
    );
  });
});

describe('parseApprovedQueryParam', () => {
  it('parses boolean and string values', () => {
    expect(parseApprovedQueryParam(true)).toBe(true);
    expect(parseApprovedQueryParam('true')).toBe(true);
    expect(parseApprovedQueryParam(false)).toBe(false);
    expect(parseApprovedQueryParam('false')).toBe(false);
  });

  it('rejects invalid values', () => {
    expect(() => parseApprovedQueryParam('maybe')).toThrow(
      new ExternalResumeError('approved query parameter must be true or false', 400)
    );
  });
});
