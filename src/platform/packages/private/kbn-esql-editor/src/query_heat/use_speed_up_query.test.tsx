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
import { useSpeedUpQuery } from './use_speed_up_query';
import type { EditorCommandHeat } from './query_heat';

const mockShowReview = jest.fn();
const mockRejectReview = jest.fn();

jest.mock('@kbn/code-editor', () => ({
  monaco: {
    Range: jest.fn().mockImplementation((sl: number, sc: number, el: number, ec: number) => ({
      startLineNumber: sl,
      startColumn: sc,
      endLineNumber: el,
      endColumn: ec,
    })),
  },
}));

jest.mock('../comment_to_esql/use_replace_review', () => ({
  useReplaceReview: () => ({
    showReview: mockShowReview,
    reject: mockRejectReview,
    accept: jest.fn(),
    cleanup: jest.fn(),
  }),
}));

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  useEuiTheme: () => ({ euiTheme: {} }),
}));

const query = 'FROM logs\n| STATS c = COUNT(*) BY a, b\n| STATS t = SUM(c) BY a';
/** Where a piece of the query is, so the fixture never depends on counting characters by hand. */
const span = (piece: string) => ({
  start: query.indexOf(piece),
  end: query.indexOf(piece) + piece.length,
});
const heat: EditorCommandHeat = {
  query,
  profileContext: 'The query took 100 ms',
  commands: [
    { ...span('FROM logs'), share: 0.2, isApproximate: false, operators: [] },
    { ...span('STATS c = COUNT(*) BY a, b'), share: 0.5, isApproximate: true, operators: [] },
    { ...span('STATS t = SUM(c) BY a'), share: 0.3, isApproximate: true, operators: [] },
  ],
};

const build = (initialText: string) => {
  let text = initialText;
  const model = {
    getValue: () => text,
    getPositionAt: (offset: number) => {
      const lines = text.slice(0, offset).split('\n');
      return { lineNumber: lines.length, column: lines[lines.length - 1].length + 1 };
    },
    getLineMaxColumn: (line: number) => text.split('\n')[line - 1].length + 1,
  };
  const generating = { clear: jest.fn() };
  const editor = {
    createDecorationsCollection: jest.fn(() => generating),
    executeEdits: jest.fn(),
  };
  const http = { post: jest.fn() };
  const toasts = { addInfo: jest.fn(), addDanger: jest.fn() };

  const hook = renderHook(
    (props: { heat?: EditorCommandHeat; isEnabled: boolean }) =>
      useSpeedUpQuery({
        editorRef: { current: editor as unknown as monaco.editor.IStandaloneCodeEditor },
        editorModel: { current: model as unknown as monaco.editor.ITextModel },
        http: http as never,
        notifications: { toasts } as never,
        heat: props.heat,
        isEnabled: props.isEnabled,
        onSubmit: jest.fn(),
      }),
    { initialProps: { heat, isEnabled: true } as { heat?: EditorCommandHeat; isEnabled: boolean } }
  );

  return {
    ...hook,
    editor,
    http,
    toasts,
    generating,
    setText: (next: string) => {
      text = next;
    },
  };
};

describe('useSpeedUpQuery', () => {
  beforeEach(() => jest.clearAllMocks());

  it('asks the AI about the command, then puts the changed lines under the original for review', async () => {
    const { result, http, editor, toasts, generating } = build(query);
    http.post.mockResolvedValue({
      query: 'FROM logs\n| STATS t = COUNT(*) BY a',
      reason: 'One aggregation is enough.',
    });

    await act(async () => {
      await result.current.speedUp?.(2);
    });

    const [route, { body }] = http.post.mock.calls[0];
    expect(route).toBe('/internal/esql/optimize_query');
    expect(JSON.parse(body)).toEqual({
      queryString: query,
      profileContext: 'The query took 100 ms',
      focusCommand: 'STATS t = SUM(c) BY a',
    });
    expect(editor.executeEdits).toHaveBeenCalledWith(
      'esql-speed-up',
      expect.arrayContaining([expect.objectContaining({ text: '\n| STATS t = COUNT(*) BY a' })])
    );
    expect(mockShowReview).toHaveBeenCalledWith({
      firstChangedOriginalLine: 2,
      lastChangedOriginalLine: 3,
      generatedLineStart: 4,
      generatedLineEnd: 4,
    });
    expect(toasts.addInfo).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'One aggregation is enough.' })
    );
    expect(generating.clear).toHaveBeenCalled();
  });

  it('says so, and leaves the query alone, when there is no safe improvement', async () => {
    const { result, http, editor, toasts } = build(query);
    http.post.mockResolvedValue({ query: null, reason: 'Already efficient.' });

    await act(async () => {
      await result.current.speedUp?.(1);
    });

    expect(toasts.addInfo).toHaveBeenCalledWith({
      title: 'No safe improvement found',
      text: 'Already efficient.',
    });
    expect(editor.executeEdits).not.toHaveBeenCalled();
    expect(mockShowReview).not.toHaveBeenCalled();
  });

  it('drops an answer that arrives after the query was edited', async () => {
    const { result, http, editor, toasts, setText } = build(query);
    http.post.mockImplementation(async () => {
      setText(`${query}\n| LIMIT 5`);
      return { query: 'FROM logs', reason: 'Fewer steps.' };
    });

    await act(async () => {
      await result.current.speedUp?.(1);
    });

    expect(editor.executeEdits).not.toHaveBeenCalled();
    expect(toasts.addInfo).not.toHaveBeenCalled();
  });

  it('reports a failure of the AI', async () => {
    const { result, http, toasts } = build(query);
    http.post.mockRejectedValue({ body: { message: 'No AI connector available.' } });

    await act(async () => {
      await result.current.speedUp?.(1);
    });

    expect(toasts.addDanger).toHaveBeenCalledWith({ title: 'No AI connector available.' });
  });

  it('is not offered without a profile to base it on, or when the AI is off', () => {
    const noContext = build(query);
    noContext.rerender({ heat: { ...heat, profileContext: undefined }, isEnabled: true });
    expect(noContext.result.current.speedUp).toBeUndefined();

    const disabled = build(query);
    disabled.rerender({ heat, isEnabled: false });
    expect(disabled.result.current.speedUp).toBeUndefined();

    const noHeat = build(query);
    noHeat.rerender({ heat: undefined, isEnabled: true });
    expect(noHeat.result.current.speedUp).toBeUndefined();
  });

  it('does nothing for a command that does not exist in the text now', async () => {
    const { result, http } = build('FROM other');

    await act(async () => {
      await result.current.speedUp?.(1);
    });

    expect(http.post).not.toHaveBeenCalled();
  });
});
