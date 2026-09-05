/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { monaco } from '@kbn/monaco';

/**
 * Creates a mock Monaco editor model backed by a real string value.
 * Implements the subset of `ITextModel` actually used by plugin code,
 * centralizing the single unavoidable `as unknown as ITextModel` cast.
 *
 * If Monaco adds a method the plugin starts using, the mock will return
 * `undefined` at runtime — consider adding it here if a test fails.
 */
export const createMockMonacoModel = (value: string): monaco.editor.ITextModel => {
  const lines = value.split('\n');
  return {
    getValue: jest.fn(() => value),
    getLineContent: jest.fn((lineNum: number) => lines[lineNum - 1] ?? ''),
    getLineMaxColumn: jest.fn((lineNum: number) => (lines[lineNum - 1]?.length ?? 0) + 1),
    getLineCount: jest.fn(() => lines.length),
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
    getOffsetAt: jest.fn((position: { lineNumber: number; column: number }) => {
      let offset = 0;
      for (let i = 0; i < position.lineNumber - 1; i++) {
        offset += lines[i].length + 1;
      }
      return offset + position.column - 1;
    }),
    getWordAtPosition: jest.fn(() => null),
    getWordUntilPosition: jest.fn(() => ({ word: '', startColumn: 1, endColumn: 1 })),
    getFullModelRange: jest.fn(() => ({
      startLineNumber: 1,
      startColumn: 1,
      endLineNumber: lines.length,
      endColumn: (lines[lines.length - 1]?.length ?? 0) + 1,
    })),
  } as unknown as monaco.editor.ITextModel;
};

/**
 * Creates a mock Monaco editor instance with a model and decorations collection.
 * Returns the editor, model, and decorations collection for easy assertion access.
 * The editor cast is centralized here — same rationale as `createMockMonacoModel`.
 *
 * All disposable listeners (`onDid*`) return a Jest mock `dispose` so tests can
 * assert attachment without the real Monaco event infrastructure. `getVisibleRanges`
 * defaults to returning a single full-document range; pass a custom implementation to
 * simulate scroll state in minimap tests.
 */
export const createMockMonacoEditor = (
  value: string,
  overrides?: Partial<monaco.editor.IStandaloneCodeEditor>
) => {
  const model = createMockMonacoModel(value);
  const decorationsCollection = {
    clear: jest.fn(),
    set: jest.fn(),
  };
  const lineCount = value.split('\n').length;
  const editor: monaco.editor.IStandaloneCodeEditor = {
    createDecorationsCollection: jest.fn(() => decorationsCollection),
    getModel: jest.fn(() => model),
    onDidChangeCursorPosition: jest.fn(() => ({ dispose: jest.fn() })),
    onDidChangeModelContent: jest.fn(() => ({ dispose: jest.fn() })),
    onDidScrollChange: jest.fn(() => ({ dispose: jest.fn() })),
    onDidLayoutChange: jest.fn(() => ({ dispose: jest.fn() })),
    getPosition: jest.fn(() => ({ lineNumber: 1, column: 1 })),
    getVisibleRanges: jest.fn(() => [{ startLineNumber: 1, endLineNumber: lineCount }]),
    revealLineInCenter: jest.fn(),
    setPosition: jest.fn(),
    focus: jest.fn(),
    dispose: jest.fn(),
    getTopForLineNumber: jest.fn(() => 0),
    getScrollTop: jest.fn(() => 0),
    ...overrides,
  } as unknown as monaco.editor.IStandaloneCodeEditor;
  return {
    editor,
    decorationsCollection,
    model,
  };
};

/**
 * A mock `@kbn/monaco` module to be used with `jest.mock('@kbn/monaco', () => mockMonacoModule)`.
 * Stubs the `Range` constructor so tests do not need the real Monaco environment.
 *
 * Usage in test files:
 * ```ts
 * import { mockMonacoModule } from '../../shared/test_utils';
 * jest.mock('@kbn/monaco', () => mockMonacoModule);
 * ```
 */
export const mockMonacoModule = {
  ...jest.requireActual('@kbn/monaco'),
  monaco: {
    ...jest.requireActual<typeof import('@kbn/monaco')>('@kbn/monaco').monaco,
    Range: jest.fn((startLine: number, startCol: number, endLine: number, endCol: number) => ({
      startLineNumber: startLine,
      startColumn: startCol,
      endLineNumber: endLine,
      endColumn: endCol,
    })),
  },
};
