/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '@kbn/monaco';
import type { LegacyWorkflowInput } from '@kbn/workflows';
import {
  buildInsertTextAndEdits,
  checkExistingInputs,
  getEmptyInputsRangeAndIndent,
} from './workflow_inputs_scaffolding';
import type { WorkflowsResponse } from '../../../../../../entities/workflows/model/types';
import type { ExtendedAutocompleteContext } from '../../context/autocomplete.types';

/**
 * Gets workflows from Redux store and filters by search prefix
 * Similar to how connectors work - uses pre-loaded data
 */
function getWorkflowsFromStore(
  workflows: WorkflowsResponse,
  searchPrefix?: string
): Array<{ id: string; name: string; inputs?: LegacyWorkflowInput[] }> {
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
 * Builds documentation for workflow suggestion
 */
function buildDocumentation(
  workflow: { id: string; name: string; inputs?: LegacyWorkflowInput[] },
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
