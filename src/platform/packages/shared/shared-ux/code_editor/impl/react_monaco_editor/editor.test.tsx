/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { monaco } from '@kbn/monaco';
import { render, waitFor } from '@testing-library/react';
import { MonacoEditor } from './editor';

const createEvent = (
  changes: monaco.editor.IModelContentChange[],
  eol = '\n'
): monaco.editor.IModelContentChangedEvent => ({
  changes,
  eol,
  versionId: 1,
  isUndoing: false,
  isRedoing: false,
  isFlush: false,
  isEolChange: false,
});

const createRange = (): monaco.IRange => ({
  startLineNumber: 1,
  startColumn: 1,
  endLineNumber: 1,
  endColumn: 1,
});

const createDisposable = (): monaco.IDisposable => ({ dispose: jest.fn() });

const setupMonacoEditorHarness = (params: {
  onDidChangeModelContent?: (cb: (e: monaco.editor.IModelContentChangedEvent) => void) => void;
  onPushUndoStop: jest.Mock;
  onCreateModel?: (model: monaco.editor.ITextModel) => void;
}) => {
  const disposable = createDisposable();

  const createSpy = jest.spyOn(monaco.editor, 'create').mockImplementation((container, options) => {
    if (!options?.model) {
      throw new Error('expected create() to be called with a model');
    }

    const model = options.model;
    params.onCreateModel?.(model);

    const editor = {
      onDidChangeModelContent: (cb: (e: monaco.editor.IModelContentChangedEvent) => void) => {
        params.onDidChangeModelContent?.(cb);
        return disposable;
      },
      getModel: () => model,
      pushUndoStop: params.onPushUndoStop,
      updateOptions: jest.fn(),
      layout: jest.fn(),
      dispose: jest.fn(),
      getDomNode: () => null,
    } as unknown as monaco.editor.IStandaloneCodeEditor;

    return editor;
  });

  const markersSpy = jest
    .spyOn(monaco.editor, 'onDidChangeMarkers')
    .mockImplementation(() => disposable);
  const getModelMarkersSpy = jest.spyOn(monaco.editor, 'getModelMarkers').mockReturnValue([]);

  const cleanup = () => {
    createSpy.mockRestore();
    markersSpy.mockRestore();
    getModelMarkersSpy.mockRestore();
  };

  return { cleanup };
};

describe('react monaco editor onChange performance', () => {
  let lastOnDidChangeModelContentCb:
    | ((e: monaco.editor.IModelContentChangedEvent) => void)
    | undefined;

  beforeEach(() => {
    lastOnDidChangeModelContentCb = undefined;
    jest.clearAllMocks();
  });

  it('does not normalize or push edits when a controlled rerender matches the shadow value', async () => {
    const originalCreateModel = monaco.editor.createModel.bind(monaco.editor);
    let pushEditOperationsSpy: jest.SpyInstance | undefined;
    const createModelSpy = jest
      .spyOn(monaco.editor, 'createModel')
      .mockImplementation((...args) => {
        const model = originalCreateModel(...args);
        pushEditOperationsSpy = jest.spyOn(model, 'pushEditOperations');
        return model;
      });

    const editorPushUndoStop = jest.fn();
    const { cleanup } = setupMonacoEditorHarness({
      onDidChangeModelContent: (cb) => {
        lastOnDidChangeModelContentCb = cb;
      },
      onPushUndoStop: editorPushUndoStop,
    });

    const onChange = jest.fn<void, [string, monaco.editor.IModelContentChangedEvent]>();
    const { rerender } = render(
      <MonacoEditor value="abcdefghij" onChange={onChange} options={{}} />
    );

    await waitFor(() => expect(typeof lastOnDidChangeModelContentCb).toBe('function'));

    const range = createRange();
    const event = createEvent([{ range, rangeOffset: 2, rangeLength: 2, text: 'XXXX' }]);
    lastOnDidChangeModelContentCb!(event);

    expect(onChange).toHaveBeenCalledWith('abXXXXefghij', event);

    const stringIncludesSpy = jest.spyOn(String.prototype, 'includes');
    try {
      rerender(<MonacoEditor value="abXXXXefghij" onChange={onChange} options={{}} />);

      expect(stringIncludesSpy).not.toHaveBeenCalledWith('\r');
      expect(pushEditOperationsSpy).toBeDefined();
      expect(pushEditOperationsSpy!).not.toHaveBeenCalled();
      expect(editorPushUndoStop).not.toHaveBeenCalled();
    } finally {
      stringIncludesSpy.mockRestore();
      createModelSpy.mockRestore();
      cleanup();
    }
  });

  describe('WHEN the Monaco model uses CRLF and the controlled value uses LF', () => {
    it('SHOULD apply Monaco change offsets to a CRLF-normalized shadow value', async () => {
      let createdModel: monaco.editor.ITextModel | undefined;

      const editorPushUndoStop = jest.fn();
      const { cleanup } = setupMonacoEditorHarness({
        onDidChangeModelContent: (cb) => {
          lastOnDidChangeModelContentCb = cb;
        },
        onPushUndoStop: editorPushUndoStop,
        onCreateModel: (model) => {
          createdModel = model;
        },
      });

      const onChange = jest.fn<void, [string, monaco.editor.IModelContentChangedEvent]>();
      const { rerender } = render(<MonacoEditor value="" onChange={onChange} options={{}} />);

      await waitFor(() => {
        expect(createdModel).toBeDefined();
        expect(typeof lastOnDidChangeModelContentCb).toBe('function');
      });

      createdModel!.setEOL(monaco.editor.EndOfLineSequence.CRLF);
      rerender(<MonacoEditor value={'A\nB'} onChange={onChange} options={{}} />);
      onChange.mockClear();

      const range = createRange();
      const event = createEvent(
        [{ range, rangeOffset: 3, rangeLength: 1, text: 'X' }],
        createdModel!.getEOL()
      );
      lastOnDidChangeModelContentCb!(event);

      expect(onChange).toHaveBeenCalledWith('A\r\nX', event);

      cleanup();
    });
  });

  describe('WHEN the Monaco model uses LF and the controlled value uses CRLF', () => {
    it('SHOULD apply Monaco change offsets to an LF-normalized shadow value', async () => {
      let createdModel: monaco.editor.ITextModel | undefined;

      const editorPushUndoStop = jest.fn();
      const { cleanup } = setupMonacoEditorHarness({
        onDidChangeModelContent: (cb) => {
          lastOnDidChangeModelContentCb = cb;
        },
        onPushUndoStop: editorPushUndoStop,
        onCreateModel: (model) => {
          createdModel = model;
        },
      });

      const onChange = jest.fn<void, [string, monaco.editor.IModelContentChangedEvent]>();
      const { rerender } = render(<MonacoEditor value="" onChange={onChange} options={{}} />);

      await waitFor(() => {
        expect(createdModel).toBeDefined();
        expect(typeof lastOnDidChangeModelContentCb).toBe('function');
      });

      createdModel!.setEOL(monaco.editor.EndOfLineSequence.LF);
      rerender(<MonacoEditor value={'A\r\nB'} onChange={onChange} options={{}} />);
      onChange.mockClear();

      const range = createRange();
      const event = createEvent(
        [{ range, rangeOffset: 2, rangeLength: 1, text: 'X' }],
        createdModel!.getEOL()
      );
      lastOnDidChangeModelContentCb!(event);

      expect(onChange).toHaveBeenCalledWith('A\nX', event);

      cleanup();
    });
  });
});
