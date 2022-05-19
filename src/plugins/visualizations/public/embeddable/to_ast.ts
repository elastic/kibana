/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ExpressionFunctionKibana } from '@kbn/data-plugin/public';
import { buildExpressionFunction } from '@kbn/expressions-plugin/public';

import { VisToExpressionAst } from '../types';

/**
 * Creates an ast expression for a visualization based on kibana context (query, filters, timerange)
 * including a saved search if the visualization is based on it.
 * The expression also includes particular visualization expression ast if presented.
 *
 * @internal
 */
export const toExpressionAst: VisToExpressionAst = async (vis, params) => {
  if (!vis.type.toExpressionAst) {
    throw new Error('Visualization type definition should have toExpressionAst function defined');
  }

  const { searchSource } = vis.data;
  const visExpressionAst = await vis.type.toExpressionAst(vis, params);
  const searchSourceExpressionAst = searchSource?.toExpressionAst();

  // expand the expression chain with a particular visualization expression chain, if it exists
  searchSourceExpressionAst?.chain.push(...visExpressionAst.chain);

  const expression = searchSourceExpressionAst ?? visExpressionAst;
  expression.chain.unshift(buildExpressionFunction<ExpressionFunctionKibana>('kibana', {}).toAst());

  return expression;
};
