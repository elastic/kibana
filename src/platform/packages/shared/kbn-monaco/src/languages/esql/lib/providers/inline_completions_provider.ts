/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { inlineSuggest } from '@kbn/esql-language';
import type { ESQLCallbacks } from '@kbn/esql-types';
import { monaco } from '../../../../monaco_imports';
import { createMonacoProvider } from './providers_factory';

export function getInlineCompletionsProvider(
  callbacks?: ESQLCallbacks
): monaco.languages.InlineCompletionsProvider {
  return {
    async provideInlineCompletions(
      model: monaco.editor.ITextModel,
      position: monaco.Position,
      _context: monaco.languages.InlineCompletionContext,
      _token: monaco.CancellationToken
    ) {
      return createMonacoProvider({
        model,
        run: async (safeModel) => {
          const fullText = safeModel.getValue();
          const textBeforeCursor = safeModel.getValueInRange({
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: position.lineNumber,
            endColumn: position.column,
          });

          const range = new monaco.Range(
            position.lineNumber,
            position.column,
            position.lineNumber,
            position.column
          );

          return await inlineSuggest(fullText, textBeforeCursor, range, callbacks);
        },
        emptyResult: { items: [] },
      });
    },
    freeInlineCompletions: () => {},
  };
}
