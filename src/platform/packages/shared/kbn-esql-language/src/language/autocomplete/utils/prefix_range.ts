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

interface LexerToken {
  text: string;
  start: number;
  stop: number;
}

type PrefixClassification = 'token-based' | 'dot-field-combining' | 'fallback-required';

export interface PrefixResult {
  prefix: string;
  range: { start: number; end: number };
  classification: PrefixClassification;
}

/** Determines the typed prefix and its replacement range using ANTLR lexer tokens. */
export function computePrefixRange(query: string): PrefixResult {
  const tokens = getVisibleLexerTokens(query);

  if (tokens.length === 0) {
    return {
      prefix: '',
      range: { start: query.length, end: query.length },
      classification: 'fallback-required',
    };
  }

  const lastToken = tokens[tokens.length - 1];
  const { text: lastText, start: lastStart, stop: lastStop } = lastToken;
  const lastTokenEnd = lastStop + 1;

  // "WHERE x IS N" → the lexer tokenizes up to "IS", leaving " N" as unrecognized text (gap = 2)
  const gap = query.length - lastTokenEnd;

  // the user is typing something the lexer can't parse yet (e.g. a partial keyword like "N" for "NOT NULL")
  if (gap > 0) {
    const textAfterLastToken = query.substring(lastTokenEnd);
    const isJustWhitespace = ONLY_WHITESPACE_REGEX.test(textAfterLastToken);

    if (!isJustWhitespace) {
      const range = getTrailingNonWhitespaceRange(query, lastTokenEnd);

      return {
        prefix: query.substring(range.start, range.end),
        range,
        classification: 'fallback-required',
      };
    }

    return {
      prefix: '',
      range: { start: query.length, end: query.length },
      classification: 'token-based',
    };
  }

  // Structural delimiters like ( ) , . = are not valid prefixes — cursor is in an empty position
  if (!STARTS_WITH_WORD_CHAR.test(lastText[0])) {
    if (lastText === '.') {
      const trailingDotPrefix = getTrailingDotFieldPrefix(query, tokens);

      if (trailingDotPrefix) {
        return {
          ...trailingDotPrefix,
          classification: 'dot-field-combining',
        };
      }
    }

    return {
      prefix: '',
      range: { start: query.length, end: query.length },
      classification: 'token-based',
    };
  }

  // Walk backwards through adjacent dot-separated tokens (e.g. event.data.field)
  const compoundStart = walkBackDotChain(tokens, tokens.length - 1, lastStart);

  if (compoundStart < lastStart) {
    return {
      prefix: query.substring(compoundStart, lastTokenEnd),
      range: { start: compoundStart, end: lastTokenEnd },
      classification: 'dot-field-combining',
    };
  }

  return {
    prefix: lastText,
    range: { start: lastStart, end: lastTokenEnd },
    classification: 'token-based',
  };
}

// =============================================
// Replacement Range Resolver
// =============================================

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
  const shouldPreferContinuationSuggestions =
    hasExistingColumnMatch &&
    suggestions.some((suggestion) => suggestion.requiresExistingColumnMatch);

  return suggestions.flatMap((suggestion) => {
    const { requiresExistingColumnMatch, preserveTypedPrefix, rangeToReplace, filterText } =
      suggestion;

    if (requiresExistingColumnMatch && !hasExistingColumnMatch) {
      return [];
    }

    if (shouldPreferContinuationSuggestions && !requiresExistingColumnMatch) {
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

    const overlapRange = getOverlapRange(innerText, suggestion.text);
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

/** Extends a trailing dot into a dotted field prefix (e.g. event.data.). */
function getTrailingDotFieldPrefix(query: string, tokens: LexerToken[]) {
  if (tokens.length < 2) {
    return;
  }

  const dotToken = tokens[tokens.length - 1];
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
