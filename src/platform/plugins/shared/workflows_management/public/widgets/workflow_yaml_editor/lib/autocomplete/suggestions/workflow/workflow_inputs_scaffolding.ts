/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { JSONSchema7 } from 'json-schema';
import YAML, { isMap, isPair, isScalar } from 'yaml';
import { monaco } from '@kbn/monaco';
import type { JsonModelSchemaType } from '@kbn/workflows/spec/schema/common/json_model_schema';
import { getPlaceholderForProperty } from './workflow_input_placeholder';
import type { StepInfo } from '../../../../../../entities/workflows/store/workflow_detail/utils/build_workflow_lookup';
import { getIndentLevelFromLineNumber } from '../../../get_indent_level';
import { getMonacoRangeFromYamlNode, getMonacoRangeFromYamlRange } from '../../../utils';

/**
 * Generates the input value for a single input from its JSON Schema property
 * @param useSnippetPlaceholders - if true, uses snippet placeholders for tab navigation (for insertion)
 *                                  if false, uses actual values (for replacement)
 */
function getInputValue(
  propSchema: JSONSchema7,
  index: number,
  useSnippetPlaceholders: boolean
): string {
  const value = getPlaceholderForProperty(propSchema);
  if (useSnippetPlaceholders) {
    return `\${${index + 1}:${value}}`;
  }
  return value;
}

/**
 * Generates input lines (key-value pairs) for a workflow from its inputs JSON Schema
 * @param inputsSchema - The workflow inputs schema (properties + required)
 * @param useSnippetPlaceholders - Whether to use snippet placeholders for tab navigation
 * @param indentPrefix - The indentation prefix for each input line (e.g., "    " for 4 spaces)
 */
export function generateInputLines(
  inputsSchema: JsonModelSchemaType | undefined,
  useSnippetPlaceholders: boolean,
  indentPrefix: string
): string[] {
  const properties = inputsSchema?.properties;
  if (!properties || Object.keys(properties).length === 0) {
    return [];
  }

  return Object.entries(properties).map(([name, propSchema], index) => {
    const prop = propSchema as JSONSchema7;
    const value = getInputValue(prop, index, useSnippetPlaceholders);
    return `${indentPrefix}${name}: ${value}`;
  });
}

/**
 * Generates just the inputs content (key-value pairs) without the inputs: header
 * Used when replacing empty inputs: {}
 */
export function generateInputsContent(
  inputsSchema: JsonModelSchemaType | undefined,
  inputsIndentLevel: number
): string {
  const inputIndent = ' '.repeat(inputsIndentLevel + 2);
  const inputLines = generateInputLines(inputsSchema, false, inputIndent);
  // Start with newline so when replacing {}, the content appears on new lines
  // End with newline so the next property (like await:) appears on a new line
  return inputLines.length > 0 ? `\n${inputLines.join('\n')}\n` : '';
}

/**
 * Generates the inputs YAML structure for a workflow
 * Returns empty string if workflow has no inputs
 * The snippet is designed to be inserted after workflow-id on the same indentation level
 */
export function generateInputsSnippet(inputsSchema: JsonModelSchemaType | undefined): string {
  const inputLines = generateInputLines(inputsSchema, true, '  ');
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
 * Checks whether the workflow.execute step's YAML already has a with.inputs block.
 * - 'none': step has no inputs key (we can insert "inputs:\n  key: value" in the snippet).
 * - 'empty': step has "inputs: {}" (we can replace the {} with scaffolded key-value pairs).
 * - 'has-content': step has "inputs: { someKey: ... }" (we do not modify, only suggest workflow-id).
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
  workflow: { id: string; name: string; inputsSchema?: JsonModelSchemaType },
  existingInputsState: 'none' | 'empty' | 'has-content',
  emptyInputsInfo: { range: monaco.Range; indentLevel: number } | null
): {
  insertText: string;
  additionalTextEdits?: monaco.languages.TextEdit[];
  insertTextRules: monaco.languages.CompletionItemInsertTextRule;
} {
  const workflowId = workflow.id;
  const hasInputs = Boolean(
    workflow.inputsSchema?.properties && Object.keys(workflow.inputsSchema.properties).length > 0
  );

  // If inputs are empty, replace them using additionalTextEdits
  if (existingInputsState === 'empty' && hasInputs && workflow.inputsSchema && emptyInputsInfo) {
    const inputsContent = generateInputsContent(workflow.inputsSchema, emptyInputsInfo.indentLevel);
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
  if (existingInputsState === 'none' && hasInputs && workflow.inputsSchema) {
    const inputsSnippet = generateInputsSnippet(workflow.inputsSchema);
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
