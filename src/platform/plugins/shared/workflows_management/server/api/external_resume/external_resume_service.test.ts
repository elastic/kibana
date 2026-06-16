/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExecutionStatus } from '@kbn/workflows';
import { resumeWorkflowExecutionExternally } from './external_resume_service';
import { ExternalResumeError } from '../external_resume_error';
import type { WorkflowsService } from '../workflows_management_service';

describe('resumeWorkflowExecutionExternally', () => {
  const encodedApiKey = Buffer.from('api-key-id:secret').toString('base64');
  const authenticate = jest.fn();
  const invalidateApiKey = jest.fn();
  const resumeWorkflowExecution = jest.fn();
  const getWorkflowExecution = jest.fn();
  const workflowsService = {
    getCoreStart: jest.fn(),
    getWorkflowExecution,
    getWorkflowsExecutionEngine: jest.fn(),
  } as unknown as jest.Mocked<WorkflowsService>;

  beforeEach(() => {
    jest.clearAllMocks();
    workflowsService.getCoreStart.mockResolvedValue({
      elasticsearch: {
        client: {
          asScoped: jest.fn().mockReturnValue({
            asCurrentUser: {
              security: {
                authenticate,
              },
            },
          }),
          asInternalUser: {
            security: {
              invalidateApiKey,
            },
          },
        },
      },
    } as never);
    workflowsService.getWorkflowsExecutionEngine.mockResolvedValue({
      resumeWorkflowExecution,
    } as never);
    authenticate.mockResolvedValue({
      api_key: {
        id: 'api-key-id',
      },
    });
    getWorkflowExecution.mockResolvedValue({
      id: 'execution-1',
      stepExecutions: [
        {
          id: 'step-execution-1',
          input: {
            schema: {
              properties: {
                approved: { type: 'boolean' },
              },
              required: ['approved'],
            },
          },
          output: {
            external: {
              apiKeyId: 'api-key-id',
            },
          },
          status: ExecutionStatus.WAITING_FOR_INPUT,
          stepId: 'approval',
          stepType: 'waitForInput',
          workflowRunId: 'execution-1',
        },
      ],
    });
    resumeWorkflowExecution.mockResolvedValue({ resumedBy: 'api_key:api-key-id' });
    invalidateApiKey.mockResolvedValue({});
  });

  it('validates the token, coerces GET-style input, resumes, and invalidates the API key', async () => {
    const result = await resumeWorkflowExecutionExternally(workflowsService, {
      apiKey: encodedApiKey,
      coerceInput: true,
      executionId: 'execution-1',
      input: { approved: 'true' },
      spaceId: 'default',
    });

    expect(getWorkflowExecution).toHaveBeenCalledWith('execution-1', 'default', {
      includeInput: true,
      includeOutput: true,
    });
    expect(resumeWorkflowExecution).toHaveBeenCalledWith(
      'execution-1',
      'default',
      { approved: true },
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: `ApiKey ${encodedApiKey}`,
        }),
      }),
      {
        resumedAt: expect.any(String),
        resumedBy: 'api_key:api-key-id',
      }
    );
    expect(invalidateApiKey).toHaveBeenCalledWith({ ids: ['api-key-id'] });
    expect(result).toEqual({ resumedBy: 'api_key:api-key-id' });
  });

  it('falls back to decoding the API key id when authenticate omits it', async () => {
    authenticate.mockResolvedValue({});

    await resumeWorkflowExecutionExternally(workflowsService, {
      apiKey: encodedApiKey,
      coerceInput: true,
      executionId: 'execution-1',
      input: { approved: 'true' },
      spaceId: 'default',
    });

    expect(getWorkflowExecution).toHaveBeenCalledWith('execution-1', 'default', {
      includeInput: true,
      includeOutput: true,
    });
  });

  it('maps API key authentication failures to an external resume 401', async () => {
    authenticate.mockRejectedValue(new Error('security_exception'));

    await expect(
      resumeWorkflowExecutionExternally(workflowsService, {
        apiKey: encodedApiKey,
        executionId: 'execution-1',
        input: {},
        spaceId: 'default',
      })
    ).rejects.toEqual(new ExternalResumeError('Invalid external resume API key', 401));
    expect(getWorkflowExecution).not.toHaveBeenCalled();
    expect(resumeWorkflowExecution).not.toHaveBeenCalled();
    expect(invalidateApiKey).not.toHaveBeenCalled();
  });

  it('rejects API keys that do not match a waiting step output for the execution', async () => {
    getWorkflowExecution.mockResolvedValue({
      id: 'execution-1',
      stepExecutions: [
        {
          output: {
            external: {
              apiKeyId: 'different-api-key-id',
            },
          },
          status: ExecutionStatus.WAITING_FOR_INPUT,
          stepId: 'approval',
          stepType: 'waitForInput',
          workflowRunId: 'execution-1',
        },
      ],
    });

    await expect(
      resumeWorkflowExecutionExternally(workflowsService, {
        apiKey: encodedApiKey,
        executionId: 'execution-1',
        input: {},
        spaceId: 'default',
      })
    ).rejects.toEqual(
      new ExternalResumeError('API key does not match this workflow execution', 403)
    );
    expect(resumeWorkflowExecution).not.toHaveBeenCalled();
    expect(invalidateApiKey).not.toHaveBeenCalled();
  });

  it('rejects input that does not match the waiting step schema', async () => {
    await expect(
      resumeWorkflowExecutionExternally(workflowsService, {
        apiKey: encodedApiKey,
        coerceInput: true,
        executionId: 'execution-1',
        input: { approved: 'not-a-boolean' },
        spaceId: 'default',
      })
    ).rejects.toMatchObject({
      message: expect.stringContaining('Resume input does not match waitForInput schema'),
      statusCode: 400,
    });
    expect(resumeWorkflowExecution).not.toHaveBeenCalled();
    expect(invalidateApiKey).not.toHaveBeenCalled();
  });
});
