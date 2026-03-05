/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type CST, Parser } from 'yaml';

export interface CommentRange {
  start: number;
  end: number;
}

const collectSourceTokens = (
  tokens: CST.SourceToken[] | undefined,
  ranges: CommentRange[]
): void => {
  if (!tokens) return;
  for (const st of tokens) {
    if (st.type === 'comment') {
      ranges.push({ start: st.offset, end: st.offset + st.source.length });
    }
  }
};

function collectFromCollectionItem(item: CST.CollectionItem, ranges: CommentRange[]): void {
  collectSourceTokens(item.start, ranges);
  if (item.key) collectFromToken(item.key, ranges);
  collectSourceTokens(item.sep, ranges);
  if (item.value) collectFromToken(item.value, ranges);
}

/**
 * Walks a YAML CST token tree and appends every comment range
 * (offset-based) to the provided array.
 */
function collectFromToken(token: CST.Token, ranges: CommentRange[]): void {
  switch (token.type) {
    case 'comment':
      ranges.push({ start: token.offset, end: token.offset + token.source.length });
      break;
    case 'document':
      collectSourceTokens(token.start, ranges);
      if (token.value) collectFromToken(token.value, ranges);
      collectSourceTokens(token.end, ranges);
      break;
    case 'block-map':
    case 'block-seq':
      for (const item of token.items) {
        collectFromCollectionItem(item, ranges);
      }
      break;
    case 'flow-collection':
      for (const item of token.items) {
        collectFromCollectionItem(item, ranges);
      }
      collectSourceTokens(token.end, ranges);
      break;
    case 'block-scalar':
      for (const prop of token.props) {
        collectFromToken(prop, ranges);
      }
      break;
    case 'doc-end':
      collectSourceTokens(token.end, ranges);
      break;
    case 'alias':
    case 'scalar':
    case 'single-quoted-scalar':
    case 'double-quoted-scalar':
      collectSourceTokens(token.end, ranges);
      break;
    default:
      break;
  }
}

/**
 * Parses the YAML text at the CST level and returns the offset ranges of
 * every comment token. The ranges are sorted by start offset.
 *
 * Unlike line-by-line `#` scanning, this correctly handles block scalars
 * (`|`, `>`), flow collections, and other YAML constructs where `#` is
 * content rather than a comment indicator.
 */
export const getYamlCommentRanges = (text: string): CommentRange[] => {
  const parser = new Parser();
  const ranges: CommentRange[] = [];
  for (const token of parser.parse(text)) {
    collectFromToken(token, ranges);
  }
  ranges.sort((a, b) => a.start - b.start);
  return ranges;
};

/**
 * Checks whether the given offset falls within a YAML comment range.
 * Accepts pre-computed ranges from {@link getYamlCommentRanges} to avoid
 * re-parsing when checking multiple offsets against the same text.
 *
 * Uses binary search since ranges are sorted by start offset.
 */
export const isOffsetInYamlComment = (ranges: CommentRange[], offset: number): boolean => {
  let lo = 0;
  let hi = ranges.length - 1;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const r = ranges[mid];
    if (offset < r.start) {
      hi = mid - 1;
    } else if (offset >= r.end) {
      lo = mid + 1;
    } else {
      return true;
    }
  }
  return false;
};

/**
 * Replaces the content of YAML comments with spaces, preserving string
 * length and line count so that offset-based error positions remain valid.
 *
 * IMPORTANT: The output has the exact same `.length` as the input. This
 * invariant is relied upon by {@link validateLiquidTemplate} which extracts
 * error offsets from the stripped text and maps them back to the original.
 * YAML comments never span newlines, so replacing with spaces is safe.
 */
export const stripYamlComments = (text: string): string => {
  const ranges = getYamlCommentRanges(text);
  if (ranges.length === 0) return text;
  const parts: string[] = [];
  let pos = 0;
  for (const { start, end } of ranges) {
    parts.push(text.slice(pos, start));
    parts.push(' '.repeat(end - start));
    pos = end;
  }
  parts.push(text.slice(pos));
  return parts.join('');
};
