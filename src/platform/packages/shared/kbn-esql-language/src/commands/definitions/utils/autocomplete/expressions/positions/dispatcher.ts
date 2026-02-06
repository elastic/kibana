/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ISuggestionItem } from '../../../../../registry/types';
import type { ExpressionPosition } from '../position';
import type { ExpressionContext } from '../types';
import { suggestAfterCast } from './after_cast';
import { suggestAfterComplete } from './after_complete';
import { suggestAfterNot } from './after_not';
import { suggestAfterOperator } from './after_operator';
import { suggestForEmptyExpression } from './empty_expression';
import { suggestInFunction } from './in_function';

const handlers: Record<ExpressionPosition, (ctx: ExpressionContext) => Promise<ISuggestionItem[]>> =
  {
    in_function: suggestInFunction,
    after_operator: suggestAfterOperator,
    after_complete: suggestAfterComplete,
    after_not: suggestAfterNot,
    after_cast: suggestAfterCast,
    empty_expression: suggestForEmptyExpression,
  };

export async function dispatchStates(
  context: ExpressionContext,
  position: ExpressionPosition
): Promise<ISuggestionItem[]> {
  const handler = handlers[position];

  return handler(context);
}
