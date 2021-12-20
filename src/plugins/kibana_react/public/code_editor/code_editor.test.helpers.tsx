/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useEffect, KeyboardEventHandler } from 'react';
import { monaco } from '@kbn/monaco';

function createEditorInstance() {
  const keyDownListeners: Array<(e?: unknown) => void> = [];
  const didShowListeners: Array<(e?: unknown) => void> = [];
  const didHideListeners: Array<(e?: unknown) => void> = [];
  let placeholderDiv: undefined | HTMLDivElement;
  let areSuggestionsVisible = false;

  const editorInstance = {
    // Mock monaco editor API
    getContribution: jest.fn((id: string) => {
      if (id === 'editor.contrib.suggestController') {
        return {
          widget: {
            value: {
              onDidShow: jest.fn((listener) => {
                didShowListeners.push(listener);
              }),
              onDidHide: jest.fn((listener) => {
                didHideListeners.push(listener);
              }),
            },
          },
        };
      }
    }),
    focus: jest.fn(),
    onDidBlurEditorText: jest.fn(),
    onKeyDown: jest.fn((listener) => {
      keyDownListeners.push(listener);
    }),
    addContentWidget: jest.fn((widget: monaco.editor.IContentWidget) => {
      placeholderDiv?.appendChild(widget.getDomNode());
    }),
    applyFontInfo: jest.fn(),
    removeContentWidget: jest.fn((widget: monaco.editor.IContentWidget) => {
      placeholderDiv?.removeChild(widget.getDomNode());
    }),
    getDomNode: jest.fn(),
    // Helpers for our tests
    __helpers__: {
      areSuggestionsVisible: () => areSuggestionsVisible,
      getPlaceholderRef: (div: HTMLDivElement) => {
        placeholderDiv = div;
      },
      onTextareaKeyDown: ((e) => {
        // Let all our listener know that a key has been pressed on the textarea
        keyDownListeners.forEach((listener) => listener(e));

        // Close the suggestions when hitting the ESC key
        if (e.keyCode === monaco.KeyCode.Escape && areSuggestionsVisible) {
          editorInstance.__helpers__.hideSuggestions();
        }
      }) as KeyboardEventHandler,
      showSuggestions: () => {
        areSuggestionsVisible = true;
        didShowListeners.forEach((listener) => listener());
      },
      hideSuggestions: () => {
        areSuggestionsVisible = false;
        didHideListeners.forEach((listener) => listener());
      },
    },
  };

  return editorInstance;
}

type MockedEditor = ReturnType<typeof createEditorInstance>;

export const mockedEditorInstance: MockedEditor = createEditorInstance();

// <MonacoEditor /> mock
const mockMonacoEditor = ({
  editorWillMount,
  editorDidMount,
}: Record<string, (...args: unknown[]) => void>) => {
  editorWillMount(monaco);

  useEffect(() => {
    editorDidMount(mockedEditorInstance, monaco);
  }, [editorDidMount]);

  return (
    <div>
      <div ref={mockedEditorInstance?.__helpers__.getPlaceholderRef} />
      <textarea
        onKeyDown={mockedEditorInstance?.__helpers__.onTextareaKeyDown}
        data-test-subj="monacoEditorTextarea"
      />
    </div>
  );
};

jest.mock('react-monaco-editor', () => {
  return function JestMockEditor() {
    return mockMonacoEditor;
  };
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
