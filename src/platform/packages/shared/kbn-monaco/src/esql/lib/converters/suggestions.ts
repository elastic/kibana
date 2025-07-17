/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SuggestionRawDefinition } from '@kbn/esql-validation-autocomplete';
import { MonacoAutocompleteCommandDefinition } from '../types';
import { offsetRangeToMonacoRange } from '../shared/utils';
import { monaco } from '../../../monaco_imports';

function escapeForStringLiteral(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export function wrapAsMonacoSuggestions(
  suggestions: SuggestionRawDefinition[],
  fullText: string,
  defineRange: boolean = true,
  escapeSpecialChars: boolean = false
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
      rangeToReplace,
    }) => {
      const monacoSuggestion: MonacoAutocompleteCommandDefinition = {
        label,
        insertText: escapeSpecialChars ? escapeForStringLiteral(text) : text,
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
        range:
          rangeToReplace && defineRange
            ? offsetRangeToMonacoRange(fullText, rangeToReplace)
            : undefined,
      };
      return monacoSuggestion;
    }
  );
}
