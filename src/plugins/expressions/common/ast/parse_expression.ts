/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ExpressionAstExpression } from './types';
import { parse } from './parse';

/**
 * Given expression pipeline string, returns parsed AST.
 *
 * @param expression Expression pipeline string.
 */
export function parseExpression(expression: string): ExpressionAstExpression {
  return parse(expression, 'expression');
}
