/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Parser } from '@elastic/esql';
import type { ICommandContext, ISuggestionItem } from '../../../commands/registry/types';
import { getOverlapRange } from '../../../commands/definitions/utils/shared';

const NON_WHITESPACE_REGEX = /\S/;
const ONLY_WHITESPACE_REGEX = /^\s+$/;
const STARTS_WITH_WORD_CHAR = /^\w/;
const CONTAINS_WHITESPACE_REGEX = /\s/;

interface LexerToken {
  text: string;
  start: number;
  stop: number;
}

type PrefixClassification = 'token-based' | 'compound-prefix' | 'fallback-required';

export interface PrefixResult {
  prefix: string;
  range: { start: number; end: number };
  classification: PrefixClassification;
}

/**
 * Resolves the prefix currently under the cursor and the text range that should
 * be replaced if a suggestion is accepted.
 */
export function computePrefixRange(query: string): PrefixResult {
  const tokens = getVisibleLexerTokens(query);

  if (tokens.length === 0) {
    return createEmptyPrefixResult(query, 'fallback-required');
  }

  const lastToken = tokens[tokens.length - 1];
  const lastTokenEnd = lastToken.stop + 1;

  // "WHERE x IS N" → the lexer tokenizes up to "IS", leaving " N" as unrecognized text (gap = 2)
  const gap = query.length - lastTokenEnd;

  // the user is typing something the lexer can't parse yet (e.g. a partial keyword like "N" for "NOT NULL")
  if (gap > 0) {
    return getPrefixResultFromUnparsedTrailingText(query, lastTokenEnd);
  }

  // Structural delimiters like ( ) , . = are not valid prefixes — cursor is in an empty position
  if (!STARTS_WITH_WORD_CHAR.test(lastToken.text[0])) {
    return getPrefixResultAfterDelimiter(query, tokens);
  }

  return getPrefixResultFromLastToken(query, tokens, lastToken, lastTokenEnd);
}

// =============================================
// Replacement Range Resolver
// =============================================

/** Adds a replacement range for root-level query suggestions. */
export function attachRootQueryReplacementRanges(
  suggestions: ISuggestionItem[],
  fullText: string,
  offset: number
): ISuggestionItem[] {
  const start = computePrefixRange(fullText.substring(0, offset)).range.start;
  const end = fullText.length;

  // If there is nothing after the cursor, do not replace anything.
  if (start === offset && end === offset) {
    return suggestions;
  }

  const rangeToReplace = { start, end: end + 1 };

  return suggestions.map((suggestion) => ({
    ...suggestion,
    rangeToReplace,
  }));
}

/** Attaches replacement ranges, resolves preserveTypedPrefix and requiresExistingColumnMatch. */
export function attachReplacementRanges(
  innerText: string,
  suggestions: ISuggestionItem[],
  context?: ICommandContext
): ISuggestionItem[] {
  if (suggestions.length === 0) {
    return suggestions;
  }

  const prefixResult = computePrefixRange(innerText);
  const { prefix, range } = prefixResult;
  const hasExistingColumnMatch = Boolean(prefix && context?.columns.has(prefix));
  const prefixMatchesExistingColumn =
    hasExistingColumnMatch &&
    suggestions.some((suggestion) => suggestion.requiresExistingColumnMatch);

  return suggestions.flatMap((suggestion) => {
    const { requiresExistingColumnMatch, preserveTypedPrefix, rangeToReplace, filterText } =
      suggestion;

    if (requiresExistingColumnMatch && !hasExistingColumnMatch) {
      return [];
    }

    if (prefixMatchesExistingColumn && !requiresExistingColumnMatch) {
      return [];
    }

    const resolvedSuggestion =
      preserveTypedPrefix && prefix
        ? {
            ...suggestion,
            text: prefix + suggestion.text,
            filterText: filterText ?? prefix,
          }
        : suggestion;

    if (rangeToReplace) {
      return [resolvedSuggestion];
    }

    // getOverlapRange is only needed for suggestions whose internal whitespace is
    // part of the typed sequence, such as "IS NOT NULL" after "IS NO|". Using
    // trimEnd() keeps trailing formatting whitespace from routing otherwise-normal
    // suggestions through the overlap path.
    const overlapRange = CONTAINS_WHITESPACE_REGEX.test(suggestion.text.trimEnd())
      ? getOverlapRange(innerText, suggestion.text)
      : undefined;
    const effectiveRange = overlapRange ?? { start: range.start, end: range.end };

    return [
      {
        ...resolvedSuggestion,
        rangeToReplace: effectiveRange,
      },
    ];
  });
}

// =============================================
// Local Helpers
// =============================================

