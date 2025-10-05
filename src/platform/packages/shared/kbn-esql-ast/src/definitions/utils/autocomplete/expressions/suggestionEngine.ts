/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ISuggestionItem } from '../../../../commands_registry/types';
import { getOverlapRange } from '../../shared';
import { dispatchStates } from './positions/dispatcher';
import { getPosition, type ExpressionPosition } from './position';
import type {
  ExpressionContext,
  ExpressionContextOptions,
  SuggestForExpressionParams,
} from './types';
import { isNullCheckOperator } from './utils';

const WHITESPACE_REGEX = /\s/;
const LAST_WORD_BOUNDARY_REGEX = /\b\w(?=\w*$)/;

/** Coordinates position detection, handler selection, and range attachment */
export async function suggestForExpression(
  params: SuggestForExpressionParams
): Promise<ISuggestionItem[]> {
  const baseCtx = buildContext(params);
  const position: ExpressionPosition = getPosition(baseCtx.innerText, baseCtx.expressionRoot);

  const ctx = { ...baseCtx, position };
  const suggestions = await dispatchStates(ctx, position);

  attachRanges(ctx, suggestions);

  return suggestions;
}

/** Derives innerText and option flags from the incoming params.*/
export function buildContext(params: SuggestForExpressionParams): ExpressionContext {
  const { query, cursorPosition } = params;
  const innerText = query.slice(0, cursorPosition);
  const isCursorFollowedByComma = query.slice(cursorPosition).trimStart().startsWith(',');

  const baseOptions: ExpressionContextOptions = params.options ?? ({} as ExpressionContextOptions);
  const options: ExpressionContextOptions = { ...baseOptions, isCursorFollowedByComma };

  return {
    query,
    cursorPosition,
    innerText,
    expressionRoot: params.expressionRoot,
    location: params.location!,
    command: params.command,
    context: params.context,
    callbacks: params.callbacks,
    options,
  };
}

/** Range policy: NULL-check → overlap; else replace last word if non-space, insert otherwise. */
function attachRanges(ctx: ExpressionContext, suggestions: ISuggestionItem[]) {
  const { innerText } = ctx;
  const lastChar = innerText[innerText.length - 1];
  const hasNonWhitespacePrefix = !WHITESPACE_REGEX.test(lastChar);

  suggestions.forEach((suggestion) => {
    if (isNullCheckOperator(suggestion.text)) {
      suggestion.rangeToReplace = getOverlapRange(innerText, suggestion.text);

      return;
    }

    if (hasNonWhitespacePrefix) {
      const lastNonWhitespaceIndex = innerText.search(LAST_WORD_BOUNDARY_REGEX);
      suggestion.rangeToReplace = { start: lastNonWhitespaceIndex, end: innerText.length };
    }
  });
}
