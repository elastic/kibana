/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { timingSafeEqual } from 'node:crypto';
import {
  ExecutionStatus,
  HITL_TOKEN_EXPIRES_AT_INPUT_FIELD,
  HITL_TOKEN_HASH_INPUT_FIELD,
  isHitlWaitStepType,
} from '@kbn/workflows';
import type { ResumeWorkflowExecutionResponseDto, WorkflowStepExecutionDto } from '@kbn/workflows';
import {
  WorkflowExecutionInvalidStatusError,
  WorkflowExecutionNotFoundError,
} from '@kbn/workflows/common/errors';
import { computeTokenHmac, EXTERNAL_RESUME_API_PATH } from '@kbn/workflows/server';
import type { JsonModelSchemaType } from '@kbn/workflows/spec/schema/common/json_model_schema';
import { ExternalResumeError } from './external_resume_error';
import {
  buildExternalResumeFormFieldsHtml,
  parseExternalResumeFormBody,
  validateExternalResumeInput,
} from './external_resume_form_fields';
import { renderExternalResumeFormPage } from './render_external_resume_page';
import type { WorkflowsService } from '../workflows_management_service';

export interface ExternalResumeViaGetParams {
  token: string;
  executionId: string;
  stepId: string;
  spaceId: string;
  query: Record<string, unknown>;
}

export interface ExternalResumeWorkflowExecutionWithInputParams {
  token: string;
  executionId: string;
  stepId: string;
  spaceId: string;
  input: Record<string, unknown>;
}

export interface ExternalResumeFormPageParams {
  token: string;
  executionId: string;
  stepId: string;
  spaceId: string;
  basePath: string;
}

interface ResolvedExternalResumeContext {
  stepExecution: WorkflowStepExecutionDto;
}

export async function resumeWorkflowExecutionExternallyViaGet(
  workflowsService: WorkflowsService,
  { token, executionId, stepId, spaceId, query }: ExternalResumeViaGetParams
): Promise<ResumeWorkflowExecutionResponseDto> {
  const { stepExecution } = await resolveExternalResumeContext(workflowsService, {
    token,
    executionId,
    stepId,
    spaceId,
  });

  if (stepExecution.stepType === 'waitForApproval') {
    if (!Object.hasOwn(query, 'approved')) {
      throw new ExternalResumeError('approved query parameter is required', 400, true);
    }

    return resumeWorkflowExecutionWithResolvedContext(workflowsService, {
      stepExecutionId: stepExecution.id,
      executionId,
      spaceId,
      input: { approved: parseApprovedQueryParam(query.approved) },
    });
  }

  if (stepExecution.stepType === 'waitForInput') {
    const schema = getStepInputSchema(stepExecution.input);
    const queryInput = getExternalResumeInputFromQuery(query, schema);
    if (Object.keys(queryInput).length === 0) {
      throw new ExternalResumeError(
        'Query-param resume requires at least one schema field; use the form link instead.',
        400,
        true
      );
    }

    const validatedInput = parseExternalResumeFormSubmission(queryInput, schema);

    return resumeWorkflowExecutionWithResolvedContext(workflowsService, {
      stepExecutionId: stepExecution.id,
      executionId,
      spaceId,
      input: validatedInput,
    });
  }

  throw new ExternalResumeError('This workflow step does not support external resume', 400, true);
}

export async function resumeWorkflowExecutionExternallyWithInput(
  workflowsService: WorkflowsService,
  { token, executionId, stepId, spaceId, input }: ExternalResumeWorkflowExecutionWithInputParams
): Promise<ResumeWorkflowExecutionResponseDto> {
  const { stepExecution } = await resolveExternalResumeContext(workflowsService, {
    token,
    executionId,
    stepId,
    spaceId,
  });

  if (stepExecution.stepType !== 'waitForInput') {
    throw new ExternalResumeError(
      'This workflow step does not accept structured external input',
      400,
      true
    );
  }

  const schema = getStepInputSchema(stepExecution.input);
  const validatedInput = parseExternalResumeFormSubmission(input, schema);

  return resumeWorkflowExecutionWithResolvedContext(workflowsService, {
    stepExecutionId: stepExecution.id,
    executionId,
    spaceId,
    input: validatedInput,
  });
}

export async function getExternalResumeFormPage(
  workflowsService: WorkflowsService,
  { token, executionId, stepId, spaceId, basePath }: ExternalResumeFormPageParams
): Promise<string> {
  const { stepExecution } = await resolveExternalResumeContext(workflowsService, {
    token,
    executionId,
    stepId,
    spaceId,
  });

  if (stepExecution.stepType !== 'waitForInput') {
    throw new ExternalResumeError(
      'This workflow step does not expose an external input form',
      400,
      true
    );
  }

  const stepInput = getStepInputRecord(stepExecution.input);
  const schema = getStepInputSchema(stepExecution.input);
  const message = typeof stepInput.message === 'string' ? stepInput.message : undefined;

  return renderExternalResumeFormPage({
    message,
    formActionUrl: buildExternalResumePublicPath({ basePath, executionId, stepId, token }),
    fieldsHtml: buildExternalResumeFormFieldsHtml(schema),
  });
}

export function buildExternalResumePublicPath({
  basePath,
  executionId,
  stepId,
  token,
  approved,
}: {
  basePath: string;
  executionId: string;
  stepId: string;
  token: string;
  approved?: boolean;
}): string {
  const path = EXTERNAL_RESUME_API_PATH.replace('{executionId}', executionId).replace(
    '{stepId}',
    stepId
  );
  const params = new URLSearchParams();
  params.set('token', token);
  if (approved !== undefined) {
    params.set('approved', String(approved));
  }
  return `${basePath}${path}?${params.toString()}`;
}

