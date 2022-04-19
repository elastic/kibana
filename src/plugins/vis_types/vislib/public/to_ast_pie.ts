/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getVisSchemas, VisToExpressionAst } from '@kbn/visualizations-plugin/public';
import { buildExpression, buildExpressionFunction } from '@kbn/expressions-plugin/public';

import { PieVisParams } from './pie';
import { vislibPieName, VisTypeVislibPieExpressionFunctionDefinition } from './pie_fn';
import { getEsaggsFn } from './to_ast_esaggs';

export const toExpressionAst: VisToExpressionAst<PieVisParams> = async (vis, params) => {
  const schemas = getVisSchemas(vis, params);
  const visConfig = {
    ...vis.params,
    dimensions: {
      metric: schemas.metric[0],
      buckets: schemas.segment,
      splitRow: schemas.split_row,
      splitColumn: schemas.split_column,
    },
  };

  const visTypePie = buildExpressionFunction<VisTypeVislibPieExpressionFunctionDefinition>(
    vislibPieName,
    {
      visConfig: JSON.stringify(visConfig),
    }
  );

  const ast = buildExpression([getEsaggsFn(vis), visTypePie]);

  return ast.toAst();
};
