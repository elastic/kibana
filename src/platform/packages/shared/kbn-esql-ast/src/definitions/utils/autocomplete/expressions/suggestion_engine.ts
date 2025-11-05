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
  const partialSuggestions = await trySuggestForPartialOperators(baseCtx);

  if (partialSuggestions !== null) {
    return attachRanges(baseCtx, partialSuggestions);
  }

  const position: ExpressionPosition = getPosition(baseCtx.innerText, baseCtx.expressionRoot);

  const ctx = { ...baseCtx, position };
  const suggestions = await dispatchStates(ctx, position);
  return attachRanges(ctx, suggestions);
}

/**
 * Handles IN/NOT IN, LIKE/RLIKE, and IS/IS NOT operators.
 *
 * Use cases:
 * 1. Partial operator typing: "field IS ", "field IS N", "field LIKE "
 * 2. Complete operator without AST: "CASE(field IN(" - operator complete but no AST node
 *
 * - If valid AST node exists: uses it directly (preserves parser information)
 * - If AST missing/incomplete: creates synthetic node or suggests directly
 *
 * Skips when AST has a complete operator node - normal flow handles it.
 */
async function trySuggestForPartialOperators(
  ctx: ExpressionContext
): Promise<ISuggestionItem[] | null> {
  const { innerText, expressionRoot } = ctx;

  const detection = detectNullCheck(innerText) || detectLike(innerText) || detectIn(innerText);

  if (!detection) {
    return null;
  }

  // If we have an AST operator node, check if it's complete
  if (expressionRoot?.type === 'function') {
    const astOperatorName = expressionRoot.name?.toLowerCase();
    const isIncomplete = expressionRoot.incomplete;

    // Build list of all operator names that we handle in the partial system
    const managedPartialOperators = [
      ...nullCheckOperators.map((op) => op.name),
      ...inOperators.map((op) => op.name),
      ...patternMatchOperators.map((op) => op.name),
    ];

    // If AST has a complete operator node (not incomplete), let normal flow handle it
    if (managedPartialOperators.includes(astOperatorName) && !isIncomplete) {
      return null;
    }
  }

  return dispatchPartialOperators(detection.operatorName, detection, ctx);
}

/** Derives innerText and option flags from the incoming params.*/
function buildContext(params: SuggestForExpressionParams): ExpressionContext {
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
