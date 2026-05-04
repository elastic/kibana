/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, renderHook } from '@testing-library/react';
import { monaco } from '@kbn/code-editor';
import { shouldShowGhostHint, useGhostLineHint } from './use_ghost_line_hint';

const buildModel = (
  lines: string[]
): {
  model: monaco.editor.ITextModel;
  setLines: (next: string[]) => void;
} => {
  let current = lines;
  const model = {
    getLineContent: jest.fn((lineNumber: number) => current[lineNumber - 1] ?? ''),
    getValueLength: jest.fn(() => current.join('\n').length),
  } as unknown as monaco.editor.ITextModel;
  return {
    model,
    setLines: (next) => {
      current = next;
    },
  };
};

describe('shouldShowGhostHint', () => {
  it('returns true on an empty line in a non-empty editor', () => {
    const { model } = buildModel(['FROM logs', '']);
    expect(shouldShowGhostHint(model, 2)).toBe(true);
  });

  it('returns false on a non-empty line', () => {
    const { model } = buildModel(['FROM logs']);
    expect(shouldShowGhostHint(model, 1)).toBe(false);
  });

  it('returns false in an entirely empty editor (so it does not clash with the placeholder)', () => {
    const { model } = buildModel(['']);
    expect(shouldShowGhostHint(model, 1)).toBe(false);
  });
});

describe('useGhostLineHint', () => {
  // Pulled from the source file. If the source changes, the tests should track it.
  const CURSOR_PAUSE_MS = 400;

  const setupEditorStubs = () => {
    const cursorListeners: Array<() => void> = [];
    const contentListeners: Array<() => void> = [];

    const decorationsCollection = {
      clear: jest.fn(),
    };

    const editor = {
      onDidChangeCursorPosition: jest.fn((cb: () => void) => {
        cursorListeners.push(cb);
        return { dispose: jest.fn() };
      }),
      onDidChangeModelContent: jest.fn((cb: () => void) => {
        contentListeners.push(cb);
        return { dispose: jest.fn() };
      }),
      createDecorationsCollection: jest.fn(() => decorationsCollection),
      getPosition: jest.fn(() => new monaco.Position(2, 1)),
    } as unknown as monaco.editor.IStandaloneCodeEditor;

    return {
      editor,
      decorationsCollection,
      fireCursorChange: () => cursorListeners.forEach((cb) => cb()),
      fireContentChange: () => contentListeners.forEach((cb) => cb()),
    };
  };

  const renderGhostHint = (
    overrides: {
      model?: monaco.editor.ITextModel;
      isReviewActive?: boolean;
      isEnabled?: boolean;
    } = {}
  ) => {
    const { model } = overrides.model ? { model: overrides.model } : buildModel(['FROM logs', '']);
    const stubs = setupEditorStubs();
    const editorRef = { current: stubs.editor };
    const editorModel = { current: model };
    const isReviewActiveRef = { current: overrides.isReviewActive ? {} : null };
    const isEnabled = overrides.isEnabled ?? true;

    const { result, rerender } = renderHook(
      (props: { isEnabled: boolean }) =>
        useGhostLineHint({
          editorRef,
          editorModel,
          isReviewActiveRef,
          isEnabled: props.isEnabled,
        }),
      { initialProps: { isEnabled } }
    );

    act(() => {
      result.current.setupGhostLineHint(stubs.editor);
    });

    return { ...stubs, rerender };
  };

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows the hint only after the cursor has been still for the debounce window', () => {
    const stubs = renderGhostHint();

    act(() => {
      stubs.fireCursorChange();
    });

    // Before the debounce elapses no decoration is created.
    expect(stubs.editor.createDecorationsCollection).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(CURSOR_PAUSE_MS);
    });

    expect(stubs.editor.createDecorationsCollection).toHaveBeenCalledTimes(1);
  });

  it('cancels the pending hint when the model content changes during the debounce window', () => {
    const stubs = renderGhostHint();

    act(() => {
      stubs.fireCursorChange();
      // User types something before the 400ms is up.
      jest.advanceTimersByTime(CURSOR_PAUSE_MS - 100);
      stubs.fireContentChange();
      jest.advanceTimersByTime(200);
    });

    expect(stubs.editor.createDecorationsCollection).not.toHaveBeenCalled();
  });

  it('does not show the hint while a review is active', () => {
    const stubs = renderGhostHint({ isReviewActive: true });

    act(() => {
      stubs.fireCursorChange();
      jest.advanceTimersByTime(CURSOR_PAUSE_MS);
    });

    expect(stubs.editor.createDecorationsCollection).not.toHaveBeenCalled();
  });

  it('does not show the hint when the feature is disabled, and starts showing it once enabled', () => {
    const stubs = renderGhostHint({ isEnabled: false });

    act(() => {
      stubs.fireCursorChange();
      jest.advanceTimersByTime(CURSOR_PAUSE_MS);
    });
    expect(stubs.editor.createDecorationsCollection).not.toHaveBeenCalled();

    // Async license check resolves later in the same editor session — the listener
    // registered at mount must pick up the new value via the ref.
    act(() => {
      stubs.rerender({ isEnabled: true });
    });

    act(() => {
      stubs.fireCursorChange();
      jest.advanceTimersByTime(CURSOR_PAUSE_MS);
    });
    expect(stubs.editor.createDecorationsCollection).toHaveBeenCalledTimes(1);
  });
});
