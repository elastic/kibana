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
import { getFunctionSuggestions } from '../../../functions';
import { getOperatorsSuggestionsAfterNot } from '../../../operators';
import type { ExpressionContext } from '../context';

/**
 * Handles suggestions after the NOT keyword
 *
 * This handler covers two cases:
 * - After unary NOT function: NOT / (suggest boolean functions/fields)
 * - After NOT keyword before operators: field NOT / (suggest IN, LIKE, RLIKE)
 */
export async function handleAfterNot(ctx: ExpressionContext): Promise<ISuggestionItem[]> {
  const { expressionRoot, location, env } = ctx;

  // Case 1: Unary NOT operator - suggest boolean expressions
  // Example: WHERE NOT / → suggest boolean fields and functions
  if (expressionRoot && isFunctionExpression(expressionRoot) && expressionRoot.name === 'not') {
    return [
      ...getFunctionSuggestions(
        { location, returnTypes: ['boolean'] },
        env.hasMinimumLicenseRequired,
        env.activeProduct
      ),
      ...(await env.getColumnsByType('boolean', [], {
        advanceCursor: true,
        openSuggestions: true,
      })),
    ];
  }

  // Case 2: NOT as part of binary operator - suggest NOT IN, NOT LIKE, NOT RLIKE
  // Example: field NOT / → suggest IN, LIKE, RLIKE
  return getOperatorsSuggestionsAfterNot();
}
