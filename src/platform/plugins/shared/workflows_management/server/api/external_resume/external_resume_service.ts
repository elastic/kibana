/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { FakeRawRequest, Headers } from '@kbn/core-http-server';
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';
import { asSpaceId } from '@kbn/core-spaces-common';
import { ExecutionStatus } from '@kbn/workflows';
import type { ResumeWorkflowExecutionResponseDto, WorkflowStepExecutionDto } from '@kbn/workflows';
import { buildFieldsZodValidator } from '@kbn/workflows/spec/lib/build_fields_zod_validator';
import type { JsonModelSchemaType } from '@kbn/workflows/spec/schema/common/json_model_schema';
import { ExternalResumeError } from './external_resume_error';
import type { WorkflowsService } from '../workflows_management_service';

export interface ExternalResumeWorkflowExecutionParams {
  apiKey: string;
  coerceInput?: boolean;
  executionId: string;
  input: Record<string, unknown>;
  spaceId: string;
}

interface ApiKeyAuthenticateResponse {
  api_key?: {
    id?: string;
    name?: string;
  };
}

export async function resumeWorkflowExecutionExternally(
  workflowsService: WorkflowsService,
  {
    apiKey,
    coerceInput = false,
    executionId,
    input,
    spaceId,
  }: ExternalResumeWorkflowExecutionParams
): Promise<ResumeWorkflowExecutionResponseDto> {
  const coreStart = await workflowsService.getCoreStart();
  const apiKeyRequest = createApiKeyRequest(apiKey, spaceId);
  let authentication: ApiKeyAuthenticateResponse;
  try {
    authentication = (await coreStart.elasticsearch.client
      .asScoped(apiKeyRequest)
      .asCurrentUser.security.authenticate()) as ApiKeyAuthenticateResponse;
  } catch {
    throw new ExternalResumeError('Invalid external resume API key', 401);
  }

  const apiKeyId = getAuthenticatedApiKeyId(authentication, apiKey);
  const stepExecution = await getExternalResumeStepExecution(workflowsService, {
    apiKeyId,
    executionId,
    spaceId,
  });

  if (!stepExecution) {
    throw new ExternalResumeError('API key does not match this workflow execution', 403);
  }

  if (
    stepExecution.status !== ExecutionStatus.WAITING_FOR_INPUT ||
    stepExecution.stepType !== 'waitForInput'
  ) {
    throw new ExternalResumeError('Workflow execution is not waiting for external input', 409);
  }

  if (stepExecution.finishedAt || stepExecution.error) {
    throw new ExternalResumeError('This workflow response link is no longer valid', 409);
  }

  const schema = getWaitForInputSchema(stepExecution.input);
  const validatedInput = validateExternalResumeInput(input, schema, coerceInput);
  const workflowsExecutionEngine = await workflowsService.getWorkflowsExecutionEngine();
  const resumedAt = new Date().toISOString();
  const result = await workflowsExecutionEngine.resumeWorkflowExecution(
    executionId,
    spaceId,
    validatedInput,
    apiKeyRequest,
    {
      resumedAt,
      resumedBy: `api_key:${apiKeyId}`,
    }
  );

  await coreStart.elasticsearch.client.asInternalUser.security.invalidateApiKey({
    ids: [apiKeyId],
  });

  return result;
}

function createApiKeyRequest(apiKey: string, spaceId: string): KibanaRequest {
  const requestHeaders: Headers = {
    authorization: `ApiKey ${apiKey}`,
  };
  const fakeRawRequest: FakeRawRequest = {
    headers: requestHeaders,
    spaceId: asSpaceId(spaceId),
  };
  return kibanaRequestFactory(fakeRawRequest);
}

function getAuthenticatedApiKeyId(
  authentication: ApiKeyAuthenticateResponse,
  encodedApiKey: string
): string {
  const id = authentication.api_key?.id ?? decodeApiKeyId(encodedApiKey);

  if (!id) {
    throw new ExternalResumeError('Invalid external resume API key', 401);
  }

  return id;
}

function decodeApiKeyId(encodedApiKey: string): string | undefined {
  try {
    const decoded = Buffer.from(encodedApiKey, 'base64').toString('utf8');
    const [id] = decoded.split(':');
    return id || undefined;
  } catch {
    return undefined;
  }
}

async function getExternalResumeStepExecution(
  workflowsService: WorkflowsService,
  {
    apiKeyId,
    executionId,
    spaceId,
  }: {
    apiKeyId: string;
    executionId: string;
    spaceId: string;
  }
): Promise<WorkflowStepExecutionDto | undefined> {
  const execution = await workflowsService.getWorkflowExecution(executionId, spaceId, {
    includeInput: true,
  });

  if (!execution) {
    throw new ExternalResumeError('Workflow execution not found', 404);
  }

  return execution.stepExecutions.find(
    (stepExecution) =>
      stepExecution.workflowRunId === executionId &&
      stepExecution.stepType === 'waitForInput' &&
      getExternalResumeApiKeyId(stepExecution.input) === apiKeyId
  );
}

export function getExternalResumeApiKeyId(input: unknown): string | undefined {
  if (input == null || typeof input !== 'object' || !('externalResumeApiKeyId' in input)) {
    return undefined;
  }

  const apiKeyId = (input as { externalResumeApiKeyId?: unknown }).externalResumeApiKeyId;
  return typeof apiKeyId === 'string' && apiKeyId.length > 0 ? apiKeyId : undefined;
}

function getWaitForInputSchema(input: unknown): JsonModelSchemaType | undefined {
  if (input == null || typeof input !== 'object' || !('schema' in input)) {
    return undefined;
  }

  const schema = (input as { schema?: unknown }).schema;
  if (schema == null || typeof schema !== 'object' || Array.isArray(schema)) {
    return undefined;
  }

  return schema as JsonModelSchemaType;
}

function validateExternalResumeInput(
  input: Record<string, unknown>,
  jsonSchema: JsonModelSchemaType | undefined,
  coerceInput: boolean
): Record<string, unknown> {
  const inputToValidate = coerceInput ? coerceInputFromSchema(input, jsonSchema) : input;
  const result = buildFieldsZodValidator(jsonSchema).safeParse(inputToValidate);

  if (!result.success) {
    throw new ExternalResumeError(
      `Resume input does not match waitForInput schema: ${result.error.message}`,
      400
    );
  }

  return result.data;
}

function coerceInputFromSchema(
  input: Record<string, unknown>,
  jsonSchema: JsonModelSchemaType | undefined
): Record<string, unknown> {
  if (!jsonSchema?.properties) {
    return input;
  }

  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [
      key,
      coerceValue(value, jsonSchema.properties?.[key]),
    ])
  );
}

function coerceValue(value: unknown, propertySchema: unknown): unknown {
  if (
    propertySchema == null ||
    typeof propertySchema !== 'object' ||
    Array.isArray(propertySchema)
  ) {
    return value;
  }

  const { type, items } = propertySchema as { items?: unknown; type?: string | string[] };
  const targetTypes = Array.isArray(type) ? type : type ? [type] : [];

  if (Array.isArray(value)) {
    return value.map((item) => coerceValue(item, items));
  }

  if (typeof value !== 'string') {
    return value;
  }

  if (targetTypes.includes('boolean')) {
    if (value === 'true') return true;
    if (value === 'false') return false;
  }

  if (targetTypes.includes('number') || targetTypes.includes('integer')) {
    const numberValue = Number(value);
    if (!Number.isNaN(numberValue)) {
      return numberValue;
    }
  }

  if (targetTypes.includes('object') || targetTypes.includes('array')) {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  return value;
}
