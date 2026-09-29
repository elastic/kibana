/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { renderHook } from '@testing-library/react';
import type { MutableRefObject } from 'react';
import { parseDocument } from 'yaml';
import type { monaco } from '@kbn/monaco';
import {
  applyTriggerTypeDecorations,
  useTriggerTypeDecorations,
} from './use_trigger_type_decorations';

vi.mock('@kbn/workflows', async () => {
      const mocked = {
      ...(await vi.importActual('@kbn/workflows')),
      isTriggerType: vi.fn((type: string) => ['alert', 'manual', 'scheduled'].includes(type)),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../../trigger_schemas', () => {
      const mocked = {
      triggerSchemas: {
        getTriggerDefinition: vi.fn(() => undefined),
        getRegisteredIds: vi.fn(() => []),
      },
    };
      return { ...mocked, default: mocked };
    });

const createMockModel = (value: string) => {
  const lines = value.split('\n');
  return {
    getValue: vi.fn(() => value),
    getLineContent: vi.fn((lineNum: number) => lines[lineNum - 1] ?? ''),
    getPositionAt: vi.fn((offset: number) => {
      let remaining = offset;
      for (let i = 0; i < lines.length; i++) {
        // +1 for newline character
        if (remaining <= lines[i].length) {
          return { lineNumber: i + 1, column: remaining + 1 };
        }
        remaining -= lines[i].length + 1;
      }
      return { lineNumber: lines.length, column: (lines[lines.length - 1]?.length ?? 0) + 1 };
    }),
    onDidChangeContent: vi.fn(() => ({ dispose: vi.fn() })),
  } as unknown as monaco.editor.ITextModel;
};

const createMockEditor = (value: string) => {
  const model = createMockModel(value);
  const decorationsCollection = {
    clear: vi.fn(),
    set: vi.fn(),
  };
  return {
    editor: {
      createDecorationsCollection: vi.fn(() => decorationsCollection),
      getModel: vi.fn(() => model),
    } as unknown as monaco.editor.IStandaloneCodeEditor,
    decorationsCollection,
    model,
  };
};

describe('applyTriggerTypeDecorations', () => {
  it('creates decorations when the document contains known trigger types', () => {
    const yamlString = [
      'version: "1"',
      'name: test',
      'triggers:',
      '  - type: alert',
      'steps: []',
    ].join('\n');

    const { editor } = createMockEditor(yamlString);
    const collectionRef: MutableRefObject<monaco.editor.IEditorDecorationsCollection | null> = {
      current: null,
    };
    const doc = parseDocument(yamlString, { keepSourceTokens: true });

    applyTriggerTypeDecorations(editor, collectionRef, doc);

    expect(editor.createDecorationsCollection).toHaveBeenCalledTimes(1);
    const decorations = (editor.createDecorationsCollection as Mock).mock.calls[0][0];
    expect(decorations.length).toBeGreaterThan(0);
    expect(decorations[0].options.inlineClassName).toContain('type-inline-highlight');
    expect(decorations[0].options.inlineClassName).toContain('type-alert');
  });

  it('clears existing decorations when document has no triggers', () => {
    const yamlString = ['version: "1"', 'name: test', 'steps: []'].join('\n');

    const { editor } = createMockEditor(yamlString);
    const mockCollection = { set: vi.fn(), clear: vi.fn() };
    const collectionRef: MutableRefObject<monaco.editor.IEditorDecorationsCollection | null> = {
      current: mockCollection as unknown as monaco.editor.IEditorDecorationsCollection,
    };
    const doc = parseDocument(yamlString, { keepSourceTokens: true });

    applyTriggerTypeDecorations(editor, collectionRef, doc);

    expect(mockCollection.set).toHaveBeenCalledWith([]);
  });

  it('sets decorations on existing collection when it already exists', () => {
    const yamlString = [
      'version: "1"',
      'name: test',
      'triggers:',
      '  - type: manual',
      'steps: []',
    ].join('\n');

    const { editor } = createMockEditor(yamlString);
    const mockCollection = { set: vi.fn(), clear: vi.fn() };
    const collectionRef: MutableRefObject<monaco.editor.IEditorDecorationsCollection | null> = {
      current: mockCollection as unknown as monaco.editor.IEditorDecorationsCollection,
    };
    const doc = parseDocument(yamlString, { keepSourceTokens: true });

    applyTriggerTypeDecorations(editor, collectionRef, doc);

    expect(mockCollection.set).toHaveBeenCalled();
    const decorations = mockCollection.set.mock.calls[0][0];
    expect(decorations.length).toBeGreaterThan(0);
  });

  it('does nothing when editor model is null', () => {
    const editor = {
      createDecorationsCollection: vi.fn(),
      getModel: vi.fn(() => null),
    } as unknown as monaco.editor.IStandaloneCodeEditor;

    const collectionRef: MutableRefObject<monaco.editor.IEditorDecorationsCollection | null> = {
      current: null,
    };

    applyTriggerTypeDecorations(editor, collectionRef);

    expect(editor.createDecorationsCollection).not.toHaveBeenCalled();
  });
});

describe('useTriggerTypeDecorations', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not apply decorations when editor is null', () => {
    const yamlString = 'version: "1"\nname: test\ntriggers:\n  - type: alert';
    const doc = parseDocument(yamlString, { keepSourceTokens: true });

    renderHook(() =>
      useTriggerTypeDecorations({
        editor: null,
        yamlDocument: doc,
        isEditorMounted: true,
      })
    );

    vi.advanceTimersByTime(200);
    // No error thrown, ref stays null
  });

  it('applies decorations when all prerequisites are met', () => {
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
      useTriggerTypeDecorations({
        editor,
        yamlDocument: doc,
        isEditorMounted: true,
      })
    );

    // Advance past the 100ms initial setTimeout
    vi.advanceTimersByTime(150);

    expect(editor.createDecorationsCollection).toHaveBeenCalled();
  });
});