/** Extracts visible (channel 0) tokens from the ANTLR lexer. */
function getVisibleLexerTokens(query: string): LexerToken[] {
  const parser = Parser.create(query);
  const tokens: LexerToken[] = [];

  while (true) {
    const { type, channel, text, start, stop } = parser.lexer.nextToken();

    // type -1 = EOF in ANTLR
    if (type < 0) {
      break;
    }

    // channel 0 = default (keywords, identifiers, operators); skip whitespace/comments
    if (channel !== 0 || !text.length) {
      continue;
    }

    tokens.push({ text, start, stop });
  }

  return tokens;
}

/** Range of non-whitespace text after the last recognized token (fallback case). */
function getTrailingNonWhitespaceRange(
  query: string,
  startOffset: number
): { start: number; end: number } {
  const trailingText = query.substring(startOffset);
  const nonWhitespaceOffset = trailingText.search(NON_WHITESPACE_REGEX);
  const rangeStart = nonWhitespaceOffset >= 0 ? startOffset + nonWhitespaceOffset : query.length;

  return {
    start: rangeStart,
    end: query.length,
  };
}

/** Builds an empty-prefix result anchored at the current cursor position. */
function createEmptyPrefixResult(
  query: string,
  classification: PrefixClassification
): PrefixResult {
  return {
    prefix: '',
    range: { start: query.length, end: query.length },
    classification,
  };
}

/** Uses the lexer gap to recover partially typed text the lexer could not tokenize yet. */
function getPrefixResultFromUnparsedTrailingText(
  query: string,
  lastTokenEnd: number
): PrefixResult {
  const textAfterLastToken = query.substring(lastTokenEnd);

  if (ONLY_WHITESPACE_REGEX.test(textAfterLastToken)) {
    return createEmptyPrefixResult(query, 'token-based');
  }

  const range = getTrailingNonWhitespaceRange(query, lastTokenEnd);

  return {
    prefix: query.substring(range.start, range.end),
    range,
    classification: 'fallback-required',
  };
}

/** Handles positions after delimiters, including a trailing dot that continues a field path. */
function getPrefixResultAfterDelimiter(query: string, tokens: LexerToken[]): PrefixResult {
  const trailingDotPrefix = getTrailingDotFieldPrefix(query, tokens);

  if (trailingDotPrefix) {
    return {
      ...trailingDotPrefix,
      classification: 'compound-prefix',
    };
  }

  return createEmptyPrefixResult(query, 'token-based');
}

/** Resolves a normal token prefix, expanding it if it belongs to a dotted field chain. */
function getPrefixResultFromLastToken(
  query: string,
  tokens: LexerToken[],
  lastToken: LexerToken,
  lastTokenEnd: number
): PrefixResult {
  const compoundStart = walkBackDotChain(tokens, tokens.length - 1, lastToken.start);

  if (compoundStart < lastToken.start) {
    return {
      prefix: query.substring(compoundStart, lastTokenEnd),
      range: { start: compoundStart, end: lastTokenEnd },
      classification: 'compound-prefix',
    };
  }

  return {
    prefix: lastToken.text,
    range: { start: lastToken.start, end: lastTokenEnd },
    classification: 'token-based',
  };
}

/** Extends a trailing dot into a dotted field prefix (e.g. event.data.). */
function getTrailingDotFieldPrefix(query: string, tokens: LexerToken[]) {
  if (tokens.length < 2) {
    return;
  }

  const dotToken = tokens[tokens.length - 1];

  if (dotToken.text !== '.') {
    return;
  }

  const previousToken = tokens[tokens.length - 2];

  if (
    previousToken.stop + 1 !== dotToken.start ||
    (!STARTS_WITH_WORD_CHAR.test(previousToken.text[0]) && !previousToken.text.startsWith('`'))
  ) {
    return;
  }

  const compoundStart = walkBackDotChain(tokens, tokens.length - 2, previousToken.start);
  const range = { start: compoundStart, end: dotToken.stop + 1 };

  return {
    prefix: query.substring(range.start, range.end),
    range,
  };
}

/** Walks backwards through adjacent dot-separated tokens (e.g. event.data.field). */
function walkBackDotChain(tokens: LexerToken[], startIdx: number, compoundStart: number): number {
  let tokenIdx = startIdx;
  let result = compoundStart;

  while (tokenIdx >= 2) {
    const dotCandidate = tokens[tokenIdx - 1];
    const identCandidate = tokens[tokenIdx - 2];

    const isAdjacentDot =
      dotCandidate.text === '.' &&
      dotCandidate.stop + 1 === tokens[tokenIdx].start &&
      identCandidate.stop + 1 === dotCandidate.start;

    if (!isAdjacentDot) {
      break;
    }

    result = identCandidate.start;
    tokenIdx -= 2;
  }

  return result;
}
