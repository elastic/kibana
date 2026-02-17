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
import type { LegacyWorkflowInput } from '@kbn/workflows';
import { getInputPlaceholderValue } from './workflow_input_placeholder';
import type { StepInfo } from '../../../../../../entities/workflows/store/workflow_detail/utils/build_workflow_lookup';
import { getIndentLevelFromLineNumber } from '../../../get_indent_level';
import { getMonacoRangeFromYamlNode, getMonacoRangeFromYamlRange } from '../../../utils';

/**
 * Generates the input value for a single input
 * @param useSnippetPlaceholders - if true, uses snippet placeholders for tab navigation (for insertion)
 *                                  if false, uses actual values (for replacement)
 */
function getInputValue(
  input: LegacyWorkflowInput,
  index: number,
  useSnippetPlaceholders: boolean
): string {
  const value = getInputPlaceholderValue(input);
  if (useSnippetPlaceholders) {
    return `\${${index + 1}:${value}}`;
  }
  return value;
}

/**
 * Generates input lines (key-value pairs) for a workflow
 * @param inputs - The workflow inputs to generate content for
 * @param useSnippetPlaceholders - Whether to use snippet placeholders for tab navigation
 * @param indentPrefix - The indentation prefix for each input line (e.g., "    " for 4 spaces)
 */
export function generateInputLines(
  inputs: LegacyWorkflowInput[] | undefined,
  useSnippetPlaceholders: boolean,
  indentPrefix: string
): string[] {
  if (!inputs || inputs.length === 0) {
    return [];
  }

  return inputs.map((input, index) => {
    const value = getInputValue(input, index, useSnippetPlaceholders);
    return `${indentPrefix}${input.name}: ${value}`;
  });
}

/**
 * Generates just the inputs content (key-value pairs) without the inputs: header
 * Used when replacing empty inputs: {}
 */
export function generateInputsContent(
  inputs: LegacyWorkflowInput[] | undefined,
  inputsIndentLevel: number
): string {
  const inputIndent = ' '.repeat(inputsIndentLevel + 2);
  const inputLines = generateInputLines(inputs, false, inputIndent);
  // Start with newline so when replacing {}, the content appears on new lines
  // End with newline so the next property (like await:) appears on a new line
  return inputLines.length > 0 ? `\n${inputLines.join('\n')}\n` : '';
}

/**
 * Generates the inputs YAML structure for a workflow
 * Returns empty string if workflow has no inputs
 * The snippet is designed to be inserted after workflow-id on the same indentation level
 */
export function generateInputsSnippet(inputs: LegacyWorkflowInput[] | undefined): string {
  const inputLines = generateInputLines(inputs, true, '  ');
  // inputs: is at the same indentation level as workflow-id:
  // Monaco will maintain the base indentation automatically, no leading spaces needed
  return inputLines.length > 0 ? `\ninputs:\n${inputLines.join('\n')}` : '';
}

/**
 * Checks if a YAML value node is empty
 */
function isValueNodeEmpty(valueNode: YAML.Node): boolean {
  if (YAML.isMap(valueNode)) {
    return !valueNode.items || valueNode.items.length === 0;
  }
  if (YAML.isScalar(valueNode)) {
    const value = valueNode.value;
    if (typeof value === 'object' && value !== null) {
      return Object.keys(value).length === 0;
    }
  }
  return false;
}

/**
 * Checks for inputs in the step's YAML node directly (fallback method)
 */
export function checkInputsInYamlNode(
  stepYamlNode: YAML.YAMLMap
): 'none' | 'empty' | 'has-content' {
  if (!isMap(stepYamlNode) || !stepYamlNode.items) {
    return 'none';
  }

  const withPair = stepYamlNode.items.find(
    (item) => isPair(item) && isScalar(item.key) && item.key.value === 'with'
  );

  if (!withPair || !isPair(withPair) || !isMap(withPair.value) || !withPair.value.items) {
    return 'none';
  }

  const inputsPair = withPair.value.items.find(
    (item) => isPair(item) && isScalar(item.key) && item.key.value === 'inputs'
  );

  if (!inputsPair || !isPair(inputsPair)) {
    return 'none';
  }

  if (YAML.isNode(inputsPair.value)) {
    return isValueNodeEmpty(inputsPair.value) ? 'empty' : 'has-content';
  }

  return 'has-content';
}

