/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';
import type { WorkflowExecutionEngineModel } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import { getInputsFromDefinition } from '@kbn/workflows/spec/lib/field_conversion';
import type { JsonModelSchemaType } from '@kbn/workflows/spec/schema/common/json_model_schema';
import { featureFlags, validateWorkflowInputs } from './validate_workflow_inputs';
import type { WorkflowExecutionRepository } from '../repositories/workflow_execution_repository';

const makeDocumentParsingException = () => {
  const err = new Error('document_parsing_exception');
  (err as { meta?: unknown }).meta = {
    body: { error: { type: 'document_parsing_exception' } },
  };
  return err;
};

jest.mock('@kbn/workflows/spec/lib/field_conversion', () => ({
  ...jest.requireActual('@kbn/workflows/spec/lib/field_conversion'),
  getInputsFromDefinition: jest.fn(),
}));

const mockGetInputsFromDefinition = getInputsFromDefinition as jest.MockedFunction<
  typeof getInputsFromDefinition
>;

describe('validateWorkflowInputs', () => {
  const executionId = 'exec-123';
  let mockRepository: jest.Mocked<Pick<WorkflowExecutionRepository, 'updateWorkflowExecution'>>;
  let mockLogger: jest.Mocked<Pick<Logger, 'error'>>;

  // Format-shape coverage (legacy array vs JSON Schema, root-level vs trigger-level
  // inputs, multiple manual triggers) is owned by the `getInputsFromDefinition` unit
  // tests in `field_conversion.test.ts`. Tests here mock that helper and only verify
  // the validator's own logic against whatever schema it returns.
  const stubWorkflow: WorkflowExecutionEngineModel = {
    id: 'workflow-1',
    name: 'Test Workflow',
    enabled: true,
    definition: {
      name: 'Test Workflow',
      enabled: true,
      version: '1',
      triggers: [],
      steps: [],
    },
    yaml: '',
  };

  const callValidate = (workflow: WorkflowExecutionEngineModel, context: Record<string, unknown>) =>
    validateWorkflowInputs(
      workflow,
      context,
      executionId,
      mockRepository as unknown as WorkflowExecutionRepository,
      mockLogger as unknown as Logger
    );

  const setInputsSchema = (schema: JsonModelSchemaType | undefined) => {
    mockGetInputsFromDefinition.mockReturnValue(schema);
  };

  beforeEach(() => {
    mockRepository = {
      updateWorkflowExecution: jest.fn().mockResolvedValue(undefined),
    };
    mockLogger = {
      error: jest.fn(),
    };
    mockGetInputsFromDefinition.mockReset();
    mockGetInputsFromDefinition.mockReturnValue(undefined);
  });

  it('should return true when workflow has no input definition', async () => {
    const result = await callValidate(stubWorkflow, { inputs: {} });

    expect(result).toBe(true);
    expect(mockRepository.updateWorkflowExecution).not.toHaveBeenCalled();
  });

  it('should return true when input definition has no properties', async () => {
    setInputsSchema({ required: ['name'] } as JsonModelSchemaType);

    const result = await callValidate(stubWorkflow, { inputs: {} });

    expect(result).toBe(true);
    expect(mockRepository.updateWorkflowExecution).not.toHaveBeenCalled();
  });

  it('should return true when all required inputs are provided', async () => {
    setInputsSchema({
      properties: {
        name: { type: 'string' },
        count: { type: 'number' },
      },
      required: ['name'],
    });

    const result = await callValidate(stubWorkflow, { inputs: { name: 'hello', count: 5 } });

    expect(result).toBe(true);
    expect(mockRepository.updateWorkflowExecution).not.toHaveBeenCalled();
  });

  it('should return true when optional inputs are omitted', async () => {
    setInputsSchema({
      properties: {
        name: { type: 'string' },
        optionalField: { type: 'string' },
      },
      required: ['name'],
    });

    const result = await callValidate(stubWorkflow, { inputs: { name: 'hello' } });

    expect(result).toBe(true);
  });

  it('should return true when a required input has a default and is not provided', async () => {
    setInputsSchema({
      properties: {
        name: { type: 'string', default: 'default-name' },
      },
      required: ['name'],
    });

    const result = await callValidate(stubWorkflow, { inputs: {} });

    expect(result).toBe(true);
  });

  it('should return false and mark execution as FAILED when a required input is missing', async () => {
    setInputsSchema({
      properties: {
        name: { type: 'string' },
      },
      required: ['name'],
    });

    const result = await callValidate(stubWorkflow, { inputs: {} });

    expect(result).toBe(false);
    expect(mockRepository.updateWorkflowExecution).toHaveBeenCalledWith({
      id: executionId,
      status: ExecutionStatus.FAILED,
      error: {
        type: 'InputValidationError',
        message: expect.stringContaining('Workflow input validation failed'),
      },
    });
  });

  it('should return false and mark execution as FAILED on type mismatch', async () => {
    setInputsSchema({
      properties: {
        count: { type: 'number' },
      },
      required: ['count'],
    });

    const result = await callValidate(stubWorkflow, { inputs: { count: 'not-a-number' } });

    expect(result).toBe(false);
    expect(mockRepository.updateWorkflowExecution).toHaveBeenCalledWith(
      expect.objectContaining({
        id: executionId,
        status: ExecutionStatus.FAILED,
      })
    );
  });

  it('should return false on invalid enum value', async () => {
    setInputsSchema({
      properties: {
        severity: { type: 'string', enum: ['low', 'medium', 'high'] },
      },
      required: ['severity'],
    });

    const result = await callValidate(stubWorkflow, { inputs: { severity: 'critical' } });

    expect(result).toBe(false);
    expect(mockRepository.updateWorkflowExecution).toHaveBeenCalledWith(
      expect.objectContaining({
        status: ExecutionStatus.FAILED,
        error: expect.objectContaining({ type: 'InputValidationError' }),
      })
    );
  });

  it('should return true with valid enum value', async () => {
    setInputsSchema({
      properties: {
        severity: { type: 'string', enum: ['low', 'medium', 'high'] },
      },
      required: ['severity'],
    });

    const result = await callValidate(stubWorkflow, { inputs: { severity: 'medium' } });

    expect(result).toBe(true);
  });

  it('should apply defaults before validation', async () => {
    setInputsSchema({
      properties: {
        name: { type: 'string' },
        greeting: { type: 'string', default: 'hello' },
      },
      required: ['name', 'greeting'],
    });

    const result = await callValidate(stubWorkflow, { inputs: { name: 'test' } });

    expect(result).toBe(true);
  });

  it('should return false and log error when updateWorkflowExecution fails', async () => {
    mockRepository.updateWorkflowExecution.mockRejectedValueOnce(new Error('ES unavailable'));

    setInputsSchema({
      properties: {
        name: { type: 'string' },
      },
      required: ['name'],
    });

    const result = await callValidate(stubWorkflow, { inputs: {} });

    expect(result).toBe(false);
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining(`Failed to mark execution ${executionId} as FAILED`)
    );
  });

  it('should return true when context.inputs is missing', async () => {
    setInputsSchema({
      properties: {
        optionalField: { type: 'string' },
      },
    });

    const result = await callValidate(stubWorkflow, {});

    expect(result).toBe(true);
  });

  describe('with legacy `error: text` index mapping (document_parsing_exception)', () => {
    afterEach(() => {
      featureFlags.legacyErrorMappingFallback = false;
    });

    const missingRequiredSchema = (): JsonModelSchemaType => ({
      properties: { name: { type: 'string' } },
      required: ['name'],
    });

    it('does not retry and logs the failure when the flag is off', async () => {
      featureFlags.legacyErrorMappingFallback = false;
      mockRepository.updateWorkflowExecution.mockRejectedValueOnce(makeDocumentParsingException());
      setInputsSchema(missingRequiredSchema());

      const result = await callValidate(stubWorkflow, { inputs: {} });

      expect(result).toBe(false);
      expect(mockRepository.updateWorkflowExecution).toHaveBeenCalledTimes(1);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining(`Failed to mark execution ${executionId} as FAILED`)
      );
    });

    it('retries the update with a stringified error and succeeds when the flag is on', async () => {
      featureFlags.legacyErrorMappingFallback = true;
      mockRepository.updateWorkflowExecution
        .mockRejectedValueOnce(makeDocumentParsingException())
        .mockResolvedValueOnce(undefined);
      setInputsSchema(missingRequiredSchema());

      const result = await callValidate(stubWorkflow, { inputs: {} });

      expect(result).toBe(false);
      expect(mockRepository.updateWorkflowExecution).toHaveBeenCalledTimes(2);

      const firstCall = mockRepository.updateWorkflowExecution.mock.calls[0][0];
      expect(firstCall.error).toEqual({
        type: 'InputValidationError',
        message: expect.stringContaining('Workflow input validation failed'),
      });

      const retryCall = mockRepository.updateWorkflowExecution.mock.calls[1][0];
      expect(retryCall.status).toBe(ExecutionStatus.FAILED);
      expect(typeof retryCall.error).toBe('string');
      expect(retryCall.error).toEqual(expect.stringContaining('InputValidationError'));
      expect(retryCall.error).toEqual(expect.stringContaining('Workflow input validation failed'));
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('does not retry on unrelated update errors even when the flag is on', async () => {
      featureFlags.legacyErrorMappingFallback = true;
      mockRepository.updateWorkflowExecution.mockRejectedValueOnce(new Error('ES unavailable'));
      setInputsSchema(missingRequiredSchema());

      const result = await callValidate(stubWorkflow, { inputs: {} });

      expect(result).toBe(false);
      expect(mockRepository.updateWorkflowExecution).toHaveBeenCalledTimes(1);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining(`Failed to mark execution ${executionId} as FAILED`)
      );
    });
  });
});
