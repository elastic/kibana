/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { KeyboardEventHandler } from 'react';
import { monaco } from '@kbn/monaco';

import { keyCodes } from './code_editor';

export function createEditorInstance() {
  const keyDownListeners: any[] = [];
  const didShowListeners: any[] = [];
  const didHideListeners: any[] = [];
  let areSuggestionsVisible = false;

  const editorInstance = {
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
    areSuggestionsVisible: () => areSuggestionsVisible,
    onKeyDown: jest.fn((listener) => {
      keyDownListeners.push(listener);
    }),
    onTextareaKeyDown: ((e) => {
      // Let all our listener know that a key has been pressed on the textarea
      keyDownListeners.forEach((listener) => listener(e));

      // Close the suggestions when hitting the ESC key
      if (e.keyCode === keyCodes.ESCAPE && areSuggestionsVisible) {
        editorInstance.hideSuggestions();
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
  };

  return editorInstance;
}

type MockedEditor = ReturnType<typeof createEditorInstance>;

export let mockedEditorInstance: MockedEditor | undefined;

export const setMockedEditorInstance = (instance: MockedEditor) => {
  mockedEditorInstance = instance;
};

// MonacoEditor mock
const mockMonacoEditor = React.forwardRef((props: any, ref) => {
  props.editorWillMount(monaco);

  if (ref) {
    // We forward to the parent the ref with the editor instance
    (ref as React.MutableRefObject<{ editor: MockedEditor | undefined }>).current = {
      editor: mockedEditorInstance,
    };
  }

  return (
    <div>
      <textarea
        onKeyDown={mockedEditorInstance?.onTextareaKeyDown}
        data-test-subj="monacoEditorTextarea"
      />
    </div>
  );
});

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
      return () => 42;
    },
  };
});
