/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '@kbn/code-editor';
import type { FixWithAiTarget } from './register_fix_with_ai_code_action_provider';
import {
  FIX_WITH_AI_COMMAND_ID,
  registerFixWithAiCodeActionProvider,
} from './register_fix_with_ai_code_action_provider';

type CodeActionProvider = monaco.languages.CodeActionProvider;
type CommandHandler = (accessor: unknown, target: FixWithAiTarget) => void;

const buildMarker = (
  overrides: Partial<monaco.editor.IMarkerData> = {}
): monaco.editor.IMarkerData => ({
  severity: monaco.MarkerSeverity.Error,
  message: 'Variable inputs.mesage is invalid',
  startLineNumber: 15,
  startColumn: 17,
  endLineNumber: 15,
  endColumn: 30,
  ...overrides,
});

const editorModel = {
  uri: { toString: () => 'inmemory://workflow.yaml' },
} as monaco.editor.ITextModel;
const otherModel = {
  uri: { toString: () => 'inmemory://preview.yaml' },
} as monaco.editor.ITextModel;

const isEditorModel = (model: monaco.editor.ITextModel) => model === editorModel;

const provideCodeActions = (
  provider: CodeActionProvider,
  markers: monaco.editor.IMarkerData[],
  model: monaco.editor.ITextModel = editorModel
) =>
  provider.provideCodeActions(
    model,
    {} as monaco.Range,
    { markers, only: undefined, trigger: monaco.languages.CodeActionTriggerType.Invoke },
    {} as monaco.CancellationToken
  ) as monaco.languages.CodeActionList;

describe('registerFixWithAiCodeActionProvider', () => {
  let registerCodeActionProvider: jest.SpyInstance;
  let registerCommand: jest.SpyInstance;
  let provider: CodeActionProvider;
  let commandHandler: CommandHandler;
  let providerDispose: jest.Mock;
  let commandDispose: jest.Mock;

  beforeEach(() => {
    providerDispose = jest.fn();
    commandDispose = jest.fn();
    registerCodeActionProvider = jest
      .spyOn(monaco.languages, 'registerCodeActionProvider')
      .mockImplementation((_language, codeActionProvider) => {
        provider = codeActionProvider;
        return { dispose: providerDispose };
      });
    registerCommand = jest
      .spyOn(monaco.editor, 'registerCommand')
      .mockImplementation((_id, handler) => {
        commandHandler = handler as CommandHandler;
        return { dispose: commandDispose };
      });
  });

  afterEach(() => {
    registerCodeActionProvider.mockRestore();
    registerCommand.mockRestore();
  });

  it('offers one quick fix, pointing at the fix command', () => {
    registerFixWithAiCodeActionProvider({ getFixWithAi: () => jest.fn(), isEditorModel });

    const { actions } = provideCodeActions(provider, [buildMarker()]);

    expect(actions).toHaveLength(1);
    expect(actions[0].title).toBe('Fix with AI Agent');
    expect(actions[0].kind).toBe('quickfix');
    expect(actions[0].command).toEqual({
      id: FIX_WITH_AI_COMMAND_ID,
      title: 'Fix with AI Agent',
      arguments: [
        {
          startLineNumber: 15,
          startColumn: 17,
          message: 'Variable inputs.mesage is invalid',
          severity: 'error',
        },
      ],
    });
  });

  it('ignores hint markers and markers without a message', () => {
    registerFixWithAiCodeActionProvider({ getFixWithAi: () => jest.fn(), isEditorModel });

    const { actions } = provideCodeActions(provider, [
      buildMarker({ severity: monaco.MarkerSeverity.Hint }),
      buildMarker({ severity: monaco.MarkerSeverity.Info }),
      buildMarker({ message: '' }),
      buildMarker({ severity: monaco.MarkerSeverity.Warning, message: 'Step is deprecated' }),
    ]);

    expect(actions).toHaveLength(1);
    expect(actions[0].command?.arguments?.[0]).toEqual({
      startLineNumber: 15,
      startColumn: 17,
      message: 'Step is deprecated',
      severity: 'warning',
    });
  });

  it('merges every marker under the cursor into one action at the earliest position', () => {
    registerFixWithAiCodeActionProvider({ getFixWithAi: () => jest.fn(), isEditorModel });

    const { actions } = provideCodeActions(provider, [
      buildMarker({ startColumn: 25, message: 'expected "|" before filter' }),
      buildMarker(),
      buildMarker(),
    ]);

    expect(actions).toHaveLength(1);
    expect(actions[0].command?.arguments?.[0]).toEqual({
      startLineNumber: 15,
      startColumn: 17,
      message: 'expected "|" before filter\nVariable inputs.mesage is invalid',
      severity: 'error',
    });
  });

  it('offers no quick fix for another yaml model, such as a version preview', () => {
    registerFixWithAiCodeActionProvider({ getFixWithAi: () => jest.fn(), isEditorModel });

    const { actions } = provideCodeActions(provider, [buildMarker()], otherModel);

    expect(actions).toHaveLength(0);
  });

  it('runs the current handler when the command is executed', () => {
    const fixWithAi = jest.fn();
    registerFixWithAiCodeActionProvider({ getFixWithAi: () => fixWithAi, isEditorModel });

    commandHandler({}, { startLineNumber: 3, startColumn: 5, message: 'Boom', severity: 'error' });

    expect(fixWithAi).toHaveBeenCalledWith({
      startLineNumber: 3,
      startColumn: 5,
      message: 'Boom',
      severity: 'error',
    });
  });

  it('disposes the command and the provider', () => {
    registerFixWithAiCodeActionProvider({ getFixWithAi: () => jest.fn(), isEditorModel }).dispose();

    expect(commandDispose).toHaveBeenCalled();
    expect(providerDispose).toHaveBeenCalled();
  });
});
