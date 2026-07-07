/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { JSONSchema7 } from 'json-schema';
import { isScalar } from 'yaml';
import { monaco } from '@kbn/monaco';
import { getPlaceholderForProperty } from './workflow_input_placeholder';
import type { WorkflowsResponse } from '../../../../../../entities/workflows/model/types';
import type { AutocompleteContext } from '../../context/autocomplete.types';

type WorkflowInputsContext = AutocompleteContext & {
  workflows: WorkflowsResponse;
  isInWorkflowInputsContext: boolean;
};

/**
 * Builds documentation string for a workflow input from its JSON Schema property
 */
function buildDocFromJsonSchema(
  name: string,
  propSchema: JSONSchema7,
  isRequired: boolean
): string {
  const inputType = propSchema.type ?? 'unknown';
  const description = propSchema.description ?? '';
  const hasDefault = propSchema.default !== undefined;

  let documentation = `Input: ${name}\nType: ${inputType}`;
  if (isRequired) {
    documentation += '\nRequired: Yes';
  }
  if (description) {
    documentation += `\nDescription: ${description}`;
  }
  if (hasDefault) {
    documentation += `\nDefault: ${JSON.stringify(propSchema.default)}`;
  }

  if (propSchema.enum && propSchema.enum.length > 0) {
    documentation += `\nOptions: ${propSchema.enum.join(', ')}`;
  }

  if (inputType === 'array') {
    if (propSchema.minItems !== undefined) {
      documentation += `\nMin items: ${propSchema.minItems}`;
    }
    if (propSchema.maxItems !== undefined) {
      documentation += `\nMax items: ${propSchema.maxItems}`;
    }
  }

  return documentation;
}

/**
 * Creates a completion item for a workflow input from its JSON Schema property
 */
function createInputSuggestion(
  name: string,
  propSchema: JSONSchema7,
  isRequired: boolean,
  range: monaco.IRange
): monaco.languages.CompletionItem {
  const inputType = propSchema.type ?? 'unknown';
  const documentation = buildDocFromJsonSchema(name, propSchema, isRequired);
  const placeholder = getPlaceholderForProperty(propSchema);
  const insertText = `${name}: ${placeholder}`;

  return {
    label: name,
    kind: monaco.languages.CompletionItemKind.Property,
    insertText,
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    range,
    documentation: {
      value: documentation,
      isTrusted: true,
    },
    detail: `${inputType}${isRequired ? ' (required)' : ''}`,
    sortText: isRequired ? `!${name}` : name,
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
  autocompleteContext: WorkflowInputsContext
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
  const schema = workflow?.inputsSchema;
  const properties = schema?.properties;
  if (!workflow || !properties || Object.keys(properties).length === 0) {
    return [];
  }

  const searchPrefix =
    lineParseResult?.matchType === 'workflow-inputs' && lineParseResult
      ? lineParseResult.fullKey ?? ''
      : extractInputKeyPrefix(lineUpToCursor);
  const lowerSearchPrefix = searchPrefix.toLowerCase();
  const required = schema.required ?? [];

  const suggestions: monaco.languages.CompletionItem[] = [];

  for (const [name, propSchema] of Object.entries(properties)) {
    const prop = propSchema as JSONSchema7;
    const isRequired = required.includes(name);
    const matchesPrefix = !lowerSearchPrefix || name.toLowerCase().startsWith(lowerSearchPrefix);

    if (matchesPrefix) {
      suggestions.push(createInputSuggestion(name, prop, isRequired, range));
    }
  }

  return suggestions;
}
