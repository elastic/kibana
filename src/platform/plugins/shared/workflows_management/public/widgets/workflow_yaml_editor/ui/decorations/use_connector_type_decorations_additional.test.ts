/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import { vi } from 'vitest';

import { parseDocument } from 'yaml';
import type { monaco } from '@kbn/monaco';
import { useConnectorTypeDecorations } from './use_connector_type_decorations';
import { createMockMonacoEditor } from '../../../../shared/test_utils/mock_monaco';

const mockBuiltInStepTypes = new Set(['foreach', 'if']);
const mockConnectorsMap = new Map<string, { stability?: string }>([
  ['elasticsearch.search', { stability: 'stable' }],
  ['tech_preview_connector', { stability: 'tech_preview' }],
  ['kibana.createCase', { stability: 'stable' }],
]);

vi.mock('@kbn/workflows', async () => {
  const mocked = {
    ...(await vi.importActual('@kbn/workflows')),
    isBuiltInStepType: (type: string) => mockBuiltInStepTypes.has(type),
    getBuiltInStepStability: (type: string) => {
      if (type === 'if') return 'tech_preview';
      return undefined;
    },
    resolveKibanaStepTypeAlias: (type: string) =>
      type === 'kibana.createCaseDefaultSpace' ? 'kibana.createCase' : type,
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../../../common/step_schemas', () => {
  const mocked = {
    stepSchemas: {
      getStepDefinition: vi.fn(() => undefined),
    },
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../../../common/schema', () => {
  const mocked = {
    getCachedAllConnectorsMap: () => mockConnectorsMap,
  };
  return { ...mocked, default: mocked };
});

vi.mock('@kbn/workflows-ui', () => {
  const mocked = {
    getBaseConnectorType: (type: string) => {
      if (type.startsWith('elasticsearch.')) return 'elasticsearch';
      if (type.startsWith('kibana.')) return 'kibana';
      const normalized = type.startsWith('.') ? type.slice(1) : type;
      return normalized.includes('.') ? normalized.split('.')[0] : normalized;
    },
  };
  return { ...mocked, default: mocked };
});

/**
 * The mock cannot reuse the factory one as jest.mock is hoisted to the top of the file before imports are resolved,
 * so mockMonacoModule is undefined when the jest.mock callback runs.
 * The mockMonacoModule uses jest.requireActual inside, so it needs to be called lazily.
 * The mock need to be inlined to work here.
 */
vi.mock('@kbn/monaco', async () => {
  const mocked = {
    ...(await vi.importActual('@kbn/monaco')),
    monaco: {
      ...(await vi.importActual<typeof import('@kbn/monaco')>('@kbn/monaco')).monaco,
      Range: vi.fn((startLine: number, startCol: number, endLine: number, endCol: number) => ({
        startLineNumber: startLine,
        startColumn: startCol,
        endLineNumber: endLine,
        endColumn: endCol,
      })),
    },
  };
  return { ...mocked, default: mocked };
});

vi.useFakeTimers();

describe('useConnectorTypeDecorations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('returns a ref with null when editor is not mounted', () => {
    const yamlString = ['version: "1"', 'steps:', '  - type: elasticsearch.search'].join('\n');
    const doc = parseDocument(yamlString, { keepSourceTokens: true });

    const { result } = renderHook(() =>
      useConnectorTypeDecorations({
        editor: null,
        yamlDocument: doc,
        isEditorMounted: false,
      })
    );

    vi.advanceTimersByTime(200);

    expect(result.current.decorationCollectionRef.current).toBeNull();
  });

  it('returns a ref with null when yamlDocument is null', () => {
    const { editor } = createMockMonacoEditor('');

    const { result } = renderHook(() =>
      useConnectorTypeDecorations({
        editor,
        yamlDocument: null,
        isEditorMounted: true,
      })
    );

    vi.advanceTimersByTime(200);

    expect(result.current.decorationCollectionRef.current).toBeNull();
  });

  it('returns a ref with null when the model is null', () => {
    const mockEditor = {
      createDecorationsCollection: vi.fn(),
      getModel: vi.fn(() => null),
    } as unknown as monaco.editor.IStandaloneCodeEditor;

    const yamlString = ['version: "1"', 'steps:', '  - type: elasticsearch.search'].join('\n');
    const doc = parseDocument(yamlString, { keepSourceTokens: true });

    const { result } = renderHook(() =>
      useConnectorTypeDecorations({
        editor: mockEditor,
        yamlDocument: doc,
        isEditorMounted: true,
      })
    );

    vi.advanceTimersByTime(200);

    expect(result.current.decorationCollectionRef.current).toBeNull();
  });

  it('creates decorations for known connector types', () => {
    const yamlString = [
      'version: "1"',
      'name: test',
      'steps:',
      '  - name: search_step',
      '    type: elasticsearch.search',
      '    with:',
      '      index: my-index',
    ].join('\n');

    const doc = parseDocument(yamlString, { keepSourceTokens: true });
    const { editor } = createMockMonacoEditor(yamlString);

    renderHook(() =>
      useConnectorTypeDecorations({
        editor,
        yamlDocument: doc,
        isEditorMounted: true,
      })
    );

    vi.advanceTimersByTime(200);

    expect(editor.createDecorationsCollection).toHaveBeenCalled();
  });

  it('creates decorations for deprecated aliases when their canonical type exists', () => {
    const yamlString = [
      'version: "1"',
      'name: test',
      'steps:',
      '  - name: create_case',
      '    type: kibana.createCaseDefaultSpace',
      '    with: {}',
    ].join('\n');

    const doc = parseDocument(yamlString, { keepSourceTokens: true });
    const { editor } = createMockMonacoEditor(yamlString);

    renderHook(() =>
      useConnectorTypeDecorations({
        editor,
        yamlDocument: doc,
        isEditorMounted: true,
      })
    );

    vi.advanceTimersByTime(200);

    expect(editor.createDecorationsCollection).toHaveBeenCalled();
  });

  it('does not create decorations for unknown connector types', () => {
    const yamlString = [
      'version: "1"',
      'name: test',
      'steps:',
      '  - name: custom_step',
      '    type: completely_unknown_connector',
      '    with: {}',
    ].join('\n');

    const doc = parseDocument(yamlString, { keepSourceTokens: true });
    const { editor } = createMockMonacoEditor(yamlString);

    renderHook(() =>
      useConnectorTypeDecorations({
        editor,
        yamlDocument: doc,
        isEditorMounted: true,
      })
    );

    vi.advanceTimersByTime(200);

    // Should not create decorations since the connector type is unknown
    expect(editor.createDecorationsCollection).not.toHaveBeenCalled();
  });

  it('skips step types shorter than 3 characters that are not "if"', () => {
    const yamlString = [
      'version: "1"',
      'name: test',
      'steps:',
      '  - name: short_step',
      '    type: ab',
    ].join('\n');

    const doc = parseDocument(yamlString, { keepSourceTokens: true });
    const { editor } = createMockMonacoEditor(yamlString);

    renderHook(() =>
      useConnectorTypeDecorations({
        editor,
        yamlDocument: doc,
        isEditorMounted: true,
      })
    );

    vi.advanceTimersByTime(200);

    expect(editor.createDecorationsCollection).not.toHaveBeenCalled();
  });

  it('creates decorations for "if" step type despite being 2 characters', () => {
    const yamlString = [
      'version: "1"',
      'name: test',
      'steps:',
      '  - name: condition_step',
      '    type: if',
      '    condition: true',
    ].join('\n');

    const doc = parseDocument(yamlString, { keepSourceTokens: true });
    const { editor } = createMockMonacoEditor(yamlString);

    renderHook(() =>
      useConnectorTypeDecorations({
        editor,
        yamlDocument: doc,
        isEditorMounted: true,
      })
    );

    vi.advanceTimersByTime(200);

    expect(editor.createDecorationsCollection).toHaveBeenCalled();
  });

  it('clears previous decorations before creating new ones', () => {
    const yamlString = [
      'version: "1"',
      'name: test',
      'steps:',
      '  - name: search_step',
      '    type: elasticsearch.search',
    ].join('\n');

    const doc = parseDocument(yamlString, { keepSourceTokens: true });
    const { editor, decorationsCollection } = createMockMonacoEditor(yamlString);

    const { rerender } = renderHook(
      ({ yamlDoc }) =>
        useConnectorTypeDecorations({
          editor,
          yamlDocument: yamlDoc,
          isEditorMounted: true,
        }),
      { initialProps: { yamlDoc: doc } }
    );

    vi.advanceTimersByTime(200);

    // Re-render to trigger a second effect run
    const doc2 = parseDocument(yamlString, { keepSourceTokens: true });
    rerender({ yamlDoc: doc2 });

    vi.advanceTimersByTime(200);

    expect(decorationsCollection.clear).toHaveBeenCalled();
  });

  it('handles documents with no steps gracefully', () => {
    const yamlString = ['version: "1"', 'name: test'].join('\n');
    const doc = parseDocument(yamlString, { keepSourceTokens: true });
    const { editor } = createMockMonacoEditor(yamlString);

    renderHook(() =>
      useConnectorTypeDecorations({
        editor,
        yamlDocument: doc,
        isEditorMounted: true,
      })
    );

    vi.advanceTimersByTime(200);

    // No decorations should be created when there are no steps
    expect(editor.createDecorationsCollection).not.toHaveBeenCalled();
  });
});
