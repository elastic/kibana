/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import type { VariableItem } from '../model/types';
import { validateVariable } from './validate_variable';

// Mock the imports
jest.mock('../../../../common/lib/parse_variable_path');
jest.mock('../../../../common/lib/zod');
jest.mock('../../workflow_context/lib/get_foreach_state_schema');

import { parseVariablePath } from '../../../../common/lib/parse_variable_path';
import { getSchemaAtPath, getZodTypeName } from '../../../../common/lib/zod';
import { getForeachItemSchema } from '../../workflow_context/lib/get_foreach_state_schema';

const mockParseVariablePath = parseVariablePath as jest.MockedFunction<typeof parseVariablePath>;
const mockGetSchemaAtPath = getSchemaAtPath as jest.MockedFunction<typeof getSchemaAtPath>;
const mockGetZodTypeName = getZodTypeName as jest.MockedFunction<typeof getZodTypeName>;
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
      errors: ['Invalid JSON'],
      propertyPath: null,
    } as any);
    mockGetForeachItemSchema.mockReturnValue(z.array(z.number()));

    const result = validateVariable(variableItem, mockContext);

    expect(result).toMatchObject({
      message: null,
      severity: null,
      owner: 'variable-validation',
      hoverMessage: expect.stringContaining('(property)'),
    });
  });

  it('should handle foreach variables with parse errors that throw', () => {
    const variableItem = createVariableItem({
      key: 'invalid json',
      type: 'foreach',
    });
    mockParseVariablePath.mockReturnValue({
      errors: ['Invalid JSON'],
      propertyPath: null,
    } as any);
    mockGetForeachItemSchema.mockImplementation(() => {
      throw new Error('Invalid JSON');
    });

    const result = validateVariable(variableItem, mockContext);

    expect(result).toMatchObject({
      message: 'Foreach parameter can be an array or a JSON string. invalid json is not valid JSON',
      severity: 'error',
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
    mockGetSchemaAtPath.mockReturnValue(null);

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
    mockGetSchemaAtPath.mockReturnValue(z.string());
    mockGetZodTypeName.mockReturnValue('string');

    const result = validateVariable(variableItem, mockContext);

    expect(result).toMatchObject({
      message:
        'Foreach parameter should be an array or a JSON string. stringVar is unknown string, engine will try to parse it as JSON in runtime, but it might fail',
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
    mockGetSchemaAtPath.mockReturnValue(schema);
    mockGetZodTypeName.mockReturnValue('any');

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
    mockGetSchemaAtPath.mockReturnValue(z.unknown());
    mockGetZodTypeName.mockReturnValue('unknown');

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
    mockGetSchemaAtPath.mockReturnValue(z.string());
    mockGetZodTypeName.mockReturnValue('string');

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
    mockGetSchemaAtPath.mockReturnValue(z.string());
    mockGetZodTypeName.mockReturnValue('string');

    const result = validateVariable(variableItem, mockContext);

    expect(result).toMatchObject({
      message: null,
      severity: null,
      owner: 'variable-validation',
      hoverMessage: expect.stringContaining('(property) response.data.items[0].name:'),
    });
  });
});
