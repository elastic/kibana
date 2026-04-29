/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '@kbn/monaco';
import { buildAutocompleteContext } from './context/build_autocomplete_context';
import { getAllYamlProviders } from './intercept_monaco_yaml_provider';
import { getSuggestions, isInsideLoopBody } from './suggestions/get_suggestions';
import type { GetStepPropertyHandler } from './suggestions/step_property/get_step_property_suggestions';
import { isInWorkflowOutputWithBlock } from './suggestions/workflow/get_workflow_outputs_suggestions';
import type { WorkflowKqlCompletionServices } from './suggestions/workflow_kql_completion_services';
import { isDeprecatedStepType } from '../../../../../common/schema';
import type { WorkflowDetailState } from '../../../../entities/workflows/store';

// Unique identifier for the workflow completion provider
export const WORKFLOW_COMPLETION_PROVIDER_ID = 'workflows-yaml-completion-provider';
// Snippet enum alias to improve code readability
const INSERT_AS_SNIPPET = monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet;

/**
 * Step types that are only valid inside loop bodies (foreach / while).
 * The monaco-yaml schema provider suggests them everywhere, so the
 * completion provider must strip them when the cursor is outside a loop.
 */
const LOOP_ONLY_STEP_TYPES = new Set(['loop.break', 'loop.continue']);

/**
 * Match types where the cursor is inside a Liquid/variable expression.
 * The YAML schema provider cannot contribute suggestions for these contexts
 * and can block the completion pipeline for seconds on large documents.
 */
const TEMPLATE_EXPRESSION_MATCH_TYPES = new Set([
  'variable-unfinished',
  'variable-complete',
  'at',
  'foreach-variable',
  'liquid-filter',
  'liquid-block-filter',
  'liquid-syntax',
]);

/**
 * Get the deduplication key for a suggestion.
 * Uses filterText if available (contains the actual connector type),
 * otherwise falls back to the label.
 */
function getDeduplicationKey(suggestion: monaco.languages.CompletionItem): string {
  // Prefer filterText as it contains the actual technical name (e.g., 'kibana.createCaseDefaultSpace')
  // even when the label shows a cleaner display name (e.g., 'kibana.createCase')
  if (suggestion.filterText) {
    return suggestion.filterText;
  }
  return typeof suggestion.label === 'string' ? suggestion.label : suggestion.label.label;
}

/**
 * Add suggestions to a deduplicated map, preferring suggestions with snippets over plain text.
 * Filters out deprecated step types so they don't appear in autocomplete.
 */
function mapSuggestions(
  map: Map<string, monaco.languages.CompletionItem>,
  suggestions: monaco.languages.CompletionItem[]
): void {
  for (const suggestion of suggestions) {
    const key = getDeduplicationKey(suggestion);

    // Skip deprecated step types - they still work for backward compatibility
    // but we don't want to suggest them to users
    if (!isDeprecatedStepType(key)) {
      const existing = map.get(key);

      if (existing) {
        const existingHasSnippet = existing.insertTextRules === INSERT_AS_SNIPPET;
        const currentHasSnippet = suggestion.insertTextRules === INSERT_AS_SNIPPET;

        if (currentHasSnippet && !existingHasSnippet) {
          map.set(key, suggestion);
        }
      } else {
        map.set(key, suggestion);
      }
    }
  }
}

export function getCompletionItemProvider(
  getState: () => WorkflowDetailState,
  getKqlServices?: () => WorkflowKqlCompletionServices,
  getPropertyHandler?: GetStepPropertyHandler
): monaco.languages.CompletionItemProvider {
  const provider: monaco.languages.CompletionItemProvider & { __providerId?: string } = {
    // Unique identifier to distinguish our provider from others
    __providerId: WORKFLOW_COMPLETION_PROVIDER_ID,
    // Trigger characters for completion:
    // '@' - variable references
    // '.' - property access within variables
    // ' ' - space, Liquid / KQL tokens
    // '|' - Liquid filters (e.g., {{ variable | filter }})
    // '{' - start of Liquid blocks (e.g., {{ ... }})
    // ':' '(' '"' "'" — also trigger automatic quick suggest for KQL inside quoted `on.condition`.
    triggerCharacters: ['@', '.', ' ', '"', "'", '(', ':', '|', '{'],
    provideCompletionItems: async (model, position, completionContext) => {
      const editorState = getState();
      const autocompleteContext = buildAutocompleteContext({
        editorState,
        model,
        position,
        completionContext,
      });
      if (!autocompleteContext) {
        return {
          suggestions: [],
          incomplete: false,
        };
      }

      // Incremental deduplication accumulator
      const deduplicatedMap = new Map<string, monaco.languages.CompletionItem>();

      // Inside workflow.output's with: block, show only declared output field names so the user
      // doesn't get generic YAML/JSON Schema keys; skip the YAML provider in that case.
      const shouldUseExclusiveSuggestions = isInWorkflowOutputWithBlock(
        autocompleteContext.focusedStepInfo
      );

      const matchType = autocompleteContext.lineParseResult?.matchType ?? '';
      const isInTemplateExpression =
        TEMPLATE_EXPRESSION_MATCH_TYPES.has(matchType) ||
        (matchType === 'liquid-block-keyword' && autocompleteContext.isInLiquidBlock);

      let isIncomplete = false;

      if (!shouldUseExclusiveSuggestions && !isInTemplateExpression) {
        const allYamlProviders = getAllYamlProviders();

        for (const yamlProvider of allYamlProviders) {
          if (yamlProvider.provideCompletionItems) {
            try {
              const result = await yamlProvider.provideCompletionItems(
                model,
                position,
                completionContext,
                {} as monaco.CancellationToken
              );
              if (result) {
                // Deduplicate across YAML providers only (snippet beats plain)
                mapSuggestions(deduplicatedMap, result.suggestions || []);
                if (result.incomplete) {
                  isIncomplete = true;
                }
              }
            } catch (error) {
              // Continue with other providers if one fails
            }
          }
        }
      }

      const workflowSuggestions = await getSuggestions(
        {
          ...autocompleteContext,
          model,
          position,
        },
        getKqlServices?.(),
        getPropertyHandler
      );
      // Workflow suggestions always win over YAML duplicates.
      for (const suggestion of workflowSuggestions) {
        const key = getDeduplicationKey(suggestion);
        if (!isDeprecatedStepType(key)) {
          deduplicatedMap.set(key, suggestion);
        }
      }

      let suggestions = Array.from(deduplicatedMap.values());

      if (!isInsideLoopBody(autocompleteContext)) {
        suggestions = suggestions.filter((s) => {
          const label = typeof s.label === 'string' ? s.label : s.label.label;
          const text = typeof s.insertText === 'string' ? s.insertText : '';
          return !LOOP_ONLY_STEP_TYPES.has(label) && !LOOP_ONLY_STEP_TYPES.has(text);
        });
      }

      return {
        suggestions,
        incomplete: isIncomplete,
      };
    },
  };
  return provider;
}
