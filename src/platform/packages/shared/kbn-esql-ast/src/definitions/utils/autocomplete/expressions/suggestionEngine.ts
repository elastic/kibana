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
import {
  OperatorDetectorRegistry,
  ListDetector,
  LikePatternDetector,
  NullCheckDetector,
} from './operators/partial';

const WHITESPACE_REGEX = /\s/;
const LAST_WORD_BOUNDARY_REGEX = /\b\w(?=\w*$)/;

// Initialize the operator detector registry (singleton)
let operatorDetectorRegistry: OperatorDetectorRegistry | null = null;

// Get or create the registry instance
function getOperatorDetectorRegistry(): OperatorDetectorRegistry {
  if (!operatorDetectorRegistry) {
    operatorDetectorRegistry = new OperatorDetectorRegistry();
    // Register detectors in priority order
    operatorDetectorRegistry.register(new ListDetector());
    operatorDetectorRegistry.register(new LikePatternDetector());
    operatorDetectorRegistry.register(new NullCheckDetector());
  }

  return operatorDetectorRegistry;
}

/** Coordinates position detection, handler selection, and range attachment */
export async function suggestForExpression(
  params: SuggestForExpressionParams
): Promise<ISuggestionItem[]> {
  const baseCtx = buildContext(params);
  // Pre-pass: handle partial operators (IN/NOT IN, LIKE/RLIKE/NOT LIKE, IS/IS NOT)
  const preSuggestions = await trySuggestForPartialOperators(baseCtx);
  if (preSuggestions?.length) {
    return attachRanges(baseCtx, preSuggestions);
  }
  const position: ExpressionPosition = getPosition(baseCtx.innerText, baseCtx.expressionRoot);

  const ctx = { ...baseCtx, position };
  const suggestions = await dispatchStates(ctx, position);

  return attachRanges(ctx, suggestions);
}

/**
 * Pre-pass for partial operator tokens.
 * Uses the detector registry pattern to handle IN/NOT IN, LIKE/RLIKE, and IS/IS NOT operators.
 * Purpose: provide operator-specific suggestions even inside function args
 * (e.g. CASE(field IN ▌), CASE(field IS ▌)) when the user is typing a partial operator.
 *
 * Runs for both cases:
 * - When AST doesn't exist yet (e.g., deep inside CASE without full expression)
 * - When AST exists but user is typing a partial operator (e.g., "field IS ")
 */
async function trySuggestForPartialOperators(
  ctx: ExpressionContext
): Promise<ISuggestionItem[] | null> {
  const { query, cursorPosition, innerText } = ctx;

  // Use the full text before cursor for detection
  const textBeforeCursor = query ? query.substring(0, cursorPosition) : innerText;
  const registry = getOperatorDetectorRegistry();

  return await registry.detectAndSuggest(textBeforeCursor, ctx);
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
