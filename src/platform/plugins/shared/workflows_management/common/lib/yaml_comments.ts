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

const collectFromCollectionItem = (item: CST.CollectionItem, ranges: CommentRange[]): void => {
  collectSourceTokens(item.start, ranges);
  if (item.key) collectFromToken(item.key, ranges);
  collectSourceTokens(item.sep, ranges);
  if (item.value) collectFromToken(item.value, ranges);
};

/**
 * Walks a YAML CST token tree and appends every comment range
 * (offset-based) to the provided array.
 */
const collectFromToken = (token: CST.Token, ranges: CommentRange[]): void => {
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
};

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
 */
export const isOffsetInYamlComment = (ranges: CommentRange[], offset: number): boolean =>
  ranges.some((r) => offset >= r.start && offset < r.end);

/**
 * Replaces the content of YAML comments with spaces, preserving string
 * length and line count so that offset-based error positions remain valid.
 */
export const stripYamlComments = (text: string): string => {
  const ranges = getYamlCommentRanges(text);
  const chars = text.split('');
  for (const { start, end } of ranges) {
    for (let i = start; i < end; i++) {
      if (chars[i] !== '\n') {
        chars[i] = ' ';
      }
    }
  }
  return chars.join('');
};
