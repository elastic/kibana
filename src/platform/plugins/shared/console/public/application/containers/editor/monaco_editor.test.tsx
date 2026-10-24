/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { monaco } from '@kbn/code-editor';
import { MonacoEditor } from './monaco_editor';
import {
  useEditorActionContext,
  useEditorReadContext,
  useRequestActionContext,
  useServicesContext,
} from '../../contexts';
import { useSetInputEditor } from '../../hooks';
import { initialValue } from '../../stores/editor';

const mockAppendRequestToEditor = jest.fn();
const mockDestroyResizeChecker = jest.fn();
const mockEditorDispatch = jest.fn();
const mockImportRequestsToEditor = jest.fn();
const mockRegisterKeyboardCommands = jest.fn();
const mockRequestDispatch = jest.fn();
const mockSetInputEditor = jest.fn();
const mockSetupResizeChecker = jest.fn();
const mockUnregisterKeyboardCommands = jest.fn();

interface MockCodeEditorProps {
  editorDidMount: (editor: monaco.editor.IStandaloneCodeEditor) => void;
}

const mockCodeEditor = jest.fn((_props: MockCodeEditorProps) => null);

const mockActionsProvider = {
  appendRequestToEditor: mockAppendRequestToEditor,
  autoIndent: jest.fn(),
  getDocumentationLink: jest.fn(),
  getRequests: jest.fn(),
  importRequestsToEditor: mockImportRequestsToEditor,
  isKbnRequestSelected: jest.fn(),
  moveToNextRequestEdge: jest.fn(),
  moveToPreviousRequestEdge: jest.fn(),
  sendRequests: jest.fn(),
};

const mockServicesContext = {
  services: {
    application: {},
    autocompleteInfo: {
      getEntitiesRefreshGeneration: jest.fn(),
    },
    data: {},
    http: {},
    licensing: {},
    notifications: {
      toasts: {},
    },
    settings: {},
  },
  config: {
    isDevMode: false,
  },
  docLinks: {
    console: {
      kibanaApiReference: '',
    },
  },
  docLinkVersion: 'NA',
};

jest.mock('@kbn/code-editor/code_editor', () => ({
  CodeEditor: (props: MockCodeEditorProps) => mockCodeEditor(props),
}));

jest.mock('@kbn/monaco', () => ({
  CONSOLE_LANG_ID: 'console',
  CONSOLE_THEME_ID: 'console',
  ConsoleLang: {
    getSuggestionProvider: jest.fn(),
  },
}));

jest.mock('./monaco_editor_actions_provider', () => ({
  MonacoEditorActionsProvider: jest.fn(() => mockActionsProvider),
}));

jest.mock('./hooks', () => ({
  useConsoleEsqlCallbacks: jest.fn(() => ({})),
  useKeyboardCommandsUtils: jest.fn(() => ({
    registerKeyboardCommands: mockRegisterKeyboardCommands,
    unregisterKeyboardCommands: mockUnregisterKeyboardCommands,
  })),
  useResizeCheckerUtils: jest.fn(() => ({
    destroyResizeChecker: mockDestroyResizeChecker,
    setupResizeChecker: mockSetupResizeChecker,
  })),
  useSetInitialValue: jest.fn(),
  useSetupAutocompletePolling: jest.fn(),
  useSetupAutosave: jest.fn(),
}));

jest.mock('../../contexts', () => ({
  useEditorActionContext: jest.fn(),
  useEditorReadContext: jest.fn(),
  useRequestActionContext: jest.fn(),
  useServicesContext: jest.fn(),
}));

jest.mock('../../hooks', () => ({
  useSetInputEditor: jest.fn(),
}));

jest.mock('./components', () => ({
  ContextMenu: () => null,
}));

jest.mock('./styles', () => ({
  useActionStyles: () => ({ actions: '' }),
  useHighlightedLinesClassName: () => 'highlightedLines',
}));

const mockUseEditorActionContext = useEditorActionContext as jest.MockedFunction<
  typeof useEditorActionContext
>;
const mockUseEditorReadContext = useEditorReadContext as jest.MockedFunction<
  typeof useEditorReadContext
>;
const mockUseRequestActionContext = useRequestActionContext as jest.MockedFunction<
  typeof useRequestActionContext
>;
const mockUseServicesContext = useServicesContext as jest.Mock;
const mockUseSetInputEditor = useSetInputEditor as jest.MockedFunction<typeof useSetInputEditor>;

describe('MonacoEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    const requestToRestore = { request: 'GET /_search' };

    mockUseServicesContext.mockReturnValue(mockServicesContext);
    mockUseEditorReadContext.mockReturnValue({
      ...initialValue,
      restoreRequestFromHistory: requestToRestore,
    });
    mockUseRequestActionContext.mockReturnValue(mockRequestDispatch);
    mockUseEditorActionContext.mockReturnValue(mockEditorDispatch);
    mockUseSetInputEditor.mockReturnValue(mockSetInputEditor);
    mockAppendRequestToEditor.mockResolvedValue(undefined);
  });

  it('keeps a request pending until the editor mounts and then appends it once', async () => {
    const { rerender } = render(
      <I18nProvider>
        <MonacoEditor localStorageValue="GET /" value="GET /" setValue={jest.fn()} />
      </I18nProvider>
    );

    expect(mockAppendRequestToEditor).not.toHaveBeenCalled();
    expect(mockEditorDispatch).not.toHaveBeenCalledWith({ type: 'clearRequestToRestore' });

    expect(mockCodeEditor).toHaveBeenCalled();
    const codeEditorProps = mockCodeEditor.mock.calls[0][0];
    const editor = {} as monaco.editor.IStandaloneCodeEditor;

    act(() => {
      codeEditorProps.editorDidMount(editor);
    });

    await waitFor(() => {
      expect(mockAppendRequestToEditor).toHaveBeenCalledTimes(1);
    });
    expect(mockAppendRequestToEditor).toHaveBeenCalledWith(
      { request: 'GET /_search' },
      mockRequestDispatch,
      mockServicesContext
    );
    expect(mockEditorDispatch).toHaveBeenCalledTimes(1);
    expect(mockEditorDispatch).toHaveBeenCalledWith({ type: 'clearRequestToRestore' });

    rerender(
      <I18nProvider>
        <MonacoEditor localStorageValue="GET /" value="GET /" setValue={jest.fn()} />
      </I18nProvider>
    );

    expect(mockAppendRequestToEditor).toHaveBeenCalledTimes(1);
  });
});
