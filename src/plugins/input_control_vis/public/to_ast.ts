/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { buildExpression, buildExpressionFunction } from '../../expressions/public';
import { Vis } from '../../visualizations/public';
import { InputControlExpressionFunctionDefinition } from './input_control_fn';
import { InputControlVisParams } from './types';

export const toExpressionAst = (vis: Vis<InputControlVisParams>) => {
  const inputControl = buildExpressionFunction<InputControlExpressionFunctionDefinition>(
    'input_control_vis',
    {
      visConfig: JSON.stringify(vis.params),
    }
  );

  const ast = buildExpression([inputControl]);

  return ast.toAst();
};
