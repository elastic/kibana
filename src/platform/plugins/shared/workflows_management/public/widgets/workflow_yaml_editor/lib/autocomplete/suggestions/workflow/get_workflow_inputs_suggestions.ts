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
import type { LegacyWorkflowInput } from '@kbn/workflows';
// WorkflowInputChoiceSchema is needed as a value for typeof, not just as a type
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { WorkflowInputChoiceSchema } from '@kbn/workflows';
import type { z } from '@kbn/zod/v4';
import { getInputPlaceholderValue } from './workflow_input_placeholder';
import type { AutocompleteContext } from '../../context/autocomplete.types';

type WorkflowInputChoice = z.infer<typeof WorkflowInputChoiceSchema>;

/**
 * Builds documentation string for a workflow input
 */
function buildInputDocumentation(input: LegacyWorkflowInput): string {
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
    const arrayInput = input as LegacyWorkflowInput & { minItems?: number; maxItems?: number };
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
function getInputInsertText(input: LegacyWorkflowInput): string {
  return `${input.name}: ${getInputPlaceholderValue(input)}`;
}

/**
 * Creates a completion item for a workflow input
 */
function createInputSuggestion(
  input: LegacyWorkflowInput,
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
 * Extracts the input key prefix from a line inside a `with.inputs` block.
 * For `  myIn` returns `'myIn'`, for `  myInput: value` returns `'myInput'`.
 */
function extractInputKeyPrefix(lineUpToCursor: string): string {
  const keyMatch = lineUpToCursor.match(/^\s*([a-zA-Z_][a-zA-Z0-9_-]*)/);
  return keyMatch?.[1] ?? '';
}

/**
 * Gets workflow inputs suggestions for autocomplete.
 * Used when typing in the inputs: section of a workflow.execute or workflow.executeAsync step.
 *
 * Detection uses two complementary signals:
 * - `matchType === 'workflow-inputs'`: line parser matched the `inputs:` key directly
 * - `isInWorkflowInputsContext`: YAML AST path indicates cursor is inside `with.inputs`
 *
 * Returns null when not in a workflow step context so other suggestion providers
 * (e.g. JSON Schema) can run.
 */
export async function getWorkflowInputsSuggestions(
  autocompleteContext: AutocompleteContext
): Promise<monaco.languages.CompletionItem[] | null> {
  const { focusedStepInfo, lineParseResult, lineUpToCursor, range, workflows } =
    autocompleteContext;

  const isWorkflowStep =
    focusedStepInfo?.stepType === 'workflow.execute' ||
    focusedStepInfo?.stepType === 'workflow.executeAsync';

  if (!focusedStepInfo || !isWorkflowStep) {
    return null;
  }

  const isInputsMatchType = lineParseResult?.matchType === 'workflow-inputs';
  const isInputsPath = autocompleteContext.isInWorkflowInputsContext;

  if (!isInputsMatchType && !isInputsPath) {
    return null;
  }

  const workflowIdProp = focusedStepInfo.propInfos['with.workflow-id'];
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

  const searchPrefix = isInputsMatchType
    ? lineParseResult?.fullKey || ''
    : extractInputKeyPrefix(lineUpToCursor);
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