/**
 * Checks if inputs already exist in the step and if they're empty
 * Returns: 'none' if inputs don't exist, 'empty' if they exist but are empty, 'has-content' if they have content
 */
export function checkExistingInputs(
  focusedStepInfo: StepInfo | null
): 'none' | 'empty' | 'has-content' {
  if (!focusedStepInfo) {
    return 'none';
  }

  const inputsProp = focusedStepInfo.propInfos['with.inputs'];
  if (inputsProp) {
    if (YAML.isNode(inputsProp.valueNode)) {
      const isEmpty = isValueNodeEmpty(inputsProp.valueNode);
      return isEmpty ? 'empty' : 'has-content';
    }
  }

  // Fallback: check the YAML node directly
  return checkInputsInYamlNode(focusedStepInfo.stepYamlNode);
}

/**
 * Builds insert text and additional text edits for workflow completion
 */
export function buildInsertTextAndEdits(
  workflow: { id: string; name: string; inputs?: LegacyWorkflowInput[] },
  existingInputsState: 'none' | 'empty' | 'has-content',
  emptyInputsInfo: { range: monaco.Range; indentLevel: number } | null
): {
  insertText: string;
  additionalTextEdits?: monaco.languages.TextEdit[];
  insertTextRules: monaco.languages.CompletionItemInsertTextRule;
} {
  const workflowId = workflow.id;
  const hasInputs = Boolean(workflow.inputs && workflow.inputs.length > 0);

  // If inputs are empty, replace them using additionalTextEdits
  if (existingInputsState === 'empty' && hasInputs && workflow.inputs && emptyInputsInfo) {
    const inputsContent = generateInputsContent(workflow.inputs, emptyInputsInfo.indentLevel);
    return {
      insertText: workflowId,
      additionalTextEdits: [
        {
          range: emptyInputsInfo.range,
          text: inputsContent,
        },
      ],
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.None,
    };
  }

  // If inputs don't exist and workflow has inputs, include them in the snippet
  if (existingInputsState === 'none' && hasInputs && workflow.inputs) {
    const inputsSnippet = generateInputsSnippet(workflow.inputs);
    return {
      insertText: `${workflowId}${inputsSnippet}`,
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    };
  }

  // Otherwise, just return the workflow ID
  return {
    insertText: workflowId,
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.None,
  };
}

/**
 * Gets the range and indentation for empty inputs that need to be replaced
 */
export function getEmptyInputsRangeAndIndent(
  focusedStepInfo: StepInfo | null,
  model: monaco.editor.ITextModel
): { range: monaco.Range; indentLevel: number } | null {
  if (!focusedStepInfo) {
    return null;
  }

  // Check the YAML node directly for empty inputs
  const stepYamlNode = focusedStepInfo.stepYamlNode;
  if (!isMap(stepYamlNode) || !stepYamlNode.items) {
    return null;
  }

  // Find the 'with' pair
  const withPair = stepYamlNode.items.find(
    (item) => isPair(item) && isScalar(item.key) && item.key.value === 'with'
  );

  if (!withPair || !isPair(withPair) || !isMap(withPair.value) || !withPair.value.items) {
    return null;
  }

  // Find the 'inputs' pair within 'with'
  const inputsPair = withPair.value.items.find(
    (item) => isPair(item) && isScalar(item.key) && item.key.value === 'inputs'
  );

  if (!inputsPair || !isPair(inputsPair)) {
    return null;
  }

  // Check if inputs are empty
  if (!YAML.isNode(inputsPair.value) || !isValueNodeEmpty(inputsPair.value)) {
    return null;
  }

  const range = getMonacoRangeFromYamlNode(model, inputsPair.value);
  if (!range) {
    return null;
  }

  // Get the indentation level of the inputs: line
  // Try to get it from the key node, otherwise use the value range's start line
  const inputsKeyNode = inputsPair.key;
  const indentLevel =
    inputsKeyNode && isScalar(inputsKeyNode) && inputsKeyNode.range
      ? (() => {
          const keyRange = getMonacoRangeFromYamlRange(model, inputsKeyNode.range);
          return keyRange ? getIndentLevelFromLineNumber(model, keyRange.startLineNumber) : 0;
        })()
      : getIndentLevelFromLineNumber(model, range.startLineNumber);

  return { range, indentLevel };
}
