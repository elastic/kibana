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
import { CURSOR_PAUSE_MS, getGhostHintKind, useGhostLineHint } from './use_ghost_line_hint';

const buildModel = (
  lines: string[]
): {
  model: monaco.editor.ITextModel;
  setLines: (next: string[]) => void;
} => {
  let current = lines;
  const model = {
    getLineContent: jest.fn((lineNumber: number) => current[lineNumber - 1] ?? ''),
    getLineMaxColumn: jest.fn((lineNumber: number) => (current[lineNumber - 1] ?? '').length + 1),
    getValueLength: jest.fn(() => current.join('\n').length),
  } as unknown as monaco.editor.ITextModel;
  return {
    model,
    setLines: (next) => {
      current = next;
    },
  };
};

describe('getGhostHintKind', () => {
  it('returns "empty" on a blank line in a non-empty editor', () => {
    const { model } = buildModel(['FROM logs', '']);
    expect(getGhostHintKind(model, 2)).toBe('empty');
  });

  it('returns "comment" when the line starts with //', () => {
    const { model } = buildModel(['FROM logs', '// summarise per host']);
    expect(getGhostHintKind(model, 2)).toBe('comment');
  });

  it('returns "comment" even when the // comment is preceded by whitespace', () => {
    const { model } = buildModel(['  // indented']);
    expect(getGhostHintKind(model, 1)).toBe('comment');
  });

  it('returns null on a non-empty, non-comment line', () => {
    const { model } = buildModel(['FROM logs']);
    expect(getGhostHintKind(model, 1)).toBeNull();
  });

  it('returns null in an entirely empty editor (so it does not clash with the placeholder)', () => {
    const { model } = buildModel(['']);
    expect(getGhostHintKind(model, 1)).toBeNull();
  });
});

describe('useGhostLineHint', () => {
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

  const lastDecorationClassName = (editor: monaco.editor.IStandaloneCodeEditor): string => {
    const calls = (editor.createDecorationsCollection as jest.Mock).mock.calls;
    const lastDecoration = calls[calls.length - 1][0][0];
    return lastDecoration.options.afterContentClassName;
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

  it('shows the empty-line hint after the cursor has been still for the debounce window', () => {
    const stubs = renderGhostHint();

    act(() => {
      stubs.fireCursorChange();
    });
    expect(stubs.editor.createDecorationsCollection).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(CURSOR_PAUSE_MS);
    });

    expect(stubs.editor.createDecorationsCollection).toHaveBeenCalledTimes(1);
    expect(lastDecorationClassName(stubs.editor)).toBe('esqlGhostLineHint');
  });

  it('shows the comment-line hint when the cursor is on a // line and the user pauses', () => {
    // Cursor is on line 2 (per the stub's getPosition); make line 2 a comment.
    const { model } = buildModel(['FROM logs', '// summarise per host']);
    const stubs = renderGhostHint({ model });

    act(() => {
      // Simulates the user typing the comment: a content change followed by a pause.
      stubs.fireContentChange();
      jest.advanceTimersByTime(CURSOR_PAUSE_MS);
    });

    expect(stubs.editor.createDecorationsCollection).toHaveBeenCalledTimes(1);
    expect(lastDecorationClassName(stubs.editor)).toBe('esqlGhostCommentHint');
  });

  it('resets the debounce on each subsequent edit so the hint only appears after the user pauses', () => {
    const stubs = renderGhostHint();

    act(() => {
      stubs.fireCursorChange();
      jest.advanceTimersByTime(CURSOR_PAUSE_MS - 100);
      // User keeps typing before the 400ms is up — debounce restarts.
      stubs.fireContentChange();
      jest.advanceTimersByTime(CURSOR_PAUSE_MS - 100);
    });
    expect(stubs.editor.createDecorationsCollection).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(CURSOR_PAUSE_MS);
    });
    expect(stubs.editor.createDecorationsCollection).toHaveBeenCalledTimes(1);
  });

  it('does not show the hint while a review is active', () => {
    const stubs = renderGhostHint({ isReviewActive: true });

    act(() => {
      stubs.fireCursorChange();
      jest.advanceTimersByTime(CURSOR_PAUSE_MS);
    });

    expect(stubs.editor.createDecorationsCollection).not.toHaveBeenCalled();
  });

  it('does not show the hint while a generation is in flight', () => {
    const isGeneratingRef = { current: true };
    const { model } = buildModel(['FROM logs', '']);
    const stubs = setupEditorStubs();

    const { result } = renderHook(() =>
      useGhostLineHint({
        editorRef: { current: stubs.editor },
        editorModel: { current: model },
        isReviewActiveRef: { current: null },
        isEnabled: true,
        isGeneratingRef,
      })
    );

    act(() => {
      result.current.setupGhostLineHint(stubs.editor);
    });

    act(() => {
      stubs.fireCursorChange();
      jest.advanceTimersByTime(CURSOR_PAUSE_MS);
    });

    expect(stubs.editor.createDecorationsCollection).not.toHaveBeenCalled();
  });

  it('writes its clearDecoration into clearGhostHintRef so other hooks can hide a visible hint', () => {
    const clearGhostHintRef = { current: () => {} };
    const { model } = buildModel(['FROM logs', '']);
    const stubs = setupEditorStubs();

    const { result } = renderHook(() =>
      useGhostLineHint({
        editorRef: { current: stubs.editor },
        editorModel: { current: model },
        isReviewActiveRef: { current: null },
        isEnabled: true,
        clearGhostHintRef,
      })
    );

    act(() => {
      result.current.setupGhostLineHint(stubs.editor);
      stubs.fireCursorChange();
      jest.advanceTimersByTime(CURSOR_PAUSE_MS);
    });
    expect(stubs.editor.createDecorationsCollection).toHaveBeenCalledTimes(1);

    // The forward-ref now holds the real clear callback; calling it should
    // dismiss the visible decoration.
    act(() => {
      clearGhostHintRef.current();
    });

    expect(stubs.decorationsCollection.clear).toHaveBeenCalled();
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
