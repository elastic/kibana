/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getQuickFixForMessage } from '@kbn/esql-language';
import { monaco } from '../../../../monaco_imports';
import { getCodeActionProvider } from './code_action_provider';

jest.mock('@kbn/esql-language', () => ({
  getQuickFixForMessage: jest.fn(),
}));

describe('code_action_provider', () => {
  const mockGetQuickFixForMessage = getQuickFixForMessage as jest.MockedFunction<
    typeof getQuickFixForMessage
  >;

  describe('disposed model', () => {
    it('returns an empty code action list and does not call the language service', async () => {
      mockGetQuickFixForMessage.mockClear();

      const disposedModel = {
        getValue: jest.fn(),
        isDisposed: () => true,
      } as unknown as monaco.editor.ITextModel;

      const provider = getCodeActionProvider();
      const result = await provider.provideCodeActions(
        disposedModel,
        new monaco.Range(1, 1, 1, 1),
        {
          markers: [],
          trigger: monaco.languages.CodeActionTriggerType.Invoke,
        } as monaco.languages.CodeActionContext,
        new monaco.CancellationTokenSource().token
      );

      expect(result).toEqual({ actions: [], dispose: expect.any(Function) });
      expect(mockGetQuickFixForMessage).not.toHaveBeenCalled();
      expect(disposedModel.getValue).not.toHaveBeenCalled();
    });
  });
});
