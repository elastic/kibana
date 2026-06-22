/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExecutionStatus, isHitlWaitStepType } from '@kbn/workflows';
import type { ResumeWorkflowExecutionResponseDto, WorkflowStepExecutionDto } from '@kbn/workflows';
import {
  WorkflowExecutionInvalidStatusError,
  WorkflowExecutionNotFoundError,
} from '@kbn/workflows/common/errors';
import {
  ExternalResumeTokenVerificationError,
  getAuthenticatedExternalResumeApiKeyId,
  getExternalResumeEncodedApiKeyFromStepInput,
  invalidateExternalResumeApiKey,
  verifyExternalResumeToken,
} from '@kbn/workflows/server';
import { createExternalResumeApiKeyRequest } from './create_external_resume_api_key_request';
import { ExternalResumeError } from './external_resume_error';
import type { WorkflowsService } from '../workflows_management_service';

export interface ExternalResumeWorkflowExecutionParams {
  approved: boolean;
  executionId: string;
  signingKey: string;
  spaceId: string;
  token: string;
}

interface ApiKeyAuthenticateResponse {
  api_key?: {
    id?: string;
    name?: string;
  };
}

export async function resumeWorkflowExecutionExternally(
  workflowsService: WorkflowsService,
  { approved, executionId, signingKey, spaceId, token }: ExternalResumeWorkflowExecutionParams
): Promise<ResumeWorkflowExecutionResponseDto> {
  let payload;
  try {
    payload = verifyExternalResumeToken(token, signingKey);
  } catch (error) {
    if (error instanceof ExternalResumeTokenVerificationError) {
      throw new ExternalResumeError(error.message, error.statusCode);
    }
    throw error;
  }

  if (payload.executionId !== executionId) {
    throw new ExternalResumeError('Resume token does not match this workflow execution', 403);
  }

  if (payload.spaceId !== spaceId) {
    throw new ExternalResumeError('Resume token does not match this space', 403);
  }

  const execution = await workflowsService.getWorkflowExecution(
    payload.executionId,
    payload.spaceId,
    {
      includeInput: true,
    }
  );

  if (!execution) {
    throw new ExternalResumeError('Workflow execution not found', 404);
  }

  const stepExecution = getWaitingStepExecutionFromDto(execution, payload.stepId);

  if (!stepExecution) {
    throw new ExternalResumeError('Workflow execution is not waiting for external input', 409);
  }

  if (stepExecution.finishedAt || stepExecution.error) {
    throw new ExternalResumeError('This workflow response link is no longer valid', 409);
  }

  const coreStart = await workflowsService.getCoreStart();
  const internalEsClient = coreStart.elasticsearch.client.asInternalUser;

  const encodedApiKey = getExternalResumeEncodedApiKeyFromStepInput(stepExecution.input);
  if (!encodedApiKey) {
    throw new ExternalResumeError('This workflow response link is no longer valid', 409);
  }

  const apiKeyRequest = createExternalResumeApiKeyRequest(encodedApiKey, spaceId);
  let authentication: ApiKeyAuthenticateResponse;
  try {
    authentication = (await coreStart.elasticsearch.client
      .asScoped(apiKeyRequest)
      .asCurrentUser.security.authenticate()) as ApiKeyAuthenticateResponse;
  } catch {
    throw new ExternalResumeError('Invalid external resume API key', 401);
  }

  const authenticatedApiKeyId = getAuthenticatedExternalResumeApiKeyId(
    authentication,
    encodedApiKey
  );
  if (!authenticatedApiKeyId || authenticatedApiKeyId !== payload.apiKeyId) {
    throw new ExternalResumeError('Invalid external resume API key', 401);
  }

  const workflowsExecutionEngine = await workflowsService.getWorkflowsExecutionEngine();
  const resumedBy = `api_key:${payload.apiKeyId}`;

  try {
    const result = await workflowsExecutionEngine.resumeWorkflowExecution(
      payload.executionId,
      payload.spaceId,
      { approved },
      apiKeyRequest,
      { resumedBy }
    );

    await invalidateExternalResumeApiKey(internalEsClient, payload.apiKeyId);

    return result;
  } catch (error) {
    if (error instanceof WorkflowExecutionNotFoundError) {
      throw new ExternalResumeError('Workflow execution not found', 404);
    }
    if (error instanceof WorkflowExecutionInvalidStatusError) {
      throw new ExternalResumeError('Workflow execution is not waiting for external input', 409);
    }
    throw error;
  }
}

function getWaitingStepExecutionFromDto(
  execution: {
    id: string;
    status: ExecutionStatus;
    finishedAt?: string;
    stepExecutions: WorkflowStepExecutionDto[];
  },
  stepId: string
): WorkflowStepExecutionDto | undefined {
  if (execution.status !== ExecutionStatus.WAITING_FOR_INPUT) {
    return undefined;
  }

  if (execution.finishedAt) {
    return undefined;
  }

  return execution.stepExecutions.find(
    (stepExecution) =>
      stepExecution.workflowRunId === execution.id &&
      stepExecution.stepId === stepId &&
      isHitlWaitStepType(stepExecution.stepType) &&
      stepExecution.status === ExecutionStatus.WAITING_FOR_INPUT
  );
}

export function parseApprovedQueryParam(value: unknown): boolean {
  if (value === true || value === 'true') {
    return true;
  }

  if (value === false || value === 'false') {
    return false;
  }

  throw new ExternalResumeError('approved query parameter must be true or false', 400);
}
