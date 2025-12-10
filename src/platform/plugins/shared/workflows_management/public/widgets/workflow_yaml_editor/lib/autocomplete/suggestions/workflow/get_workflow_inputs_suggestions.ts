/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isScalar } from 'yaml';
import { monaco } from '@kbn/monaco';
import type { WorkflowInput, WorkflowInputChoice } from '@kbn/workflows';
import type { AutocompleteContext } from '../../context/autocomplete.types';

/**
 * Builds documentation string for a workflow input
 */
function buildInputDocumentation(input: WorkflowInput): string {
  const inputType = input.type;
  const isRequired = input.required || false;
  const description = input.description || '';
  const hasDefault = input.default !== undefined;

  let documentation = `Input: ${input.name}\nType: ${inputType}`;
  if (isRequired) {
    documentation += '\nRequired: Yes';
  }
  if (description) {
    documentation += `\nDescription: ${description}`;
  }
  if (hasDefault) {
    documentation += `\nDefault: ${JSON.stringify(input.default)}`;
  }

  // For choice inputs, show options
  if (inputType === 'choice') {
    const choiceInput = input as WorkflowInputChoice;
    if (choiceInput.options && choiceInput.options.length > 0) {
      documentation += `\nOptions: ${choiceInput.options.join(', ')}`;
    }
  }

  // For array inputs, show constraints
  if (inputType === 'array') {
    const arrayInput = input as WorkflowInput & { minItems?: number; maxItems?: number };
    if (arrayInput.minItems !== undefined) {
      documentation += `\nMin items: ${arrayInput.minItems}`;
    }
    if (arrayInput.maxItems !== undefined) {
      documentation += `\nMax items: ${arrayInput.maxItems}`;
    }
  }

  return documentation;
}

/**
 * Determines the insert text for a workflow input based on its type and default value
 */
function getInputInsertText(input: WorkflowInput): string {
  const inputName = input.name;
  const hasDefault = input.default !== undefined;

  if (hasDefault) {
    return `${inputName}: ${JSON.stringify(input.default)}`;
  }

  // Otherwise, insert placeholder based on type
  switch (input.type) {
    case 'string':
      return `${inputName}: ""`;
    case 'number':
      return `${inputName}: 0`;
    case 'boolean':
      return `${inputName}: false`;
    case 'choice': {
      const choiceInput = input as WorkflowInputChoice;
      if (choiceInput.options && choiceInput.options.length > 0) {
        return `${inputName}: "${choiceInput.options[0]}"`;
      }
      return `${inputName}: ""`;
    }
    case 'array':
      return `${inputName}: []`;
    default:
      return `${inputName}: ""`;
  }
}

/**
 * Creates a completion item for a workflow input
 */
function createInputSuggestion(
  input: WorkflowInput,
  range: monaco.IRange
): monaco.languages.CompletionItem {
  const inputType = input.type;
  const isRequired = input.required || false;
  const documentation = buildInputDocumentation(input);
  const insertText = getInputInsertText(input);

  return {
    label: input.name,
    kind: monaco.languages.CompletionItemKind.Property,
    insertText,
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    range,
    documentation: {
      value: documentation,
      isTrusted: true,
    },
    detail: `${inputType}${isRequired ? ' (required)' : ''}`,
    sortText: isRequired ? `!${input.name}` : input.name, // Sort required inputs first
  };
}

/**
 * Gets workflow inputs suggestions for autocomplete
 * Used when typing in the inputs: section of a workflow.execute or workflow.executeAsync step
 */
export async function getWorkflowInputsSuggestions(
  autocompleteContext: AutocompleteContext
): Promise<monaco.languages.CompletionItem[]> {
  const { focusedStepInfo, lineParseResult, range, workflows } = autocompleteContext;

  if (
    !focusedStepInfo ||
    (focusedStepInfo.stepType !== 'workflow.execute' &&
      focusedStepInfo.stepType !== 'workflow.executeAsync')
  ) {
    return [];
  }

  if (lineParseResult?.matchType !== 'workflow-inputs') {
    return [];
  }

  const workflowIdProp = focusedStepInfo.propInfos['workflow-id'];
  if (!workflowIdProp || !isScalar(workflowIdProp.valueNode)) {
    return [];
  }

  const workflowId = workflowIdProp.valueNode.value;
  if (typeof workflowId !== 'string' || !workflowId) {
    return [];
  }

  const workflow = workflows.workflows[workflowId];
  if (!workflow || !workflow.inputs || workflow.inputs.length === 0) {
    return [];
  }

  const searchPrefix = lineParseResult?.fullKey || '';
  const lowerSearchPrefix = searchPrefix.toLowerCase();

  const suggestions: monaco.languages.CompletionItem[] = [];

  for (const input of workflow.inputs) {
    const matchesPrefix =
      !lowerSearchPrefix || input.name.toLowerCase().startsWith(lowerSearchPrefix);

    if (matchesPrefix) {
      suggestions.push(createInputSuggestion(input, range));
    }
  }

  return suggestions;
}
