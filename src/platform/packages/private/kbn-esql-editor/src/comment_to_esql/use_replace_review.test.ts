/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, act } from '@testing-library/react';
import { useEuiTheme } from '@elastic/eui';
import type { monaco } from '@kbn/code-editor';
import { useReplaceReview } from './use_replace_review';
import { ReviewActionsWidget } from './review_actions_widget';

jest.mock('@kbn/code-editor', () => ({
  monaco: {
    Range: jest.fn().mockImplementation((sl: number, sc: number, el: number, ec: number) => ({
      startLineNumber: sl,
      startColumn: sc,
      endLineNumber: el,
      endColumn: ec,
      isEmpty: () => sl === el && sc === ec,
    })),
    KeyMod: { CtrlCmd: 2048, Shift: 1024 },
    KeyCode: { Backspace: 1 },
  },
}));

interface Decoration {
  range: { startLineNumber: number; endLineNumber: number };
  options: { className: string };
}

const buildEditor = () => {
  const clearDecorations = jest.fn();
  let lastDecorations: Decoration[] = [];
  let getRangeOverride: ((index: number) => unknown) | undefined;
  const createDecorationsCollection = jest.fn((decs: Decoration[]) => {
    lastDecorations = decs;
    return {
      clear: clearDecorations,
      getRange: (index: number) => getRangeOverride?.(index) ?? decs[index].range,
    };
  });
  const contentListeners: Array<() => void> = [];
  const onDidChangeModelContent = jest.fn((listener: () => void) => {
    contentListeners.push(listener);
    return { dispose: jest.fn() };
  });

  const contextKeySet = jest.fn();
  const createContextKey = jest.fn(() => ({ set: contextKeySet }));
  const actionDispose = jest.fn();
  const registeredActions = new Map<string, () => void>();
  const addAction = jest.fn(
    (params: { id: string; label: string; run: () => void; [k: string]: unknown }) => {
      registeredActions.set(params.id, params.run);
      return { dispose: actionDispose };
    }
  );
  const executeEdits = jest.fn();
  const focus = jest.fn();
  const revealLineInCenter = jest.fn();
  const editorDomNode = document.createElement('div');

  const editor = {
    changeViewZones: jest.fn((cb: (accessor: monaco.editor.IViewZoneChangeAccessor) => void) => {
      cb({ addZone: jest.fn(() => 'zone-id'), removeZone: jest.fn(), layoutZone: jest.fn() });
    }),
    addContentWidget: jest.fn(),
    removeContentWidget: jest.fn(),
    createDecorationsCollection,
    createContextKey,
    addAction,
    onDidChangeModelContent,
    executeEdits,
    focus,
    revealLineInCenter,
    getDomNode: () => editorDomNode,
  } as unknown as monaco.editor.IStandaloneCodeEditor;

  return {
    editor,
    getDecorations: () => lastDecorations,
    clearDecorations,
    contextKeySet,
    getAction: (id: string) => registeredActions.get(id),
    emitContentChange: () => contentListeners.forEach((listener) => listener()),
    setTrackedRange: (range: unknown) => {
      getRangeOverride = () => range;
    },
    executeEdits,
    focus,
    revealLineInCenter,
    editorDomNode,
  };
};

const MODEL_VALUE = 'FROM logs | LIMIT 10';

const buildModel = (lineMaxColumn = 10, lineCount = 100) =>
  ({
    getLineMaxColumn: jest.fn(() => lineMaxColumn),
    getLineCount: jest.fn(() => lineCount),
    getValue: jest.fn(() => MODEL_VALUE),
  } as unknown as monaco.editor.ITextModel);

const REVIEW_STATE = {
  firstChangedOriginalLine: 2,
  lastChangedOriginalLine: 3,
  generatedLineStart: 4,
  generatedLineEnd: 6,
};

