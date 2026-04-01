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
import { validateWorkflowInputs } from './validate_workflow_inputs';
import type { WorkflowExecutionRepository } from '../repositories/workflow_execution_repository';

describe('validateWorkflowInputs', () => {
  const executionId = 'exec-123';
  let mockRepository: jest.Mocked<Pick<WorkflowExecutionRepository, 'updateWorkflowExecution'>>;
  let mockLogger: jest.Mocked<Pick<Logger, 'error'>>;

  const makeWorkflow = (inputs?: Record<string, unknown>): WorkflowExecutionEngineModel => ({
    id: 'workflow-1',
    name: 'Test Workflow',
    enabled: true,
    definition: {
      name: 'Test Workflow',
      enabled: true,
      version: '1',
      triggers: [],
      steps: [],
      ...(inputs !== undefined ? { inputs } : {}),
    },
    yaml: '',
  });

  const callValidate = (workflow: WorkflowExecutionEngineModel, context: Record<string, unknown>) =>
    validateWorkflowInputs(
      workflow,
      context,
      executionId,
      mockRepository as unknown as WorkflowExecutionRepository,
      mockLogger as unknown as Logger
    );

  beforeEach(() => {
    mockRepository = {
      updateWorkflowExecution: jest.fn().mockResolvedValue(undefined),
    };
    mockLogger = {
      error: jest.fn(),
    };
  });

  it('should return true when workflow has no input definition', async () => {
    const result = await callValidate(makeWorkflow(), { inputs: {} });

    expect(result).toBe(true);
    expect(mockRepository.updateWorkflowExecution).not.toHaveBeenCalled();
  });

  it('should return true when input definition has no properties', async () => {
    const result = await callValidate(makeWorkflow({ required: ['name'] }), { inputs: {} });

    expect(result).toBe(true);
    expect(mockRepository.updateWorkflowExecution).not.toHaveBeenCalled();
  });

  it('should return true when all required inputs are provided', async () => {
    const workflow = makeWorkflow({
      properties: {
        name: { type: 'string' },
        count: { type: 'number' },
      },
      required: ['name'],
    });

    const result = await callValidate(workflow, { inputs: { name: 'hello', count: 5 } });

    expect(result).toBe(true);
    expect(mockRepository.updateWorkflowExecution).not.toHaveBeenCalled();
  });

  it('should return true when optional inputs are omitted', async () => {
    const workflow = makeWorkflow({
      properties: {
        name: { type: 'string' },
        optionalField: { type: 'string' },
      },
      required: ['name'],
    });

    const result = await callValidate(workflow, { inputs: { name: 'hello' } });

    expect(result).toBe(true);
  });

  it('should return true when a required input has a default and is not provided', async () => {
    const workflow = makeWorkflow({
      properties: {
        name: { type: 'string', default: 'default-name' },
      },
      required: ['name'],
    });

    const result = await callValidate(workflow, { inputs: {} });

    expect(result).toBe(true);
  });

  it('should return false and mark execution as FAILED when a required input is missing', async () => {
    const workflow = makeWorkflow({
      properties: {
        name: { type: 'string' },
      },
      required: ['name'],
    });

    const result = await callValidate(workflow, { inputs: {} });

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
    const workflow = makeWorkflow({
      properties: {
        count: { type: 'number' },
      },
      required: ['count'],
    });

    const result = await callValidate(workflow, { inputs: { count: 'not-a-number' } });

    expect(result).toBe(false);
    expect(mockRepository.updateWorkflowExecution).toHaveBeenCalledWith(
      expect.objectContaining({
        id: executionId,
        status: ExecutionStatus.FAILED,
      })
    );
  });

  it('should return false on invalid enum value', async () => {
    const workflow = makeWorkflow({
      properties: {
        severity: { type: 'string', enum: ['low', 'medium', 'high'] },
      },
      required: ['severity'],
    });

    const result = await callValidate(workflow, { inputs: { severity: 'critical' } });

    expect(result).toBe(false);
    expect(mockRepository.updateWorkflowExecution).toHaveBeenCalledWith(
      expect.objectContaining({
        status: ExecutionStatus.FAILED,
        error: expect.objectContaining({ type: 'InputValidationError' }),
      })
    );
  });

  it('should return true with valid enum value', async () => {
    const workflow = makeWorkflow({
      properties: {
        severity: { type: 'string', enum: ['low', 'medium', 'high'] },
      },
      required: ['severity'],
    });

    const result = await callValidate(workflow, { inputs: { severity: 'medium' } });

    expect(result).toBe(true);
  });

  it('should apply defaults before validation', async () => {
    const workflow = makeWorkflow({
      properties: {
        name: { type: 'string' },
        greeting: { type: 'string', default: 'hello' },
      },
      required: ['name', 'greeting'],
    });

    const result = await callValidate(workflow, { inputs: { name: 'test' } });

    expect(result).toBe(true);
  });

  it('should return false and log error when updateWorkflowExecution fails', async () => {
    mockRepository.updateWorkflowExecution.mockRejectedValueOnce(new Error('ES unavailable'));

    const workflow = makeWorkflow({
      properties: {
        name: { type: 'string' },
      },
      required: ['name'],
    });

    const result = await callValidate(workflow, { inputs: {} });

    expect(result).toBe(false);
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining(`Failed to mark execution ${executionId} as FAILED`)
    );
  });

  it('should return true when context.inputs is missing', async () => {
    const workflow = makeWorkflow({
      properties: {
        optionalField: { type: 'string' },
      },
    });

    const result = await callValidate(workflow, {});

    expect(result).toBe(true);
  });
});
