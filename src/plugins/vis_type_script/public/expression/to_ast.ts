/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { VisToExpressionAst } from '@kbn/visualizations-plugin/public';
import { buildExpression, buildExpressionFunction } from '@kbn/expressions-plugin/public';
import type { ExpressionFunctionDefinition, Render } from '@kbn/expressions-plugin/public';
import type { RenderValue } from './renderer';
import { VisParams } from '../types';

type ScriptVisExpressionFunctionDefinition = ExpressionFunctionDefinition<
  'scriptVis',
  unknown,
  {},
  Render<RenderValue>
>;

export const toExpressionAst: VisToExpressionAst<VisParams> = (vis) => {
  const scriptVis = buildExpressionFunction<ScriptVisExpressionFunctionDefinition>('scriptVis', {
    script: vis.params.script,
    dependencyUrls: vis.params.dependencyUrls,
  });

  const ast = buildExpression([scriptVis]);

  return ast.toAst();
};
