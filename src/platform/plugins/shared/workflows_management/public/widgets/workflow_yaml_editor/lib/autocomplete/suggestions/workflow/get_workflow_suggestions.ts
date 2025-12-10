/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '@kbn/monaco';
import type { WorkflowsResponse } from '../../../../../../entities/workflows/model/types';
import type { AutocompleteContext } from '../../context/autocomplete.types';

interface WorkflowSuggestion {
  id: string;
  name: string;
}

/**
 * Gets workflows from Redux store and filters by search prefix
 * Similar to how connectors work - uses pre-loaded data
 */
function getWorkflowsFromStore(
  workflows: WorkflowsResponse,
  searchPrefix?: string
): WorkflowSuggestion[] {
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

  return filtered.map((workflow: { id: string; name: string }) => ({
    id: workflow.id,
    name: workflow.name,
  }));
}

/**
 * Determines the insert text - always just the workflow ID
 */
function getInsertText(workflow: WorkflowSuggestion): string {
  return workflow.id;
}

/**
 * Creates workflow suggestions for autocomplete
 * Uses pre-loaded workflows from Redux (like connectors)
 */
export async function getWorkflowSuggestions(
  autocompleteContext: AutocompleteContext
): Promise<monaco.languages.CompletionItem[]> {
  const { focusedStepInfo, line, lineParseResult, range, workflows } = autocompleteContext;

  if (lineParseResult?.matchType !== 'workflow-id') {
    return [];
  }

  if (focusedStepInfo && focusedStepInfo.stepType !== 'workflow.execute') {
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
    const insertText = getInsertText(workflow);

    suggestions.push({
      label: `${workflow.name} (id: ${workflow.id})`,
      kind: monaco.languages.CompletionItemKind.Reference,
      insertText,
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      range: adjustedRange,
      documentation: `Workflow: ${workflow.name}`,
      filterText: `${workflow.name} ${workflow.id}`, // Allow filtering by both name and ID
      sortText: `!${workflow.id}`,
      detail: 'Workflow ID',
    });
  }

  return suggestions;
}
