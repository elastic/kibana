/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getSignatureHelp } from '@kbn/esql-language';
import { monaco } from '../../../../monaco_imports';
import { getSignatureProvider } from './signature_help_provider';

jest.mock('@kbn/esql-language', () => ({
  getSignatureHelp: jest.fn(),
}));

describe('signature_help_provider', () => {
  const mockGetSignatureHelp = getSignatureHelp as jest.MockedFunction<typeof getSignatureHelp>;

  describe('disposed model', () => {
    it('returns null and does not call the language service', async () => {
      mockGetSignatureHelp.mockClear();

      const disposedModel = {
        getValue: jest.fn(),
        isDisposed: () => true,
      } as unknown as monaco.editor.ITextModel;

      const provider = getSignatureProvider();
      const result = await provider.provideSignatureHelp(
        disposedModel,
        new monaco.Position(1, 1),
        new monaco.CancellationTokenSource().token,
        {
          triggerCharacter: '',
          triggerKind: monaco.languages.SignatureHelpTriggerKind.Invoke,
          isRetrigger: false,
        }
      );

      expect(result).toBeNull();
      expect(mockGetSignatureHelp).not.toHaveBeenCalled();
      expect(disposedModel.getValue).not.toHaveBeenCalled();
    });
  });
});
