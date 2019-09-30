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
import { Position } from './editor';

/**
 * Describes a kind of object that provides tokens.
 */
export interface TokensProvider {
  /**
   * Special values in this interface are `null` and an empty array `[]`.
   * - `null` means that we are outside of the document range (i.e., have requested tokens for a non-existent line).
   * - An empty array means that we are on an empty line.
   */
  getTokens(lineNumber: number): Token[] | null;
  // TODO: document
  getTokenAt(pos: Position): Token | null;
}
