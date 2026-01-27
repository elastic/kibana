/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowYaml } from '@kbn/workflows';
import { WorkflowGraph } from '@kbn/workflows/graph';

// Mock the imports
jest.mock('../../workflow_context/lib/get_context_for_path');
jest.mock('./validate_variable');

import { validateVariable } from './validate_variable';
import { validateVariables } from './validate_variables';
import { getContextSchemaForPath } from '../../workflow_context/lib/get_context_for_path';
import type { VariableItem, YamlValidationResult } from '../model/types';

const mockGetContextSchemaForPath = getContextSchemaForPath as jest.MockedFunction<
  typeof getContextSchemaForPath
>;
const mockValidateVariable = validateVariable as jest.MockedFunction<typeof validateVariable>;

describe('validateVariables', () => {
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

  const mockWorkflowDefinition = {
    name: 'Test Workflow',
    version: '1',
    enabled: true,
    triggers: [{ type: 'manual' }],
    steps: [
      {
        name: 'Test Step',
        type: 'test',
        with: {
          value: '{{test.variable}}',
        },
      },
    ],
  } as WorkflowYaml;

  const mockWorkflowGraph = WorkflowGraph.fromWorkflowDefinition(mockWorkflowDefinition);

  it('should return array of validation results when no variables have errors', () => {
    const variables = [
      createVariableItem({ key: 'var1' }),
      createVariableItem({ key: 'var2' }),
      createVariableItem({ key: 'var3' }),
    ];

    mockGetContextSchemaForPath.mockReturnValue({} as any);
    mockValidateVariable.mockReturnValue({} as YamlValidationResult); // No errors

    const result = validateVariables(variables, mockWorkflowGraph, mockWorkflowDefinition);

    expect(result).toHaveLength(3);
    expect(mockValidateVariable).toHaveBeenCalledTimes(3);
  });

  it('should collect errors from variable validation', () => {
    const variables = [
      createVariableItem({ key: 'validVar' }),
      createVariableItem({ key: 'invalidVar' }),
      createVariableItem({ key: 'anotherInvalidVar' }),
    ];

    mockGetContextSchemaForPath.mockReturnValue({} as any);

    mockValidateVariable
      .mockReturnValueOnce({
        id: 'validVar',
        message: null,
        severity: null,
        source: 'variable-validation',
        hoverMessage: null,
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: 1,
        endColumn: 10,
        owner: 'variable-validation',
      }) // First variable is valid
      .mockReturnValueOnce({
        id: 'error-1',
        message: 'Variable invalidVar is invalid',
        severity: 'error',
        source: 'variable-validation',
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: 1,
        endColumn: 10,
        hoverMessage: null,
        owner: 'variable-validation',
      })
      .mockReturnValueOnce({
        id: 'error-2',
        message: 'Variable anotherInvalidVar is invalid',
        severity: 'error',
        source: 'variable-validation',
        startLineNumber: 2,
        startColumn: 1,
        endLineNumber: 2,
        endColumn: 10,
        hoverMessage: null,
        owner: 'variable-validation',
      });

    const result = validateVariables(variables, mockWorkflowGraph, mockWorkflowDefinition);

    expect(result).toHaveLength(3);
    expect(result[0].message).toBe(null);
    expect(result[1].message).toBe('Variable invalidVar is invalid');
    expect(result[2].message).toBe('Variable anotherInvalidVar is invalid');
  });

  it('should handle context schema errors', () => {
    const variables = [createVariableItem({ key: 'var1', yamlPath: ['invalid', 'path'] })];

    mockGetContextSchemaForPath.mockImplementation(() => {
      throw new Error('Invalid path');
    });

    const result = validateVariables(variables, mockWorkflowGraph, mockWorkflowDefinition);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      message: 'Failed to get context schema for path',
      severity: 'error',
      owner: 'variable-validation',
      hoverMessage: null,
      key: 'var1',
    });
    expect(mockValidateVariable).not.toHaveBeenCalled();
  });

  it('should process mixed valid and invalid variables', () => {
    const variables = [
      createVariableItem({ key: 'valid1' }),
      createVariableItem({ key: 'invalid1' }),
      createVariableItem({ key: 'valid2' }),
      createVariableItem({ key: 'contextError' }),
      createVariableItem({ key: 'invalid2' }),
    ];

    mockGetContextSchemaForPath
      .mockReturnValueOnce({} as any) // valid1
      .mockReturnValueOnce({} as any) // invalid1
      .mockReturnValueOnce({} as any) // valid2
      .mockImplementationOnce(() => {
        throw new Error('Context error');
      }) // contextError
      .mockReturnValueOnce({} as any); // invalid2

    mockValidateVariable
      .mockReturnValueOnce({
        id: 'valid1',
        message: null,
        severity: null,
        source: 'variable-validation',
        hoverMessage: null,
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: 1,
        endColumn: 10,
        owner: 'variable-validation',
      }) // valid1
      .mockReturnValueOnce({
        id: 'error-1',
        message: 'Variable invalid1 is invalid',
        severity: 'error',
        source: 'variable-validation',
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: 1,
        endColumn: 10,
        hoverMessage: null,
        owner: 'variable-validation',
      })
      .mockReturnValueOnce({
        id: 'valid2',
        message: null,
        severity: null,
        source: 'variable-validation',
        hoverMessage: null,
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: 1,
        endColumn: 10,
        owner: 'variable-validation',
      }) // valid2
      .mockReturnValueOnce({
        id: 'error-2',
        message: 'Variable invalid2 is invalid',
        severity: 'warning',
        source: 'variable-validation',
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: 1,
        endColumn: 10,
        hoverMessage: 'Type info',
        owner: 'variable-validation',
      });

    const result = validateVariables(variables, mockWorkflowGraph, mockWorkflowDefinition);

    expect(result).toHaveLength(5);
    expect(result[0].message).toBe(null);
    expect(result[1].message).toBe('Variable invalid1 is invalid');
    expect(result[2].message).toBe(null);
    expect(result[3].message).toBe('Failed to get context schema for path');
    expect(result[3].severity).toBe('error');
    expect(result[4].message).toBe('Variable invalid2 is invalid');
    expect(result[4].severity).toBe('warning');
  });

  it('should handle empty variable list', () => {
    const result = validateVariables([], mockWorkflowGraph, mockWorkflowDefinition);

    expect(result).toEqual([]);
    expect(mockGetContextSchemaForPath).not.toHaveBeenCalled();
    expect(mockValidateVariable).not.toHaveBeenCalled();
  });

  it('should pass correct parameters to validateVariable', () => {
    const variable = createVariableItem({
      key: 'test.deep.variable',
      yamlPath: ['steps', 0, 'params', 'value'],
    });

    const mockContext = { someSchema: true };
    mockGetContextSchemaForPath.mockReturnValue(mockContext as any);
    mockValidateVariable.mockReturnValue({} as YamlValidationResult);

    validateVariables([variable], mockWorkflowGraph, mockWorkflowDefinition);

    expect(mockGetContextSchemaForPath).toHaveBeenCalledWith(
      mockWorkflowDefinition,
      mockWorkflowGraph,
      ['steps', 0, 'params', 'value'],
      undefined
    );
    expect(mockValidateVariable).toHaveBeenCalledWith(variable, mockContext);
  });

  it('should handle foreach variables', () => {
    const foreachVariable = createVariableItem({
      key: 'items',
      type: 'foreach',
      yamlPath: ['steps', 0, 'foreach'],
    });

    mockGetContextSchemaForPath.mockReturnValue({} as any);
    mockValidateVariable.mockReturnValue({
      id: 'foreach-error',
      message: 'Foreach parameter can be an array or a JSON string',
      severity: 'warning',
      source: 'variable-validation',
      startLineNumber: 1,
      startColumn: 1,
      endLineNumber: 1,
      endColumn: 10,
      hoverMessage: '<pre>(property) items: array</pre>',
      owner: 'variable-validation',
    });

    const result = validateVariables([foreachVariable], mockWorkflowGraph, mockWorkflowDefinition);

    expect(result).toHaveLength(1);
    expect(result[0].message).toContain('Foreach parameter');
  });

  it('should preserve all properties from validation errors', () => {
    const variable = createVariableItem({
      key: 'test.var',
      startLineNumber: 5,
      startColumn: 10,
      endLineNumber: 5,
      endColumn: 20,
    });

    mockGetContextSchemaForPath.mockReturnValue({} as any);
    mockValidateVariable.mockReturnValue({
      id: 'test-error',
      message: 'Test error message',
      severity: 'error',
      startLineNumber: 5,
      startColumn: 10,
      endLineNumber: 5,
      endColumn: 20,
      hoverMessage: 'Hover info',
      owner: 'variable-validation',
    });

    const result = validateVariables([variable], mockWorkflowGraph, mockWorkflowDefinition);

    expect(result[0]).toEqual({
      id: 'test-error',
      message: 'Test error message',
      severity: 'error',
      startLineNumber: 5,
      startColumn: 10,
      endLineNumber: 5,
      endColumn: 20,
      hoverMessage: 'Hover info',
      owner: 'variable-validation',
    });
  });
});
