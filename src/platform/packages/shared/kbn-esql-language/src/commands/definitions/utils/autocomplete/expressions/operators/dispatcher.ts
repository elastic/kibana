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
import type { ESQLFunction } from '../../../../../../types';
import type { ExpressionContext } from '../types';
import { handleListOperator } from './handlers';
import { handleStringListOperator, handleNullCheckOperator } from './handlers';

const handlers: Record<string, (ctx: ExpressionContext) => Promise<ISuggestionItem[] | null>> = {
  in: handleListOperator,
  'not in': handleListOperator,
  like: handleStringListOperator,
  rlike: handleStringListOperator,
  'not like': handleStringListOperator,
  'not rlike': handleStringListOperator,
  'is null': handleNullCheckOperator,
  'is not null': handleNullCheckOperator,
};

export async function dispatchOperators(ctx: ExpressionContext): Promise<ISuggestionItem[] | null> {
  const { expressionRoot } = ctx;

  if (!expressionRoot || !isFunctionExpression(expressionRoot)) {
    return null;
  }

  const { name } = expressionRoot as ESQLFunction;
  const handler = handlers[name.toLocaleLowerCase()];

  if (!handler) {
    return null;
  }

  return handler(ctx);
}
