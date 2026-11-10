/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KeyboardEventHandler } from 'react';
import React, { useEffect } from 'react';
import { monaco } from '@kbn/monaco';
// TODO: circular dependency
// import type { MonacoEditorProps } from '@kbn/code-editor/react_monaco_editor';
type MonacoEditorProps = any;

function createEditorInstance() {
  const keyDownListeners: Array<(e?: unknown) => void> = [];
  const didShowListeners: Array<(e?: unknown) => void> = [];
  const didHideListeners: Array<(e?: unknown) => void> = [];
  const registeredActions: Record<string, () => void> = {};
  let placeholderDiv: undefined | HTMLDivElement;
  let editorDomNode: HTMLDivElement | undefined;
  let textareaNode: HTMLTextAreaElement | undefined;
  let areSuggestionsVisible = false;
  let isInspectTokensWidgetVisible = false;

  /**
   * Mocks for monaco editor API
   */
  const editorInstanceMethods = {
    focus: jest.fn(() => {
      textareaNode?.focus();
    }),
    layout: jest.fn(),
    applyFontInfo: jest.fn(),
    executeEdits: jest.fn(),
    removeContentWidget: jest.fn((widget: monaco.editor.IContentWidget) => {
      placeholderDiv?.removeChild(widget.getDomNode());
    }),
    getValue: jest.fn(),
    getModel: jest.fn(),
    getDomNode: jest.fn(() => editorDomNode ?? null),
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
      if (id === 'editor.contrib.inspectTokens') {
        return {
          _widget: isInspectTokensWidgetVisible
            ? { getDomNode: () => document.createElement('div') }
            : null,
        };
      }
    }),
    addAction: jest.fn(({ id, run }: { id: string; run: () => void }) => {
      registeredActions[id] = run;
      return { dispose: jest.fn() };
    }),
    // Mirrors real Monaco's `editor.trigger(source, handlerId)` for actions registered
    // via `addAction`, plus `hideSuggestWidget`, which the Escape action invokes.
    trigger: jest.fn((_source: string, handlerId: string, _payload?: unknown) => {
      if (handlerId === 'hideSuggestWidget') {
        editorInstanceMethods.__helpers__.hideSuggestions();
        return;
      }
      registeredActions[handlerId]?.();
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
    onDidScrollChange: jest.fn(() => ({
      dispose: jest.fn(),
    })),
    setScrollTop: jest.fn(),
    getScrollTop: jest.fn(() => 0),
    // Helpers for our tests
    __helpers__: {
      areSuggestionsVisible: () => areSuggestionsVisible,
      isInspectTokensWidgetVisible: () => isInspectTokensWidgetVisible,
      getPlaceholderRef: (div: HTMLDivElement) => {
        placeholderDiv = div;
      },
      getEditorDomNodeRef: (div: HTMLDivElement) => {
        editorDomNode = div;
      },
      getTextareaRef: (textarea: HTMLTextAreaElement | null) => {
        textareaNode = textarea ?? undefined;
      },
      onTextareaKeyDown: ((e) => {
        // Let all our listener know that a key has been pressed on the textarea
        keyDownListeners.forEach((listener) => listener(e));

        // Close the suggestions when hitting the ESC key
        if (e.keyCode === monaco.KeyCode.Escape && areSuggestionsVisible) {
          editorInstanceMethods.__helpers__.hideSuggestions();
        }
        // Close the inspect tokens when hitting the ESC key
        if (e.keyCode === monaco.KeyCode.Escape && isInspectTokensWidgetVisible) {
          editorInstanceMethods.__helpers__.hideInspectTokensWidget();
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
      showInspectTokensWidget: () => {
        isInspectTokensWidgetVisible = true;
      },
      hideInspectTokensWidget: () => {
        isInspectTokensWidgetVisible = false;
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
    <div ref={mockedEditorInstance?.__helpers__.getEditorDomNodeRef}>
      <div ref={mockedEditorInstance?.__helpers__.getPlaceholderRef} />
      <textarea
        value={value ?? ''}
        aria-roledescription="editor"
        onKeyDown={mockedEditorInstance?.__helpers__.onTextareaKeyDown}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
          onChange?.(e.target.value, {} as unknown as monaco.editor.IModelContentChangedEvent);
        }}
        {...rest}
        /**
         * place this after spreading props, so the fallback value is set
         */
        data-test-subj={rest['data-test-subj'] || 'monacoEditorTextarea'}
        ref={mockedEditorInstance?.__helpers__.getTextareaRef}
      />
    </div>
  );
};

const useComponentWillMount = (cb: Function) => {
  const willMount = React.useRef(true);

  if (willMount.current) cb();

  willMount.current = false;
};
