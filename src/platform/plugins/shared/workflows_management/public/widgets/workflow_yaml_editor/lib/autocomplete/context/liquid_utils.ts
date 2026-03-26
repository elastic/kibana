/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { monaco } from '@kbn/monaco';
import {
  LIQUID_BLOCK_END_REGEX,
  LIQUID_BLOCK_START_REGEX,
} from '../../../../../../common/lib/regex';

/**
 * Checks if the current position is inside a liquid block by looking for {%- liquid ... -%} tags
 *
 * A position is considered "inside" a liquid block when:
 * - The cursor is positioned after a `{%- liquid` (or `{% liquid`) opening tag
 * - AND before the corresponding `-%}` (or `%}`) closing tag
 *
 * Examples:
 * ```
 * {%- liquid
 *   assign x = 1  <-- INSIDE (cursor here shows liquid block keywords)
 *   echo x        <-- INSIDE
 * -%}
 * regular text    <-- OUTSIDE (no liquid block keywords)
 * ```
 *
 * Note: This implementation uses simple counting (openings > closings)
 */
export function isInsideLiquidBlock(fullText: string, position: monaco.Position): boolean {
  // Get text from start to cursor position
  const textUpToPosition =
    fullText.split('\n').slice(0, position.lineNumber).join('\n') +
    fullText.split('\n')[position.lineNumber - 1].substring(0, position.column - 1);

  // Reset regex lastIndex to ensure fresh matching
  LIQUID_BLOCK_START_REGEX.lastIndex = 0;
  LIQUID_BLOCK_END_REGEX.lastIndex = 0;

  // Count opening and closing liquid blocks - simple and effective
  const openingMatches = Array.from(textUpToPosition.matchAll(LIQUID_BLOCK_START_REGEX));
  const closingMatches = Array.from(textUpToPosition.matchAll(LIQUID_BLOCK_END_REGEX));

  // If we have more openings than closings, we're inside a liquid block
  return openingMatches.length > closingMatches.length;
}
