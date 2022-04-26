/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ExpressionFunctionKibana, ExpressionFunctionKibanaContext } from '@kbn/data-plugin/public';
import { buildExpression, buildExpressionFunction } from '@kbn/expressions-plugin/public';

import { queryToAst, filtersToAst } from '@kbn/data-plugin/common';
import { VisToExpressionAst } from '../types';

/**
 * Creates an ast expression for a visualization based on kibana context (query, filters, timerange)
 * including a saved search if the visualization is based on it.
 * The expression also includes particular visualization expression ast if presented.
 *
 * @internal
 */
export const toExpressionAst: VisToExpressionAst = async (vis, params) => {
  const { savedSearchId, searchSource } = vis.data;
  const query = searchSource?.getField('query');
  let filters = searchSource?.getField('filter');
  if (typeof filters === 'function') {
    filters = filters();
  }

  const kibana = buildExpressionFunction<ExpressionFunctionKibana>('kibana', {});
  const kibanaContext = buildExpressionFunction<ExpressionFunctionKibanaContext>('kibana_context', {
    q: query && queryToAst(query),
    filters: filters && filtersToAst(filters),
    savedSearchId,
  });

  const ast = buildExpression([kibana, kibanaContext]);
  const expression = ast.toAst();

  if (!vis.type.toExpressionAst) {
    throw new Error('Visualization type definition should have toExpressionAst function defined');
  }

  const visExpressionAst = await vis.type.toExpressionAst(vis, params);
  // expand the expression chain with a particular visualization expression chain, if it exists
  expression.chain.push(...visExpressionAst.chain);

  return expression;
};
