/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import YAML, { isMap, isPair, isScalar } from 'yaml';
import { monaco } from '@kbn/monaco';
import {
  buildInsertTextAndEdits,
  checkExistingInputs,
  checkInputsInYamlNode,
  getEmptyInputsRangeAndIndent,
} from './workflow_inputs_scaffolding';
import { createFakeMonacoModel } from '../../../../../../../common/mocks/monaco_model';
import type { StepInfo } from '../../../../../../entities/workflows/store/workflow_detail/utils/build_workflow_lookup';

/**
 * Parse YAML and return the root map node, throwing if the result is not a map.
 */
function parseRootMap(yamlContent: string): YAML.YAMLMap {
  const doc = YAML.parseDocument(yamlContent);
  if (!isMap(doc.contents)) {
    throw new Error('Expected root to be a YAML map');
  }
  return doc.contents;
}

/**
 * Build a StepInfo from a root-level YAML map, extracting the with.inputs propInfos
 * from the real AST when present.
 */
function buildStepInfo(yamlContent: string, stepId: string, stepType: string): StepInfo {
  const rootMap = parseRootMap(yamlContent);
  const propInfos: Record<string, StepInfo['propInfos'][string]> = {};

  const withPair = rootMap.items.find(
    (item) => isPair(item) && isScalar(item.key) && item.key.value === 'with'
  );
  if (withPair && isPair(withPair) && isMap(withPair.value)) {
    const inputsPair = withPair.value.items.find(
      (item) => isPair(item) && isScalar(item.key) && item.key.value === 'inputs'
    );
    if (inputsPair && isPair(inputsPair) && isScalar(inputsPair.key)) {
      propInfos['with.inputs'] = {
        path: ['with', 'inputs'],
        keyNode: inputsPair.key,
        valueNode: inputsPair.value as unknown as YAML.Scalar,
      };
    }
  }

  return {
    stepId,
    stepType,
    stepYamlNode: rootMap,
    lineStart: 1,
    lineEnd: yamlContent.split('\n').length,
    propInfos,
  };
}

describe('checkInputsInYamlNode', () => {
  it('should return none when stepYamlNode is null', () => {
    expect(checkInputsInYamlNode(null as unknown as YAML.YAMLMap)).toBe('none');
  });

  it('should return none when stepYamlNode is a scalar (not a map)', () => {
    const doc = YAML.parseDocument('"just a string"');
    expect(checkInputsInYamlNode(doc.contents as unknown as YAML.YAMLMap)).toBe('none');
  });

  it('should return none when step has no with pair', () => {
    const rootMap = parseRootMap('name: step1\ntype: workflow.execute');
    expect(checkInputsInYamlNode(rootMap)).toBe('none');
  });

  it('should return none when with is not a map (string value)', () => {
    const rootMap = parseRootMap('name: step1\ntype: workflow.execute\nwith: some_string_value');
    expect(checkInputsInYamlNode(rootMap)).toBe('none');
  });

  it('should return none when with map has no inputs pair', () => {
    const rootMap = parseRootMap('name: step1\ntype: workflow.execute\nwith:\n  workflow-id: wf-1');
    expect(checkInputsInYamlNode(rootMap)).toBe('none');
  });

  it('should return empty when inputs is an empty map {}', () => {
    const rootMap = parseRootMap(
      'name: step1\ntype: workflow.execute\nwith:\n  workflow-id: wf-1\n  inputs: {}'
    );
    expect(checkInputsInYamlNode(rootMap)).toBe('empty');
  });

  it('should return has-content when inputs has key-value pairs', () => {
    const rootMap = parseRootMap(
      'name: step1\ntype: workflow.execute\nwith:\n  workflow-id: wf-1\n  inputs:\n    name: John'
    );
    expect(checkInputsInYamlNode(rootMap)).toBe('has-content');
  });

  it('should return has-content when inputs has a scalar string value', () => {
    const rootMap = parseRootMap('name: step1\ntype: workflow.execute\nwith:\n  inputs: something');
    expect(checkInputsInYamlNode(rootMap)).toBe('has-content');
  });
});

