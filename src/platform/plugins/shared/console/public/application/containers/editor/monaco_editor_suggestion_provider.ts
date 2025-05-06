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
import { getEsqlCompletionItems, isInsideTripleQuotes } from './utils';
import { MonacoEditorActionsProvider } from './monaco_editor_actions_provider';

const CONSOLE_TRIGGER_CHARS = ['/', '.', '_', ',', '?', '=', '&', '"'];
const ESQL_TRIGGER_CHARS = ['(', ' ', '[', '?', '"'];

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
      const cursorOffset = model.getOffsetAt(position);
      const textBeforeCursor = fullText.slice(0, cursorOffset);
      const isInsideEsqlQuery = isInsideTripleQuotes(textBeforeCursor);
      const lastChar = fullText.at(cursorOffset - 1);
      if (esqlCallbacks && isInsideEsqlQuery && ESQL_TRIGGER_CHARS.includes(lastChar)) {
        const queryStartOffset = textBeforeCursor.lastIndexOf('"""') + 3;
        const esqlSuggestions = await suggest(
          textBeforeCursor.slice(queryStartOffset, cursorOffset),
          cursorOffset - queryStartOffset,
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
