/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { parseDocument } from 'yaml';
import type { monaco } from '@kbn/monaco';
import { useWorkflowIdDecorations } from './use_workflow_id_decorations';
import { createMockStore } from '../../../../entities/workflows/store/__mocks__/store.mock';

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

const renderWithStore = (
  editorInstance: monaco.editor.IStandaloneCodeEditor | null,
  yamlDoc: ReturnType<typeof parseDocument> | null,
  isEditorMounted: boolean
) => {
  const store = createMockStore();

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(Provider, { store }, children);

  return {
    ...renderHook(
      () =>
        useWorkflowIdDecorations({
          editor: editorInstance,
          yamlDocument: yamlDoc,
          isEditorMounted,
        }),
      { wrapper }
    ),
    store,
  };
};

describe('useWorkflowIdDecorations', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('does not create decorations when editor is null', () => {
    const yamlString = 'version: "1"\nname: test';
    const doc = parseDocument(yamlString, { keepSourceTokens: true });

    renderWithStore(null, doc, true);
    jest.advanceTimersByTime(200);

    // No errors, ref stays null
  });

  it('does not create decorations when yamlDocument is null', () => {
    const yamlString = 'version: "1"\nname: test';
    const { editor } = createMockEditor(yamlString);

    renderWithStore(editor, null, true);
    jest.advanceTimersByTime(200);

    expect(editor.createDecorationsCollection).not.toHaveBeenCalled();
  });

  it('does not create decorations when there are no workflow.execute steps', () => {
    const yamlString = [
      'version: "1"',
      'name: test',
      'steps:',
      '  - id: step-1',
      '    type: connector',
      '    with:',
      '      connector-id: abc',
    ].join('\n');
    const doc = parseDocument(yamlString, { keepSourceTokens: true });
    const { editor } = createMockEditor(yamlString);

    renderWithStore(editor, doc, true);
    jest.advanceTimersByTime(200);

    // No decorations created because no workflow.execute steps
    expect(editor.createDecorationsCollection).not.toHaveBeenCalled();
  });
});
