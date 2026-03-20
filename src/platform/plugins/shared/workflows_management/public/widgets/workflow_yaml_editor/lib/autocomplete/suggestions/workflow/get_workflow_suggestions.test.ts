/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { monaco } from '@kbn/monaco';
import { getWorkflowSuggestions } from './get_workflow_suggestions';
import type { WorkflowsResponse } from '../../../../../../entities/workflows/model/types';
import type { ExtendedAutocompleteContext } from '../../context/autocomplete.types';

type WorkflowSuggestionsContext = ExtendedAutocompleteContext & {
  workflows: WorkflowsResponse;
};

const workflows: WorkflowsResponse = {
  workflows: {
    'wf-alpha': {
      id: 'wf-alpha',
      name: 'Alpha Workflow',
      inputsSchema: {
        type: 'object',
        properties: {
          host: { type: 'string' },
          port: { type: 'number' },
        },
        required: ['host'],
      },
    },
    'wf-beta': {
      id: 'wf-beta',
      name: 'Beta Workflow',
    },
  },
  totalWorkflows: 2,
};

const range = { startLineNumber: 3, endLineNumber: 3, startColumn: 1, endColumn: 20 };

function makeContext(
  overrides: Partial<WorkflowSuggestionsContext> = {}
): WorkflowSuggestionsContext {
  return {
    line: '  workflow-id: ',
    lineParseResult: {
      matchType: 'workflow-id',
      fullKey: '',
      valueStartIndex: 15,
      match: ['workflow-id: '],
    },
    range,
    workflows,
    focusedStepInfo: {
      stepId: 'step1',
      stepType: 'workflow.execute',
      stepYamlNode: {} as any,
      lineStart: 1,
      lineEnd: 5,
      propInfos: {},
    },
    model: {
      getLineContent: () => '  workflow-id: ',
    } as unknown as monaco.editor.ITextModel,
    ...overrides,
  } as unknown as WorkflowSuggestionsContext;
}

describe('getWorkflowSuggestions', () => {
  it('returns empty array when matchType is not workflow-id', async () => {
    const result = await getWorkflowSuggestions(
      makeContext({
        lineParseResult: { matchType: 'type', fullKey: '' } as any,
      })
    );
    expect(result).toEqual([]);
  });

  it('returns empty array when step type is not workflow.execute or workflow.executeAsync', async () => {
    const result = await getWorkflowSuggestions(
      makeContext({
        focusedStepInfo: {
          stepId: 's',
          stepType: 'slack',
          stepYamlNode: {} as any,
          lineStart: 1,
          lineEnd: 1,
          propInfos: {},
        },
      })
    );
    expect(result).toEqual([]);
  });

  it('returns suggestions for all workflows', async () => {
    const result = await getWorkflowSuggestions(makeContext());
    expect(result).toHaveLength(2);

    const labels = result.map((s) => s.label);
    expect(labels).toContain('Alpha Workflow (id: wf-alpha)');
    expect(labels).toContain('Beta Workflow (id: wf-beta)');
  });

  it('returns suggestions for workflow.executeAsync step type', async () => {
    const result = await getWorkflowSuggestions(
      makeContext({
        focusedStepInfo: {
          stepId: 's',
          stepType: 'workflow.executeAsync',
          stepYamlNode: {} as any,
          lineStart: 1,
          lineEnd: 1,
          propInfos: {},
        },
      })
    );
    expect(result).toHaveLength(2);
  });

  it('marks workflow with inputs in detail', async () => {
    const result = await getWorkflowSuggestions(makeContext());
    const alpha = result.find((s) => s.label === 'Alpha Workflow (id: wf-alpha)');
    const beta = result.find((s) => s.label === 'Beta Workflow (id: wf-beta)');
    expect(alpha?.detail).toBe('Workflow ID (with inputs)');
    expect(beta?.detail).toBe('Workflow ID');
  });

  it('filters by search prefix', async () => {
    const result = await getWorkflowSuggestions(
      makeContext({
        lineParseResult: {
          matchType: 'workflow-id',
          fullKey: 'alpha',
          valueStartIndex: 15,
          match: ['workflow-id: alpha'],
        } as any,
      })
    );
    expect(result).toHaveLength(1);
    expect(result[0].label).toBe('Alpha Workflow (id: wf-alpha)');
  });

  it('adjusts range based on valueStartIndex', async () => {
    const result = await getWorkflowSuggestions(makeContext());
    expect(result[0].range).toMatchObject({
      startColumn: 16,
    });
  });

  it('includes filterText with both name and id', async () => {
    const result = await getWorkflowSuggestions(makeContext());
    const alpha = result.find((s) => s.label === 'Alpha Workflow (id: wf-alpha)');
    expect(alpha?.filterText).toBe('Alpha Workflow wf-alpha');
  });

  it('returns suggestions when focusedStepInfo is null (outside any step)', async () => {
    const result = await getWorkflowSuggestions(makeContext({ focusedStepInfo: null }));
    expect(result).toHaveLength(2);
  });

  it('excludes the current workflow from suggestions to prevent recursion', async () => {
    const result = await getWorkflowSuggestions(makeContext({ currentWorkflowId: 'wf-alpha' }));
    expect(result).toHaveLength(1);
    expect(result[0].label).toBe('Beta Workflow (id: wf-beta)');
  });

  it('returns all workflows when currentWorkflowId is null', async () => {
    const result = await getWorkflowSuggestions(makeContext({ currentWorkflowId: null }));
    expect(result).toHaveLength(2);
  });
});
