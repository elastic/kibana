/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';

// Mock the imports
jest.mock('../../../../common/lib/parse_variable_path');
jest.mock('../../../../common/lib/zod');
jest.mock('../../workflow_context/lib/get_foreach_state_schema');

import { validateVariable } from './validate_variable';
import { parseVariablePath } from '../../../../common/lib/parse_variable_path';
import { getSchemaAtPath } from '../../../../common/lib/zod';
import {
  InvalidForeachParameterError,
  InvalidForeachParameterErrorCodes,
} from '../../workflow_context/lib/errors';
import { getForeachItemSchema } from '../../workflow_context/lib/get_foreach_state_schema';
import type { VariableItem } from '../model/types';

const mockParseVariablePath = parseVariablePath as jest.MockedFunction<typeof parseVariablePath>;
const mockGetSchemaAtPath = getSchemaAtPath as jest.MockedFunction<typeof getSchemaAtPath>;
const mockGetForeachItemSchema = getForeachItemSchema as jest.MockedFunction<
  typeof getForeachItemSchema
>;

describe('validateVariable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createVariableItem = (overrides: Partial<VariableItem> = {}): VariableItem => ({
    id: 'test-id',
    type: 'regexp',
    key: 'test.variable',
    startLineNumber: 1,
    startColumn: 1,
    endLineNumber: 1,
    endColumn: 10,
    yamlPath: ['steps', 0, 'params', 'value'],
    ...overrides,
  });

  const mockContext = z.object({
    test: z.object({
      variable: z.string(),
    }),
  }) as any;

  it('should return error when variable key is not defined', () => {
    const variableItem = createVariableItem({ key: null });

    const result = validateVariable(variableItem, mockContext);

    expect(result).toMatchObject({
      message: 'Variable is not defined',
      severity: 'error',
      owner: 'variable-validation',
      hoverMessage: null,
    });
  });

  it('should return error when variable path cannot be parsed', () => {
    const variableItem = createVariableItem({ key: 'invalid.path' });
    mockParseVariablePath.mockReturnValue(null);

    const result = validateVariable(variableItem, mockContext);

    expect(result).toMatchObject({
      message: 'Invalid variable path: invalid.path',
      severity: 'error',
      owner: 'variable-validation',
      hoverMessage: null,
    });
  });

  it('should handle foreach variables with parse errors and context', () => {
    const variableItem = createVariableItem({
      key: '{"items": [1,2,3]}',
      type: 'foreach',
    });
    mockParseVariablePath.mockReturnValue({
      errors: ['Invalid property path'],
      propertyPath: null,
    } as any);
    mockGetForeachItemSchema.mockImplementation(() => {
      throw new InvalidForeachParameterError(
        'Unable to parse foreach parameter as JSON',
        InvalidForeachParameterErrorCodes.INVALID_JSON
      );
    });

    const result = validateVariable(variableItem, mockContext);

    expect(result).toMatchObject({
      message: 'Unable to parse foreach parameter as JSON',
      severity: 'warning',
      owner: 'variable-validation',
      hoverMessage: null,
    });
  });

  it('should return parse errors for non-foreach variables', () => {
    const variableItem = createVariableItem({ key: 'test.variable' });
    mockParseVariablePath.mockReturnValue({
      errors: ['Missing closing bracket', 'Invalid character'],
      propertyPath: null,
    } as any);

    const result = validateVariable(variableItem, mockContext);

    expect(result).toMatchObject({
      message: 'Missing closing bracket, Invalid character',
      severity: 'error',
      owner: 'variable-validation',
      hoverMessage: null,
    });
  });

  it('should return error when propertyPath is missing', () => {
    const variableItem = createVariableItem({ key: 'test' });
    mockParseVariablePath.mockReturnValue({
      errors: null,
      propertyPath: null,
    } as any);

    const result = validateVariable(variableItem, mockContext);

    expect(result).toMatchObject({
      message: 'Failed to parse variable path',
      severity: 'error',
      owner: 'variable-validation',
      hoverMessage: null,
    });
  });

  it('should return warning when context is null', () => {
    const variableItem = createVariableItem({ key: 'test.variable' });
    mockParseVariablePath.mockReturnValue({
      errors: null,
      propertyPath: 'test.variable',
    } as any);

    const result = validateVariable(variableItem, null);

    expect(result).toMatchObject({
      message: 'Variable test.variable cannot be validated, because the workflow schema is invalid',
      severity: 'warning',
      owner: 'variable-validation',
      hoverMessage: null,
    });
  });

  it('should return error when schema is not found at path', () => {
    const variableItem = createVariableItem({ key: 'nonexistent.variable' });
    mockParseVariablePath.mockReturnValue({
      errors: null,
      propertyPath: 'nonexistent.variable',
    } as any);
    mockGetSchemaAtPath.mockReturnValue({ schema: null, scopedToPath: null });

    const result = validateVariable(variableItem, mockContext);

    expect(result).toMatchObject({
      message: 'Variable nonexistent.variable is invalid',
      severity: 'error',
      owner: 'variable-validation',
      hoverMessage: null,
    });
  });

  it('should return warning for string type with foreach', () => {
    const variableItem = createVariableItem({
      key: 'stringVar',
      type: 'foreach',
    });
    mockParseVariablePath.mockReturnValue({
      errors: null,
      propertyPath: 'stringVar',
    } as any);
    mockGetSchemaAtPath.mockReturnValue({ schema: z.string(), scopedToPath: null });
    mockGetForeachItemSchema.mockReturnValue(
      z.unknown().describe('Unable to determine foreach item type')
    );
    const result = validateVariable(variableItem, mockContext);
    expect(result).toMatchObject({
      message: 'Unable to determine foreach item type',
      severity: 'warning',
      owner: 'variable-validation',
      hoverMessage: expect.stringContaining('(property)'),
    });
  });

  it('should return warning with description for any type', () => {
    const schema = z.any().describe('This variable comes from external source');

    const variableItem = createVariableItem({ key: 'externalVar' });
    mockParseVariablePath.mockReturnValue({
      errors: null,
      propertyPath: 'externalVar',
    } as any);
    mockGetSchemaAtPath.mockReturnValue({ schema, scopedToPath: 'externalVar' });

    const result = validateVariable(variableItem, mockContext);

    expect(result).toMatchObject({
      message: 'This variable comes from external source',
      severity: 'warning',
      owner: 'variable-validation',
      hoverMessage: expect.stringContaining('(property)'),
    });
  });

  it('should return warning for unknown type', () => {
    const variableItem = createVariableItem({ key: 'unknownVar' });
    mockParseVariablePath.mockReturnValue({
      errors: null,
      propertyPath: 'unknownVar',
    } as any);
    mockGetSchemaAtPath.mockReturnValue({ schema: z.unknown(), scopedToPath: null });

    const result = validateVariable(variableItem, mockContext);

    expect(result).toMatchObject({
      message: "Variable unknownVar cannot be validated, because it's type is unknown",
      severity: 'warning',
      owner: 'variable-validation',
      hoverMessage: expect.stringContaining('(property) unknownVar:'),
    });
  });

  it('should return valid result with hover message for valid variable', () => {
    const variableItem = createVariableItem({ key: 'test.variable' });
    mockParseVariablePath.mockReturnValue({
      errors: null,
      propertyPath: 'test.variable',
    } as any);
    mockGetSchemaAtPath.mockReturnValue({ schema: z.string(), scopedToPath: 'test.variable' });

    const result = validateVariable(variableItem, mockContext);

    expect(result).toMatchObject({
      message: null,
      severity: null,
      owner: 'variable-validation',
      hoverMessage: expect.stringContaining('(property) test.variable:'),
    });
  });

  it('should handle complex nested paths', () => {
    const variableItem = createVariableItem({ key: 'response.data.items[0].name' });
    mockParseVariablePath.mockReturnValue({
      errors: null,
      propertyPath: 'response.data.items[0].name',
    } as any);
    mockGetSchemaAtPath.mockReturnValue({
      schema: z.string(),
      scopedToPath: 'response.data.items[0].name',
    });

    const result = validateVariable(variableItem, mockContext);

    expect(result).toMatchObject({
      message: null,
      severity: null,
      owner: 'variable-validation',
      hoverMessage: expect.stringContaining('(property) response.data.items[0].name:'),
    });
  });

  it('should handle array input with default value in foreach validation', () => {
    const variableItem = createVariableItem({
      key: 'inputs.days_to_plan',
      type: 'foreach',
    });
    mockParseVariablePath.mockReturnValue({
      errors: null,
      propertyPath: 'inputs.days_to_plan',
    } as any);
    // Mock the schema as an array with default value (ZodDefault wrapper)
    mockGetSchemaAtPath.mockReturnValue({
      schema: z.array(z.string()).default(['monday', 'tuesday']),
      scopedToPath: 'inputs.days_to_plan',
    });
    mockGetForeachItemSchema.mockReturnValue(z.string());

    const result = validateVariable(variableItem, mockContext);

    expect(result).toMatchObject({
      message: null,
      severity: null,
      owner: 'variable-validation',
      hoverMessage: expect.stringContaining('(property) inputs.days_to_plan:'),
    });
  });

  it('should handle array input without default value in foreach validation', () => {
    const variableItem = createVariableItem({
      key: 'inputs.items',
      type: 'foreach',
    });
    mockParseVariablePath.mockReturnValue({
      errors: null,
      propertyPath: 'inputs.items',
    } as any);
    // Mock the schema as a plain array without default
    mockGetSchemaAtPath.mockReturnValue({
      schema: z.array(z.string()),
      scopedToPath: 'inputs.items',
    });

    const result = validateVariable(variableItem, mockContext);

    expect(result).toMatchObject({
      message: null,
      severity: null,
      owner: 'variable-validation',
      hoverMessage: expect.stringContaining('(property) inputs.items:'),
    });
  });
});
