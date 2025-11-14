/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { monaco } from '@kbn/monaco';
import { buildAutocompleteContext } from './context/build_autocomplete_context';
import { getSuggestions } from './suggestions/get_suggestions';
import type { WorkflowDetailState } from '../../../../entities/workflows/store';

export function getCompletionItemProvider(
  getState: () => WorkflowDetailState
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
