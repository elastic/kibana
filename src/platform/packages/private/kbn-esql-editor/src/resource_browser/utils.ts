/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Parser, isSource } from '@kbn/esql-language';

export interface CommandRange {
  lineNumber: number; // 1-based, assumes the command is on a single line
  startColumn: number; // 1-based
  endColumn: number; // 1-based, inclusive
}

/**
 * Returns the first command in the query that matches one of the `supportedCommands`.
 *
 * We use the ESQL AST to find the command and its `location.min` (a 0-based character offset
 * into the full query string). That offset is then converted to a Monaco-style range
 * (1-based line/column) so we can decorate the exact command keyword without relying on
 * brittle string searches.
 *
 * For incomplete/invalid queries, parsing may fail; in that case this returns `undefined`.
 */
export const getFirstSupportedCommandFromQuery = (
  query: string,
  supportedCommands: string[]
): { command: string; range?: CommandRange } | undefined => {
  try {
    const { root } = Parser.parse(query, { withFormatting: true });
    const cmd = root.commands.find((c) => supportedCommands.includes(c.name.toLowerCase()));
    if (!cmd) return;

    const min = cmd.location?.min;
    if (typeof min !== 'number') {
      return { command: cmd.name };
    }

    const safeMin = Math.max(0, Math.min(min, query.length));
    const textBefore = query.slice(0, safeMin);
    const lines = textBefore.split('\n');
    const lineNumber = lines.length;
    const startColumn = lines[lineNumber - 1].length + 1;
    const endColumn = startColumn + cmd.name.length;

    return {
      command: cmd.name,
      range: { lineNumber, startColumn, endColumn },
    };
  } catch {
    return undefined;
  }
};

export interface LocatedSourceItem {
  min: number;
  max: number;
  type?: string;
  name?: string;
}

/**
 * Parses the query and returns the `location.min/max` for each *existing* `source` argument
 * of the main `FROM`/`TS` command.
 *
 * This is used to remove an exact source token (and its adjacent comma) without rewriting
 * the rest of the sources list.
 */
export const getLocatedSourceItemsFromQuery = (query: string): LocatedSourceItem[] => {
  try {
    const { root } = Parser.parse(query, { withFormatting: true });
    const sourceCommand = root.commands.find(({ name }) => name === 'from' || name === 'ts');

    const sources = (sourceCommand?.args ?? []).filter(isSource);

    return sources
      .map((s) => ({
        min: s.location.min,
        max: s.location.max,
        type: s.type as string | undefined,
        name: s.name as string | undefined,
      }))
      .sort((a, b) => a.min - b.min);
  } catch {
    return [];
  }
};

/**
 * Walks left from an offset to find the first non-whitespace character.
 * Used to decide whether we need to add a leading comma when inserting at the cursor.
 */
export const findPrevNonWhitespaceChar = (
  text: string,
  from: number,
  lowerBound: number
): string | undefined => {
  for (let i = from; i >= lowerBound; i--) {
    const ch = text[i];
    if (ch && !/\s/.test(ch)) return ch;
  }
  return undefined;
};

/**
 * Walks right from an offset to find the first non-whitespace character.
 * Used to decide whether we need to add a trailing comma when inserting at the cursor.
 */
export const findNextNonWhitespaceChar = (
  text: string,
  from: number,
  upperBound: number
): string | undefined => {
  for (let i = from; i < upperBound; i++) {
    const ch = text[i];
    if (ch && !/\s/.test(ch)) return ch;
  }
  return undefined;
};

/**
 * Computes the exact `[start, end)` range to delete when removing a source.
 *
 * Rules:
 * - If source is at the front or in the middle: delete `source + following comma` when present
 * - If source is at the end: delete `preceding comma + source` when present
 *
 * Whitespace around commas is intentionally preserved to avoid reformatting the user's query.
 */
export const computeRemovalRange = (
  query: string,
  items: LocatedSourceItem[],
  sourceName: string
): { start: number; end: number } | undefined => {
  const idx = items.findIndex((it) => it.type === 'source' && it.name === sourceName);
  if (idx === -1) return;

  const target = items[idx];
  const targetStart = target.min;
  const targetEnd = target.max + 1;

  // Middle/front: remove `item... ,` (following comma)
  if (idx < items.length - 1) {
    const nextStart = items[idx + 1].min;
    const commaIdx = query.indexOf(',', targetEnd);
    if (commaIdx !== -1 && commaIdx < nextStart) {
      return { start: targetStart, end: commaIdx + 1 };
    }
    return { start: targetStart, end: targetEnd };
  }

  // End: remove `, item...` (previous comma)
  if (idx > 0) {
    const prevEnd = items[idx - 1].max + 1;
    const commaIdx = query.lastIndexOf(',', targetStart);
    if (commaIdx !== -1 && commaIdx >= prevEnd) {
      return { start: commaIdx, end: targetEnd };
    }
    return { start: targetStart, end: targetEnd };
  }

  // Single item
  return { start: targetStart, end: targetEnd };
};

/**
 * Computes the insertion text (and offset) for adding a source.
 *
 * Rules:
 * - `badge`: insert at the beginning of the sources list; add a trailing comma when there are existing sources
 * - `autocomplete`: insert at cursor; add a leading/trailing comma when needed based on nearby tokens
 *
 * This returns the exact `text` to insert without changing surrounding whitespace.
 */
export const computeInsertionText = ({
  query,
  items,
  at,
  sourceName,
  mode,
}: {
  query: string;
  items: Array<{ min: number; max: number }>;
  at: number;
  sourceName: string;
  mode: 'badge' | 'autocomplete';
}): { at: number; text: string } => {
  const hasItems = items.length > 0;

  if (mode === 'badge') {
    const insertAt = hasItems ? items[0].min : at;
    return { at: insertAt, text: hasItems ? `${sourceName},` : sourceName };
  }

  if (!hasItems) {
    return { at, text: sourceName };
  }

  const lowerBound = items[0].min;
  const upperBound = Math.max(at, items[items.length - 1].max + 1) + 1;
  const leftCh = findPrevNonWhitespaceChar(query, at - 1, lowerBound);
  const rightCh = findNextNonWhitespaceChar(query, at, Math.min(upperBound, query.length));

  const hasPrevItem = items.some((it) => it.max + 1 <= at);
  const hasNextItem = items.some((it) => it.min >= at);

  const needsLeadingComma = hasPrevItem && leftCh !== ',';
  const needsTrailingComma = hasNextItem && rightCh !== ',' && rightCh !== '|';

  return {
    at,
    text: `${needsLeadingComma ? ',' : ''}${sourceName}${needsTrailingComma ? ',' : ''}`,
  };
};
