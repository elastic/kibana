/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ISuggestionItem } from '../../../../../commands_registry/types';
import type { ESQLFunction } from '../../../../../types';
import { getExpressionType, getRightmostNonVariadicOperator } from '../../../expressions';
import { getSuggestionsToRightOfOperatorExpression } from '../../../operators';
import { dispatchOperators } from '../operators/dispatcher';
import type { ExpressionContext } from '../types';
import { getColumnsByTypeFromCtx, getLicenseCheckerFromCtx } from '../utils';

/**
 * Suggests completions after an operator
 * Called for 'after_operator' position (e.g., field = |, field IN |)
 * Delegates to special case handlers first, then suggests appropriate right-hand values
 */
export async function suggestAfterOperator(ctx: ExpressionContext): Promise<ISuggestionItem[]> {
  const { expressionRoot, innerText } = ctx;

  if (!expressionRoot) {
    return [];
  }

  // Try special case handling first (IN, IS NULL, etc.)
  const specialSuggestions = await dispatchOperators(ctx);

  if (specialSuggestions) {
    return specialSuggestions;
  }

  // Default: suggest appropriate values/operators to the right
  const fn = expressionRoot as ESQLFunction;
  const rightmostOperator = getRightmostNonVariadicOperator(fn) as ESQLFunction;

  return getSuggestionsToRightOfOperatorExpression({
    queryText: innerText,
    location: ctx.location,
    rootOperator: rightmostOperator,
    preferredExpressionType: ctx.options.preferredExpressionType,
    getExpressionType: (expression) => getExpressionType(expression, ctx.context?.columns),
    getColumnsByType: (types, ignored, options) =>
      getColumnsByTypeFromCtx(ctx, types, ignored, options),
    context: ctx.context,
    callbacks: { hasMinimumLicenseRequired: getLicenseCheckerFromCtx(ctx) },
    addSpaceAfterOperator: ctx.options.addSpaceAfterOperator,
    openSuggestions: ctx.options.openSuggestions,
    functionParameterContext: ctx.options.functionParameterContext,
  });
}
