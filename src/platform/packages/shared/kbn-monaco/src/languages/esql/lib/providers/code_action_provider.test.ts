/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '../../../../monaco_imports';
import { getCodeActionProvider } from './code_action_provider';
import { createDisposedTextModel, createTextModel, createWiredStreamSource } from './test_helpers';
import type { ESQLDependencies } from './types';

describe('Code actions provider', () => {
  describe('provideCodeActions', () => {
    it('returns quick fixes from the language service when markers match editor messages', async () => {
      const queryText = 'FROM logs.otel.child | KEEP missingField';
      const uri = monaco.Uri.parse('inmemory://test');
      const editorMessage = {
        severity: monaco.MarkerSeverity.Error,
        message: 'bad query',
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: 1,
        endColumn: 10,
        code: 'unknownColumn',
      };

      const getSources = jest.fn(async () => [createWiredStreamSource('logs.otel.child')]);

      const deps: ESQLDependencies = {
        getEditorMessages: () => ({
          errors: [editorMessage],
          warnings: [],
        }),
        getSources,
      };

      const marker: monaco.editor.IMarkerData = {
        severity: editorMessage.severity,
        message: editorMessage.message,
        startLineNumber: editorMessage.startLineNumber,
        startColumn: editorMessage.startColumn,
        endLineNumber: editorMessage.endLineNumber,
        endColumn: editorMessage.endColumn,
      };

      const model = createTextModel({ value: queryText, uri });

      const provider = getCodeActionProvider(deps);
      const result = await provider.provideCodeActions(
        model,
        new monaco.Range(1, 1, 1, 10),
        {
          markers: [marker],
          trigger: monaco.languages.CodeActionTriggerType.Invoke,
        },
        new monaco.CancellationTokenSource().token
      );

      expect(result?.actions).toHaveLength(1);
      expect(result?.actions[0].title).toBe('Load unmapped fields');
      const firstWorkspaceEdit = result?.actions[0].edit
        ?.edits?.[0] as monaco.languages.IWorkspaceTextEdit;
      expect(firstWorkspaceEdit?.textEdit?.text).toBe(
        `SET unmapped_fields = "LOAD";\nFROM logs.otel.child\n  | KEEP missingField`
      );
    });
  });

  describe('disposed model', () => {
    it('returns an empty code action list without accessing the model value', async () => {
      const disposedModel = createDisposedTextModel();

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
      expect(disposedModel.getValue).not.toHaveBeenCalled();
    });
  });
});
