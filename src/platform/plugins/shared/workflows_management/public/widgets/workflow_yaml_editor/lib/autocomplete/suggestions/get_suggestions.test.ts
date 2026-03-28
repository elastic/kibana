/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseDocument, Scalar } from 'yaml';
import { monaco } from '@kbn/monaco';
import { getSuggestions, isInsideLoopBody } from './get_suggestions';
import type { ExtendedAutocompleteContext } from '../context/autocomplete.types';

jest.mock('./connector_id/get_connector_id_suggestions', () => ({
  getConnectorIdSuggestions: jest.fn(() => [{ label: 'connector-id-1' }]),
}));
jest.mock('./connector_type/get_connector_type_suggestions', () => ({
  getConnectorTypeSuggestions: jest.fn(() => [{ label: 'type-1' }]),
}));
jest.mock('./custom_property/get_custom_property_suggestions', () => ({
  getCustomPropertySuggestions: jest.fn(() => []),
}));
jest.mock('./json_schema/get_json_schema_suggestions', () => ({
  getJsonSchemaSuggestions: jest.fn(() => []),
}));
jest.mock('./liquid/liquid_completions', () => ({
  createLiquidBlockKeywordCompletions: jest.fn(() => [{ label: 'assign' }]),
  createLiquidFilterCompletions: jest.fn(() => [{ label: 'upcase' }]),
  createLiquidSyntaxCompletions: jest.fn(() => [{ label: '{% if %}' }]),
}));
jest.mock('./rrule/get_rrule_scheduling_suggestions', () => ({
  getRRuleSchedulingSuggestions: jest.fn(() => [{ label: 'rrule' }]),
}));
jest.mock('./timezone/get_timezone_suggestions', () => ({
  getTimezoneSuggestions: jest.fn(() => [{ label: 'UTC' }]),
}));
jest.mock('./trigger_type/get_trigger_type_suggestions', () => ({
  getTriggerTypeSuggestions: jest.fn(() => [{ label: 'scheduled' }]),
}));
jest.mock('./variable/get_variable_suggestions', () => ({
  getVariableSuggestions: jest.fn(() => [{ label: '{{context.var}}' }]),
}));
jest.mock('./workflow/get_workflow_inputs_suggestions', () => ({
  getWorkflowInputsSuggestions: jest.fn(() => []),
}));
jest.mock('./workflow/get_workflow_outputs_suggestions', () => ({
  getWorkflowOutputsSuggestions: jest.fn(() => []),
}));
jest.mock('./workflow/get_workflow_suggestions', () => ({
  getWorkflowSuggestions: jest.fn(() => [{ label: 'wf-1' }]),
}));
jest.mock('../../../../../../common/schema', () => ({
  getPropertyHandler: jest.fn(),
}));

function createMockContext(
  overrides: Partial<ExtendedAutocompleteContext> = {}
): ExtendedAutocompleteContext {
  const yamlDocument = parseDocument('steps:\n  - name: s1\n    type: wait');
  return {
    triggerCharacter: null,
    triggerKind: null,
    line: '',
    lineUpToCursor: '',
    lineParseResult: null,
    path: ['steps', 0],
    range: { startLineNumber: 1, endLineNumber: 1, startColumn: 1, endColumn: 1 },
    absoluteOffset: 0,
    focusedStepInfo: null,
    focusedYamlPair: null,
    contextSchema: {} as ExtendedAutocompleteContext['contextSchema'],
    contextScopedToPath: null,
    yamlDocument,
    yamlLineCounter: null,
    scalarType: null,
    isInLiquidBlock: false,
    isInTriggerConditionField: false,
    triggerConditionDefinition: undefined,
    isInTriggersContext: false,
    isInScheduledTriggerWithBlock: false,
    isInStepsContext: true,
    isInWorkflowInputsContext: false,
    dynamicConnectorTypes: null,
    workflows: { workflows: {}, totalWorkflows: 0 },
    currentWorkflowId: null,
    workflowDefinition: null,
    model: {} as monaco.editor.ITextModel,
    position: new monaco.Position(1, 1),
    ...overrides,
  };
}

