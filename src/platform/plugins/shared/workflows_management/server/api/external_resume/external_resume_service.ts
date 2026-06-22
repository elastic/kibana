/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { FakeRawRequest } from '@kbn/core-http-server';
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';
import { asSpaceId } from '@kbn/core-spaces-common';
import { ExecutionStatus, isHitlWaitStepType } from '@kbn/workflows';
import type { ResumeWorkflowExecutionResponseDto, WorkflowStepExecutionDto } from '@kbn/workflows';
import {
  ExternalResumeTokenVerificationError,
  verifyExternalResumeToken,
} from '@kbn/workflows/server';
import { ExternalResumeError } from './external_resume_error';
import type { WorkflowsService } from '../workflows_management_service';

export interface ExternalResumeWorkflowExecutionParams {
  approved: boolean;
  executionId: string;
  signingKey: string;
  spaceId: string;
  token: string;
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

  const stepExecution = await getWaitingStepExecution(workflowsService, {
    executionId,
    spaceId,
    stepId: payload.stepId,
  });

  if (!stepExecution) {
    throw new ExternalResumeError('Workflow execution is not waiting for external input', 409);
  }

  if (stepExecution.finishedAt || stepExecution.error) {
    throw new ExternalResumeError('This workflow response link is no longer valid', 409);
  }

  const workflowsExecutionEngine = await workflowsService.getWorkflowsExecutionEngine();
  const externalRequest = createExternalResumeRequest(spaceId);
  const resumedBy = `external_resume:${payload.jti}`;

  return workflowsExecutionEngine.resumeWorkflowExecution(
    executionId,
    spaceId,
    { approved },
    externalRequest,
    { resumedBy }
  );
}

function createExternalResumeRequest(spaceId: string): KibanaRequest {
  const fakeRawRequest: FakeRawRequest = {
    headers: {},
    spaceId: asSpaceId(spaceId),
  };
  return kibanaRequestFactory(fakeRawRequest);
}

async function getWaitingStepExecution(
  workflowsService: WorkflowsService,
  {
    executionId,
    spaceId,
    stepId,
  }: {
    executionId: string;
    spaceId: string;
    stepId: string;
  }
): Promise<WorkflowStepExecutionDto | undefined> {
  const execution = await workflowsService.getWorkflowExecution(executionId, spaceId);

  if (!execution) {
    throw new ExternalResumeError('Workflow execution not found', 404);
  }

  if (execution.status !== ExecutionStatus.WAITING_FOR_INPUT) {
    throw new ExternalResumeError('Workflow execution is not waiting for external input', 409);
  }

  if (execution.finishedAt) {
    throw new ExternalResumeError('This workflow response link is no longer valid', 409);
  }

  return execution.stepExecutions.find(
    (stepExecution) =>
      stepExecution.workflowRunId === executionId &&
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
