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
import type { WorkflowInput, WorkflowInputChoice } from '@kbn/workflows';
import type { WorkflowsResponse } from '../../../../../../entities/workflows/model/types';
import type { StepInfo } from '../../../../../../entities/workflows/store/workflow_detail/utils/build_workflow_lookup';
import { getIndentLevelFromLineNumber } from '../../../get_indent_level';
import { getMonacoRangeFromYamlNode, getMonacoRangeFromYamlRange } from '../../../utils';
import type { ExtendedAutocompleteContext } from '../../context/autocomplete.types';

/**
 * Gets workflows from Redux store and filters by search prefix
 * Similar to how connectors work - uses pre-loaded data
 */
function getWorkflowsFromStore(
  workflows: WorkflowsResponse,
  searchPrefix?: string
): Array<{ id: string; name: string; inputs?: WorkflowInput[] }> {
  if (!workflows.workflows) {
    return [];
  }

  const allWorkflows = Object.values(workflows.workflows);
  const lowerSearchPrefix = searchPrefix?.toLowerCase() || '';

  const filtered = allWorkflows.filter((workflow) => {
    if (!lowerSearchPrefix) {
      return true;
    }
    return (
      workflow.name.toLowerCase().includes(lowerSearchPrefix) ||
      workflow.id.toLowerCase().includes(lowerSearchPrefix)
    );
  });

  return filtered;
}

/**
 * Generates the input value for a single input
 * @param useSnippetPlaceholders - if true, uses snippet placeholders for tab navigation (for insertion)
 *                                  if false, uses actual values (for replacement)
 */
function getInputValue(
  input: WorkflowInput,
  index: number,
  useSnippetPlaceholders: boolean
): string {
  let value: string;

  // Use default value if available, otherwise use placeholder based on type
  if (input.default !== undefined) {
    value = JSON.stringify(input.default);
  } else {
    switch (input.type) {
      case 'string':
        value = '""';
        break;
      case 'number':
        value = '0';
        break;
      case 'boolean':
        value = 'false';
        break;
      case 'choice':
        const choiceInput = input as WorkflowInputChoice;
        if (choiceInput.options && choiceInput.options.length > 0) {
          value = JSON.stringify(choiceInput.options[0]);
        } else {
          value = '""';
        }
        break;
      case 'array':
        value = '[]';
        break;
      default:
        value = '""';
    }
  }

  // Use snippet placeholder only for insertion, not for replacement
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
function generateInputLines(
  inputs: WorkflowInput[] | undefined,
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
function generateInputsContent(
  inputs: WorkflowInput[] | undefined,
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
function generateInputsSnippet(inputs: WorkflowInput[] | undefined): string {
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
function checkInputsInYamlNode(stepYamlNode: YAML.YAMLMap): 'none' | 'empty' | 'has-content' {
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
function checkExistingInputs(focusedStepInfo: StepInfo | null): 'none' | 'empty' | 'has-content' {
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
function buildInsertTextAndEdits(
  workflow: { id: string; name: string; inputs?: WorkflowInput[] },
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
 * Builds documentation for workflow suggestion
 */
function buildDocumentation(
  workflow: { id: string; name: string; inputs?: WorkflowInput[] },
  hasInputs: boolean,
  existingInputsState: 'none' | 'empty' | 'has-content'
): string {
  let documentation = `Workflow: ${workflow.name}`;
  if (hasInputs && workflow.inputs) {
    const inputNames = workflow.inputs.map((input) => input.name).join(', ');
    documentation += `\n\nInputs: ${inputNames}`;
    if (existingInputsState === 'has-content') {
      documentation += '\n\nNote: Inputs already exist in this step and will not be modified.';
    } else if (existingInputsState === 'empty') {
      documentation += '\n\nNote: Empty inputs will be replaced with scaffolded values.';
    }
  }
  return documentation;
}

/**
 * Gets the range and indentation for empty inputs that need to be replaced
 */
function getEmptyInputsRangeAndIndent(
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

/**
 * Creates workflow suggestions for autocomplete
 * Uses pre-loaded workflows from Redux (like connectors)
 */
export async function getWorkflowSuggestions(
  autocompleteContext: ExtendedAutocompleteContext
): Promise<monaco.languages.CompletionItem[]> {
  const { focusedStepInfo, line, lineParseResult, range, workflows, model } = autocompleteContext;

  if (lineParseResult?.matchType !== 'workflow-id') {
    return [];
  }

  if (
    focusedStepInfo &&
    focusedStepInfo.stepType !== 'workflow.execute' &&
    focusedStepInfo.stepType !== 'workflow.executeAsync'
  ) {
    return [];
  }

  const searchPrefix = lineParseResult?.fullKey || '';

  const workflowSuggestions = getWorkflowsFromStore(workflows, searchPrefix);

  const workflowParseResult = lineParseResult?.matchType === 'workflow-id' ? lineParseResult : null;
  const adjustedRange =
    workflowParseResult && 'valueStartIndex' in workflowParseResult
      ? {
          ...range,
          startColumn: workflowParseResult.valueStartIndex + 1,
          endColumn: line.length + 1,
        }
      : range;

  const suggestions: monaco.languages.CompletionItem[] = [];

  for (const workflow of workflowSuggestions) {
    const hasInputs = Boolean(workflow.inputs && workflow.inputs.length > 0);
    const existingInputsState = checkExistingInputs(focusedStepInfo);

    // If inputs are empty, get their range and indentation for replacement
    const emptyInputsInfo =
      existingInputsState === 'empty' ? getEmptyInputsRangeAndIndent(focusedStepInfo, model) : null;

    // Generate insert text, additional edits, and insert rules
    const { insertText, additionalTextEdits, insertTextRules } = buildInsertTextAndEdits(
      workflow,
      existingInputsState,
      emptyInputsInfo
    );

    // Build documentation
    const documentation = buildDocumentation(workflow, hasInputs, existingInputsState);

    suggestions.push({
      label: `${workflow.name} (id: ${workflow.id})`,
      kind: monaco.languages.CompletionItemKind.Reference,
      insertText,
      insertTextRules,
      range: adjustedRange,
      additionalTextEdits,
      documentation,
      filterText: `${workflow.name} ${workflow.id}`, // Allow filtering by both name and ID
      sortText: `!${workflow.id}`,
      detail: hasInputs ? 'Workflow ID (with inputs)' : 'Workflow ID',
    });
  }

  return suggestions;
}
