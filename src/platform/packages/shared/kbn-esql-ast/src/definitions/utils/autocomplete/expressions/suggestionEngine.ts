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
import { dispatchPartialOperators } from './operators/partial/dispatcher';
import { detectIn, detectLike, detectNullCheck } from './operators/partial/utils';
import { nullCheckOperators, inOperators, patternMatchOperators } from '../../../all_operators';

const WHITESPACE_REGEX = /\s/;
const LAST_WORD_BOUNDARY_REGEX = /\b\w(?=\w*$)/;

/** Coordinates position detection, handler selection, and range attachment */
export async function suggestForExpression(
  params: SuggestForExpressionParams
): Promise<ISuggestionItem[]> {
  const baseCtx = buildContext(params);
  const preSuggestions = await trySuggestForPartialOperators(baseCtx);

  if (preSuggestions !== null) {
    return attachRanges(baseCtx, preSuggestions);
  }

  const position: ExpressionPosition = getPosition(baseCtx.innerText, baseCtx.expressionRoot);

  const ctx = { ...baseCtx, position };
  const suggestions = await dispatchStates(ctx, position);
  return attachRanges(ctx, suggestions);
}

/**
 * Pre-pass for partial operator tokens before the AST exists.
 * Handles IN/NOT IN, LIKE/RLIKE, and IS/IS NOT operators.
 * Purpose: provide operator-specific suggestions even inside function args
 * (e.g. CASE(field IN ▌), CASE(field IS ▌)) when the user is typing a partial operator
 * and the parser hasn't formed the operator node yet.
 *
 * Only runs when AST doesn't have a complete operator node (e.g., deep inside CASE).
 * For complete expressions (e.g., WHERE field IN), the normal flow handles it.
 */
async function trySuggestForPartialOperators(
  ctx: ExpressionContext
): Promise<ISuggestionItem[] | null> {
  const { innerText, expressionRoot } = ctx;

  // Skip if we already have a complete operator function node (e.g., WHERE field LIKE)
  // In that case, the normal flow should handle it
  if (expressionRoot?.type === 'function') {
    const operatorName = (expressionRoot as any).name?.toLowerCase();

    // Combine all partial operators from definitions
    const partialOperatorNames = [
      ...nullCheckOperators.map((op) => op.name),
      ...inOperators.map((op) => op.name),
      ...patternMatchOperators.map((op) => op.name),
    ];

    if (partialOperatorNames.includes(operatorName)) {
      return null;
    }
  }

  // Try each detector in sequence
  const detection = detectNullCheck(innerText) || detectLike(innerText) || detectIn(innerText);

  if (!detection) {
    return null;
  }

  // Dispatch to appropriate handler
  const result = await dispatchPartialOperators(detection.operatorName, detection, ctx);

  return result;
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

/** Returns new suggestions array with range information */
function attachRanges(ctx: ExpressionContext, suggestions: ISuggestionItem[]): ISuggestionItem[] {
  const { innerText } = ctx;
  const lastChar = innerText[innerText.length - 1];
  const hasNonWhitespacePrefix = !WHITESPACE_REGEX.test(lastChar);

  return suggestions.map((suggestion) => {
    if (isNullCheckOperator(suggestion.text)) {
      return {
        ...suggestion,
        rangeToReplace: getOverlapRange(innerText, suggestion.text),
      };
    }

    if (hasNonWhitespacePrefix) {
      return {
        ...suggestion,
        rangeToReplace: {
          start: innerText.search(LAST_WORD_BOUNDARY_REGEX),
          end: innerText.length,
        },
      };
    }

    return { ...suggestion };
  });
}
