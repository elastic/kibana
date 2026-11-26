/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Mock, MockedFunction } from 'vitest';
import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { monaco } from '@kbn/code-editor';
import { BehaviorSubject } from 'rxjs';
import { MonacoEditor } from './monaco_editor';
import {
  useEditorActionContext,
  useEditorReadContext,
  useRequestActionContext,
  useServicesContext,
} from '../../contexts';
import { useSetInputEditor } from '../../hooks';
import { initialValue } from '../../stores/editor';

const mockAppendRequestToEditor = vi.fn();
const mockDestroyResizeChecker = vi.fn();
const mockEditorDispatch = vi.fn();
const mockImportRequestsToEditor = vi.fn();
const mockRegisterKeyboardCommands = vi.fn();
const mockRequestDispatch = vi.fn();
const mockSetInputEditor = vi.fn();
const mockSetupResizeChecker = vi.fn();
const mockUnregisterKeyboardCommands = vi.fn();

interface MockCodeEditorProps {
  editorDidMount: (editor: monaco.editor.IStandaloneCodeEditor) => void;
}

const mockCodeEditor = vi.fn((_props: MockCodeEditorProps) => null);

const mockActionsProvider = {
  appendRequestToEditor: mockAppendRequestToEditor,
  autoIndent: vi.fn(),
  getDocumentationLink: vi.fn(),
  getRequests: vi.fn(),
  importRequestsToEditor: mockImportRequestsToEditor,
  isKbnRequestSelected: vi.fn(),
  moveToNextRequestEdge: vi.fn(),
  moveToPreviousRequestEdge: vi.fn(),
  sendRequests: vi.fn(),
};

const mockServicesContext = {
  services: {
    application: {},
    autocompleteInfo: {
      entitiesRefreshGeneration$: new BehaviorSubject(0),
      getEntitiesRefreshGeneration: vi.fn(),
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

vi.mock('@kbn/code-editor/code_editor', () => {
  const mockedModule = {
    CodeEditor: (props: MockCodeEditorProps) => mockCodeEditor(props),
  };
  return { ...mockedModule, default: mockedModule };
});

vi.mock('@kbn/monaco', () => {
  const mockedModule = {
    CONSOLE_LANG_ID: 'console',
    CONSOLE_THEME_ID: 'console',
    ConsoleLang: {
      getSuggestionProvider: vi.fn(),
    },
  };
  return { ...mockedModule, default: mockedModule };
});

vi.mock('./monaco_editor_actions_provider', () => {
  const mockedModule = {
    MonacoEditorActionsProvider: vi.fn(function () {
      return mockActionsProvider;
    }),
  };
  return { ...mockedModule, default: mockedModule };
});

vi.mock('./hooks', () => {
  const mockedModule = {
    useConsoleEsqlCallbacks: vi.fn(() => ({})),
    useKeyboardCommandsUtils: vi.fn(() => ({
      registerKeyboardCommands: mockRegisterKeyboardCommands,
      unregisterKeyboardCommands: mockUnregisterKeyboardCommands,
    })),
    useResizeCheckerUtils: vi.fn(() => ({
      destroyResizeChecker: mockDestroyResizeChecker,
      setupResizeChecker: mockSetupResizeChecker,
    })),
    useSetInitialValue: vi.fn(),
    useSetupAutocompletePolling: vi.fn(),
    useSetupAutosave: vi.fn(),
  };
  return { ...mockedModule, default: mockedModule };
});

vi.mock('../../contexts', () => {
  const mockedModule = {
    useEditorActionContext: vi.fn(),
    useEditorReadContext: vi.fn(),
    useRequestActionContext: vi.fn(),
    useServicesContext: vi.fn(),
  };
  return { ...mockedModule, default: mockedModule };
});

vi.mock('../../hooks', () => {
  const mockedModule = {
    useSetInputEditor: vi.fn(),
  };
  return { ...mockedModule, default: mockedModule };
});

vi.mock('./components', () => {
  const mockedModule = {
    ContextMenu: () => null,
  };
  return { ...mockedModule, default: mockedModule };
});

vi.mock('./styles', () => {
  const mockedModule = {
    useActionStyles: () => ({ actions: '' }),
    useHighlightedLinesClassName: () => 'highlightedLines',
  };
  return { ...mockedModule, default: mockedModule };
});

const mockUseEditorActionContext = useEditorActionContext as MockedFunction<
  typeof useEditorActionContext
>;
const mockUseEditorReadContext = useEditorReadContext as MockedFunction<
  typeof useEditorReadContext
>;
const mockUseRequestActionContext = useRequestActionContext as MockedFunction<
  typeof useRequestActionContext
>;
const mockUseServicesContext = useServicesContext as Mock;
const mockUseSetInputEditor = useSetInputEditor as MockedFunction<typeof useSetInputEditor>;

describe('MonacoEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();

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
        <MonacoEditor localStorageValue="GET /" value="GET /" setValue={vi.fn()} />
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
        <MonacoEditor localStorageValue="GET /" value="GET /" setValue={vi.fn()} />
      </I18nProvider>
    );

    expect(mockAppendRequestToEditor).toHaveBeenCalledTimes(1);
  });
});
