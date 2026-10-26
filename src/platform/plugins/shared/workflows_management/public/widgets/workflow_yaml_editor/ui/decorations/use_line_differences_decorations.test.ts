/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import type { monaco } from '@kbn/monaco';
import { useLineDifferencesDecorations } from './use_line_differences_decorations';

jest.mock('@kbn/monaco', () => {
  const actualMonaco = jest.requireActual('@kbn/monaco');
  return {
    ...actualMonaco,
    monaco: {
      ...actualMonaco.monaco,
      Range: jest.fn((startLine: number, startCol: number, endLine: number, endCol: number) => ({
        startLineNumber: startLine,
        startColumn: startCol,
        endLineNumber: endLine,
        endColumn: endCol,
      })),
    },
  };
});

const createMockEditor = () => {
  const decorationsCollection = {
    clear: jest.fn(),
    set: jest.fn(),
  };

  return {
    editor: {
      createDecorationsCollection: jest.fn(() => decorationsCollection),
      getModel: jest.fn(() => ({
        getLineMaxColumn: jest.fn((lineNum: number) => 80),
      })),
    } as unknown as monaco.editor.IStandaloneCodeEditor,
    decorationsCollection,
  };
};

describe('useLineDifferencesDecorations', () => {
  it('does not create decorations when highlightDiff is false', () => {
    const { editor } = createMockEditor();

    renderHook(() =>
      useLineDifferencesDecorations({
        editor,
        isEditorMounted: true,
        highlightDiff: false,
        originalValue: 'line1\nline2',
        currentValue: 'line1\nmodified',
      })
    );

    expect(editor.createDecorationsCollection).not.toHaveBeenCalled();
  });

  it('does not create decorations when editor is null', () => {
    renderHook(() =>
      useLineDifferencesDecorations({
        editor: null,
        isEditorMounted: true,
        highlightDiff: true,
        originalValue: 'line1',
        currentValue: 'line2',
      })
    );
    // No error thrown
  });

  it('creates decorations when lines differ', () => {
    const { editor } = createMockEditor();

    renderHook(() =>
      useLineDifferencesDecorations({
        editor,
        isEditorMounted: true,
        highlightDiff: true,
        originalValue: 'line1\nline2\nline3',
        currentValue: 'line1\nmodified\nline3',
      })
    );

    expect(editor.createDecorationsCollection).toHaveBeenCalledTimes(1);
    const decorations = (editor.createDecorationsCollection as jest.Mock).mock.calls[0][0];
    expect(decorations).toHaveLength(1); // Only line 2 changed
    expect(decorations[0].range.startLineNumber).toBe(2);
    expect(decorations[0].options.className).toBe('changed-line-highlight');
    expect(decorations[0].options.isWholeLine).toBe(true);
    expect(decorations[0].options.marginClassName).toBe('changed-line-margin');
  });

  it('creates decorations for multiple changed lines', () => {
    const { editor } = createMockEditor();

    renderHook(() =>
      useLineDifferencesDecorations({
        editor,
        isEditorMounted: true,
        highlightDiff: true,
        originalValue: 'aaa\nbbb\nccc',
        currentValue: 'xxx\nbbb\nyyy',
      })
    );

    expect(editor.createDecorationsCollection).toHaveBeenCalledTimes(1);
    const decorations = (editor.createDecorationsCollection as jest.Mock).mock.calls[0][0];
    expect(decorations).toHaveLength(2); // Lines 1 and 3 changed
  });

  it('does not create decorations when original and current are identical', () => {
    const { editor } = createMockEditor();

    renderHook(() =>
      useLineDifferencesDecorations({
        editor,
        isEditorMounted: true,
        highlightDiff: true,
        originalValue: 'same\ncontent',
        currentValue: 'same\ncontent',
      })
    );

    expect(editor.createDecorationsCollection).not.toHaveBeenCalled();
  });

  it('clears existing decorations when highlightDiff is toggled off', () => {
    const { editor, decorationsCollection } = createMockEditor();

    const { rerender } = renderHook(
      ({ highlightDiff }) =>
        useLineDifferencesDecorations({
          editor,
          isEditorMounted: true,
          highlightDiff,
          originalValue: 'a',
          currentValue: 'b',
        }),
      { initialProps: { highlightDiff: true } }
    );

    expect(editor.createDecorationsCollection).toHaveBeenCalled();

    rerender({ highlightDiff: false });

    expect(decorationsCollection.clear).toHaveBeenCalled();
  });

  it('handles when original has more lines than current', () => {
    const { editor } = createMockEditor();

    renderHook(() =>
      useLineDifferencesDecorations({
        editor,
        isEditorMounted: true,
        highlightDiff: true,
        originalValue: 'line1\nline2\nline3',
        currentValue: 'line1',
      })
    );

    expect(editor.createDecorationsCollection).toHaveBeenCalledTimes(1);
    const decorations = (editor.createDecorationsCollection as jest.Mock).mock.calls[0][0];
    // Lines 2 and 3 differ (missing in current)
    expect(decorations).toHaveLength(2);
  });
});
