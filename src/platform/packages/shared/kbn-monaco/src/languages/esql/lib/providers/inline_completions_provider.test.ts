/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '../../../../monaco_imports';
import { getInlineCompletionsProvider } from './inline_completions_provider';
import { createDisposedTextModel, createField, createTextModel } from './test_helpers';

describe('Inline completion provider', () => {
  describe('provideInlineCompletions', () => {
    it('returns inline suggestions from the language service', async () => {
      const fullText = 'FROM logs*';
      const callbacks = {
        getColumnsFor: jest.fn(async () => [
          createField('@timestamp', 'date'),
          createField('message', 'text'),
        ]),
        getEditorExtensions: jest.fn(async () => ({
          recommendedQueries: [
            { query: 'FROM logs* | STATS count = COUNT(*)', name: 'Count aggregation' },
          ],
          recommendedFields: [],
        })),
        getHistoryStarredItems: jest.fn(async () => []),
      };
      const model = createTextModel({ value: fullText });

      const provider = getInlineCompletionsProvider(callbacks);
      const result = await provider.provideInlineCompletions(
        model,
        new monaco.Position(1, fullText.length + 1),
        {} as monaco.languages.InlineCompletionContext,
        new monaco.CancellationTokenSource().token
      );

      expect(result!.items).toContainEqual(
        expect.objectContaining({
          insertText: ' | STATS count = COUNT(*)',
        })
      );
    });
  });

  describe('disposed model', () => {
    it('returns an empty item list without accessing the model value', async () => {
      const disposedModel = createDisposedTextModel();

      const provider = getInlineCompletionsProvider();
      const result = await provider.provideInlineCompletions(
        disposedModel,
        new monaco.Position(1, 1),
        {} as monaco.languages.InlineCompletionContext,
        new monaco.CancellationTokenSource().token
      );

      expect(result).toEqual({ items: [] });
      expect(disposedModel.getValue).not.toHaveBeenCalled();
    });
  });
});
