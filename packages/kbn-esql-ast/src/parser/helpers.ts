/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Token } from 'antlr4';
import { DEFAULT_CHANNEL } from './constants';

export const isQuotedIdentifier = (text: string): boolean => {
  const firstChar = text[0];
  const lastChar = text[text.length - 1];

  return firstChar === '`' && lastChar === '`';
};

export const parseIdentifier = (text: string): string => {
  const isQuoted = isQuotedIdentifier(text);

  if (!isQuoted) {
    return text;
  }

  return text.slice(1, -1).replace(/``/g, '`');
};

export const regexUnquotedIdentifierPattern = /^([a-z\*_\@]{1})[a-z0-9_\*]*$/i;

export const formatIdentifier = (text: string): string => {
  if (regexUnquotedIdentifierPattern.test(text)) {
    return text;
  }

  return `\`${text.replace(/`/g, '``')}\``;
};

export const formatIdentifierParts = (parts: string[]): string =>
  parts.map(formatIdentifier).join('.');

export const getPosition = (
  token: Pick<Token, 'start' | 'stop'> | null,
  lastToken?: Pick<Token, 'stop'> | undefined
) => {
  if (!token || token.start < 0) {
    return { min: 0, max: 0 };
  }
  const endFirstToken = token.stop > -1 ? Math.max(token.stop + 1, token.start) : undefined;
  const endLastToken = lastToken?.stop;
  return {
    min: token.start,
    max: endLastToken ?? endFirstToken ?? Infinity,
  };
};

/**
 * Finds all tokens in the given range using binary search. Allows to further
 * filter the tokens using a predicate.
 *
 * @param tokens List of ANTLR tokens.
 * @param min Text position to start searching from.
 * @param max Text position to stop searching at.
 * @param predicate Function to test each token.
 */
export const findTokens = function* (
  tokens: Token[],
  min: number = 0,
  max: number = tokens.length ? tokens[tokens.length - 1].stop : 0,
  predicate: (token: Token) => boolean = () => true
): Iterable<Token> {
  let index = 0;
  let left = 0;
  let right = tokens.length - 1;

  // Find the first token index.
  while (left <= right) {
    const mid = left + Math.floor((right - left) / 2);
    const token = tokens[mid];

    if (token.start < min) {
      left = mid + 1;
    } else if (token.stop > min) {
      right = mid - 1;
    } else {
      index = mid;
      break;
    }
  }

  // Return all tokens in the range, which satisfy the predicate.
  for (; index < tokens.length; index++) {
    const token = tokens[index];

    if (token.start > max) {
      break;
    }
    if (predicate(token)) {
      yield token;
    }
  }
};

/**
 * Finds the first token in the given range using binary search. Allows to
 * further filter the tokens using a predicate.
 *
 * @param tokens List of ANTLR tokens.
 * @param min Text position to start searching from.
 * @param max Text position to stop searching at.
 * @param predicate Function to test each token.
 * @returns The first token that matches the predicate or `null` if no token is found.
 */
export const findFirstToken = (
  tokens: Token[],
  min: number = 0,
  max: number = tokens.length ? tokens[tokens.length - 1].stop : 0,
  predicate: (token: Token) => boolean = () => true
): Token | null => {
  for (const token of findTokens(tokens, min, max, predicate)) {
    return token;
  }

  return null;
};

/**
 * Finds the first visible token in the given token range using binary search.
 *
 * @param tokens List of ANTLR tokens.
 * @param min Text position to start searching from.
 * @param max Text position to stop searching at.
 * @returns The first punctuation token or `null` if no token is found.
 */
export const findVisibleToken = (
  tokens: Token[],
  min: number = 0,
  max: number = tokens.length ? tokens[tokens.length - 1].stop : 0
): Token | null => {
  return findFirstToken(
    tokens,
    min,
    max,
    ({ channel, text }) => channel === DEFAULT_CHANNEL && text.length > 0
  );
};

/**
 * A heuristic set of punctuation characters.
 */
const punctuationChars = new Set(['.', ',', ';', ':', '(', ')', '[', ']', '{', '}']);

export const isLikelyPunctuation = (text: string): boolean =>
  text.length === 1 && punctuationChars.has(text);

/**
 * Finds the first punctuation token in the given token range using binary
 * search.
 *
 * @param tokens List of ANTLR tokens.
 * @param min Text position to start searching from.
 * @param max Text position to stop searching at.
 * @returns The first punctuation token or `null` if no token is found.
 */
export const findPunctuationToken = (
  tokens: Token[],
  min: number = 0,
  max: number = tokens.length ? tokens[tokens.length - 1].stop : 0
): Token | null => {
  return findFirstToken(
    tokens,
    min,
    max,
    ({ channel, text }) =>
      channel === DEFAULT_CHANNEL && text.length === 1 && punctuationChars.has(text)
  );
};
