/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useRef } from 'react';
import type { monaco } from '@kbn/code-editor';
import type { Position } from './fake_monaco_editor';
import { offsetAt, positionAt } from './fake_monaco_editor';

type Editor = monaco.editor.IStandaloneCodeEditor;

export interface MockCodeEditorChange {
  readonly rangeOffset: number;
  readonly text: string;
}

export interface MockCodeEditorProps {
  readonly value: string;
  readonly languageId: string;
  readonly onChange?: (
    value: string,
    event?: { readonly changes: readonly MockCodeEditorChange[] }
  ) => void;
  readonly dataTestSubj?: string;
  readonly 'aria-label'?: string;
  readonly placeholder?: string;
  readonly editorDidMount?: (editor: Editor) => void;
}

/** Knobs a test can turn; reset them in `beforeEach` with `resetMockCodeEditor`. */
export const mockCodeEditorState = {
  /** Column `getTargetAtClientPoint` reports, for drag-and-drop tests. */
  dropColumn: 1,
  /** Every decoration collection drawn on any mounted mock editor, in drawing order. */
  decorations: [] as Array<{
    decorations: readonly monaco.editor.IModelDeltaDecoration[];
    cleared: boolean;
  }>,
};

export const resetMockCodeEditor = (): void => {
  mockCodeEditorState.dropColumn = 1;
  mockCodeEditorState.decorations = [];
};

const MockCodeEditor = ({
  value,
  languageId,
  onChange,
  dataTestSubj,
  'aria-label': ariaLabel,
  placeholder,
  editorDidMount,
}: MockCodeEditorProps) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const blurRef = useRef<(() => void) | null>(null);
  // Monaco mounts once and keeps the callbacks it was given; the editor reads what is current.
  const latest = useRef({ value, onChange, editorDidMount });
  latest.current = { value, onChange, editorDidMount };

  useEffect(() => {
    const caretOffset = () => textareaRef.current?.selectionStart ?? latest.current.value.length;
    const model = {
      getValue: () => latest.current.value,
      getValueLength: () => latest.current.value.length,
      getOffsetAt: (position: Position) => offsetAt(latest.current.value, position),
      getPositionAt: (offset: number) => positionAt(latest.current.value, offset),
    };
    const mounted = {
      focus: () => textareaRef.current?.focus(),
      getValue: () => latest.current.value,
      getModel: () => model,
      getPosition: () => positionAt(latest.current.value, caretOffset()),
      setPosition: (position: Position) => {
        const offset = offsetAt(latest.current.value, position);
        textareaRef.current?.setSelectionRange(offset, offset);
      },
      setSelection: () => undefined,
      revealPosition: () => undefined,
      onKeyDown: () => undefined,
      onDidBlurEditorText: (callback: () => void) => {
        blurRef.current = callback;
      },
      getTargetAtClientPoint: () => ({
        position: { lineNumber: 1, column: mockCodeEditorState.dropColumn },
      }),
      // Like Monaco: apply the edit to the text and report it as a change.
      executeEdits: (
        _source: string,
        edits: ReadonlyArray<{
          range: {
            startLineNumber: number;
            startColumn: number;
            endLineNumber: number;
            endColumn: number;
          };
          text: string;
        }>
      ) => {
        const [{ range, text }] = edits;
        const current = latest.current.value;
        const from = offsetAt(current, {
          lineNumber: range.startLineNumber,
          column: range.startColumn,
        });
        const to = offsetAt(current, { lineNumber: range.endLineNumber, column: range.endColumn });
        latest.current.onChange?.(`${current.slice(0, from)}${text}${current.slice(to)}`, {
          changes: [{ rangeOffset: from, text }],
        });
      },
      createDecorationsCollection: (
        decorations: readonly monaco.editor.IModelDeltaDecoration[]
      ) => {
        const entry = { decorations, cleared: false };
        mockCodeEditorState.decorations.push(entry);
        return {
          clear: () => {
            entry.cleared = true;
          },
        };
      },
    };
    // The mock implements the part of the editor API the panel code uses.
    latest.current.editorDidMount?.(mounted as unknown as Editor);
  }, []);

  return (
    <textarea
      ref={textareaRef}
      data-test-subj={dataTestSubj ?? 'mocked-code-editor'}
      data-language={languageId}
      aria-label={ariaLabel}
      placeholder={placeholder}
      value={value}
      onBlur={() => blurRef.current?.()}
      onChange={(event) => {
        const next = event.target.value;
        const caret = event.target.selectionStart ?? next.length;
        onChange?.(next, {
          changes: [
            {
              rangeOffset: caret - (next.length - value.length),
              text: next.slice(Math.max(0, caret - 1), caret),
            },
          ],
        });
      }}
    />
  );
};

/** The value of the `@kbn/code-editor` module mock: `jest.mock('@kbn/code-editor', () => createCodeEditorModuleMock())`. */
export const createCodeEditorModuleMock = () => ({
  monaco: {
    languages: {
      getLanguages: () => [],
      register: () => undefined,
      setMonarchTokensProvider: () => undefined,
      setLanguageConfiguration: () => undefined,
    },
    editor: { InjectedTextCursorStops: { None: 3 } },
  },
  CodeEditor: MockCodeEditor,
});
