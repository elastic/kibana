/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { TokensProvider } from './tokens_provider';
import { Token } from './token';

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
  // TODO: document
  start: Position;
  // TODO: document
  end: Position;
}

// TODO: document
export enum LINE_MODE {
  REQUEST_START = 2,
  IN_REQUEST = 4,
  MULTI_DOC_CUR_DOC_END = 8,
  REQUEST_END = 16,
  BETWEEN_REQUESTS = 32,
  UNKNOWN = 64,
}

export interface Editor {
  /**
   * Get the current position of the cursor
   */
  getCurrentPosition(): Position;

  /**
   * Get the contents of the editor
   */
  getValue(): string;

  /**
   * Get the contents of the editor at a specific line
   */
  getLineValue(args: { lineNumber: number }): string;

  // TODO: document
  insert(value: string): void;

  // TODO: document
  replace(rangeToReplace: Range, value: string): void;

  // TODO: document
  clearSelection(): void;

  // TODO: document
  moveCursorToPosition(pos: Position): void;

  // TODO: document
  getTokenAt(pos: Position): Token | null;

  /**
   * Get an iterable token provider
   */
  getTokenProvider(): TokensProvider;

  /**
   * Get the contents of the editor between two points.
   */
  getValueInRange(range: Range): string;

  /**
   * Get the lexer state at the end of a specific line.
   */
  getLineState(args: { lineNumber: number }): string;

  // TODO: document
  // getLineMode(args: { lineNumber: number }): LINE_MODE;
}
