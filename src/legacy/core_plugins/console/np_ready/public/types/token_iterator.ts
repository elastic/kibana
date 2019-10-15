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

import { Token } from './token';
import { Position } from './core_editor';

export interface ITokenIterator {
  /**
   * Report the token under the iterator's cursor.
   */
  getCurrentToken(): Token | null;

  /**
   * Return the current position in the document.
   *
   * This will correspond to the position of a token.
   *
   * Note: this method may not be that useful given {@link getCurrentToken}.
   */
  getCurrentPosition(): Position;

  /**
   * Go to the previous token in the document.
   *
   * Stepping to the previous token can return null under the following conditions:
   *
   * 1. We are at the beginning of the document.
   * 2. The preceding line is empty - no tokens.
   * 3. We are in an empty document - not text, so no tokens.
   */
  stepBackward(): Token | null;

  /**
   * See documentation for {@link stepBackward}.
   *
   * Steps forward instead of backwards.
   */
  stepForward(): Token | null;

  /**
   * Get the line number of the current token.
   *
   * Can be considered a convenience method for:
   *
   * ```ts
   * it.getCurrentToken().lineNumber;
   * ```
   */
  getCurrentTokenLineNumber(): number | null;

  /**
   * See documentation for {@link getCurrentTokenLineNumber}.
   *
   * Substitutes `column` for `lineNumber`.
   */
  getCurrentTokenColumn(): number | null;
}