describe('isInsideLoopBody', () => {
  it('should return false when yamlDocument is null', () => {
    expect(
      isInsideLoopBody({
        yamlDocument: null as never,
        path: ['steps', 0],
      })
    ).toBe(false);
  });

  it('should return false when path is null', () => {
    const yamlDocument = parseDocument('steps:\n  - type: wait');
    expect(isInsideLoopBody({ yamlDocument, path: null as never })).toBe(false);
  });

  it('should return false when not inside any loop', () => {
    const yamlDocument = parseDocument('steps:\n  - type: wait');
    expect(isInsideLoopBody({ yamlDocument, path: ['steps', 0, 'type'] })).toBe(false);
  });

  it('should return true when inside a foreach loop steps', () => {
    const yamlContent = `steps:
  - name: loop
    type: foreach
    foreach: "{{ items }}"
    steps:
      - name: inner
        type: wait`;
    const yamlDocument = parseDocument(yamlContent);
    // Path inside the inner step of the foreach
    expect(isInsideLoopBody({ yamlDocument, path: ['steps', 0, 'steps', 0, 'type'] })).toBe(true);
  });

  it('should return true when inside a while loop steps', () => {
    const yamlContent = `steps:
  - name: loop
    type: while
    condition: "x"
    steps:
      - name: inner
        type: wait`;
    const yamlDocument = parseDocument(yamlContent);
    expect(isInsideLoopBody({ yamlDocument, path: ['steps', 0, 'steps', 0, 'type'] })).toBe(true);
  });

  it('should return false when path is too short', () => {
    const yamlDocument = parseDocument('steps:\n  - type: foreach');
    expect(isInsideLoopBody({ yamlDocument, path: ['steps', 0] })).toBe(false);
  });

  it('should return false when step type is not a loop type (e.g., if)', () => {
    const yamlContent = `steps:
  - name: check
    type: if
    condition: "x"
    steps:
      - name: inner
        type: wait`;
    const yamlDocument = parseDocument(yamlContent);
    expect(isInsideLoopBody({ yamlDocument, path: ['steps', 0, 'steps', 0, 'type'] })).toBe(false);
  });
});