describe('useReplaceReview', () => {
  const { result: euiResult } = renderHook(() => useEuiTheme());
  const euiTheme = euiResult.current.euiTheme;

  const makeParams = (overrides = {}) => {
    const editorRef = { current: undefined as monaco.editor.IStandaloneCodeEditor | undefined };
    const editorModel = { current: undefined as monaco.editor.ITextModel | undefined };
    return {
      editorRef,
      editorModel,
      euiTheme,
      contextKeyId: 'testContextKey',
      rejectAction: { id: 'test.reject', label: 'Reject' },
      editSourceId: 'test-edit',
      onAfterAccept: jest.fn(),
      onAfterReject: jest.fn(),
      ...overrides,
    };
  };

  describe('keyboard focus', () => {
    afterEach(() => {
      jest.restoreAllMocks();
      (document.activeElement as HTMLElement | null)?.blur();
    });

    it('moves keyboard focus to the review buttons instead of the editor caret', () => {
      const params = makeParams();
      const { editor, focus, revealLineInCenter } = buildEditor();
      params.editorRef.current = editor;
      params.editorModel.current = buildModel();
      const widgetFocus = jest.spyOn(ReviewActionsWidget.prototype, 'focus');

      const { result } = renderHook(() => useReplaceReview(params));

      act(() => result.current.showReview(REVIEW_STATE));

      expect(focus).not.toHaveBeenCalled();
      expect(revealLineInCenter).toHaveBeenCalledWith(REVIEW_STATE.generatedLineEnd);
      expect(widgetFocus).toHaveBeenCalled();
    });

    it('does not steal focus when the user moved it outside the editor', () => {
      const params = makeParams();
      const { editor, revealLineInCenter } = buildEditor();
      params.editorRef.current = editor;
      params.editorModel.current = buildModel();
      const widgetFocus = jest.spyOn(ReviewActionsWidget.prototype, 'focus');
      const outside = document.createElement('input');
      document.body.appendChild(outside);
      outside.focus();

      const { result } = renderHook(() => useReplaceReview(params));

      act(() => result.current.showReview(REVIEW_STATE));

      expect(widgetFocus).not.toHaveBeenCalled();
      expect(revealLineInCenter).not.toHaveBeenCalled();
      outside.remove();
    });
  });

  it('showReview tracks the original lines and the generated lines as one range each', () => {
    const params = makeParams();
    const { editor, getDecorations } = buildEditor();
    params.editorRef.current = editor;
    params.editorModel.current = buildModel();

    const { result } = renderHook(() => useReplaceReview(params));

    act(() => result.current.showReview(REVIEW_STATE));

    const decorations = getDecorations();
    // One range for the original lines (2–3) and one for the generated lines (4–6)
    expect(decorations).toHaveLength(2);
    expect(decorations[0]).toMatchObject({
      range: { startLineNumber: 2, endLineNumber: 3 },
      options: { className: 'esqlLineReplaced' },
    });
    expect(decorations[1]).toMatchObject({
      range: { startLineNumber: 4, endLineNumber: 6 },
      options: { className: 'esqlCodeAdded' },
    });
  });

  it('reject deletes the generated lines and calls onAfterReject', () => {
    const params = makeParams();
    const { editor, executeEdits } = buildEditor();
    params.editorRef.current = editor;
    params.editorModel.current = buildModel(20);

    const { result } = renderHook(() => useReplaceReview(params));

    act(() => result.current.showReview(REVIEW_STATE));
    act(() => result.current.reject());

    expect(executeEdits).toHaveBeenCalledWith('test-edit-reject', [
      expect.objectContaining({
        range: expect.objectContaining({
          startLineNumber: REVIEW_STATE.lastChangedOriginalLine,
          endLineNumber: REVIEW_STATE.generatedLineEnd,
        }),
        text: null,
      }),
    ]);
    expect(params.onAfterReject).toHaveBeenCalledWith(REVIEW_STATE);
  });

  it('reject deletes the generated lines where they are now, not where they were inserted', () => {
    const params = makeParams();
    const { editor, executeEdits, setTrackedRange } = buildEditor();
    params.editorRef.current = editor;
    params.editorModel.current = buildModel(20);

    const { result } = renderHook(() => useReplaceReview(params));

    act(() => result.current.showReview(REVIEW_STATE));
    // The user added a line above, so Monaco moved the generated lines down by one.
    setTrackedRange({ startLineNumber: 5, endLineNumber: 7, isEmpty: () => false });
    act(() => result.current.reject());

    expect(executeEdits).toHaveBeenCalledWith('test-edit-reject', [
      expect.objectContaining({
        range: expect.objectContaining({ startLineNumber: 4, endLineNumber: 7 }),
        text: null,
      }),
    ]);
  });

  it('reject leaves the text alone when the user already deleted the generated lines', () => {
    const params = makeParams();
    const { editor, executeEdits, setTrackedRange } = buildEditor();
    params.editorRef.current = editor;
    params.editorModel.current = buildModel(20);

    const { result } = renderHook(() => useReplaceReview(params));

    act(() => result.current.showReview(REVIEW_STATE));
    setTrackedRange({ startLineNumber: 4, endLineNumber: 4, isEmpty: () => true });
    act(() => result.current.reject());

    expect(executeEdits).not.toHaveBeenCalled();
    expect(params.onAfterReject).toHaveBeenCalledTimes(1);
  });

  it('accept after the user edited the query removes the suggestion instead of applying it', () => {
    const params = makeParams();
    const { editor, executeEdits, emitContentChange } = buildEditor();
    params.editorRef.current = editor;
    params.editorModel.current = buildModel(20);

    const { result } = renderHook(() => useReplaceReview(params));

    act(() => result.current.showReview(REVIEW_STATE));
    act(() => emitContentChange());
    let accepted = true;
    act(() => {
      accepted = result.current.accept();
    });

    expect(accepted).toBe(false);
    expect(executeEdits).toHaveBeenCalledTimes(1);
    expect(executeEdits).toHaveBeenCalledWith('test-edit-reject', expect.any(Array));
    expect(params.onAfterAccept).not.toHaveBeenCalled();
    expect(params.onAfterReject).not.toHaveBeenCalled();
  });

  it('dismiss removes the generated lines without calling any callback', () => {
    const params = makeParams();
    const { editor, executeEdits } = buildEditor();
    params.editorRef.current = editor;
    params.editorModel.current = buildModel(20);

    const { result } = renderHook(() => useReplaceReview(params));

    act(() => result.current.showReview(REVIEW_STATE));
    act(() => result.current.dismiss());

    expect(executeEdits).toHaveBeenCalledTimes(1);
    expect(params.onAfterReject).not.toHaveBeenCalled();
    expect(params.onAfterAccept).not.toHaveBeenCalled();
  });

  it('accept deletes the original lines and calls onAfterAccept with the accepted query', () => {
    const params = makeParams();
    const { editor, getAction, executeEdits } = buildEditor();
    params.editorRef.current = editor;
    params.editorModel.current = buildModel();

    const { result } = renderHook(() => useReplaceReview(params));

    act(() => result.current.showReview(REVIEW_STATE));
    act(() => {
      result.current.accept();
    });

    // Accepting is the editor's run action, so no dedicated keybinding is registered.
    expect(getAction('test.reject')).toBeDefined();
    expect(editor.addAction).toHaveBeenCalledTimes(1);
    expect(executeEdits).toHaveBeenCalledWith('test-edit-accept', [
      expect.objectContaining({
        range: expect.objectContaining({
          startLineNumber: REVIEW_STATE.firstChangedOriginalLine,
          endLineNumber: REVIEW_STATE.lastChangedOriginalLine + 1,
        }),
        text: null,
      }),
    ]);
    expect(params.onAfterAccept).toHaveBeenCalledWith(REVIEW_STATE, MODEL_VALUE);
  });

  it('accept removes the preceding newline when the replaced line is the last line', () => {
    const params = makeParams();
    const { editor, executeEdits } = buildEditor();
    params.editorRef.current = editor;
    params.editorModel.current = buildModel(10, REVIEW_STATE.lastChangedOriginalLine);

    const { result } = renderHook(() => useReplaceReview(params));

    act(() => result.current.showReview(REVIEW_STATE));
    act(() => {
      result.current.accept();
    });

    expect(executeEdits).toHaveBeenCalledWith('test-edit-accept', [
      expect.objectContaining({
        range: expect.objectContaining({
          startLineNumber: REVIEW_STATE.firstChangedOriginalLine - 1,
          endLineNumber: REVIEW_STATE.lastChangedOriginalLine,
        }),
        text: null,
      }),
    ]);
  });

  it('accept only keeps the generated lines when nothing is replaced', () => {
    const params = makeParams();
    const { editor, executeEdits } = buildEditor();
    params.editorRef.current = editor;
    params.editorModel.current = buildModel();

    const { result } = renderHook(() => useReplaceReview(params));
    const keepOnly = { ...REVIEW_STATE, firstChangedOriginalLine: 7, lastChangedOriginalLine: 6 };

    act(() => result.current.showReview(keepOnly));
    act(() => {
      expect(result.current.accept()).toBe(true);
    });

    expect(executeEdits).not.toHaveBeenCalled();
    expect(params.onAfterAccept).toHaveBeenCalledWith(keepOnly, MODEL_VALUE);
  });

  it('accept reports whether a review was pending', () => {
    const params = makeParams();
    const { editor, executeEdits } = buildEditor();
    params.editorRef.current = editor;
    params.editorModel.current = buildModel();

    const { result } = renderHook(() => useReplaceReview(params));

    let accepted: boolean | undefined;
    act(() => {
      accepted = result.current.accept();
    });
    expect(accepted).toBe(false);
    expect(executeEdits).not.toHaveBeenCalled();

    act(() => result.current.showReview(REVIEW_STATE));
    act(() => {
      accepted = result.current.accept();
    });
    expect(accepted).toBe(true);
    expect(params.onAfterAccept).toHaveBeenCalledTimes(1);

    act(() => {
      accepted = result.current.accept();
    });
    expect(accepted).toBe(false);
    expect(params.onAfterAccept).toHaveBeenCalledTimes(1);
  });

  it('cleanup clears the pending preview mark', () => {
    const previewPendingRef = { current: true };
    const params = makeParams({ previewPendingRef });
    const { editor } = buildEditor();
    params.editorRef.current = editor;
    params.editorModel.current = buildModel();

    const { result } = renderHook(() => useReplaceReview(params));

    act(() => result.current.showReview(REVIEW_STATE));
    act(() => result.current.cleanup());

    expect(previewPendingRef.current).toBe(false);
  });

  it('cleanup clears decorations and resets the context key', () => {
    const params = makeParams();
    const { editor, clearDecorations, contextKeySet } = buildEditor();
    params.editorRef.current = editor;
    params.editorModel.current = buildModel();

    const { result } = renderHook(() => useReplaceReview(params));

    act(() => result.current.showReview(REVIEW_STATE));
    act(() => result.current.cleanup());

    expect(clearDecorations).toHaveBeenCalled();
    expect(contextKeySet).toHaveBeenCalledWith(false);
  });

  it('reject does nothing when called before showReview', () => {
    const params = makeParams();
    const { editor, executeEdits } = buildEditor();
    params.editorRef.current = editor;
    params.editorModel.current = buildModel();

    const { result } = renderHook(() => useReplaceReview(params));

    act(() => result.current.reject());

    expect(executeEdits).not.toHaveBeenCalled();
    expect(params.onAfterReject).not.toHaveBeenCalled();
  });
});
