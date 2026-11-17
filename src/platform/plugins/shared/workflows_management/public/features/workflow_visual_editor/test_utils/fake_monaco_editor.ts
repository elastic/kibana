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
  /** The editor's container, and the input inside it that keys go to, as in Monaco. */
  readonly domNode: HTMLElement;
  readonly input: HTMLElement;
  /** Presses a key in the input; says whether it was cancelled, or kept from leaving the editor. */
  readonly pressKey: (key: string) => { defaultPrevented: boolean; propagationStopped: boolean };
  /** Moves the caret and tells the cursor listeners, like the user clicking or arrowing. */
  readonly moveCaretTo: (offset: number) => void;
  /** Tells the blur listeners. */
  readonly blur: () => void;
  /** Where a position is drawn, relative to the editor: a grid of 7px by 18px characters. */
  readonly getScrolledVisiblePosition: jest.Mock;
  /** How many listeners of all kinds are attached right now. */
  readonly listenerCount: () => number;
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

  const domNode = document.createElement('div');
  const input = document.createElement('textarea');
  domNode.appendChild(input);
  // Whatever holds the editor, to tell a key that left it from one that was stopped on the way.
  const surroundings = document.createElement('div');
  surroundings.appendChild(domNode);
  let keyListeners = 0;
  const addDomListener = domNode.addEventListener.bind(domNode);
  const removeDomListener = domNode.removeEventListener.bind(domNode);
  domNode.addEventListener = (...args: Parameters<typeof addDomListener>) => {
    if (args[0] === 'keydown') keyListeners++;
    addDomListener(...args);
  };
  domNode.removeEventListener = (...args: Parameters<typeof removeDomListener>) => {
    if (args[0] === 'keydown') keyListeners--;
    removeDomListener(...args);
  };
  const cursorListeners = new Set<(event: { position: Position }) => void>();
  const blurListeners = new Set<() => void>();
  const subscribe = <T>(listeners: Set<T>, listener: T) => {
    listeners.add(listener);
    return { dispose: () => listeners.delete(listener) };
  };

  const getScrolledVisiblePosition = jest.fn((at: Position) => ({
    top: (at.lineNumber - 1) * 18,
    left: (at.column - 1) * 7,
    height: 18,
  }));
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
    getDomNode: () => domNode,
    getScrolledVisiblePosition,
    onDidChangeCursorPosition: (listener: (event: { position: Position }) => void) =>
      subscribe(cursorListeners, listener),
    onDidBlurEditorText: (listener: () => void) => subscribe(blurListeners, listener),
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
    domNode,
    input,
    pressKey: (key) => {
      const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
      let leftTheEditor = false;
      const markLeft = () => {
        leftTheEditor = true;
      };
      surroundings.addEventListener('keydown', markLeft);
      input.dispatchEvent(event);
      surroundings.removeEventListener('keydown', markLeft);
      return { defaultPrevented: event.defaultPrevented, propagationStopped: !leftTheEditor };
    },
    moveCaretTo: (offset) => {
      currentPosition = positionAt(text, offset);
      cursorListeners.forEach((listener) => listener({ position: currentPosition as Position }));
    },
    blur: () => blurListeners.forEach((listener) => listener()),
    getScrolledVisiblePosition,
    listenerCount: () => keyListeners + cursorListeners.size + blurListeners.size,
  };
};