describe('checkExistingInputs', () => {
  it('should return none when focusedStepInfo is null', () => {
    expect(checkExistingInputs(null)).toBe('none');
  });

  it('should return none when propInfos has no with.inputs', () => {
    const stepInfo = buildStepInfo('type: workflow.execute', 'exec', 'workflow.execute');
    expect(checkExistingInputs(stepInfo)).toBe('none');
  });

  it('should return empty when propInfos points to an empty inputs map', () => {
    const stepInfo = buildStepInfo(
      'name: step1\ntype: workflow.execute\nwith:\n  workflow-id: wf-1\n  inputs: {}',
      'exec',
      'workflow.execute'
    );
    expect(checkExistingInputs(stepInfo)).toBe('empty');
  });

  it('should return has-content when valueNode is a non-empty map', () => {
    const stepInfo = buildStepInfo(
      'name: step1\ntype: workflow.execute\nwith:\n  inputs:\n    key: value',
      'exec',
      'workflow.execute'
    );
    expect(checkExistingInputs(stepInfo)).toBe('has-content');
  });

  it('should fall back to checkInputsInYamlNode when propInfo valueNode is not a YAML node', () => {
    const yamlContent = 'name: step1\ntype: workflow.execute\nwith:\n  inputs: {}';
    const rootMap = parseRootMap(yamlContent);

    const stepInfo: StepInfo = {
      stepId: 'exec',
      stepType: 'workflow.execute',
      stepYamlNode: rootMap,
      lineStart: 1,
      lineEnd: 4,
      propInfos: {
        'with.inputs': {
          path: ['with', 'inputs'],
          keyNode: { value: 'inputs' } as unknown as YAML.Scalar,
          valueNode: { notAYamlNode: true } as unknown as YAML.Scalar,
        },
      },
    };
    // Falls through to checkInputsInYamlNode since YAML.isNode returns false for the valueNode
    expect(checkExistingInputs(stepInfo)).toBe('empty');
  });
});

describe('getEmptyInputsRangeAndIndent', () => {
  it('should return null when focusedStepInfo is null', () => {
    const model = createFakeMonacoModel('');
    expect(getEmptyInputsRangeAndIndent(null, model)).toBeNull();
  });

  it('should return null when stepYamlNode is not a map', () => {
    const model = createFakeMonacoModel('test');
    const stepInfo: StepInfo = {
      stepId: 'exec',
      stepType: 'workflow.execute',
      stepYamlNode: null as unknown as YAML.YAMLMap,
      lineStart: 1,
      lineEnd: 1,
      propInfos: {},
    };
    expect(getEmptyInputsRangeAndIndent(stepInfo, model)).toBeNull();
  });

  it('should return null when no with pair in step', () => {
    const yamlContent = 'name: step1\ntype: workflow.execute';
    const model = createFakeMonacoModel(yamlContent);
    const stepInfo = buildStepInfo(yamlContent, 'exec', 'workflow.execute');
    expect(getEmptyInputsRangeAndIndent(stepInfo, model)).toBeNull();
  });

  it('should return null when with value is not a map', () => {
    const yamlContent = 'name: step1\ntype: workflow.execute\nwith: some_string';
    const model = createFakeMonacoModel(yamlContent);
    const stepInfo = buildStepInfo(yamlContent, 'exec', 'workflow.execute');
    expect(getEmptyInputsRangeAndIndent(stepInfo, model)).toBeNull();
  });

  it('should return null when inputs has content', () => {
    const yamlContent = 'name: step1\ntype: workflow.execute\nwith:\n  inputs:\n    key: value';
    const model = createFakeMonacoModel(yamlContent);
    const stepInfo = buildStepInfo(yamlContent, 'exec', 'workflow.execute');
    expect(getEmptyInputsRangeAndIndent(stepInfo, model)).toBeNull();
  });

  it('should return range and indent level for empty inputs', () => {
    const yamlContent =
      'name: step1\ntype: workflow.execute\nwith:\n  workflow-id: wf-1\n  inputs: {}';
    const model = createFakeMonacoModel(yamlContent);
    const stepInfo = buildStepInfo(yamlContent, 'exec', 'workflow.execute');
    const result = getEmptyInputsRangeAndIndent(stepInfo, model);
    expect(result).not.toBeNull();
    if (result) {
      expect(result.range).toBeDefined();
      expect(typeof result.indentLevel).toBe('number');
      expect(result.indentLevel).toBeGreaterThanOrEqual(0);
    }
  });

  it('should return null when no inputs pair in with map', () => {
    const yamlContent = 'name: step1\ntype: workflow.execute\nwith:\n  workflow-id: wf-1';
    const model = createFakeMonacoModel(yamlContent);
    const stepInfo = buildStepInfo(yamlContent, 'exec', 'workflow.execute');
    expect(getEmptyInputsRangeAndIndent(stepInfo, model)).toBeNull();
  });
});

describe('buildInsertTextAndEdits — additional edge cases', () => {
  it('should not include snippet when empty inputs but no emptyInputsInfo', () => {
    const workflow = {
      id: 'wf-abc',
      name: 'W',
      inputsSchema: {
        properties: { a: { type: 'string' as const } },
      },
    };
    const result = buildInsertTextAndEdits(workflow, 'empty', null);
    expect(result.insertText).toBe('wf-abc');
    expect(result.additionalTextEdits).toBeUndefined();
    expect(result.insertTextRules).toBe(monaco.languages.CompletionItemInsertTextRule.None);
  });

  it('should return plain ID when inputsSchema is undefined and state is none', () => {
    const workflow = { id: 'wf-no-schema', name: 'No Schema' };
    const result = buildInsertTextAndEdits(workflow, 'none', null);
    expect(result.insertText).toBe('wf-no-schema');
    expect(result.insertTextRules).toBe(monaco.languages.CompletionItemInsertTextRule.None);
  });
});
