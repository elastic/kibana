/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, KeyboardEventHandler } from 'react';
import { type MonacoEditorProps } from 'react-monaco-editor';
import { monaco } from '@kbn/monaco';

function createEditorInstance() {
  const keyDownListeners: Array<(e?: unknown) => void> = [];
  const didShowListeners: Array<(e?: unknown) => void> = [];
  const didHideListeners: Array<(e?: unknown) => void> = [];
  let placeholderDiv: undefined | HTMLDivElement;
  let areSuggestionsVisible = false;

  /**
   * Mocks for monaco editor API
   */
  const editorInstanceMethods = {
    focus: jest.fn(),
    layout: jest.fn(),
    applyFontInfo: jest.fn(),
    executeEdits: jest.fn(),
    removeContentWidget: jest.fn((widget: monaco.editor.IContentWidget) => {
      placeholderDiv?.removeChild(widget.getDomNode());
    }),
    getValue: jest.fn(),
    getModel: jest.fn(),
    getDomNode: jest.fn(),
    getPosition: jest.fn(),
    getSelection: jest.fn(),
    getContentHeight: jest.fn(),
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
    addCommand: jest.fn(),
    addContentWidget: jest.fn((widget: monaco.editor.IContentWidget) => {
      placeholderDiv?.appendChild(widget.getDomNode());
    }),
    onKeyDown: jest.fn((listener) => {
      keyDownListeners.push(listener);
    }),
    onDidAttemptReadOnlyEdit: jest.fn(),
    onDidBlurEditorText: jest.fn(),
    onDidChangeModelContent: jest.fn((cb) => cb()),
    onDidFocusEditorText: jest.fn((cb) => cb()),
    onDidContentSizeChange: jest.fn((cb) => cb()),
    onDidBlurEditorWidget: () => ({
      dispose: jest.fn(),
    }),
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
          editorInstanceMethods.__helpers__.hideSuggestions();
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

  return editorInstanceMethods;
}

export const mockedEditorInstance = createEditorInstance();

export const MockedMonacoEditor = ({
  editorDidMount,
  editorWillMount,
  onChange,
  value,
  ...rest
}: Omit<MonacoEditorProps, 'className'> & {
  className?: string;
  ['data-test-subj']?: string;
}) => {
  useComponentWillMount(() => {
    editorWillMount?.(monaco);
  });

  useEffect(() => {
    editorDidMount?.(
      mockedEditorInstance as unknown as monaco.editor.IStandaloneCodeEditor,
      monaco
    );
  }, [editorDidMount]);

  return (
    <div>
      <div ref={mockedEditorInstance?.__helpers__.getPlaceholderRef} />
      <textarea
        value={value ?? ''}
        onKeyDown={mockedEditorInstance?.__helpers__.onTextareaKeyDown}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
          onChange?.(e.target.value, {} as unknown as monaco.editor.IModelContentChangedEvent);
        }}
        {...rest}
        /**
         * place this after spreading props, so the fallback value is set
         */
        data-test-subj={rest['data-test-subj'] || 'monacoEditorTextarea'}
      />
    </div>
  );
};

const useComponentWillMount = (cb: Function) => {
  const willMount = React.useRef(true);

  if (willMount.current) cb();

  willMount.current = false;
};
