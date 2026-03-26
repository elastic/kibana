/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseDocument } from 'yaml';
import type { monaco } from '@kbn/monaco';
import type { PublicTriggerDefinition } from '@kbn/workflows-extensions/public';
import { z } from '@kbn/zod/v4';
import { getSuggestions } from './get_suggestions';
import { getTriggerConditionKqlSuggestions } from './trigger_condition/get_trigger_condition_kql_suggestions';
import type { WorkflowKqlCompletionServices } from './workflow_kql_completion_services';
import type { ExtendedAutocompleteContext } from '../context/autocomplete.types';

jest.mock('./trigger_condition/get_trigger_condition_kql_suggestions', () => ({
  getTriggerConditionKqlSuggestions: jest.fn(),
}));

const mockGetTriggerConditionKqlSuggestions =
  getTriggerConditionKqlSuggestions as jest.MockedFunction<
    typeof getTriggerConditionKqlSuggestions
  >;

function createMinimalExtendedContext(
  overrides: Partial<ExtendedAutocompleteContext>
): ExtendedAutocompleteContext {
  const yaml = 'name: x\n';
  const doc = parseDocument(yaml);
  return {
    triggerCharacter: null,
    triggerKind: null,
    line: '',
    lineUpToCursor: '',
    lineParseResult: null,
    path: [],
    range: { startLineNumber: 1, endLineNumber: 1, startColumn: 1, endColumn: 1 },
    absoluteOffset: 0,
    focusedStepInfo: null,
    focusedYamlPair: null,
    contextSchema: z.object({}),
    contextScopedToPath: null,
    yamlDocument: doc,
    yamlLineCounter: null,
    scalarType: null,
    isInLiquidBlock: false,
    isInTriggerConditionField: false,
    triggerConditionDefinition: undefined,
    isInTriggersContext: false,
    isInScheduledTriggerWithBlock: false,
    isInStepsContext: false,
    isInWorkflowInputsContext: false,
    dynamicConnectorTypes: null,
    workflows: { workflows: {}, totalWorkflows: 0 },
    currentWorkflowId: null,
    workflowDefinition: null,
    model: {} as monaco.editor.ITextModel,
    position: {} as monaco.Position,
    ...overrides,
  };
}

const mockDefinition: PublicTriggerDefinition = {
  id: 'example.custom_trigger',
  title: 'Example',
  description: 'Example trigger',
  eventSchema: z.object({ severity: z.string() }),
};

const kqlServices = {
  kql: {
    hasQuerySuggestions: jest.fn().mockReturnValue(true),
    getQuerySuggestions: jest.fn(),
  },
  fieldFormats: {},
} as unknown as WorkflowKqlCompletionServices;

describe('getSuggestions', () => {
  beforeEach(() => {
    mockGetTriggerConditionKqlSuggestions.mockReset();
    mockGetTriggerConditionKqlSuggestions.mockResolvedValue([
      { label: 'kql-only', insertText: 'kql', kind: 0 } as monaco.languages.CompletionItem,
    ]);
  });

  it('delegates to getTriggerConditionKqlSuggestions when KQL services and registered condition trigger apply', async () => {
    const ctx = createMinimalExtendedContext({
      isInTriggerConditionField: true,
      triggerConditionDefinition: mockDefinition,
    });

    const result = await getSuggestions(ctx, kqlServices);

    expect(mockGetTriggerConditionKqlSuggestions).toHaveBeenCalledTimes(1);
    expect(mockGetTriggerConditionKqlSuggestions).toHaveBeenCalledWith(ctx, kqlServices);
    expect(result).toEqual([{ label: 'kql-only', insertText: 'kql', kind: 0 }]);
  });

  it('does not call getTriggerConditionKqlSuggestions when in condition but trigger is not registered', async () => {
    const ctx = createMinimalExtendedContext({
      isInTriggerConditionField: true,
      triggerConditionDefinition: undefined,
      isInScheduledTriggerWithBlock: false,
    });

    await getSuggestions(ctx, kqlServices);

    expect(mockGetTriggerConditionKqlSuggestions).not.toHaveBeenCalled();
  });

  it('does not call getTriggerConditionKqlSuggestions when kql services are missing', async () => {
    const ctx = createMinimalExtendedContext({
      isInTriggerConditionField: true,
      triggerConditionDefinition: mockDefinition,
    });

    await getSuggestions(ctx, undefined);

    expect(mockGetTriggerConditionKqlSuggestions).not.toHaveBeenCalled();
  });
});
