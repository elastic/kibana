/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { ExpressionAstExpression } from './types';
import { format } from './format';

/**
 * Given expression pipeline AST, returns formatted string.
 *
 * @param ast Expression pipeline AST.
 */
export function formatExpression(ast: ExpressionAstExpression): string {
  return format(ast, 'expression');
}
