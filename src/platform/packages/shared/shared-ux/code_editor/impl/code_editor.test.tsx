/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { monaco } from '@kbn/monaco';

import { keys } from '@elastic/eui';

import { MockedMonacoEditor, mockedEditorInstance } from '@kbn/code-editor-mock/monaco_mock';

import { CodeEditor } from './code_editor';

jest.mock('./react_monaco_editor', () => {
  return { MonacoEditor: MockedMonacoEditor };
});

// Mock the htmlIdGenerator to generate predictable ids for snapshot tests
jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');

  return {
    ...original,
    htmlIdGenerator: () => {
      return () => '1234';
    },
  };
});

// A sample language definition with a few example tokens
const simpleLogLang: monaco.languages.IMonarchLanguage = {
  tokenizer: {
    root: [
      [/\[error.*/, 'constant'],
      [/\[notice.*/, 'variable'],
      [/\[info.*/, 'string'],
      [/\[[a-zA-Z 0-9:]+\]/, 'tag'],
    ],
  },
};

const logs = `
[Sun Mar 7 20:54:27 2004] [notice] [client xx.xx.xx.xx] This is a notice!
[Sun Mar 7 20:58:27 2004] [info] [client xx.xx.xx.xx] (104)Connection reset by peer: client stopped connection before send body completed
[Sun Mar 7 21:16:17 2004] [error] [client xx.xx.xx.xx] File does not exist: /home/httpd/twiki/view/Main/WebHome
`;

describe('<CodeEditor />', () => {
  beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(), // deprecated
        removeListener: jest.fn(), // deprecated
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });

    monaco.languages.register({ id: 'loglang' });
    monaco.languages.setMonarchTokensProvider('loglang', simpleLogLang);
  });

  test('editor mount setup', () => {
    const suggestionProvider = {
      provideCompletionItems: (model: monaco.editor.ITextModel, position: monaco.Position) => ({
        suggestions: [],
      }),
    };
    const hoverProvider = {
      provideHover: (model: monaco.editor.ITextModel, position: monaco.Position) => ({
        contents: [],
      }),
    };

    const editorWillMount = jest.fn();

    monaco.languages.onLanguage = jest.fn((languageId, func) => {
      expect(languageId).toBe('loglang');

      // Call the function immediately so we can see our providers
      // get setup without a monaco editor setting up completely
      func();
    }) as any;

    monaco.languages.registerCompletionItemProvider = jest.fn();
    monaco.languages.registerSignatureHelpProvider = jest.fn();
    monaco.languages.registerHoverProvider = jest.fn();

    monaco.editor.defineTheme = jest.fn();

    renderWithI18n(
      <CodeEditor
        languageId="loglang"
        value={logs}
        onChange={() => {}}
        editorWillMount={editorWillMount}
        suggestionProvider={suggestionProvider}
        hoverProvider={hoverProvider}
      />
    );
    // Verify our mount callback will be called
    expect(editorWillMount.mock.calls.length).toBe(1);

    // Verify that both, default and transparent theme will be setup\
    // disabling this test because themes had to be refactored in Monaco editor Theme useMemo for light, dark and transparent to work
    // expect((monaco.editor.defineTheme as jest.Mock).mock.calls.length).toBe(2)

    // Verify our language features have been registered
    expect((monaco.languages.onLanguage as jest.Mock).mock.calls.length).toBe(1);
    expect((monaco.languages.registerCompletionItemProvider as jest.Mock).mock.calls.length).toBe(
      1
    );
    expect((monaco.languages.registerHoverProvider as jest.Mock).mock.calls.length).toBe(1);
  });

  describe('hint element', () => {
    const getHint = () => screen.getByTestId('codeEditorHint');

    beforeEach(() => {
      renderWithI18n(
        <CodeEditor languageId="loglang" height={250} value={logs} onChange={() => {}} />
      );
    });

    test('should be tabable', () => {
      const DOMnode = getHint();
      expect(DOMnode).toBeDefined();
      expect(DOMnode.getAttribute('tabindex')).toBe('0');
      expect(DOMnode).toMatchSnapshot();
    });

    test('should be disabled when the ui monaco editor gains focus', async () => {
      // Initially it is visible and active
      expect(getHint().getAttribute('data-code-hint-status')).toBe('active');
      fireEvent.keyDown(getHint(), { key: keys.ENTER });
      expect(getHint().getAttribute('data-code-hint-status')).toBe('inactive');
    });

    test('should be enabled when hitting the ESC key', () => {
      fireEvent.keyDown(getHint(), { key: keys.ENTER });

      fireEvent.keyDown(screen.getByTestId('monacoEditorTextarea'), {
        keyCode: monaco.KeyCode.Escape,
      });

      expect(getHint().getAttribute('data-code-hint-status')).toBe('active');
    });

    test('should detect that the suggestion menu is open and not show the hint on ESC', async () => {
      fireEvent.keyDown(getHint(), { key: keys.ENTER });

      expect(getHint().getAttribute('data-code-hint-status')).toBe('inactive');
      expect(mockedEditorInstance?.__helpers__.areSuggestionsVisible()).toBe(false);

      // Show the suggestions in the editor
      mockedEditorInstance?.__helpers__.showSuggestions();
      expect(mockedEditorInstance?.__helpers__.areSuggestionsVisible()).toBe(true);

      // Hitting the ESC key with the suggestions visible
      fireEvent.keyDown(screen.getByTestId('monacoEditorTextarea'), {
        keyCode: monaco.KeyCode.Escape,
      });

      expect(mockedEditorInstance?.__helpers__.areSuggestionsVisible()).toBe(false);

      // The keyboard hint is still **not** active
      expect(getHint().getAttribute('data-code-hint-status')).toBe('inactive');
      // Hitting a second time the ESC key should now show the hint
      fireEvent.keyDown(screen.getByTestId('monacoEditorTextarea'), {
        keyCode: monaco.KeyCode.Escape,
      });

      expect(getHint().getAttribute('data-code-hint-status')).toBe('active');
    });

    test('should detect that the inspect tokens widget is open and not show the hint on ESC', async () => {
      fireEvent.keyDown(getHint(), { key: keys.ENTER });

      expect(getHint().getAttribute('data-code-hint-status')).toBe('inactive');
      expect(mockedEditorInstance?.__helpers__.isInspectTokensWidgetVisible()).toBe(false);

      // Show the inspect tokens widget in the editor
      mockedEditorInstance?.__helpers__.showInspectTokensWidget();
      expect(mockedEditorInstance?.__helpers__.isInspectTokensWidgetVisible()).toBe(true);

      // Hitting the ESC key with the inspect tokens widget visible
      fireEvent.keyDown(screen.getByTestId('monacoEditorTextarea'), {
        keyCode: monaco.KeyCode.Escape,
      });

      expect(mockedEditorInstance?.__helpers__.isInspectTokensWidgetVisible()).toBe(false);

      // The keyboard hint is still **not** active
      expect(getHint().getAttribute('data-code-hint-status')).toBe('inactive');
      // Hitting a second time the ESC key should now show the hint
      fireEvent.keyDown(screen.getByTestId('monacoEditorTextarea'), {
        keyCode: monaco.KeyCode.Escape,
      });

      expect(getHint().getAttribute('data-code-hint-status')).toBe('active');
    });
  });
});
