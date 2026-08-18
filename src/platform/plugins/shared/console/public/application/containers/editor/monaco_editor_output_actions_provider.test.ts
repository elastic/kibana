/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CSSProperties } from 'react';
import type { monaco } from '@kbn/monaco';
import { MonacoEditorOutputActionsProvider } from './monaco_editor_output_actions_provider';

const RESPONSE_VALUE = '{\n  "acknowledged": true\n}';

const createMockModel = (value: string): monaco.editor.ITextModel => {
  const lines = value.split('\n');
  return {
    getValue: () => value,
    getLineCount: () => lines.length,
    getLineContent: (lineNumber: number) => lines[lineNumber - 1] ?? '',
    getLineMaxColumn: (lineNumber: number) => (lines[lineNumber - 1] ?? '').length + 1,
    getPositionAt: (offset: number) => {
      let remaining = offset;
      for (let index = 0; index < lines.length; index++) {
        const lineLengthWithNewLine = lines[index].length + 1;
        if (remaining < lineLengthWithNewLine || index === lines.length - 1) {
          return { lineNumber: index + 1, column: remaining + 1 };
        }
        remaining -= lineLengthWithNewLine;
      }
      return { lineNumber: 1, column: 1 };
    },
    getValueInRange: ({ startLineNumber, endLineNumber }: monaco.IRange) =>
      lines.slice(startLineNumber - 1, endLineNumber).join('\n'),
  } as unknown as monaco.editor.ITextModel;
};

describe('MonacoEditorOutputActionsProvider', () => {
  let editor: jest.Mocked<monaco.editor.IStandaloneCodeEditor>;
  let setEditorActionsCss: jest.Mock<void, [CSSProperties]>;
  let triggerCursorPositionChange: () => Promise<void>;
  let triggerCursorSelectionChange: () => Promise<void>;
  let provider: MonacoEditorOutputActionsProvider;
  // Mutable focus state so blurring the editor's focused input flips hasTextFocus()
  // to false, mirroring the browser.
  let hasFocus: boolean;
  let activeElement: { blur: jest.Mock };

  beforeEach(() => {
    setEditorActionsCss = jest.fn();
    hasFocus = true;
    activeElement = {
      blur: jest.fn(() => {
        hasFocus = false;
      }),
    };

    editor = {
      createDecorationsCollection: jest.fn(() => ({
        clear: jest.fn(),
        set: jest.fn(),
      })),
      getModel: jest.fn(() => createMockModel(RESPONSE_VALUE)),
      getSelection: jest.fn(() => ({ startLineNumber: 1, endLineNumber: 1 })),
      getTopForLineNumber: jest.fn(() => 0),
      getScrollTop: jest.fn(() => 0),
      hasTextFocus: jest.fn(() => hasFocus),
      getDomNode: jest.fn(() => ({
        ownerDocument: {
          get activeElement() {
            return hasFocus ? activeElement : null;
          },
        },
      })),
      onDidBlurEditorText: jest.fn(),
      onDidChangeCursorPosition: jest.fn((callback: () => Promise<void>) => {
        triggerCursorPositionChange = callback;
      }),
      onDidChangeCursorSelection: jest.fn((callback: () => Promise<void>) => {
        triggerCursorSelectionChange = callback;
      }),
      onDidContentSizeChange: jest.fn(),
      onDidScrollChange: jest.fn(),
      setSelection: jest.fn(),
    } as unknown as jest.Mocked<monaco.editor.IStandaloneCodeEditor>;

    provider = new MonacoEditorOutputActionsProvider(
      editor,
      setEditorActionsCss,
      'highlighted-line'
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const getLastActionsCss = (): CSSProperties =>
    setEditorActionsCss.mock.calls[setEditorActionsCss.mock.calls.length - 1][0];

  it('clamps the actions buttons offset to the editor top when the selected line has scrolled above the viewport', async () => {
    // getTopForLineNumber() returning less than getScrollTop() means the selected
    // request's start line has scrolled above the current viewport, which would
    // otherwise produce a negative `top` offset (see https://github.com/elastic/kibana/issues/266698).
    editor.getTopForLineNumber.mockReturnValue(50);
    editor.getScrollTop.mockReturnValue(150);

    await triggerCursorPositionChange();

    const { top, visibility } = getLastActionsCss();
    expect(visibility).toBe('visible');
    expect(top).toBe(1);
  });

  it('positions the actions buttons using the raw offset when it is already non-negative', async () => {
    editor.getTopForLineNumber.mockReturnValue(200);
    editor.getScrollTop.mockReturnValue(50);

    await triggerCursorPositionChange();

    const { top, visibility } = getLastActionsCss();
    expect(visibility).toBe('visible');
    // offset (200 - 50) + OFFSET_EDITOR_ACTIONS (1)
    expect(top).toBe(151);
  });

  it('keeps the actions hidden when a highlight recomputation follows copy completion', async () => {
    jest.useFakeTimers();

    await triggerCursorSelectionChange();
    await triggerCursorSelectionChange();
    provider.resetOutputActions();

    await jest.advanceTimersByTimeAsync(200);

    expect(getLastActionsCss()).toEqual({ visibility: 'hidden' });

    // resetOutputActions() relinquishes editor focus, so a highlight recomputation
    // triggered afterwards stays in the hide branch instead of re-rendering the
    // button that copy just hid. See https://github.com/elastic/kibana/issues/278855.
    expect(activeElement.blur).toHaveBeenCalled();

    await triggerCursorSelectionChange();

    expect(getLastActionsCss()).toEqual({ visibility: 'hidden' });
  });

  it('does not blur another element when the editor no longer has text focus', () => {
    const otherActiveElement = { blur: jest.fn() };
    editor.hasTextFocus.mockReturnValue(false);
    editor.getDomNode.mockReturnValue({
      ownerDocument: { activeElement: otherActiveElement },
    } as unknown as HTMLElement);

    provider.resetOutputActions();

    expect(otherActiveElement.blur).not.toHaveBeenCalled();
  });

  it('re-shows the actions once the editor regains focus after a reset', async () => {
    provider.resetOutputActions();
    expect(getLastActionsCss()).toEqual({ visibility: 'hidden' });

    // Simulate the user interacting with the output again, which refocuses the editor.
    editor.hasTextFocus.mockReturnValue(true);
    await triggerCursorSelectionChange();

    expect(getLastActionsCss()).toEqual({ visibility: 'visible', top: 1 });
  });
});
