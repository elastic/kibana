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
import type { MutableRefObject } from 'react';
import { useVisorNlToEsql } from './use_visor_nl_to_esql';

const ORIGINAL = 'FROM logs-*';
const GENERATED = 'FROM metrics-*\n| LIMIT 100';
const PREVIEW = `${ORIGINAL}\n${GENERATED}`;

const buildModel = (initial: string) => {
  let value = initial;
  const model = {
    getValue: () => value,
    setValue: (next: string) => {
      value = next;
    },
    getLineContent: (line: number) => value.split('\n')[line - 1] ?? '',
    getLineMaxColumn: (line: number) => (value.split('\n')[line - 1]?.length ?? 0) + 1,
    getLineCount: () => value.split('\n').length,
  };
  return model;
};

const buildEditor = (model: ReturnType<typeof buildModel>) => {
  const contentListeners: Array<() => void> = [];
  let isBlockCollapsed = false;
  const executeEdits = jest.fn((source: string, edits: Array<{ text: string | null }>) => {
    if (source === 'nl-to-esql-visor') {
      model.setValue(`${model.getValue()}${edits[0]?.text ?? ''}`);
      return;
    }
    if (source.endsWith('-reject')) {
      model.setValue(model.getValue().split('\n')[0] ?? '');
      return;
    }
    if (source.endsWith('-accept')) {
      model.setValue('FROM metrics-*\n| LIMIT 50');
    }
  });

  const editor = {
    executeEdits,
    changeViewZones: jest.fn((cb: (accessor: monaco.editor.IViewZoneChangeAccessor) => void) => {
      cb({ addZone: jest.fn(() => 'zone-id'), removeZone: jest.fn(), layoutZone: jest.fn() });
    }),
    addContentWidget: jest.fn(),
    removeContentWidget: jest.fn(),
    createDecorationsCollection: jest.fn((decorations: Array<{ range: monaco.Range }>) => ({
      clear: jest.fn(),
      getRange: (index: number) =>
        isBlockCollapsed ? { isEmpty: (): boolean => true } : decorations[index].range,
    })),
    createContextKey: jest.fn(() => ({ set: jest.fn() })),
    addAction: jest.fn(() => ({ dispose: jest.fn() })),
    onDidChangeModelContent: jest.fn((listener: () => void) => {
      contentListeners.push(listener);
      return { dispose: jest.fn() };
    }),
    focus: jest.fn(),
    revealLineInCenter: jest.fn(),
    getDomNode: () => document.createElement('div'),
  } as unknown as monaco.editor.IStandaloneCodeEditor;

  return {
    editor,
    executeEdits,
    emitContentChange: () => contentListeners.forEach((listener) => listener()),
    collapseGeneratedBlock: () => {
      isBlockCollapsed = true;
    },
  };
};

describe('useVisorNlToEsql', () => {
  const renderVisor = (model: ReturnType<typeof buildModel>) => {
    const { editor, executeEdits, emitContentChange, collapseGeneratedBlock } = buildEditor(model);
    const editorRef = {
      current: editor,
    } as MutableRefObject<monaco.editor.IStandaloneCodeEditor | undefined>;
    const editorModel = {
      current: model as unknown as monaco.editor.ITextModel,
    };
    const onSubmit = jest.fn();
    const previewPendingRef = { current: false };

    const rendered = renderHook(() =>
      useVisorNlToEsql({
        editorRef,
        editorModel,
        onSubmit,
        previewPendingRef,
      })
    );

    return {
      ...rendered,
      onSubmit,
      previewPendingRef,
      executeEdits,
      emitContentChange,
      collapseGeneratedBlock,
      model,
    };
  };

  it('inserts the suggestion without submitting it', () => {
    const model = buildModel(ORIGINAL);
    const { result, onSubmit, previewPendingRef } = renderVisor(model);

    act(() => {
      result.current.showVisorReview(GENERATED, { onAccept: jest.fn() });
    });

    expect(previewPendingRef.current).toBe(true);
    expect(model.getValue()).toBe(PREVIEW);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits the editor text when an untouched preview is accepted', () => {
    const model = buildModel(ORIGINAL);
    const { result, onSubmit } = renderVisor(model);

    act(() => {
      result.current.showVisorReview(GENERATED, { onAccept: jest.fn() });
    });
    act(() => {
      expect(result.current.acceptReview()).toBe(true);
    });

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith('FROM metrics-*\n| LIMIT 50');
  });

  it('drops an edited suggestion and runs the user query', () => {
    const model = buildModel(ORIGINAL);
    const onReject = jest.fn();
    const { result, onSubmit, emitContentChange } = renderVisor(model);

    act(() => {
      result.current.showVisorReview(GENERATED, { onAccept: jest.fn(), onReject });
    });
    model.setValue(`FROM traces-*\n${GENERATED}`);
    emitContentChange();

    let accepted = true;
    act(() => {
      accepted = result.current.acceptReview();
    });

    expect(accepted).toBe(true);
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith('FROM traces-*');
    expect(onReject).not.toHaveBeenCalled();
    expect(model.getValue()).toBe('FROM traces-*');
  });

  it('runs a fully replaced buffer instead of restoring the suggestion', () => {
    const model = buildModel(ORIGINAL);
    const { result, onSubmit, executeEdits, emitContentChange, collapseGeneratedBlock } =
      renderVisor(model);

    act(() => {
      result.current.showVisorReview(GENERATED, { onAccept: jest.fn() });
    });
    model.setValue('FROM traces-*');
    collapseGeneratedBlock();
    emitContentChange();
    executeEdits.mockClear();

    let accepted = true;
    act(() => {
      accepted = result.current.acceptReview();
    });

    expect(accepted).toBe(true);
    expect(onSubmit).toHaveBeenCalledWith('FROM traces-*');
    expect(executeEdits).not.toHaveBeenCalled();
    expect(model.getValue()).toBe('FROM traces-*');
  });
});
