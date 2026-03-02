/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import YAML from 'yaml';
import { getWorkflowInputsSuggestions } from './get_workflow_inputs_suggestions';
import type { WorkflowsResponse } from '../../../../../../entities/workflows/model/types';
import type { StepPropInfo } from '../../../../../../entities/workflows/store/workflow_detail/utils/build_workflow_lookup';
import type { AutocompleteContext } from '../../context/autocomplete.types';

type WorkflowInputsContext = AutocompleteContext & {
  workflows: WorkflowsResponse;
  isInWorkflowInputsContext: boolean;
};

const workflows: WorkflowsResponse = {
  workflows: {
    'sub-wf': {
      id: 'sub-wf',
      name: 'Sub Workflow',
      inputsSchema: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          retries: { type: 'number' },
        },
        required: ['message'],
      },
    },
    'no-inputs': {
      id: 'no-inputs',
      name: 'No Inputs',
    },
  },
  totalWorkflows: 2,
};

const range = { startLineNumber: 5, endLineNumber: 5, startColumn: 1, endColumn: 10 };

function buildStepYamlNode(
  workflowId: string
): YAML.YAMLMap<unknown, unknown> & { items: YAML.Pair[] } {
  const doc = YAML.parseDocument(
    `name: step1\ntype: workflow.execute\nwith:\n  workflow-id: ${workflowId}\n  inputs: {}`
  );
  return doc.contents as YAML.YAMLMap<unknown, unknown> & { items: YAML.Pair[] };
}

function buildFocusedStepInfo(workflowId: string) {
  const stepYamlNode = buildStepYamlNode(workflowId);
  const withPair = stepYamlNode.items.find(
    (item) => YAML.isPair(item) && YAML.isScalar(item.key) && item.key.value === 'with'
  );
  const withMap = withPair && YAML.isPair(withPair) ? (withPair.value as YAML.YAMLMap) : undefined;
  const wfIdPair = withMap?.items?.find(
    (item) => YAML.isPair(item) && YAML.isScalar(item.key) && item.key.value === 'workflow-id'
  );

  const propInfos: Record<string, StepPropInfo> = {};
  if (wfIdPair && YAML.isPair(wfIdPair)) {
    propInfos['with.workflow-id'] = {
      path: ['with', 'workflow-id'],
      keyNode: wfIdPair.key as YAML.Scalar<unknown>,
      valueNode: wfIdPair.value as YAML.Scalar<unknown>,
    };
  }

  return {
    stepId: 'step1',
    stepType: 'workflow.execute',
    stepYamlNode,
    lineStart: 1,
    lineEnd: 5,
    propInfos,
  };
}

function makeContext(overrides: Partial<WorkflowInputsContext> = {}): WorkflowInputsContext {
  return {
    focusedStepInfo: buildFocusedStepInfo('sub-wf'),
    lineParseResult: { matchType: 'workflow-inputs', fullKey: '' },
    lineUpToCursor: '      ',
    range,
    workflows,
    isInWorkflowInputsContext: false,
    ...overrides,
  } as unknown as WorkflowInputsContext;
}

describe('getWorkflowInputsSuggestions', () => {
  it('returns null when focusedStepInfo is null', async () => {
    const result = await getWorkflowInputsSuggestions(makeContext({ focusedStepInfo: null }));
    expect(result).toBeNull();
  });

  it('returns null when step is not a workflow step', async () => {
    const ctx = makeContext({
      focusedStepInfo: {
        stepId: 's',
        stepType: 'slack',
        stepYamlNode: {} as any,
        lineStart: 1,
        lineEnd: 1,
        propInfos: {},
      },
    });
    const result = await getWorkflowInputsSuggestions(ctx);
    expect(result).toBeNull();
  });

  it('returns null when not in inputs context (neither matchType nor path)', async () => {
    const ctx = makeContext({
      lineParseResult: { matchType: 'type', fullKey: '' } as any,
      isInWorkflowInputsContext: false,
    });
    const result = await getWorkflowInputsSuggestions(ctx);
    expect(result).toBeNull();
  });

  it('returns suggestions for workflow inputs when matchType is workflow-inputs', async () => {
    const result = await getWorkflowInputsSuggestions(makeContext());
    expect(result).not.toBeNull();
    expect(result!.length).toBe(2);

    const labels = result!.map((s) => s.label);
    expect(labels).toContain('message');
    expect(labels).toContain('retries');
  });

  it('returns suggestions when isInWorkflowInputsContext is true (AST path)', async () => {
    const ctx = makeContext({
      lineParseResult: null,
      isInWorkflowInputsContext: true,
    });
    const result = await getWorkflowInputsSuggestions(ctx);
    expect(result).not.toBeNull();
    expect(result!.length).toBe(2);
  });

  it('marks required inputs with ! sort prefix and detail tag', async () => {
    const result = await getWorkflowInputsSuggestions(makeContext());
    const messageSuggestion = result!.find((s) => s.label === 'message');
    expect(messageSuggestion?.sortText).toBe('!message');
    expect(messageSuggestion?.detail).toContain('required');
  });

  it('filters suggestions by prefix', async () => {
    const ctx = makeContext({
      lineParseResult: { matchType: 'workflow-inputs', fullKey: 'mes' },
    } as any);
    const result = await getWorkflowInputsSuggestions(ctx);
    expect(result).toHaveLength(1);
    expect(result![0].label).toBe('message');
  });

  it('returns empty array when workflow has no inputs', async () => {
    const ctx = makeContext({
      focusedStepInfo: buildFocusedStepInfo('no-inputs'),
    });
    const result = await getWorkflowInputsSuggestions(ctx);
    expect(result).toEqual([]);
  });

  it('returns empty array when workflow-id is not set', async () => {
    const stepInfo = buildFocusedStepInfo('sub-wf');
    stepInfo.propInfos = {};
    const ctx = makeContext({ focusedStepInfo: stepInfo });
    const result = await getWorkflowInputsSuggestions(ctx);
    expect(result).toEqual([]);
  });

  it('includes placeholder values in insertText', async () => {
    const result = await getWorkflowInputsSuggestions(makeContext());
    const messageSuggestion = result!.find((s) => s.label === 'message');
    expect(messageSuggestion?.insertText).toBe('message: "string"');

    const retriesSuggestion = result!.find((s) => s.label === 'retries');
    expect(retriesSuggestion?.insertText).toBe('retries: 0');
  });
});
