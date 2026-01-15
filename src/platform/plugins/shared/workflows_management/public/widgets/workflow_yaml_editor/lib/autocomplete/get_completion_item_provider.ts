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
import { getSuggestions } from './suggestions/get_suggestions';
import type { WorkflowDetailState } from '../../../../entities/workflows/store';

// Unique identifier for the workflow completion provider
export const WORKFLOW_COMPLETION_PROVIDER_ID = 'workflows-yaml-completion-provider';
// Snippet enum alias to improve code readability
const INSERT_AS_SNIPPET = monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet;

/**
 * Deprecated type aliases that should NOT be shown in autocomplete suggestions.
 * These are kept for backward compatibility (existing workflows still validate)
 * but we don't want users to use them in new workflows.
 */
const DEPRECATED_TYPE_ALIASES = new Set([
  'kibana.createCaseDefaultSpace',
  'kibana.getCaseDefaultSpace',
  'kibana.updateCaseDefaultSpace',
  'kibana.addCaseCommentDefaultSpace',
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
 * Filters out deprecated type aliases so they don't appear in autocomplete.
 */
function mapSuggestions(
  map: Map<string, monaco.languages.CompletionItem>,
  suggestions: monaco.languages.CompletionItem[]
): void {
  for (const suggestion of suggestions) {
    const key = getDeduplicationKey(suggestion);

    // Skip deprecated type aliases - they still work for backward compatibility
    // but we don't want to suggest them to users
    if (!DEPRECATED_TYPE_ALIASES.has(key)) {
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
  getState: () => WorkflowDetailState
): monaco.languages.CompletionItemProvider {
  const provider: monaco.languages.CompletionItemProvider & { __providerId?: string } = {
    // Unique identifier to distinguish our provider from others
    __providerId: WORKFLOW_COMPLETION_PROVIDER_ID,
    // Trigger characters for completion:
    // '@' - variable references
    // '.' - property access within variables
    // ' ' - space, used for separating tokens in Liquid syntax
    // '|' - Liquid filters (e.g., {{ variable | filter }})
    // '{' - start of Liquid blocks (e.g., {{ ... }})
    triggerCharacters: ['@', '.', ' ', '|', '{'],
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

      // Start with workflow suggestions (they typically have snippets and get priority in deduplication)
      const workflowSuggestions = await getSuggestions({
        ...autocompleteContext,
        model,
        position,
      });

      // Incremental deduplication accumulator
      const deduplicatedMap = new Map<string, monaco.languages.CompletionItem>();
      mapSuggestions(deduplicatedMap, workflowSuggestions);

      // Get suggestions from all stored YAML providers (excluding workflow provider)
      const allYamlProviders = getAllYamlProviders();
      let isIncomplete = false;

      // Call all stored providers and add their suggestions incrementally
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

      return {
        suggestions: Array.from(deduplicatedMap.values()),
        incomplete: isIncomplete,
      };
    },
  };
  return provider;
}
