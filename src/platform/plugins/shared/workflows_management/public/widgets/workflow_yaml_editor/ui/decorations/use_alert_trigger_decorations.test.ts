/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import { parseDocument } from 'yaml';
import type { monaco } from '@kbn/monaco';
import { useAlertTriggerDecorations } from './use_alert_trigger_decorations';

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

const createMockModel = (value: string) => {
  const lines = value.split('\n');
  return {
    getValue: jest.fn(() => value),
    getLineContent: jest.fn((lineNum: number) => lines[lineNum - 1] ?? ''),
    getLineMaxColumn: jest.fn((lineNum: number) => (lines[lineNum - 1]?.length ?? 0) + 1),
    getPositionAt: jest.fn((offset: number) => {
      let remaining = offset;
      for (let i = 0; i < lines.length; i++) {
        if (remaining <= lines[i].length) {
          return { lineNumber: i + 1, column: remaining + 1 };
        }
        remaining -= lines[i].length + 1;
      }
      return { lineNumber: lines.length, column: (lines[lines.length - 1]?.length ?? 0) + 1 };
    }),
  } as unknown as monaco.editor.ITextModel;
};

const createMockEditor = (value: string) => {
  const model = createMockModel(value);
  const decorationsCollection = {
    clear: jest.fn(),
    set: jest.fn(),
  };
  return {
    editor: {
      createDecorationsCollection: jest.fn(() => decorationsCollection),
      getModel: jest.fn(() => model),
    } as unknown as monaco.editor.IStandaloneCodeEditor,
    decorationsCollection,
  };
};

describe('useAlertTriggerDecorations', () => {
  it('does not create decorations when editor is null', () => {
    const yamlString = ['version: "1"', 'name: test', 'triggers:', '  - type: alert'].join('\n');
    const doc = parseDocument(yamlString, { keepSourceTokens: true });

    const { result } = renderHook(() =>
      useAlertTriggerDecorations({
        editor: null,
        yamlDocument: doc,
        isEditorMounted: true,
        readOnly: false,
      })
    );

    expect(result.current.decorationCollectionRef.current).toBeNull();
  });

  it('does not create decorations when readOnly is true', () => {
    const yamlString = ['version: "1"', 'name: test', 'triggers:', '  - type: alert'].join('\n');
    const doc = parseDocument(yamlString, { keepSourceTokens: true });
    const { editor } = createMockEditor(yamlString);

    renderHook(() =>
      useAlertTriggerDecorations({
        editor,
        yamlDocument: doc,
        isEditorMounted: true,
        readOnly: true,
      })
    );

    expect(editor.createDecorationsCollection).not.toHaveBeenCalled();
  });

  it('creates decorations when alert triggers exist in non-readOnly mode', () => {
    const yamlString = [
      'version: "1"',
      'name: test',
      'triggers:',
      '  - type: alert',
      'steps: []',
    ].join('\n');
    const doc = parseDocument(yamlString, { keepSourceTokens: true });
    const { editor } = createMockEditor(yamlString);

    renderHook(() =>
      useAlertTriggerDecorations({
        editor,
        yamlDocument: doc,
        isEditorMounted: true,
        readOnly: false,
      })
    );

    expect(editor.createDecorationsCollection).toHaveBeenCalledTimes(1);
    const decorations = (editor.createDecorationsCollection as jest.Mock).mock.calls[0][0];
    // Each alert trigger produces a glyph decoration and a line highlight decoration
    expect(decorations.length).toBe(2);
    expect(decorations[0].options.glyphMarginClassName).toBe('alert-trigger-glyph');
    expect(decorations[1].options.after.content).toContain('Run Workflow');
  });

  it('does not create decorations when there are no alert triggers', () => {
    const yamlString = [
      'version: "1"',
      'name: test',
      'triggers:',
      '  - type: manual',
      'steps: []',
    ].join('\n');
    const doc = parseDocument(yamlString, { keepSourceTokens: true });
    const { editor } = createMockEditor(yamlString);

    renderHook(() =>
      useAlertTriggerDecorations({
        editor,
        yamlDocument: doc,
        isEditorMounted: true,
        readOnly: false,
      })
    );

    expect(editor.createDecorationsCollection).not.toHaveBeenCalled();
  });

  it('clears existing decorations when prerequisites are no longer met', () => {
    const yamlString = ['version: "1"', 'name: test', 'triggers:', '  - type: alert'].join('\n');
    const doc = parseDocument(yamlString, { keepSourceTokens: true });
    const { editor, decorationsCollection } = createMockEditor(yamlString);

    const { rerender } = renderHook(
      ({ readOnly }) =>
        useAlertTriggerDecorations({
          editor,
          yamlDocument: doc,
          isEditorMounted: true,
          readOnly,
        }),
      { initialProps: { readOnly: false } }
    );

    // Decorations were created
    expect(editor.createDecorationsCollection).toHaveBeenCalled();

    // Now switch to readOnly
    rerender({ readOnly: true });

    // The clear function should have been called
    expect(decorationsCollection.clear).toHaveBeenCalled();
  });
});
