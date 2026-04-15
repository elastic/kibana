/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { ComponentProps } from 'react';
import {
  CODE_EDITOR_DEFAULT_THEME_ID,
  CODE_EDITOR_TRANSPARENT_THEME_ID,
  monaco,
} from '@kbn/monaco';
import { render, screen, waitFor } from '@testing-library/react';
import { MonacoEditor, OVERFLOW_WIDGETS_TEST_ID } from './editor';
import * as supportedLanguages from './languages/supported';

const defaultProps: Partial<ComponentProps<typeof MonacoEditor>> = {
  options: {},
  editorDidMount: jest.fn(),
  editorWillMount: jest.fn(),
  editorWillUnmount: jest.fn(),
};

const createEvent = (
  changes: monaco.editor.IModelContentChange[]
): monaco.editor.IModelContentChangedEvent => ({
  changes,
  eol: '\n',
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

describe('react monaco editor', () => {
  let cleanupMonaco: (() => void) | undefined;

  beforeEach(() => {
    const { cleanup } = setupMonacoEditorHarness({
      onPushUndoStop: jest.fn(),
    });
    cleanupMonaco = cleanup;
  });

  afterEach(() => {
    cleanupMonaco?.();
    cleanupMonaco = undefined;
  });

  beforeAll(() => {
    jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      (contextId, options) =>
        ({
          webkitBackingStorePixelRatio: 1,
        } as unknown as RenderingContext)
    );
  });

  afterAll(() => {
    jest.resetAllMocks();
  });

  it('registers all supported languages', () => {
    render(<MonacoEditor {...defaultProps} />);

    const configuredLanguages = window.MonacoEnvironment?.monaco.languages.getLanguages();

    Object.values(supportedLanguages).forEach((v) => {
      expect(configuredLanguages?.some((l) => l?.id === v)).toBe(true);
    });
  });

  it('registers the default theme', () => {
    const defineThemeSpy = jest.spyOn(window.MonacoEnvironment?.monaco.editor!, 'defineTheme');

    render(<MonacoEditor {...defaultProps} />);

    return waitFor(() => {
      expect(defineThemeSpy).toHaveBeenCalled();
      expect(defineThemeSpy).toHaveBeenCalledWith(CODE_EDITOR_DEFAULT_THEME_ID, expect.any(Object));
      expect(defineThemeSpy).toHaveBeenCalledWith(
        CODE_EDITOR_TRANSPARENT_THEME_ID,
        expect.any(Object)
      );
    });
  });

  it('renders the overflow widgets into a portal', async () => {
    render(<MonacoEditor {...defaultProps} />);

    expect(await screen.findByTestId(OVERFLOW_WIDGETS_TEST_ID)).toBeDefined();
  });

  it('uses defaultValue when value is undefined (uncontrolled mode)', async () => {
    const originalCreateModel = monaco.editor.createModel.bind(monaco.editor);
    let firstArg: unknown;
    const createModelSpy = jest
      .spyOn(monaco.editor, 'createModel')
      .mockImplementation((...args) => {
        firstArg = args[0];
        return originalCreateModel(...args);
      });

    render(<MonacoEditor {...defaultProps} value={undefined} defaultValue="fallback" />);

    await screen.findByTestId(OVERFLOW_WIDGETS_TEST_ID);
    expect(firstArg).toBe('fallback');

    createModelSpy.mockRestore();
  });
});

describe('react monaco editor onChange performance', () => {
  let lastOnDidChangeModelContentCb:
    | ((e: monaco.editor.IModelContentChangedEvent) => void)
    | undefined;

  beforeEach(() => {
    lastOnDidChangeModelContentCb = undefined;
    jest.clearAllMocks();
  });

  it('computes the next value from event.changes (including multiple changes)', async () => {
    const editorPushUndoStop = jest.fn();

    let createdModel: monaco.editor.ITextModel | undefined;
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

    render(
      <MonacoEditor value={null} defaultValue="abcdefghij" onChange={onChange} options={{}} />
    );

    await screen.findByTestId(OVERFLOW_WIDGETS_TEST_ID);
    expect(typeof lastOnDidChangeModelContentCb).toBe('function');

    // Two changes, deliberately provided out of order (ascending offsets) to ensure
    // the implementation sorts descending to avoid offset shifting.
    const range = createRange();
    const event = createEvent([
      { range, rangeOffset: 2, rangeLength: 2, text: 'XXXX' },
      { range, rangeOffset: 7, rangeLength: 1, text: 'Y' },
    ]);
    lastOnDidChangeModelContentCb!(event);

    expect(onChange).toHaveBeenCalledWith('abXXXXefgYij', event);
    expect(createdModel).toBeDefined();

    cleanup();
  });

  it('does not pushEditOperations for controlled rerenders when value matches last known value', async () => {
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

    await screen.findByTestId(OVERFLOW_WIDGETS_TEST_ID);
    expect(typeof lastOnDidChangeModelContentCb).toBe('function');

    const range = createRange();
    const event = createEvent([{ range, rangeOffset: 2, rangeLength: 2, text: 'XXXX' }]);
    lastOnDidChangeModelContentCb!(event);

    expect(onChange).toHaveBeenCalledWith('abXXXXefghij', event);

    rerender(<MonacoEditor value="abXXXXefghij" onChange={onChange} options={{}} />);

    expect(pushEditOperationsSpy).toBeDefined();
    expect(pushEditOperationsSpy!).not.toHaveBeenCalled();
    expect(editorPushUndoStop).not.toHaveBeenCalled();

    createModelSpy.mockRestore();
    cleanup();
  });

  it('pushes a full replace when controlled value changes externally', async () => {
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
      onPushUndoStop: editorPushUndoStop,
    });

    const onChange = jest.fn<void, [string, monaco.editor.IModelContentChangedEvent]>();
    const { rerender } = render(<MonacoEditor value="initial" onChange={onChange} options={{}} />);

    await screen.findByTestId(OVERFLOW_WIDGETS_TEST_ID);
    rerender(<MonacoEditor value="external update" onChange={onChange} options={{}} />);

    expect(pushEditOperationsSpy).toBeDefined();
    expect(pushEditOperationsSpy!).toHaveBeenCalledTimes(1);
    expect(editorPushUndoStop).toHaveBeenCalledTimes(2);

    createModelSpy.mockRestore();
    cleanup();
  });
});
