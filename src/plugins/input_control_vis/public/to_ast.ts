/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { buildExpression, buildExpressionFunction } from '@kbn/expressions-plugin/public';
import { Vis } from '@kbn/visualizations-plugin/public';
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
