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
  initializeRegisteredLanguagesTheme,
  monaco,
} from '@kbn/monaco';
import type { KbnCodeEditorChromeOverrides } from './utils/chrome_overrides';
import { render, screen, waitFor } from '@testing-library/react';
import { MonacoEditor, OVERFLOW_WIDGETS_TEST_ID, getCodeEditorScope } from './editor';
import * as supportedLanguages from './languages/supported';

const defaultProps: Partial<ComponentProps<typeof MonacoEditor>> = {
  options: {},
  editorDidMount: jest.fn(),
  editorWillMount: jest.fn(),
  editorWillUnmount: jest.fn(),
};

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
  // provide an unknown reason for our mock changes for testing purposes
  detailedReasonsChangeLengths: changes.map(() => monaco.editor.CursorChangeReason.NotSet),
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

  it('registers the Kibana theme on first mount, and not again for the same palette', async () => {
    // Registration is skipped while Monaco already holds the theme for the current palette, and
    // earlier mounts in this file registered it — start from a clean slate so the first mount
    // below is observable.
    initializeRegisteredLanguagesTheme.reset();
    const defineThemeSpy = jest.spyOn(window.MonacoEnvironment?.monaco.editor!, 'defineTheme');

    render(<MonacoEditor {...defaultProps} />);

    await waitFor(() => {
      expect(defineThemeSpy).toHaveBeenCalledWith(CODE_EDITOR_DEFAULT_THEME_ID, expect.any(Object));
    });
    // The one theme: chrome that differs per editor is applied per instance, not as another theme.
    expect(defineThemeSpy).toHaveBeenCalledTimes(1);
    const callsAfterFirstMount = defineThemeSpy.mock.calls.length;

    // Every further editor on the page sees the same palette: no re-registration, which is what
    // keeps Monaco from regenerating its stylesheet and re-tokenising every model per mount.
    render(<MonacoEditor {...defaultProps} />);

    expect(defineThemeSpy).toHaveBeenCalledTimes(callsAfterFirstMount);
    defineThemeSpy.mockRestore();
  });

  it('renders the overflow widgets into a portal', async () => {
    render(<MonacoEditor {...defaultProps} />);

    expect(await screen.findByTestId(OVERFLOW_WIDGETS_TEST_ID)).toBeDefined();
  });

  describe('editorInstanceId', () => {
    it('yields a scope whose selectors reach exactly this instance, inline and portaled', async () => {
      const { container: mine } = render(
        <MonacoEditor {...defaultProps} editorInstanceId="editor-a" />
      );
      render(<MonacoEditor {...defaultProps} editorInstanceId="editor-b" />);
      await screen.findAllByTestId(OVERFLOW_WIDGETS_TEST_ID);

      const scope = getCodeEditorScope('editor-a');

      const editors = document.querySelectorAll(scope.editor);
      expect(editors).toHaveLength(1);
      expect(editors[0]).toBe(mine.querySelector('.react-monaco-editor-container'));

      const overflow = document.querySelectorAll(scope.overflowWidgets);
      expect(overflow).toHaveLength(1);
      expect(overflow[0].getAttribute('data-test-subj')).toBe(OVERFLOW_WIDGETS_TEST_ID);
      expect(overflow[0]).not.toBe(editors[0]);
    });
  });

  describe('chromeOverrides', () => {
    const transparent: KbnCodeEditorChromeOverrides = () => ({
      'editor.background': 'transparent',
    });
    const property = (el: HTMLElement) => el.style.getPropertyValue('--vscode-editor-background');

    it('applies the overrides to the overflow widgets container, and only for this editor', async () => {
      render(<MonacoEditor {...defaultProps} chromeOverrides={transparent} />);
      render(<MonacoEditor {...defaultProps} />);

      const [mine, theirs] = await screen.findAllByTestId(OVERFLOW_WIDGETS_TEST_ID);

      await waitFor(() => expect(property(mine)).toBe('transparent'));
      expect(property(theirs)).toBe('');
    });

    it('removes its properties when the overrides go away', async () => {
      const { rerender } = render(<MonacoEditor {...defaultProps} chromeOverrides={transparent} />);
      const container = await screen.findByTestId(OVERFLOW_WIDGETS_TEST_ID);
      await waitFor(() => expect(property(container)).toBe('transparent'));

      rerender(<MonacoEditor {...defaultProps} />);

      await waitFor(() => expect(property(container)).toBe(''));
    });
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

    await screen.findByTestId(OVERFLOW_WIDGETS_TEST_ID);
    expect(typeof lastOnDidChangeModelContentCb).toBe('function');

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

      await screen.findByTestId(OVERFLOW_WIDGETS_TEST_ID);
      expect(createdModel).toBeDefined();
      expect(typeof lastOnDidChangeModelContentCb).toBe('function');

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

      await screen.findByTestId(OVERFLOW_WIDGETS_TEST_ID);
      expect(createdModel).toBeDefined();
      expect(typeof lastOnDidChangeModelContentCb).toBe('function');

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
