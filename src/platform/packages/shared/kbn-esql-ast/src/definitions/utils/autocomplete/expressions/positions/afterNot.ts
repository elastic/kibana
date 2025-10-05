/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isFunctionExpression } from '../../../../../ast/is';
import type { ISuggestionItem } from '../../../../../commands_registry/types';
import { getFieldsSuggestions, getFunctionsSuggestions } from '../../helpers';
import { getOperatorsSuggestionsAfterNot } from '../../../operators';
import type { ExpressionContext } from '../types';
import { getColumnsByTypeFromCtx, getLicenseCheckerFromCtx } from '../utils';
import type { GetColumnsByTypeFn } from '../../../../../commands_registry/types';

/**
 * Suggests completions after the NOT keyword
 * - After unary NOT function: NOT / (suggest boolean functions/fields)
 * - After NOT keyword before operators: field NOT / (suggest IN, LIKE, RLIKE)
 */
export async function suggestAfterNot(ctx: ExpressionContext): Promise<ISuggestionItem[]> {
  const { expressionRoot, location } = ctx;

  // Case 1: Unary NOT operator - suggest boolean expressions
  if (expressionRoot && isFunctionExpression(expressionRoot) && expressionRoot.name === 'not') {
    const { context } = ctx;
    const getByType: GetColumnsByTypeFn = (types, ignored, options) =>
      getColumnsByTypeFromCtx(ctx, types, ignored, options);

    return [
      ...getFunctionsSuggestions({
        location,
        types: ['boolean'],
        options: {},
        context,
        callbacks: { hasMinimumLicenseRequired: getLicenseCheckerFromCtx(ctx) },
      }),
      ...(await getFieldsSuggestions(['boolean'], getByType, {
        addSpaceAfterField: true,
        openSuggestions: true,
        promoteToTop: false,
      })),
    ];
  }

  // Case 2: NOT as part of binary operator - suggest NOT IN, NOT LIKE, NOT RLIKE
  return getOperatorsSuggestionsAfterNot();
}
