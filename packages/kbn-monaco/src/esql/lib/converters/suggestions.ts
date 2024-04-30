/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SuggestionRawDefinition } from '@kbn/esql-validation-autocomplete';
import { monaco } from '../../../monaco_imports';
import { MonacoAutocompleteCommandDefinition } from '../types';

export function wrapAsMonacoSuggestions(
  suggestions: SuggestionRawDefinition[]
): MonacoAutocompleteCommandDefinition[] {
  return suggestions.map(
    ({ label, text, asSnippet, kind, detail, documentation, sortText, command }) => ({
      label,
      insertText: text,
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
      range: undefined as unknown as monaco.IRange,
    })
  );
}
