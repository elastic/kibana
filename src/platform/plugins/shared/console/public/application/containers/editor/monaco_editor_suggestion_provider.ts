/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ESQLCallbacks, monaco } from '@kbn/monaco';
import { MutableRefObject } from 'react';
import { suggest } from '@kbn/esql-validation-autocomplete';
import { getEsqlCompletionItems } from './utils';
import { MonacoEditorActionsProvider } from './monaco_editor_actions_provider';

function isInTripleQuotedQuery(text: string, position: monaco.Position): boolean {
  const lines = text.split('\n');
  let charCount = 0;

  for (let i = 0; i < position.lineNumber - 1; i++) {
    charCount += lines[i].length + 1;
  }
  charCount += position.column - 1;
  const textUpToPosition = text.slice(0, charCount);
  const tripleQuoteMatches = [...textUpToPosition.matchAll(/"""/g)];
  const numTripleQuotes = tripleQuoteMatches.length;
  return numTripleQuotes % 2 === 1;
}

const CONSOLE_TRIGGER_CHARS = ['/', '.', '_', ',', '?', '=', '&', '"'];
const ESQL_TRIGGER_CHARS = ['\n', '(', ' ', '[', '?', '"'];

export const getSuggestionProvider = (
  actionsProvider: MutableRefObject<MonacoEditorActionsProvider | null>,
  esqlCallbacks: Pick<ESQLCallbacks, 'getSources' | 'getPolicies'>
): monaco.languages.CompletionItemProvider => {
  return {
    // force suggestions when these characters are used
    triggerCharacters: [...CONSOLE_TRIGGER_CHARS, ...ESQL_TRIGGER_CHARS],
    provideCompletionItems: async (
      model: monaco.editor.ITextModel,
      position: monaco.Position,
      context: monaco.languages.CompletionContext
    ) => {
      const fullText = model.getValue();
      const previousText = model.getValueInRange({
        startLineNumber: 0,
        startColumn: 0,
        endColumn: position.column,
        endLineNumber: position.lineNumber,
      });
      const offset = model.getOffsetAt(position);
      const lastChar = fullText.at(offset - 1);
      const isInsideEsqlQuery = isInTripleQuotedQuery(fullText, position);
      if (esqlCallbacks && isInsideEsqlQuery && ESQL_TRIGGER_CHARS.includes(lastChar)) {
        console.log(previousText.slice(previousText.lastIndexOf('"""') + 3, offset));
        const esqlSuggestions = await suggest(
          previousText.slice(previousText.lastIndexOf('"""') + 3, offset),
          offset,
          context,
          esqlCallbacks
        );
        return {
          // @ts-expect-error because of range typing: https://github.com/microsoft/monaco-editor/issues/4638
          suggestions: getEsqlCompletionItems(model, position, esqlSuggestions),
        };
      } else if (actionsProvider.current) {
        return actionsProvider.current?.provideCompletionItems(model, position, context);
      }
      return {
        suggestions: [],
      };
    },
  };
};
