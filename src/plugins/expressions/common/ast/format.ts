/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ExpressionAstExpression, ExpressionAstArgument } from './types';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { toExpression } = require('@kbn/interpreter');

export function format<T extends ExpressionAstExpression | ExpressionAstArgument>(
  ast: T,
  type: T extends ExpressionAstExpression ? 'expression' : 'argument'
): string {
  return toExpression(ast, type);
}
