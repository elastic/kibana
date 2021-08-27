/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { buildExpression } from '../../../../expressions/common/ast/build_expression';
import { buildExpressionFunction } from '../../../../expressions/common/ast/build_function';
import type { Cidr, ExpressionFunctionCidr } from './cidr';

export const cidrToAst = (cidr: Cidr) => {
  return buildExpression([buildExpressionFunction<ExpressionFunctionCidr>('cidr', cidr)]).toAst();
};
