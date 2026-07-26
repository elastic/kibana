/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '../../../../monaco_imports';
import { getDocumentHighlightProvider } from './document_highlight_provider';
import { createDisposedTextModel, createTextModel } from './test_helpers';

const cancellationToken = new monaco.CancellationTokenSource().token;

describe('Document highlight provider', () => {
  describe('provideDocumentHighlights', () => {
    it('maps highlight ranges from the language service', async () => {
      const model = createTextModel({
        value: 'FROM index | WHERE field1 > field2 | STATS count() BY field1',
      });

      const provider = getDocumentHighlightProvider();
      const result = await provider.provideDocumentHighlights(
        model,
        new monaco.Position(1, 20),
        cancellationToken
      );

      expect(result).toHaveLength(2);
      expect(result![0].kind).toBe(monaco.languages.DocumentHighlightKind.Read);
      expect(result![0].range).toEqual(new monaco.Range(1, 20, 1, 26));
      expect(result![1].range).toEqual(new monaco.Range(1, 55, 1, 61));
    });
  });

  describe('disposed model', () => {
    it('returns an empty highlight list without accessing the model value', async () => {
      const disposedModel = createDisposedTextModel();

      const provider = getDocumentHighlightProvider();
      const result = await provider.provideDocumentHighlights(
        disposedModel,
        new monaco.Position(1, 1),
        cancellationToken
      );

      expect(result).toEqual([]);
      expect(disposedModel.getValue).not.toHaveBeenCalled();
    });
  });
});
