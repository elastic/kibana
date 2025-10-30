/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { monaco } from '@kbn/monaco';
import type { MinimalWorkflowDetailState } from './autocomplete.types';
import { buildAutocompleteContext } from './build_autocomplete_context';
import { getSuggestions } from './get_suggestions';

export function getCompletionItemProvider(
  getState: () => MinimalWorkflowDetailState | undefined
): monaco.languages.CompletionItemProvider {
  return {
    // Trigger characters for completion:
    // '@' - variable references
    // '.' - property access within variables
    // ' ' - space, used for separating tokens in Liquid syntax
    // '|' - Liquid filters (e.g., {{ variable | filter }})
    // '{' - start of Liquid blocks (e.g., {{ ... }})
    triggerCharacters: ['@', '.', ' ', '|', '{'],
    provideCompletionItems: (model, position, completionContext) => {
      const editorState = getState();
      if (!editorState) {
        // console.log('no editor state');
        return {
          suggestions: [],
          incomplete: false,
        };
      }
      const autocompleteContext = buildAutocompleteContext({
        editorState,
        model,
        position,
        completionContext,
      });
      if (!autocompleteContext) {
        // console.log('no autocomplete context');
        return {
          suggestions: [],
          incomplete: false,
        };
      }

      const suggestions = getSuggestions({ ...autocompleteContext, model, position });

      return {
        suggestions,
        incomplete: false,
      };
    },
  };
}
