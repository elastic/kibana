/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Token } from './token';
import { Position } from './core_editor';

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

  /**
   * Get the token at the specified position.
   *
   * The token "at" the position is considered to the token directly preceding
   * the indicated cursor position.
   *
   * Returns null if there is not a token that meets this criteria or if the position is outside
   * of the document range.
   */
  getTokenAt(pos: Position): Token | null;
}
