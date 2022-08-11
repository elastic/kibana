/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { buildExpression, buildExpressionFunction } from '@kbn/expressions-plugin/common';
import { ExpressionFunctionExtendedBounds, ExtendedBounds } from './extended_bounds';

export const extendedBoundsToAst = (extendedBounds: ExtendedBounds) => {
  return buildExpression([
    buildExpressionFunction<ExpressionFunctionExtendedBounds>('extendedBounds', extendedBounds),
  ]).toAst();
};
