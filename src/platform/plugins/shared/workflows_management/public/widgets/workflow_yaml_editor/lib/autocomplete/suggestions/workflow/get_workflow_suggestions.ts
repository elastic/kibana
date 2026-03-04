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
  checkExistingInputs,
  getEmptyInputsRangeAndIndent,
} from './workflow_inputs_scaffolding';
import type { WorkflowsResponse } from '../../../../../../entities/workflows/model/types';
import type { ExtendedAutocompleteContext } from '../../context/autocomplete.types';

type WorkflowSuggestionsContext = ExtendedAutocompleteContext & {
  workflows: WorkflowsResponse;
};

/**
 * Gets workflows from Redux store and filters by search prefix
 * Similar to how connectors work - uses pre-loaded data
 */
function getWorkflowsFromStore(
  workflows: WorkflowsResponse,
  currentWorkflowId: string | null,
  searchPrefix?: string
): Array<{ id: string; name: string; inputsSchema?: JsonModelSchemaType }> {
  if (!workflows.workflows) {
    return [];
  }

  const allWorkflows = Object.values(workflows.workflows);
  const lowerSearchPrefix = searchPrefix?.toLowerCase() || '';

  const filtered = allWorkflows.filter((workflow) => {
    if (workflow.id === currentWorkflowId) {
      return false;
    }
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
 * Builds hover documentation for a workflow completion item.
 * Scenarios: (1) Workflow has no inputs → "Workflow: {name}".
 * (2) Workflow has inputs, step has none/empty → "Workflow: {name}", "Inputs: ...", and note about scaffold/empty replacement.
 * (3) Workflow has inputs, step already has inputs → same plus note that we will not modify existing inputs.
 */
function buildDocumentation(
  workflow: { id: string; name: string; inputsSchema?: JsonModelSchemaType },
  hasInputs: boolean,
  existingInputsState: 'none' | 'empty' | 'has-content'
): string {
  let documentation = `Workflow: ${workflow.name}`;
  if (hasInputs && workflow.inputsSchema?.properties) {
    const inputNames = Object.keys(workflow.inputsSchema.properties).join(', ');
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
 * Creates workflow suggestions for autocomplete
 * Uses pre-loaded workflows from Redux (like connectors)
 */
export async function getWorkflowSuggestions(
  autocompleteContext: WorkflowSuggestionsContext
): Promise<monaco.languages.CompletionItem[]> {
  const { focusedStepInfo, line, lineParseResult, range, workflows, currentWorkflowId, model } =
    autocompleteContext;

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

  const searchPrefix = lineParseResult.fullKey ?? '';

  const workflowSuggestions = getWorkflowsFromStore(workflows, currentWorkflowId, searchPrefix);

  const valueStartIndex = lineParseResult.valueStartIndex;
  const adjustedRange =
    valueStartIndex !== undefined
      ? {
          ...range,
          startColumn: valueStartIndex + 1,
          endColumn: line.length + 1,
        }
      : range;

  const suggestions: monaco.languages.CompletionItem[] = [];

  for (const workflow of workflowSuggestions) {
    const hasInputs = Boolean(
      workflow.inputsSchema?.properties && Object.keys(workflow.inputsSchema.properties).length > 0
    );
    const existingInputsState = checkExistingInputs(focusedStepInfo);
    const emptyInputsInfo =
      existingInputsState === 'empty' ? getEmptyInputsRangeAndIndent(focusedStepInfo, model) : null;
    const { insertText, additionalTextEdits, insertTextRules } = buildInsertTextAndEdits(
      workflow,
      existingInputsState,
      emptyInputsInfo
    );
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
