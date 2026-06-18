/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { coreMock } from '@kbn/core/server/mocks';
import { ExecutionStatus } from '@kbn/workflows';
import type { WorkflowExecutionDto, WorkflowStepExecutionDto } from '@kbn/workflows';
import type { WorkflowsExecutionEnginePluginStart } from '@kbn/workflows-execution-engine/server';
import { ExternalResumeError } from './external_resume_error';
import { resumeWorkflowExecutionExternally } from './external_resume_service';
import type { WorkflowsService } from '../workflows_management_service';

describe('resumeWorkflowExecutionExternally', () => {
  const encodedApiKey = Buffer.from('api-key-id:secret').toString('base64');
  const workflowsService = {
    getCoreStart: jest.fn(),
    getWorkflowExecution: jest.fn(),
    getWorkflowsExecutionEngine: jest.fn(),
  } as unknown as jest.Mocked<WorkflowsService>;

  beforeEach(() => {
    jest.clearAllMocks();
    const coreStart = coreMock.createStart();
    coreStart.elasticsearch.client.asScoped = jest.fn().mockReturnValue({
      asCurrentUser: {
        security: {
          authenticate: jest.fn().mockResolvedValue({
            api_key: { id: 'api-key-id' },
          }),
        },
      },
    });
    coreStart.elasticsearch.client.asInternalUser.security.invalidateApiKey = jest
      .fn()
      .mockResolvedValue({});
    workflowsService.getCoreStart.mockResolvedValue(coreStart);
    workflowsService.getWorkflowExecution.mockResolvedValue({
      id: 'exec-1',
      stepExecutions: [
        {
          workflowRunId: 'exec-1',
          stepType: 'waitForInput',
          status: ExecutionStatus.WAITING_FOR_INPUT,
          input: {
            externalResumeApiKeyId: 'api-key-id',
            schema: {
              properties: {
                approved: { type: 'boolean' },
              },
              required: ['approved'],
            },
          },
        } as unknown as WorkflowStepExecutionDto,
      ],
    } as unknown as WorkflowExecutionDto);
    workflowsService.getWorkflowsExecutionEngine.mockResolvedValue({
      resumeWorkflowExecution: jest.fn().mockResolvedValue({ resumedBy: 'api_key:api-key-id' }),
    } as unknown as WorkflowsExecutionEnginePluginStart);
  });

  it('resumes a waiting step when the API key matches externalResumeApiKeyId', async () => {
    await resumeWorkflowExecutionExternally(workflowsService, {
      apiKey: encodedApiKey,
      coerceInput: true,
      executionId: 'exec-1',
      input: { approved: 'true' },
      spaceId: 'default',
    });

    const engine = await workflowsService.getWorkflowsExecutionEngine();
    expect(engine.resumeWorkflowExecution).toHaveBeenCalledWith(
      'exec-1',
      'default',
      { approved: true },
      expect.any(Object),
      {
        resumedAt: expect.any(String),
        resumedBy: 'api_key:api-key-id',
      }
    );
    const coreStart = await workflowsService.getCoreStart();
    expect(
      coreStart.elasticsearch.client.asInternalUser.security.invalidateApiKey
    ).toHaveBeenCalledWith({ ids: ['api-key-id'] });
  });

  it('throws when the API key does not match any waiting step', async () => {
    workflowsService.getWorkflowExecution.mockResolvedValue({
      id: 'exec-1',
      stepExecutions: [
        {
          workflowRunId: 'exec-1',
          stepType: 'waitForInput',
          status: ExecutionStatus.WAITING_FOR_INPUT,
          input: {
            externalResumeApiKeyId: 'different-api-key-id',
          },
        } as unknown as WorkflowStepExecutionDto,
      ],
    } as unknown as WorkflowExecutionDto);

    await expect(
      resumeWorkflowExecutionExternally(workflowsService, {
        apiKey: encodedApiKey,
        executionId: 'exec-1',
        input: {},
        spaceId: 'default',
      })
    ).rejects.toEqual(
      new ExternalResumeError('API key does not match this workflow execution', 403)
    );
  });

  it('throws when the execution is not waiting for input', async () => {
    workflowsService.getWorkflowExecution.mockResolvedValue({
      id: 'exec-1',
      stepExecutions: [
        {
          workflowRunId: 'exec-1',
          stepType: 'waitForInput',
          status: ExecutionStatus.COMPLETED,
          input: {
            externalResumeApiKeyId: 'api-key-id',
          },
        } as unknown as WorkflowStepExecutionDto,
      ],
    } as unknown as WorkflowExecutionDto);

    await expect(
      resumeWorkflowExecutionExternally(workflowsService, {
        apiKey: encodedApiKey,
        executionId: 'exec-1',
        input: {},
        spaceId: 'default',
      })
    ).rejects.toEqual(
      new ExternalResumeError('Workflow execution is not waiting for external input', 409)
    );
  });
});
