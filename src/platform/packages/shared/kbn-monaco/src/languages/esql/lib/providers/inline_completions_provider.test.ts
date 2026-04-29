/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { inlineSuggest } from '@kbn/esql-language';
import { monaco } from '../../../../monaco_imports';
import { getInlineCompletionsProvider } from './inline_completions_provider';

jest.mock('@kbn/esql-language', () => ({
  inlineSuggest: jest.fn(),
}));

describe('inline_completions_provider', () => {
  const mockInlineSuggest = inlineSuggest as jest.MockedFunction<typeof inlineSuggest>;

  describe('disposed model', () => {
    it('returns an empty item list and does not call the language service', async () => {
      mockInlineSuggest.mockClear();

      const disposedModel = {
        getValue: jest.fn(),
        getValueInRange: jest.fn(),
        isDisposed: () => true,
      } as unknown as monaco.editor.ITextModel;

      const provider = getInlineCompletionsProvider();
      const result = await provider.provideInlineCompletions(
        disposedModel,
        new monaco.Position(1, 1),
        {} as monaco.languages.InlineCompletionContext,
        new monaco.CancellationTokenSource().token
      );

      expect(result).toEqual({ items: [] });
      expect(mockInlineSuggest).not.toHaveBeenCalled();
      expect(disposedModel.getValue).not.toHaveBeenCalled();
    });
  });
});
