/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, act } from '@testing-library/react';
import type { monaco } from '@kbn/code-editor';
import type { HttpStart, NotificationsStart } from '@kbn/core/public';
import { useCommentToEsql } from './use_comment_to_esql';

jest.mock('@kbn/code-editor', () => ({
  ESQL_LANG_ID: 'esql',
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
    editor: { TrackedRangeStickiness: { NeverGrowsWhenTypingAtEdges: 1 } },
  },
}));

const COMMENT = '// show me the errors';
const GENERATED = 'FROM logs-*\n| WHERE level == "error"';

const buildModel = (initial: string) => {
  let value = initial;
  return {
    getValue: () => value,
    appendText: (text: string) => {
      value += text;
    },
    getLineContent: (line: number) => value.split('\n')[line - 1] ?? '',
    getLineMaxColumn: (line: number) => (value.split('\n')[line - 1]?.length ?? 0) + 1,
    getLineCount: () => value.split('\n').length,
    isDisposed: () => false,
  };
};

const buildEditor = (model: ReturnType<typeof buildModel>) => {
  const executeEdits = jest.fn((_source: string, edits: Array<{ text: string | null }>) => {
    model.appendText(edits[0]?.text ?? '');
  });

  const editor = {
    executeEdits,
    getPosition: () => ({ lineNumber: 1, column: 1 }),
    changeViewZones: jest.fn((cb: (accessor: monaco.editor.IViewZoneChangeAccessor) => void) => {
      cb({ addZone: jest.fn(() => 'zone-id'), removeZone: jest.fn(), layoutZone: jest.fn() });
    }),
    addContentWidget: jest.fn(),
    removeContentWidget: jest.fn(),
    createDecorationsCollection: jest.fn((decs: Array<{ range: unknown }>) => ({
      clear: jest.fn(),
      getRanges: () => decs.map(({ range }) => range),
      getRange: (index: number) => decs[index].range,
    })),
    createContextKey: jest.fn(() => ({ set: jest.fn() })),
    addAction: jest.fn(() => ({ dispose: jest.fn() })),
    onDidChangeModelContent: jest.fn(() => ({ dispose: jest.fn() })),
    focus: jest.fn(),
    revealLineInCenter: jest.fn(),
    getDomNode: () => document.createElement('div'),
  } as unknown as monaco.editor.IStandaloneCodeEditor;

  return { editor, executeEdits };
};

describe('useCommentToEsql', () => {
  const renderComment = () => {
    const model = buildModel(COMMENT);
    const { editor, executeEdits } = buildEditor(model);
    const post = jest.fn().mockResolvedValue({ content: GENERATED });
    const previewPendingRef = { current: false };
    const dismissReviewRef: { current: (() => void) | undefined } = { current: undefined };
    const dismissAllReviews = jest.fn(() => dismissReviewRef.current?.());
    const onSubmit = jest.fn();

    const rendered = renderHook(() =>
      useCommentToEsql({
        editorRef: { current: editor },
        editorModel: { current: model as unknown as monaco.editor.ITextModel },
        http: { post } as unknown as HttpStart,
        notifications: { toasts: { addDanger: jest.fn() } } as unknown as NotificationsStart,
        isEnabled: true,
        onSubmit,
        previewPendingRef,
        publishQuery: jest.fn(),
        dismissAllReviews,
      })
    );
    dismissReviewRef.current = () => rendered.result.current.dismissReview();

    return { ...rendered, post, previewPendingRef, dismissAllReviews, executeEdits, onSubmit };
  };

  it('inserts the generated code below the comment and shows the review', async () => {
    const { result, post, previewPendingRef, executeEdits } = renderComment();

    await act(async () => {
      await result.current.generateFromComment();
    });

    expect(post).toHaveBeenCalledTimes(1);
    expect(executeEdits).toHaveBeenCalledWith('nl-to-esql-preview', expect.any(Array));
    expect(previewPendingRef.current).toBe(true);
    expect(result.current.isReviewActiveRef.current).not.toBeNull();
  });

  it('keeps generating when the editor dismisses all reviews before the insertion', async () => {
    const { result, dismissAllReviews, executeEdits } = renderComment();

    await act(async () => {
      await result.current.generateFromComment();
    });

    // dismissAllReviews reaches this hook's own dismissReview. It must only remove a pending
    // review, not the comment anchor the generation still needs to find its line.
    expect(dismissAllReviews).toHaveBeenCalledTimes(1);
    expect(dismissAllReviews.mock.invocationCallOrder[0]).toBeLessThan(
      executeEdits.mock.invocationCallOrder[0]
    );
    expect(executeEdits).toHaveBeenCalledWith('nl-to-esql-preview', expect.any(Array));
  });

  it('accepting runs the query it kept', async () => {
    const { result, onSubmit } = renderComment();

    await act(async () => {
      await result.current.generateFromComment();
    });
    act(() => {
      expect(result.current.acceptReview()).toBe(true);
    });

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