describe('getSuggestions', () => {
  it('should return RRule suggestions when in scheduled trigger with block', async () => {
    const ctx = createMockContext({ isInScheduledTriggerWithBlock: true });
    const result = await getSuggestions(ctx);
    expect(result).toEqual([{ label: 'rrule' }]);
  });

  it('should return connector-id suggestions for connector-id match type', async () => {
    const ctx = createMockContext({
      lineParseResult: {
        matchType: 'connector-id',
        fullKey: '',
        match: ''.match(/^/)!,
        valueStartIndex: 16,
      },
    });
    const result = await getSuggestions(ctx);
    expect(result).toEqual([{ label: 'connector-id-1' }]);
  });

  it('should return workflow suggestions for workflow-id match type', async () => {
    const ctx = createMockContext({
      lineParseResult: {
        matchType: 'workflow-id',
        fullKey: '',
        match: ''.match(/^/)!,
        valueStartIndex: 13,
      },
    });
    const result = await getSuggestions(ctx);
    expect(result).toEqual([{ label: 'wf-1' }]);
  });

  it('should return variable suggestions for variable-unfinished match type', async () => {
    const ctx = createMockContext({
      lineParseResult: {
        matchType: 'variable-unfinished',
        fullKey: 'context.va',
        match: ''.match(/^/)!,
        pathSegments: ['context', 'va'],
        lastPathSegment: 'va',
      },
    });
    const result = await getSuggestions(ctx);
    expect(result).toEqual([{ label: '{{context.var}}' }]);
  });

  it('should return variable suggestions for variable-complete match type', async () => {
    const ctx = createMockContext({
      lineParseResult: {
        matchType: 'variable-complete',
        fullKey: 'context.var',
        match: ''.match(/^/)!,
        pathSegments: ['context', 'var'],
        lastPathSegment: 'var',
      },
    });
    const result = await getSuggestions(ctx);
    expect(result).toEqual([{ label: '{{context.var}}' }]);
  });

  it('should return variable suggestions for foreach-variable match type', async () => {
    const ctx = createMockContext({
      lineParseResult: {
        matchType: 'foreach-variable',
        fullKey: 'context',
        match: null,
        pathSegments: ['context'],
        lastPathSegment: 'context',
      },
    });
    const result = await getSuggestions(ctx);
    expect(result).toEqual([{ label: '{{context.var}}' }]);
  });

  it('should return empty array for @ match type without focusedYamlPair', async () => {
    const ctx = createMockContext({
      lineParseResult: {
        matchType: 'at',
        fullKey: '',
        match: ''.match(/^/)!,
        pathSegments: [],
        lastPathSegment: null,
      },
      focusedYamlPair: null,
    });
    const result = await getSuggestions(ctx);
    expect(result).toEqual([]);
  });

  it('should return variable suggestions for @ match type with focusedYamlPair', async () => {
    const ctx = createMockContext({
      lineParseResult: {
        matchType: 'at',
        fullKey: 'steps',
        match: ''.match(/^/)!,
        pathSegments: ['steps'],
        lastPathSegment: 'steps',
      },
      focusedYamlPair: {
        path: ['steps', '0', 'with', 'message'],
        keyNode: new Scalar('message'),
        valueNode: new Scalar('hello'),
      },
    });
    const result = await getSuggestions(ctx);
    expect(result).toEqual([{ label: '{{context.var}}' }]);
  });

  it('should return liquid filter completions for liquid-filter match type', async () => {
    const ctx = createMockContext({
      lineParseResult: {
        matchType: 'liquid-filter',
        fullKey: 'up',
        match: ''.match(/^/)!,
      },
    });
    const result = await getSuggestions(ctx);
    expect(result).toEqual([{ label: 'upcase' }]);
  });

  it('should return liquid filter completions for liquid-block-filter match type', async () => {
    const ctx = createMockContext({
      lineParseResult: {
        matchType: 'liquid-block-filter',
        fullKey: 'up',
        match: ''.match(/^/)!,
      },
    });
    const result = await getSuggestions(ctx);
    expect(result).toEqual([{ label: 'upcase' }]);
  });

  it('should return liquid syntax completions for liquid-syntax match type', async () => {
    const ctx = createMockContext({
      lineParseResult: {
        matchType: 'liquid-syntax',
        fullKey: '',
        match: null,
      },
    });
    const result = await getSuggestions(ctx);
    expect(result).toEqual([{ label: '{% if %}' }]);
  });

  it('should return liquid block keyword completions when inside liquid block', async () => {
    const ctx = createMockContext({
      isInLiquidBlock: true,
      lineParseResult: {
        matchType: 'liquid-block-keyword',
        fullKey: 'ass',
        match: ''.match(/^/)!,
      },
    });
    const result = await getSuggestions(ctx);
    expect(result).toEqual([{ label: 'assign' }]);
  });

  it('should return null (fall through) for liquid-block-keyword when not in liquid block', async () => {
    const ctx = createMockContext({
      isInLiquidBlock: false,
      lineParseResult: {
        matchType: 'liquid-block-keyword',
        fullKey: 'ass',
        match: ''.match(/^/)!,
      },
    });
    // Falls through to other suggestion providers
    const result = await getSuggestions(ctx);
    // Should get custom property suggestions (empty array from mock)
    expect(result).toEqual([]);
  });

  it('should return trigger type suggestions for type match in triggers context', async () => {
    const ctx = createMockContext({
      isInTriggersContext: true,
      isInStepsContext: false,
      lineParseResult: {
        matchType: 'type',
        fullKey: 'sch',
        match: ''.match(/^/)!,
        valueStartIndex: 8,
      },
    });
    const result = await getSuggestions(ctx);
    expect(result).toEqual([{ label: 'scheduled' }]);
  });

  it('should return connector type suggestions for type match in steps context', async () => {
    const ctx = createMockContext({
      isInTriggersContext: false,
      isInStepsContext: true,
      dynamicConnectorTypes: {},
      lineParseResult: {
        matchType: 'type',
        fullKey: 'wa',
        match: ''.match(/^/)!,
        valueStartIndex: 8,
      },
    });
    const result = await getSuggestions(ctx);
    expect(result).toEqual([{ label: 'type-1' }]);
  });

  it('should return null for type match in steps context without dynamicConnectorTypes', async () => {
    const ctx = createMockContext({
      isInTriggersContext: false,
      isInStepsContext: true,
      dynamicConnectorTypes: null,
      lineParseResult: {
        matchType: 'type',
        fullKey: 'wa',
        match: ''.match(/^/)!,
        valueStartIndex: 8,
      },
    });
    // Falls through since dynamicConnectorTypes is null
    const result = await getSuggestions(ctx);
    expect(result).toEqual([]);
  });

  it('should return timezone suggestions for timezone match type', async () => {
    const ctx = createMockContext({
      lineParseResult: {
        matchType: 'timezone',
        fullKey: 'UT',
        match: ''.match(/^/)!,
        valueStartIndex: 10,
      },
    });
    const result = await getSuggestions(ctx);
    expect(result).toEqual([{ label: 'UTC' }]);
  });

  it('should return empty array when no suggestions match and lineParseResult is null', async () => {
    const ctx = createMockContext({ lineParseResult: null });
    const result = await getSuggestions(ctx);
    // Falls through all match types, returns custom property suggestions (empty)
    expect(result).toEqual([]);
  });

  it('should try workflow inputs suggestions when isInWorkflowInputsContext is true', async () => {
    const { getWorkflowInputsSuggestions } = jest.requireMock(
      './workflow/get_workflow_inputs_suggestions'
    );
    getWorkflowInputsSuggestions.mockResolvedValueOnce([{ label: 'input-key' }]);

    const ctx = createMockContext({
      isInWorkflowInputsContext: true,
      lineParseResult: null,
    });
    const result = await getSuggestions(ctx);
    expect(result).toEqual([{ label: 'input-key' }]);
  });

  it('should return workflow inputs suggestions for workflow-inputs match type', async () => {
    const { getWorkflowInputsSuggestions } = jest.requireMock(
      './workflow/get_workflow_inputs_suggestions'
    );
    getWorkflowInputsSuggestions.mockResolvedValueOnce([{ label: 'input-scaffold' }]);

    const ctx = createMockContext({
      lineParseResult: {
        matchType: 'workflow-inputs',
        fullKey: '',
        match: null,
      },
    });
    const result = await getSuggestions(ctx);
    expect(result).toEqual([{ label: 'input-scaffold' }]);
  });
});
