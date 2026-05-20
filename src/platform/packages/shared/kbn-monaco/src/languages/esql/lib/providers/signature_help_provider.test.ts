/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '../../../../monaco_imports';
import { getSignatureProvider } from './signature_help_provider';
import { createDisposedTextModel, createTextModel } from './test_helpers';

const cancellationToken = new monaco.CancellationTokenSource().token;

describe('Signature Help Provider', () => {
  describe('provideSignatureHelp', () => {
    it('maps signature help from the language service', async () => {
      const queryText = 'FROM logs | STATS COUNT(';

      const model = createTextModel({ value: queryText });

      const provider = getSignatureProvider();
      const result = await provider.provideSignatureHelp(
        model,
        new monaco.Position(1, queryText.length + 1),
        cancellationToken,
        {
          triggerCharacter: '(',
          triggerKind: monaco.languages.SignatureHelpTriggerKind.Invoke,
          isRetrigger: false,
        }
      );

      expect(result).toEqual(
        expect.objectContaining({
          value: expect.objectContaining({
            signatures: expect.arrayContaining([
              expect.objectContaining({
                label: expect.stringContaining('COUNT('),
                documentation: expect.objectContaining({
                  value: expect.any(String),
                }),
                parameters: expect.arrayContaining([
                  expect.objectContaining({
                    label: expect.stringContaining('field?:'),
                  }),
                ]),
              }),
            ]),
          }),
          dispose: expect.any(Function),
        })
      );
    });
  });

  describe('disposed model', () => {
    it('returns null without accessing the model value', async () => {
      const disposedModel = createDisposedTextModel();

      const provider = getSignatureProvider();
      const result = await provider.provideSignatureHelp(
        disposedModel,
        new monaco.Position(1, 1),
        cancellationToken,
        {
          triggerCharacter: '',
          triggerKind: monaco.languages.SignatureHelpTriggerKind.Invoke,
          isRetrigger: false,
        }
      );

      expect(result).toBeNull();
      expect(disposedModel.getValue).not.toHaveBeenCalled();
    });
  });
});
