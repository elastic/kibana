/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { i18n } from '@kbn/i18n';
import type { ESQLAstAllCommands, ESQLAstWorkflowCommand } from '../../../types';
import { pipeCompleteItem, withCompleteItem } from '../complete_items';
import type { ISuggestionItem, ICommandContext, ICommandCallbacks } from '../types';
import { SuggestionCategory } from '../../../shared/sorting/types';

/**
 * Workflow autocomplete item
 */
interface WorkflowAutocompleteItem {
  id: string;
  name: string;
  description?: string;
  enabled?: boolean;
}

/**
 * Creates a suggestion item for a workflow
 */
function createWorkflowSuggestion(workflow: WorkflowAutocompleteItem): ISuggestionItem {
  const label = workflow.name;
  return {
    label,
    text: `"${workflow.name}" `,
    kind: 'Constant',
    detail: workflow.description || `Workflow: ${workflow.name}`,
    sortText: workflow.enabled === false ? '9' : '1', // Sort disabled workflows last
    command: { id: 'editor.action.triggerSuggest', title: 'Trigger suggest' },
    category: SuggestionCategory.CONSTANT_VALUE,
  };
}

/**
 * Fetches available workflows from the Kibana API.
 * Returns an empty array if the fetch fails or workflows feature is not available.
 */
async function fetchAvailableWorkflows(): Promise<WorkflowAutocompleteItem[]> {
  try {
    // Call the Kibana workflows list API
    const response = await fetch('/api/workflows/list', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'kbn-xsrf': 'true',
      },
      credentials: 'same-origin',
    });

    if (!response.ok) {
      // API not available or error - return empty array
      return [];
    }

    const data = await response.json();
    return data.workflows || [];
  } catch {
    // Network error or API not available - return empty array
    return [];
  }
}

export async function autocomplete(
  query: string,
  command: ESQLAstAllCommands,
  callbacks?: ICommandCallbacks,
  context?: ICommandContext,
  cursorPosition: number = query.length
): Promise<ISuggestionItem[]> {
  const innerText = query.substring(0, cursorPosition);
  const workflowCommand = command as ESQLAstWorkflowCommand;

  // After WORKFLOW keyword, suggest available workflows
  if (/workflow\s*$/i.test(innerText)) {
    const workflows = await fetchAvailableWorkflows();

    if (workflows.length > 0) {
      // Return actual workflow suggestions
      const suggestions = workflows.map(createWorkflowSuggestion);

      // Add a generic placeholder at the end
      suggestions.push({
        label: '"<workflow-name>"',
        text: '"" ',
        kind: 'Constant',
        detail: i18n.translate('kbn-esql-language.esql.autocomplete.workflowCustomDoc', {
          defaultMessage: 'Enter a workflow name or ID',
        }),
        sortText: 'z', // Sort last
        command: { id: 'editor.action.triggerSuggest', title: 'Trigger suggest' },
        category: SuggestionCategory.CONSTANT_VALUE,
      });

      return suggestions;
    }

    // Fallback if no workflows found
    return [
      {
        label: '"workflow-name"',
        text: '"" ',
        kind: 'Constant',
        detail: i18n.translate('kbn-esql-language.esql.autocomplete.workflowIdDoc', {
          defaultMessage: 'Workflow name or ID to execute',
        }),
        sortText: '1',
        command: { id: 'editor.action.triggerSuggest', title: 'Trigger suggest' },
        category: SuggestionCategory.CONSTANT_VALUE,
      },
    ];
  }

  // After workflow ID, suggest WITH
  if (/workflow\s+"[^"]*"\s*$/i.test(innerText)) {
    return [
      {
        ...withCompleteItem,
        detail: i18n.translate('kbn-esql-language.esql.autocomplete.workflowWithDoc', {
          defaultMessage: 'Provide inputs for the workflow.',
        }),
      },
    ];
  }

  // After WITH (, suggest input parameter names
  if (/workflow\s+"[^"]*"\s+with\s*\(\s*$/i.test(innerText)) {
    const suggestions: ISuggestionItem[] = [];

    // Add common input parameter suggestions
    const commonInputs = ['message', 'input', 'data', 'query', 'text'];
    for (const input of commonInputs) {
      suggestions.push({
        label: input,
        text: `${input} = `,
        kind: 'Field',
        detail: `Workflow input parameter`,
        sortText: '1',
        command: { id: 'editor.action.triggerSuggest', title: 'Trigger suggest' },
        category: SuggestionCategory.FIELD,
      });
    }

    // Also suggest fields from the query context if available
    if (callbacks?.getByType) {
      const fields = await callbacks.getByType(['text', 'keyword']);
      for (const field of fields) {
        suggestions.push({
          label: field.label,
          text: `${field.label} = `,
          kind: 'Field',
          detail: `Field from query context`,
          sortText: '2',
          command: { id: 'editor.action.triggerSuggest', title: 'Trigger suggest' },
          category: SuggestionCategory.FIELD,
        });
      }
    }

    return suggestions;
  }

  // After closing ), suggest AS or pipe
  if (/workflow\s+"[^"]*"\s+with\s*\([^)]*\)\s*$/i.test(innerText)) {
    return [
      {
        label: 'AS',
        text: 'AS ',
        kind: 'Keyword',
        detail: i18n.translate('kbn-esql-language.esql.autocomplete.workflowAsDoc', {
          defaultMessage: 'Specify output field name',
        }),
        sortText: '1',
        command: { id: 'editor.action.triggerSuggest', title: 'Trigger suggest' },
        category: SuggestionCategory.LANGUAGE_KEYWORD,
      },
      pipeCompleteItem,
    ];
  }

  // After AS, suggest output field name
  if (/workflow\s+"[^"]*"\s+with\s*\([^)]*\)\s+as\s*$/i.test(innerText)) {
    // Get the workflow name if available for a better suggestion
    const workflowId = workflowCommand?.workflowId?.value;
    const suggestedName = workflowId
      ? workflowId.toString().replace(/[^a-zA-Z0-9]/g, '_')
      : 'result';

    return [
      {
        label: suggestedName,
        text: `${suggestedName} `,
        kind: 'Field',
        detail: i18n.translate('kbn-esql-language.esql.autocomplete.workflowResultDoc', {
          defaultMessage: 'Output field name for workflow result',
        }),
        sortText: '1',
        category: SuggestionCategory.FIELD,
      },
      {
        label: 'result',
        text: 'result ',
        kind: 'Field',
        detail: i18n.translate('kbn-esql-language.esql.autocomplete.workflowGenericResultDoc', {
          defaultMessage: 'Generic output field name',
        }),
        sortText: '2',
        category: SuggestionCategory.FIELD,
      },
    ];
  }

  // Default: suggest pipe
  return [pipeCompleteItem];
}

