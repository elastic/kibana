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
  let nativeEditContextNode: HTMLElement | undefined;
  let textareaNode: HTMLTextAreaElement | undefined;
  let areSuggestionsVisible = false;
  let isInspectTokensWidgetVisible = false;
  let isEditContextEnabled = false;

  /**
   * Mocks for monaco editor API
   */
  const editorInstanceMethods = {
    // Mirrors real Monaco: focus() moves real DOM focus to whichever surface is
    // currently live, so EditContext-vs-legacy focus transitions are observable in jsdom.
    focus: jest.fn(() => {
      (isEditContextEnabled ? nativeEditContextNode : textareaNode)?.focus();
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
    }),
    addAction: jest.fn(({ id, run }: { id: string; run: () => void }) => {
      registeredActions[id] = run;
      return { dispose: jest.fn() };
    }),
    // Mirrors real Monaco's `editor.trigger(source, handlerId)` for the subset of
    // handlers our own code invokes: actions registered via `addAction` above.
    trigger: jest.fn((_source: string, handlerId: string, _payload?: unknown) => {
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
      getNativeEditContextRef: (div: HTMLElement | null) => {
        nativeEditContextNode = div ?? undefined;
      },
      getTextareaRef: (textarea: HTMLTextAreaElement | null) => {
        textareaNode = textarea ?? undefined;
      },
      // Simulates Chrome's native EditContext being live (Monaco 0.54+): the real
      // focusable input becomes `.native-edit-context`, and the fallback `<textarea>`
      // is demoted to readonly/aria-hidden, same as in a real browser.
      enableEditContext: () => {
        isEditContextEnabled = true;
      },
      disableEditContext: () => {
        isEditContextEnabled = false;
      },
      isEditContextEnabled: () => isEditContextEnabled,
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
        didShowListeners.forEach((listener) => listener());
      },
      hideInspectTokensWidget: () => {
        isInspectTokensWidgetVisible = false;
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

  const editContextEnabled = mockedEditorInstance?.__helpers__.isEditContextEnabled();

  return (
    <div ref={mockedEditorInstance?.__helpers__.getEditorDomNodeRef}>
      <div ref={mockedEditorInstance?.__helpers__.getPlaceholderRef} />
      {editContextEnabled && (
        // Mirrors Chrome's native EditContext surface in Monaco 0.54+: this is the
        // real focusable input, demoting the <textarea> below to an IME-only fallback.
        <div
          className="native-edit-context"
          role="textbox"
          aria-roledescription="editor"
          aria-label="Editor content"
          ref={mockedEditorInstance?.__helpers__.getNativeEditContextRef}
        />
      )}
      <textarea
        value={value ?? ''}
        readOnly={editContextEnabled}
        aria-hidden={editContextEnabled}
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
