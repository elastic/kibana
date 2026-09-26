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

jest.mock('@kbn/code-editor', () => ({
  monaco: {
    Range: jest.fn().mockImplementation((sl: number, sc: number, el: number, ec: number) => ({
      startLineNumber: sl,
      startColumn: sc,
      endLineNumber: el,
      endColumn: ec,
    })),
    KeyMod: { CtrlCmd: 2048, Shift: 1024 },
    KeyCode: { Backspace: 1, Enter: 3 },
  },
}));

interface Decoration {
  options: { className: string };
}

const buildEditor = () => {
  const clearDecorations = jest.fn();
  let lastDecorations: Decoration[] = [];
  const createDecorationsCollection = jest.fn((decs: Decoration[]) => {
    lastDecorations = decs;
    return { clear: clearDecorations };
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

  const editor = {
    changeViewZones: jest.fn((cb: (accessor: monaco.editor.IViewZoneChangeAccessor) => void) => {
      cb({ addZone: jest.fn(() => 'zone-id'), removeZone: jest.fn(), layoutZone: jest.fn() });
    }),
    addContentWidget: jest.fn(),
    removeContentWidget: jest.fn(),
    createDecorationsCollection,
    createContextKey,
    addAction,
    executeEdits,
  } as unknown as monaco.editor.IStandaloneCodeEditor;

  return {
    editor,
    getDecorations: () => lastDecorations,
    clearDecorations,
    contextKeySet,
    getAction: (id: string) => registeredActions.get(id),
    executeEdits,
  };
};

const buildModel = (lineMaxColumn = 10) =>
  ({ getLineMaxColumn: jest.fn(() => lineMaxColumn) } as unknown as monaco.editor.ITextModel);

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
      acceptAction: { id: 'test.accept', label: 'Accept' },
      rejectAction: { id: 'test.reject', label: 'Reject' },
      editSourceId: 'test-edit',
      onAfterAccept: jest.fn(),
      onAfterReject: jest.fn(),
      ...overrides,
    };
  };

  it('showReview creates one decoration per original line and one per generated line', () => {
    const params = makeParams();
    const { editor, getDecorations } = buildEditor();
    params.editorRef.current = editor;
    params.editorModel.current = buildModel();

    const { result } = renderHook(() => useReplaceReview(params));

    act(() => result.current.showReview(REVIEW_STATE));

    const decorations = getDecorations();
    // 2 original lines (2–3) + 3 generated lines (4–6) = 5
    expect(decorations).toHaveLength(5);
    expect(decorations.filter((d) => d.options.className === 'esqlLineReplaced')).toHaveLength(2);
    expect(decorations.filter((d) => d.options.className === 'esqlCodeAdded')).toHaveLength(3);
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

  it('accept deletes the original lines and calls onAfterAccept', () => {
    const params = makeParams();
    const { editor, getAction, executeEdits } = buildEditor();
    params.editorRef.current = editor;
    params.editorModel.current = buildModel();

    const { result } = renderHook(() => useReplaceReview(params));

    act(() => result.current.showReview(REVIEW_STATE));

    const acceptRun = getAction('test.accept');
    if (acceptRun === undefined) throw new Error('accept action not registered');
    act(() => acceptRun());

    expect(executeEdits).toHaveBeenCalledWith('test-edit-accept', [
      expect.objectContaining({
        range: expect.objectContaining({
          startLineNumber: REVIEW_STATE.firstChangedOriginalLine,
          endLineNumber: REVIEW_STATE.lastChangedOriginalLine + 1,
        }),
        text: null,
      }),
    ]);
    expect(params.onAfterAccept).toHaveBeenCalledWith(REVIEW_STATE);
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
