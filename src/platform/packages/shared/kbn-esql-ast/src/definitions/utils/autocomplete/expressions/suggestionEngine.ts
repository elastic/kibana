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
import { dispatchOperators } from './operators/dispatcher';
import {
  endsWithInOrNotInToken,
  endsWithLikeOrRlikeToken,
  endsWithIsOrIsNotToken,
} from './operators/utils';
import type { ESQLFunction } from '../../../../types';
import { getExpressionType } from '../../expressions';
import { getNullCheckOperatorSuggestions } from '../../operators';

const WHITESPACE_REGEX = /\s/;
const LAST_WORD_BOUNDARY_REGEX = /\b\w(?=\w*$)/;

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
 * Pre-pass for partial operator tokens before the AST exists.
 * - Detects trailing IN/NOT IN, LIKE/RLIKE/NOT LIKE, IS/IS NOT.
 * - IN/LIKE: synthesize a temporary binary node and dispatch operator handlers.
 * - IS: return null-check suggestions based on the left type.
 * Purpose: provide operator-specific suggestions (e.g. list/patterns) even inside
 * function args (e.g. CASE(field IN ▌)) before the parser forms the operator node.
 */
async function trySuggestForPartialOperators(
  ctx: ExpressionContext
): Promise<ISuggestionItem[] | null> {
  const { innerText, expressionRoot } = ctx;
  const trimmed = innerText.trimEnd();
  const low = trimmed.toLowerCase();

  const buildSyntheticBinary = (opName: 'in' | 'not in' | 'like' | 'rlike'): ESQLFunction => {
    const L = innerText.length;
    return {
      type: 'function',
      name: opName,
      subtype: 'binary-expression',
      args: [expressionRoot as any, undefined as any],
      incomplete: true,
      location: { min: L, max: L },
      text: opName,
    } as unknown as ESQLFunction;
  };

  // LIKE / RLIKE / NOT LIKE / NOT RLIKE
  if (endsWithLikeOrRlikeToken(trimmed)) {
    const opName = (low.endsWith('rlike') || low.endsWith('not rlike') ? 'rlike' : 'like') as
      | 'like'
      | 'rlike';
    const synthetic = buildSyntheticBinary(opName);

    return (await dispatchOperators({ ...ctx, expressionRoot: synthetic })) ?? [];
  }

  // IN / NOT IN
  if (endsWithInOrNotInToken(trimmed)) {
    const opName: 'in' | 'not in' = low.endsWith('not in') ? 'not in' : 'in';
    const synthetic = buildSyntheticBinary(opName);

    return (await dispatchOperators({ ...ctx, expressionRoot: synthetic })) ?? [];
  }

  // IS / IS NOT
  if (endsWithIsOrIsNotToken(trimmed)) {
    const leftType = getExpressionType(expressionRoot as any, ctx.context?.columns);
    const leftParamType = (
      leftType === 'unknown' || leftType === 'unsupported' ? 'any' : leftType
    ) as any;

    return getNullCheckOperatorSuggestions(innerText, ctx.location, leftParamType);
  }

  return null;
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