export function parseExternalResumeFormSubmission(
  body: Record<string, unknown>,
  schema: JsonModelSchemaType | undefined
): Record<string, unknown> {
  try {
    const parsed = parseExternalResumeFormBody(body, schema);
    return validateExternalResumeInput(parsed, schema);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid form submission';
    throw new ExternalResumeError(message, 400, true);
  }
}

async function resolveExternalResumeContext(
  workflowsService: WorkflowsService,
  {
    token,
    executionId,
    stepId,
    spaceId,
  }: {
    token: string;
    executionId: string;
    stepId: string;
    spaceId: string;
  }
): Promise<ResolvedExternalResumeContext> {
  const stepExecution = await workflowsService.getStepExecution(
    { executionId, id: stepId },
    spaceId
  );
  if (!stepExecution) {
    throw new ExternalResumeError('Workflow execution not found', 404);
  }

  const lookup = validateExternalResumeStepExecution(stepExecution);

  if ('reason' in lookup) {
    throw new ExternalResumeError('This workflow response link is no longer valid', 409);
  }

  const stepInput = getStepInputRecord(stepExecution.input);
  const expiresAt = stepInput[HITL_TOKEN_EXPIRES_AT_INPUT_FIELD];
  const expiresAtMs = typeof expiresAt === 'string' ? Date.parse(expiresAt) : NaN;
  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
    throw new ExternalResumeError('Link expired or already used', 401);
  }

  const storedHash = stepInput[HITL_TOKEN_HASH_INPUT_FIELD];
  if (typeof storedHash !== 'string') {
    throw new ExternalResumeError('Invalid resume token', 401);
  }

  const computed = Buffer.from(
    computeTokenHmac(token, executionId, stepId, String(expiresAt)),
    'hex'
  );
  const stored = Buffer.from(storedHash, 'hex');
  if (computed.length !== stored.length || !timingSafeEqual(computed, stored)) {
    throw new ExternalResumeError('Invalid resume token', 401);
  }

  return { stepExecution };
}

async function resumeWorkflowExecutionWithResolvedContext(
  workflowsService: WorkflowsService,
  {
    stepExecutionId,
    executionId,
    spaceId,
    input,
  }: {
    stepExecutionId: string;
    executionId: string;
    spaceId: string;
    input: Record<string, unknown>;
  }
): Promise<ResumeWorkflowExecutionResponseDto> {
  const workflowsExecutionEngine = await workflowsService.getWorkflowsExecutionEngine();
  const resumedBy = `external_resume:${stepExecutionId}`;

  const claimed = await workflowsService.claimHitlStepForExternalResume(
    stepExecutionId,
    resumedBy,
    spaceId
  );
  if (!claimed) {
    throw new ExternalResumeError('This workflow response link is no longer valid', 409);
  }

  try {
    return await workflowsExecutionEngine.resumeWorkflowExecution(
      executionId,
      spaceId,
      input,
      undefined,
      { resumedBy }
    );
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

type ExternalResumeStepLookupFailureReason = 'step_not_waiting' | 'step_finished';

type ExternalResumeStepLookupResult =
  | { stepExecution: WorkflowStepExecutionDto }
  | { reason: ExternalResumeStepLookupFailureReason };

function validateExternalResumeStepExecution(
  stepExecution: WorkflowStepExecutionDto
): ExternalResumeStepLookupResult {
  if (
    !isHitlWaitStepType(stepExecution.stepType) ||
    stepExecution.status !== ExecutionStatus.WAITING_FOR_INPUT
  ) {
    return { reason: 'step_not_waiting' };
  }

  if (stepExecution.finishedAt || stepExecution.error) {
    return { reason: 'step_finished' };
  }

  return { stepExecution };
}

function getStepInputRecord(input: unknown): Record<string, unknown> {
  if (input != null && typeof input === 'object') {
    return input as Record<string, unknown>;
  }
  return {};
}

function getStepInputSchema(input: unknown): JsonModelSchemaType | undefined {
  const stepInput = getStepInputRecord(input);
  const schema = stepInput.schema;
  if (schema != null && typeof schema === 'object') {
    return schema as JsonModelSchemaType;
  }
  return undefined;
}

function normalizeExternalResumeQueryValue(value: unknown, fieldSchema: unknown): unknown {
  if (!Array.isArray(value)) {
    return value;
  }

  const fieldType = (fieldSchema as { type?: string } | undefined)?.type;
  return fieldType === 'array' ? value : value[0];
}

function getExternalResumeInputFromQuery(
  query: Record<string, unknown>,
  schema: JsonModelSchemaType | undefined
): Record<string, unknown> {
  const properties = schema?.properties ?? {};
  const allowed = new Set(Object.keys(properties));
  const input: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(query)) {
    if (key !== 'token' && allowed.has(key)) {
      input[key] = normalizeExternalResumeQueryValue(value, properties[key]);
    }
  }

  return input;
}

export function parseApprovedQueryParam(value: unknown): boolean {
  if (value === true || value === 'true') {
    return true;
  }

  if (value === false || value === 'false') {
    return false;
  }

  throw new ExternalResumeError('approved query parameter must be true or false', 400, true);
}

export function resolveExternalResumeCredentials(query: { token?: string }): { token: string } {
  const { token } = query;
  if (typeof token !== 'string' || token.length === 0) {
    throw new ExternalResumeError('token query parameter is required', 401);
  }
  return { token };
}
