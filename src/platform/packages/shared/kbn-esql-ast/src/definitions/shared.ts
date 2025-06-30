/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { getLastNonWhitespaceChar } from '../commands_registry/utils/autocomplete';
import type { ESQLAstItem } from '../types';
import type { SupportedDataType } from './types';
/**
 * In several cases we don't want to count the last arg if it is
 * of type unknown.
 *
 * this solves for the case where the user has typed a
 * prefix (e.g. "keywordField != tex/")
 *
 * "tex" is not a recognizable identifier so it is of
 * type "unknown" which leads us to continue suggesting
 * fields/functions.
 *
 * Monaco will then filter our suggestions list
 * based on the "tex" prefix which gives the correct UX
 */
export function removeFinalUnknownIdentiferArg(
  args: ESQLAstItem[],
  getExpressionType: (expression: ESQLAstItem) => SupportedDataType | 'unknown'
) {
  return getExpressionType(args[args.length - 1]) === 'unknown'
    ? args.slice(0, args.length - 1)
    : args;
}

/**
 * Checks the suggestion text for overlap with the current query.
 *
 * This is useful to determine the range of the existing query that should be
 * replaced if the suggestion is accepted.
 *
 * For example
 * QUERY: FROM source | WHERE field IS NO
 * SUGGESTION: IS NOT NULL
 *
 * The overlap is "IS NO" and the range to replace is "IS NO" in the query.
 *
 * @param query
 * @param suggestionText
 * @returns
 */
export function getOverlapRange(
  query: string,
  suggestionText: string
): { start: number; end: number } | undefined {
  let overlapLength = 0;

  // Convert both strings to lowercase for case-insensitive comparison
  const lowerQuery = query.toLowerCase();
  const lowerSuggestionText = suggestionText.toLowerCase();

  for (let i = 0; i <= lowerSuggestionText.length; i++) {
    const substr = lowerSuggestionText.substring(0, i);
    if (lowerQuery.endsWith(substr)) {
      overlapLength = i;
    }
  }

  if (overlapLength === 0) {
    return;
  }

  return {
    start: query.length - overlapLength,
    end: query.length,
  };
}

/**
 * Works backward from the cursor position to determine if
 * the final character of the previous word matches the given character.
 */
function characterPrecedesCurrentWord(text: string, char: string) {
  let inCurrentWord = true;
  for (let i = text.length - 1; i >= 0; i--) {
    if (inCurrentWord && /\s/.test(text[i])) {
      inCurrentWord = false;
    }

    if (!inCurrentWord && !/\s/.test(text[i])) {
      return text[i] === char;
    }
  }
}

export function pipePrecedesCurrentWord(text: string) {
  return characterPrecedesCurrentWord(text, '|');
}

/**
 * Are we after a comma? i.e. STATS fieldA, <here>
 */
export function isRestartingExpression(text: string) {
  return getLastNonWhitespaceChar(text) === ',' || characterPrecedesCurrentWord(text, ',');
}
