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
import type { ESQLDependencies } from './types';

jest.mock('@kbn/esql-language', () => ({
  getQuickFixForMessage: jest.fn(),
}));

describe('Code actions provider', () => {
  const mockGetQuickFixForMessage = getQuickFixForMessage as jest.MockedFunction<
    typeof getQuickFixForMessage
  >;

  describe('provideCodeActions', () => {
    it('returns quick fixes from the language service when markers match editor messages', async () => {
      mockGetQuickFixForMessage.mockResolvedValue({ title: 'Rewrite', fixedText: 'ROW 1' });

      const uri = monaco.Uri.parse('inmemory://test');
      const editorMessage = {
        severity: monaco.MarkerSeverity.Error,
        message: 'bad query',
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: 1,
        endColumn: 10,
        code: 'syntax.error',
      };

      const deps: ESQLDependencies = {
        getEditorMessages: () => ({
          errors: [editorMessage],
          warnings: [],
        }),
      };

      const marker: monaco.editor.IMarkerData = {
        severity: editorMessage.severity,
        message: editorMessage.message,
        startLineNumber: editorMessage.startLineNumber,
        startColumn: editorMessage.startColumn,
        endLineNumber: editorMessage.endLineNumber,
        endColumn: editorMessage.endColumn,
      };

      const model = {
        getValue: jest.fn().mockReturnValue('FROM'),
        isDisposed: () => false,
        uri,
        getFullModelRange: jest.fn().mockReturnValue(new monaco.Range(1, 1, 1, 100)),
      } as unknown as monaco.editor.ITextModel;

      const provider = getCodeActionProvider(deps);
      const result = await provider.provideCodeActions(
        model,
        new monaco.Range(1, 1, 1, 10),
        {
          markers: [marker],
          trigger: monaco.languages.CodeActionTriggerType.Invoke,
        } as monaco.languages.CodeActionContext,
        new monaco.CancellationTokenSource().token
      );

      expect(result?.actions).toHaveLength(1);
      expect(result?.actions[0].title).toBe('Rewrite');
      expect(mockGetQuickFixForMessage).toHaveBeenCalled();
    });
  });

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
