/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ISuggestionItem } from '@kbn/esql-language/src/commands/registry/types';
import { monaco } from '../../../../monaco_imports';
import type { MonacoAutocompleteCommandDefinition } from '../types';
import { offsetRangeToMonacoRange } from '../shared/utils';

function escapeForStringLiteral(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

const TIME_WINDOW = 15 * 60 * 1000; // 15 minutes in milliseconds

// Dynamic time range parameters: Compute start as (now - 15 minutes) and end as now at suggestion generation time.
function getTimeParamsValues(): { start: string; end: string } {
  const now = Date.now();
  const start = new Date(now - TIME_WINDOW);
  const end = new Date(now);

  return {
    start: `"${start.toISOString()}"`,
    end: `"${end.toISOString()}"`,
  };
}

export function wrapAsMonacoSuggestions(
  suggestions: ISuggestionItem[],
  fullText: string,
  defineRange: boolean = true,
  escapeSpecialChars: boolean = false,
  replaceParamsWithDefaults: boolean = false
): monaco.languages.CompletionList {
  let hasAnIncompleteSuggestion = false;

  const monacoSuggestions = suggestions.map<MonacoAutocompleteCommandDefinition>(
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
      incomplete,
    }) => {
      if (incomplete) {
        hasAnIncompleteSuggestion = true;
      }

      let insertText = text;

      if (replaceParamsWithDefaults) {
        // Replace ?_tstart and ?_tend parameters with default/dynamic values
        const { start, end } = getTimeParamsValues();
        insertText = insertText.replace(/\?_(tstart|tend)/g, (_match, p1) => {
          return p1 === 'tstart' ? start : end;
        });
      }

      if (escapeSpecialChars) {
        insertText = escapeForStringLiteral(insertText);
      }

      const monacoSuggestion: MonacoAutocompleteCommandDefinition = {
        label,
        insertText,
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
  return {
    incomplete: hasAnIncompleteSuggestion,
    // @ts-expect-error because of range typing: https://github.com/microsoft/monaco-editor/issues/4638
    suggestions: monacoSuggestions,
  };
}
