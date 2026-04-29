/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getDocumentHighlightItems } from '@kbn/esql-language';
import { monaco } from '../../../../monaco_imports';
import { getDocumentHighlightProvider } from './document_highlight_provider';

jest.mock('@kbn/esql-language', () => ({
  getDocumentHighlightItems: jest.fn(),
}));

describe('document_highlight_provider', () => {
  const mockGetDocumentHighlightItems = getDocumentHighlightItems as jest.MockedFunction<
    typeof getDocumentHighlightItems
  >;

  describe('disposed model', () => {
    it('returns an empty highlight list and does not call the language service', async () => {
      mockGetDocumentHighlightItems.mockClear();

      const disposedModel = {
        getValue: jest.fn(),
        isDisposed: () => true,
      } as unknown as monaco.editor.ITextModel;

      const provider = getDocumentHighlightProvider();
      const result = await provider.provideDocumentHighlights(
        disposedModel,
        new monaco.Position(1, 1),
        new monaco.CancellationTokenSource().token
      );

      expect(result).toEqual([]);
      expect(mockGetDocumentHighlightItems).not.toHaveBeenCalled();
      expect(disposedModel.getValue).not.toHaveBeenCalled();
    });
  });
});
