/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '../../../monaco_imports';
import {
  MonacoAutocompleteCommandDefinition,
  SuggestionRawDefinitionWithMonacoRange,
} from '../types';

export function wrapAsMonacoSuggestions(
  suggestions: SuggestionRawDefinitionWithMonacoRange[]
): MonacoAutocompleteCommandDefinition[] {
  return suggestions.map<MonacoAutocompleteCommandDefinition>(
    ({
      label,
      text,
      asSnippet,
      kind,
      detail,
      documentation,
      sortText,
      filterText,
      command,
      range,
    }) => {
      const monacoSuggestion: MonacoAutocompleteCommandDefinition = {
        label,
        insertText: text,
        filterText,
        kind:
          kind in monaco.languages.CompletionItemKind
            ? monaco.languages.CompletionItemKind[kind]
            : monaco.languages.CompletionItemKind.Method, // fallback to Method
        detail,
        documentation,
        sortText,
        command,
        insertTextRules: asSnippet
          ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
          : undefined,
        range,
      };
      return monacoSuggestion;
    }
  );
}
