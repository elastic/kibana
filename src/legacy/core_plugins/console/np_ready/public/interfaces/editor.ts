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

import { TokenIterator } from './token_iterator';

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
  a: Position;
  // TODO: document
  b: Position;
}

export interface GetTokenIteratorArgs {
  position: Position;

  /**
   * The direction in which calling 'next' on the iterator will move through the set of tokens.
   * Default to backward if not specified
   */
  direction?: 'forward' | 'backward';
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
  getCurrentPosition(): Position | null;

  /**
   * Get the contents of the editor
   */
  getValue(): string;

  /**
   * Get the contents of the editor at a specific line
   */
  getLineValue(args: { lineNumber: number }): string;

  /**
   * Get an iterator, with a direction and a position, to traverse
   * tokens in the document content.
   */
  getTokenIteratorForPosition(args: GetTokenIteratorArgs): TokenIterator;

  /**
   * Get the contents of the editor between two points.
   */
  getValueInRange(range: Range): string;

  /**
   * Get the mode of a specific line as enumerated by LINE_MODE.
   */
  getLineMode(args: { lineNumber: number }): LINE_MODE;
}
