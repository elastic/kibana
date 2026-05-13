/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import YAML, { Document } from 'yaml';
import { monaco } from '@kbn/monaco';
import { z } from '@kbn/zod/v4';
import {
  getWorkflowOutputsSuggestions,
  isInWorkflowOutputWithBlock,
} from './get_workflow_outputs_suggestions';
import type { StepPropInfo } from '../../../../../../entities/workflows/store';
import { createStepInfo as createBaseStepInfo } from '../../../../../../shared/test_utils';
import type { AutocompleteContext } from '../../context/autocomplete.types';

jest.mock('@kbn/workflows/spec/lib/field_conversion', () => ({
  normalizeFieldsToJsonSchema: jest.fn(),
}));

jest.mock('./workflow_input_placeholder', () => ({
  getPlaceholderForProperty: jest.fn().mockReturnValue('"placeholder"'),
}));

jest.mock(
  '../../../../../../features/validate_workflow_yaml/lib/validate_workflow_outputs_in_yaml',
  () => ({
    getOutputsFromYamlDocument: jest.fn().mockReturnValue(undefined),
  })
);

const { normalizeFieldsToJsonSchema } = jest.requireMock(
  '@kbn/workflows/spec/lib/field_conversion'
);
const { getOutputsFromYamlDocument } = jest.requireMock(
  '../../../../../../features/validate_workflow_yaml/lib/validate_workflow_outputs_in_yaml'
);
const { getPlaceholderForProperty } = jest.requireMock('./workflow_input_placeholder');

const createMockRange = (): monaco.IRange => ({
  startLineNumber: 5,
  endLineNumber: 5,
  startColumn: 7,
  endColumn: 7,
});

function createStepInfo(stepType: string, withProps: Record<string, unknown> = {}) {
  return createBaseStepInfo({
    stepId: 'step1',
    stepType,
    propInfos: Object.entries(withProps).reduce<Record<string, StepPropInfo>>(
      (acc, [key, value]) => {
        acc[`with.${key}`] = {
          path: ['steps', '0', 'with', key],
          valueNode: new YAML.Scalar(value),
          keyNode: new YAML.Scalar(key),
        } satisfies StepPropInfo;
        return acc;
      },
      {}
    ),
  });
}

const createMockAutocompleteContext = (
  overrides: Partial<AutocompleteContext> = {}
): AutocompleteContext =>
  ({
    triggerCharacter: null,
    triggerKind: null,
    range: createMockRange(),
    line: '      ',
    lineUpToCursor: '      ',
    lineParseResult: null,
    focusedStepInfo: createStepInfo('workflow.output'),
    focusedYamlPair: null,
    contextSchema: z.unknown(),
    contextScopedToPath: null,
    yamlDocument: new Document(),
    yamlLineCounter: null,
    scalarType: null,
    path: ['steps', 0, 'with'],
    absoluteOffset: 100,
    dynamicConnectorTypes: null,
    workflows: { workflows: {}, totalWorkflows: 0 },
    currentWorkflowId: null,
    workflowDefinition: null,
    isInLiquidBlock: false,
    isInTriggerConditionField: false,
    triggerConditionDefinition: undefined,
    isInScheduledTriggerWithBlock: false,
    isInStepsContext: true,
    isInTriggersContext: false,
    isInWorkflowInputsContext: false,
    ...overrides,
  } satisfies AutocompleteContext);

describe('isInWorkflowOutputWithBlock', () => {
  it('should return true when focused step type is workflow.output', () => {
    expect(isInWorkflowOutputWithBlock(createStepInfo('workflow.output'))).toBe(true);
  });

  it('should return false when focused step type is different', () => {
    expect(isInWorkflowOutputWithBlock(createStepInfo('elasticsearch.search'))).toBe(false);
  });

  it('should return false when focused step info is null', () => {
    expect(isInWorkflowOutputWithBlock(null)).toBe(false);
  });

  it('should return false when focused step info is undefined', () => {
    expect(isInWorkflowOutputWithBlock(undefined as never)).toBe(false);
  });
});

