/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Editor } from 'brace';
import { TokensProvider } from './tokens_provider';
import { Token } from './token';

type MarkerRef = any;

export type EditorEvent =
  | 'tokenizerUpdate'
  | 'changeCursor'
  | 'changeScrollTop'
  | 'change'
  | 'changeSelection';

export type AutoCompleterFunction = (
  pos: Position,
  prefix: string,
  callback: (...args: unknown[]) => void
) => void;

export interface Position {
  /**
   * The line number, not zero-indexed.
   *
   * E.g., if given line number 1, this would refer to the first line visible.
   */
  lineNumber: number;

  /**
   * The column number, not zero-indexed.
   *
   * E.g., if given column number 1, this would refer to the first character of a column.
   */
  column: number;
}

export interface Range {
  /**
   * The start point of the range.
   */
  start: Position;

  /**
   * The end point of the range.
   */
  end: Position;
}

/**
 * Enumeration of the different states the current position can be in.
 *
 * Current implementation uses low-level binary operations OR ('|') and AND ('&') to, respectively:
 *
 * - Create a combination of acceptable states.
 * - Extract the states from the acceptable combination.
 *
 * E.g.
 * ```ts
 * const acceptableStates = LINE_MODE.REQUEST_START | LINE_MODE.IN_REQUEST; // binary '110'
 *
 * // Is MULTI_DOC_CUR_DOC_END ('1000') acceptable?
 * Boolean(acceptableStates & LINE_MODE.MULTI_DOC_CUR_DOC_END) // false
 *
 * // Is REQUEST_START ('10') acceptable?
 * Boolean(acceptableStates & LINE_MODE.REQUEST_START) // true
 * ```
 *
 * This implementation will probably be changed to something more accessible in future but is documented
 * here for reference.
 */
export enum LINE_MODE {
  REQUEST_START = 2,
  IN_REQUEST = 4,
  MULTI_DOC_CUR_DOC_END = 8,
  REQUEST_END = 16,
  BETWEEN_REQUESTS = 32,
  UNKNOWN = 64,
}

/**
 * The CoreEditor is a component separate from the Editor implementation that provides Console
 * app specific business logic. The CoreEditor is an interface to the lower-level editor implementation
 * being used which is usually vendor code such as Ace or Monaco.
 */
export interface CoreEditor {
  /**
   * Get the current position of the cursor.
   */
  getCurrentPosition(): Position;

  /**
   * Get the contents of the editor.
   */
  getValue(): string;

  /**
   * Sets the contents of the editor.
   *
   * Returns a promise so that callers can wait for re-tokenizing to complete.
   */
  setValue(value: string, forceRetokenize: boolean): Promise<void>;

  /**
   * Get the contents of the editor at a specific line.
   */
  getLineValue(lineNumber: number): string;

  /**
   * Insert a string value at the current cursor position.
   */
  insert(value: string): void;

  /**
   * Insert a string value at the indicated position.
   */
  insert(pos: Position, value: string): void;

  /**
   * Replace a range of text.
   */
  replace(rangeToReplace: Range, value: string): void;

  /**
   * Clear the selected range.
   */
  clearSelection(): void;

  /**
   * Returns the {@link Range} for currently selected text
   */
  getSelectionRange(): Range;

  /**
   * Move the cursor to the indicated position.
   */
  moveCursorToPosition(pos: Position): void;

  /**
   * Get the token at the indicated position. The token considered "at" the position is the
   * one directly preceding the position.
   *
   * Returns null if there is no such token.
   */
  getTokenAt(pos: Position): Token | null;

  /**
   * Get an iterable token provider.
   */
  getTokenProvider(): TokensProvider;

  /**
   * Get the contents of the editor between two points.
   */
  getValueInRange(range: Range): string;

  /**
   * Get the lexer state at the end of a specific line.
   */
  getLineState(lineNumber: number): string;

  /**
   * Get line content between and including the start and end lines provided.
   */
  getLines(startLine: number, endLine: number): string[];

  /**
   * Replace a range in the current buffer with the provided value.
   */
  replaceRange(range: Range, value: string): void;

  /**
   * Return the current line count in the buffer.
   *
   * @remark
   * This function should be usable in a tight loop and must make used of a cached
   * line count.
   */
  getLineCount(): number;

  /**
   * A legacy mechanism which gives consumers of this interface a chance to wait for
   * latest tokenization to complete.
   */
  waitForLatestTokens(): Promise<void>;

  /**
   * Mark a range in the current buffer
   */
  addMarker(range: Range): MarkerRef;

  /**
   * Mark a range in the current buffer
   */
  removeMarker(ref: MarkerRef): void;

  /**
   * Get a number that represents the current wrap limit on a line
   */
  getWrapLimit(): number;

  /**
   * Register a listener for predefined editor events
   */
  on(event: EditorEvent, listener: () => void): void;

  /**
   * Unregister a listener for predefined editor events
   */
  off(event: EditorEvent, listener: () => void): void;

  /**
   * Execute a predefined editor command.
   */
  execCommand(cmd: string): void;

  /**
   * Returns a boolean value indicating whether or not the completer UI is currently showing in
   * the editor
   */
  isCompleterActive(): boolean;

  /**
   * Get the HTML container element for this editor instance
   */
  getContainer(): HTMLDivElement;

  /**
   * Because the core editor should not know about requests, but can know about ranges we still
   * have this backdoor to update UI in response to request range changes, for example, as the user
   * moves the cursor around
   */
  legacyUpdateUI(opts: unknown): void;

  /**
   * A method to for the editor to resize, useful when, for instance, window size changes.
   */
  resize(): void;

  /**
   * Expose a way to set styles on the editor
   */
  setStyles(styles: { wrapLines: boolean; fontSize: string }): void;

  /**
   * Register a keyboard shortcut and provide a function to be called.
   */
  registerKeyboardShortcut(opts: {
    keys: string | { win?: string; mac?: string };
    fn: (editor: Editor) => void;
    name: string;
  }): void;

  /**
   * Unregister a keyboard shortcut and provide a command name
   */
  unregisterKeyboardShortcut(command: string): void;

  /**
   * Register a completions function that will be called when the editor
   * detects a change
   */
  registerAutocompleter(autocompleter: AutoCompleterFunction): void;

  /**
   * Release any resources in use by the editor.
   */
  destroy(): void;
}
