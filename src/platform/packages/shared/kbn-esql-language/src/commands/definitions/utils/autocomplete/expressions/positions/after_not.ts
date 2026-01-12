/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isFunctionExpression } from '../../../../../../ast/is';
import type { ISuggestionItem } from '../../../../../registry/types';
import { getOperatorSuggestion } from '../../../operators';
import type { ExpressionContext } from '../types';
import { SuggestionBuilder } from '../suggestion_builder';
import { operatorsDefinitions } from '../../../../all_operators';

/**
 * Suggests completions after the NOT keyword
 * - After unary NOT function: NOT / (suggest boolean functions/fields)
 * - After NOT keyword before operators: field NOT / (suggest IN, LIKE, RLIKE)
 */
export async function suggestAfterNot(ctx: ExpressionContext): Promise<ISuggestionItem[]> {
  const { expressionRoot } = ctx;

  // Case 1: Unary NOT operator - suggest boolean expressions
  if (expressionRoot && isFunctionExpression(expressionRoot) && expressionRoot.name === 'not') {
    const builder = new SuggestionBuilder(ctx);

    await builder.addFields({
      types: ['boolean'],
      addSpaceAfterField: true,
      promoteToTop: false,
    });

    builder.addFunctions({
      types: ['boolean'],
    });

    return builder.build();
  }

  // Case 2: NOT as part of binary operator - suggest IN, LIKE, RLIKE
  return operatorsDefinitions
    .filter(({ name }) => name === 'like' || name === 'rlike' || name === 'in')
    .map(getOperatorSuggestion);
}