describe('getWorkflowOutputsSuggestions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getPlaceholderForProperty.mockReturnValue('"placeholder"');
    getOutputsFromYamlDocument.mockReturnValue(undefined);
    normalizeFieldsToJsonSchema.mockReturnValue(null);
  });

  it('should return empty array when step type is not workflow.output', async () => {
    const context = createMockAutocompleteContext({
      focusedStepInfo: createStepInfo('elasticsearch.search'),
    });

    const result = await getWorkflowOutputsSuggestions(context);
    expect(result).toEqual([]);
  });

  it('should return empty array when focusedStepInfo is null', async () => {
    const context = createMockAutocompleteContext({
      focusedStepInfo: null,
    });

    const result = await getWorkflowOutputsSuggestions(context);
    expect(result).toEqual([]);
  });

  it('should return empty array when no output properties are defined', async () => {
    normalizeFieldsToJsonSchema.mockReturnValue({ properties: {} });

    const context = createMockAutocompleteContext();
    const result = await getWorkflowOutputsSuggestions(context);

    expect(result).toEqual([]);
  });

  it('should return empty array when normalizeFieldsToJsonSchema returns null', async () => {
    normalizeFieldsToJsonSchema.mockReturnValue(null);

    const context = createMockAutocompleteContext();
    const result = await getWorkflowOutputsSuggestions(context);

    expect(result).toEqual([]);
  });

  it('should return suggestions for defined output properties', async () => {
    normalizeFieldsToJsonSchema.mockReturnValue({
      properties: {
        result: { type: 'string', description: 'The result of the workflow' },
        count: { type: 'number', description: 'The count of items' },
      },
      required: ['result'],
    });

    const context = createMockAutocompleteContext();
    const result = await getWorkflowOutputsSuggestions(context);

    expect(result).toHaveLength(2);

    const resultSuggestion = result.find((s) => s.label === 'result');
    expect(resultSuggestion).toBeDefined();
    expect(resultSuggestion?.kind).toBe(monaco.languages.CompletionItemKind.Property);
    expect(resultSuggestion?.insertText).toContain('result: ');
    expect(resultSuggestion?.detail).toContain('required');
    expect(resultSuggestion?.preselect).toBe(true);

    const countSuggestion = result.find((s) => s.label === 'count');
    expect(countSuggestion).toBeDefined();
    expect(countSuggestion?.detail).toContain('optional');
    expect(countSuggestion?.preselect).toBe(false);
  });

  it('should exclude output keys already provided in the with block', async () => {
    normalizeFieldsToJsonSchema.mockReturnValue({
      properties: {
        result: { type: 'string', description: 'The result' },
        count: { type: 'number', description: 'The count' },
        status: { type: 'string', description: 'The status' },
      },
      required: [],
    });

    const context = createMockAutocompleteContext({
      focusedStepInfo: {
        stepType: 'workflow.output',
        propInfos: {
          'with.result': { path: ['steps', 0, 'with', 'result'] },
        },
      } as never,
    });

    const result = await getWorkflowOutputsSuggestions(context);

    expect(result).toHaveLength(2);
    expect(result.map((s) => s.label)).toEqual(['count', 'status']);
  });

  it('should return empty when cursor is in a value position (line has key: pattern)', async () => {
    normalizeFieldsToJsonSchema.mockReturnValue({
      properties: {
        result: { type: 'string' },
      },
      required: [],
    });

    const context = createMockAutocompleteContext({
      line: '      result: ',
    });

    const result = await getWorkflowOutputsSuggestions(context);
    expect(result).toEqual([]);
  });

  it('should return empty when line starts with "with:"', async () => {
    normalizeFieldsToJsonSchema.mockReturnValue({
      properties: {
        result: { type: 'string' },
      },
      required: [],
    });

    const context = createMockAutocompleteContext({
      line: '    with:',
    });

    const result = await getWorkflowOutputsSuggestions(context);
    expect(result).toEqual([]);
  });

  it('should use workflowDefinition.outputs when available', async () => {
    const outputsDef = {
      result: { type: 'string' },
    };

    normalizeFieldsToJsonSchema.mockReturnValue({
      properties: {
        result: { type: 'string' },
      },
      required: [],
    });

    const context = createMockAutocompleteContext({
      workflowDefinition: { outputs: outputsDef } as never,
    });

    await getWorkflowOutputsSuggestions(context);

    // normalizeFieldsToJsonSchema should have been called with the outputs from workflowDefinition
    expect(normalizeFieldsToJsonSchema).toHaveBeenCalledWith(outputsDef);
  });

  it('should fall back to getOutputsFromYamlDocument when workflowDefinition.outputs is not available', async () => {
    const yamlOutputs = { status: { type: 'string' } };
    getOutputsFromYamlDocument.mockReturnValue(yamlOutputs);

    normalizeFieldsToJsonSchema.mockReturnValue({
      properties: {
        status: { type: 'string' },
      },
      required: [],
    });

    const context = createMockAutocompleteContext({
      workflowDefinition: null,
    });

    await getWorkflowOutputsSuggestions(context);

    expect(getOutputsFromYamlDocument).toHaveBeenCalled();
    expect(normalizeFieldsToJsonSchema).toHaveBeenCalledWith(yamlOutputs);
  });

  it('should use InsertAsSnippet text rule for suggestions', async () => {
    normalizeFieldsToJsonSchema.mockReturnValue({
      properties: {
        result: { type: 'string' },
      },
      required: [],
    });

    const context = createMockAutocompleteContext();
    const result = await getWorkflowOutputsSuggestions(context);

    expect(result).toHaveLength(1);
    expect(result[0].insertTextRules).toBe(
      monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
    );
  });

  it('should use placeholder from getPlaceholderForProperty', async () => {
    getPlaceholderForProperty.mockReturnValue('"my-custom-placeholder"');

    normalizeFieldsToJsonSchema.mockReturnValue({
      properties: {
        result: { type: 'string' },
      },
      required: [],
    });

    const context = createMockAutocompleteContext();
    const result = await getWorkflowOutputsSuggestions(context);

    expect(result).toHaveLength(1);
    expect(result[0].insertText).toBe('result: "my-custom-placeholder"');
  });

  it('should use schema description as documentation, falling back to type', async () => {
    normalizeFieldsToJsonSchema.mockReturnValue({
      properties: {
        withDesc: { type: 'string', description: 'A described field' },
        noDesc: { type: 'number' },
      },
      required: [],
    });

    const context = createMockAutocompleteContext();
    const result = await getWorkflowOutputsSuggestions(context);

    const withDescSuggestion = result.find((s) => s.label === 'withDesc');
    expect(withDescSuggestion?.documentation).toBe('A described field');

    const noDescSuggestion = result.find((s) => s.label === 'noDesc');
    expect(noDescSuggestion?.documentation).toBe('number output');
  });
});
