/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { monaco } from '@kbn/code-editor';

type Editor = monaco.editor.IStandaloneCodeEditor;

export interface Position {
  readonly lineNumber: number;
  readonly column: number;
}

export interface Range {
  readonly startLineNumber: number;
  readonly startColumn: number;
  readonly endLineNumber: number;
  readonly endColumn: number;
}

interface Edit {
  readonly range: Range;
  readonly text: string;
  readonly forceMoveMarkers?: boolean;
}

export interface FakeDecorationsCollection {
  readonly decorations: readonly monaco.editor.IModelDeltaDecoration[];
  readonly clear: jest.Mock;
  readonly isCleared: () => boolean;
}

export interface FakeMonacoEditor {
  /** Cast once, here: the fake implements the subset of the editor API the panel code uses. */
  readonly editor: Editor;
  readonly getText: () => string;
  /** Replaces the document without going through an edit, like a controlled `value` prop would. */
  readonly setText: (text: string) => void;
  readonly getPosition: () => Position | null;
  readonly focus: jest.Mock;
  readonly revealPosition: jest.Mock;
  readonly executeEdits: jest.Mock;
  readonly collections: readonly FakeDecorationsCollection[];
}

/** Offsets count `\n` as one character, like a Monaco model with the LF end-of-line sequence. */
export const offsetAt = (text: string, { lineNumber, column }: Position): number => {
  const lines = text.split('\n');
  let offset = 0;
  for (let index = 0; index < lineNumber - 1 && index < lines.length; index++) {
    offset += lines[index].length + 1;
  }
  return Math.min(offset + column - 1, text.length);
};

export const positionAt = (text: string, offset: number): Position => {
  const clamped = Math.max(0, Math.min(offset, text.length));
  const before = text.slice(0, clamped).split('\n');
  return { lineNumber: before.length, column: before[before.length - 1].length + 1 };
};

/**
 * A Monaco editor double with a real document model (multi-line offsets, edits, positions) and
 * decoration collections that record what was drawn. Pass `withModel: false` for an editor that
 * has not got a model yet.
 */
export const createFakeMonacoEditor = (
  initialText: string,
  { withModel = true, position }: { withModel?: boolean; position?: Position | null } = {}
): FakeMonacoEditor => {
  let text = initialText;
  let currentPosition: Position | null =
    position === undefined ? { lineNumber: 1, column: 1 } : position;
  const collections: FakeDecorationsCollection[] = [];

  const model = {
    getValue: () => text,
    getValueLength: () => text.length,
    getOffsetAt: (pos: Position) => offsetAt(text, pos),
    getPositionAt: (offset: number) => positionAt(text, offset),
  };

  const focus = jest.fn();
  const revealPosition = jest.fn();
  const executeEdits = jest.fn((_source: string, edits: readonly Edit[]) => {
    const resolved = edits.map(({ range, text: inserted }) => ({
      from: offsetAt(text, { lineNumber: range.startLineNumber, column: range.startColumn }),
      to: offsetAt(text, { lineNumber: range.endLineNumber, column: range.endColumn }),
      inserted,
    }));
    // Apply from the end so earlier offsets stay valid, like Monaco does for a batch.
    resolved
      .sort((a, b) => b.from - a.from)
      .forEach(({ from, to, inserted }) => {
        text = `${text.slice(0, from)}${inserted}${text.slice(to)}`;
      });
    return true;
  });

  const editor = {
    getModel: () => (withModel ? model : null),
    getPosition: () => currentPosition,
    setPosition: (next: Position) => {
      currentPosition = next;
    },
    getValue: () => text,
    focus,
    revealPosition,
    executeEdits,
    createDecorationsCollection: (decorations: readonly monaco.editor.IModelDeltaDecoration[]) => {
      let cleared = false;
      const clear = jest.fn(() => {
        cleared = true;
      });
      const collection: FakeDecorationsCollection = {
        decorations,
        clear,
        isCleared: () => cleared,
      };
      collections.push(collection);
      return collection;
    },
  };

  return {
    editor: editor as unknown as Editor,
    getText: () => text,
    setText: (next) => {
      text = next;
    },
    getPosition: () => currentPosition,
    focus,
    revealPosition,
    executeEdits,
    collections,
  };
};
