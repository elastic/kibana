/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { buildExpression, buildExpressionFunction } from '../../expressions/public';
import { Vis } from '../../visualizations/public';
import { TimelionExpressionFunctionDefinition, TimelionVisParams } from './timelion_vis_fn';

export const toExpressionAst = (vis: Vis<TimelionVisParams>) => {
  const { expression, interval } = vis.params;

  const timelion = buildExpressionFunction<TimelionExpressionFunctionDefinition>('timelion_vis', {
    expression,
    interval,
  });

  const ast = buildExpression([timelion]);

  return ast.toAst();
};
