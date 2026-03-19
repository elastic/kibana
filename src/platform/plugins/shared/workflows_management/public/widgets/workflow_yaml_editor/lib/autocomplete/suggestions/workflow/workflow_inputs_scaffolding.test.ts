/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '@kbn/monaco';
import type { JsonModelSchemaType } from '@kbn/workflows/spec/schema/common/json_model_schema';
import {
  buildInsertTextAndEdits,
  generateInputLines,
  generateInputsContent,
  generateInputsSnippet,
} from './workflow_inputs_scaffolding';

const testSchema: JsonModelSchemaType = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    count: { type: 'number' },
  },
  required: ['name'],
};

describe('generateInputLines', () => {
  it('returns empty array when schema has no properties', () => {
    expect(generateInputLines(undefined, true, '  ')).toEqual([]);
    expect(generateInputLines({ type: 'object', properties: {} }, true, '  ')).toEqual([]);
  });

  it('generates lines with snippet placeholders', () => {
    const lines = generateInputLines(testSchema, true, '  ');
    expect(lines).toEqual(['  name: ${1:"string"}', '  count: ${2:0}']);
  });

  it('generates lines with actual values (no snippets)', () => {
    const lines = generateInputLines(testSchema, false, '    ');
    expect(lines).toEqual(['    name: "string"', '    count: 0']);
  });
});

describe('generateInputsContent', () => {
  it('returns empty string when schema has no properties', () => {
    expect(generateInputsContent(undefined, 6)).toBe('');
  });

  it('generates content with correct indentation', () => {
    const result = generateInputsContent(testSchema, 6);
    expect(result).toBe('\n        name: "string"\n        count: 0\n');
  });
});

describe('generateInputsSnippet', () => {
  it('returns empty string when schema has no properties', () => {
    expect(generateInputsSnippet(undefined)).toBe('');
  });

  it('generates snippet with inputs header and tab-stop placeholders', () => {
    const result = generateInputsSnippet(testSchema);
    expect(result).toBe('\ninputs:\n  name: ${1:"string"}\n  count: ${2:0}');
  });
});

describe('buildInsertTextAndEdits', () => {
  const workflow = { id: 'wf-1', name: 'My Workflow', inputsSchema: testSchema };
  const workflowNoInputs = { id: 'wf-2', name: 'No Inputs Workflow' };

  it('returns just the workflow ID when no inputs', () => {
    const result = buildInsertTextAndEdits(workflowNoInputs, 'none', null);
    expect(result.insertText).toBe('wf-2');
    expect(result.additionalTextEdits).toBeUndefined();
    expect(result.insertTextRules).toBe(monaco.languages.CompletionItemInsertTextRule.None);
  });

  it('returns snippet with inputs when state is "none" and workflow has inputs', () => {
    const result = buildInsertTextAndEdits(workflow, 'none', null);
    expect(result.insertText).toContain('wf-1');
    expect(result.insertText).toContain('inputs:');
    expect(result.insertTextRules).toBe(
      monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
    );
  });

  it('returns workflow ID with additionalTextEdits when state is "empty"', () => {
    const emptyInputsInfo = {
      range: new monaco.Range(5, 1, 5, 3),
      indentLevel: 6,
    };
    const result = buildInsertTextAndEdits(workflow, 'empty', emptyInputsInfo);
    expect(result.insertText).toBe('wf-1');
    expect(result.additionalTextEdits).toHaveLength(1);
    expect(result.additionalTextEdits![0].text).toContain('name:');
  });

  it('returns just the workflow ID when state is "has-content"', () => {
    const result = buildInsertTextAndEdits(workflow, 'has-content', null);
    expect(result.insertText).toBe('wf-1');
    expect(result.additionalTextEdits).toBeUndefined();
    expect(result.insertTextRules).toBe(monaco.languages.CompletionItemInsertTextRule.None);
  });
});
