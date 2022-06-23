/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ExpressionFunctionKibana } from '@kbn/data-plugin/public';
import { ExpressionAstExpression, buildExpressionFunction } from '@kbn/expressions-plugin/public';

import type { VisToExpressionAst } from '../types';

/**
 * Creates an ast expression for a visualization based on kibana context (query, filters, timerange)
 * including a saved search if the visualization is based on it.
 * The expression also includes particular visualization expression ast if presented.
 *
 * @internal
 */
export const toExpressionAst: VisToExpressionAst = async (
  vis,
  params
): Promise<ExpressionAstExpression> => {
  if (!vis.type.toExpressionAst) {
    throw new Error('Visualization type definition should have toExpressionAst function defined');
  }

  const searchSource = vis.data.searchSource?.createCopy();

  if (vis.data.aggs) {
    const aggs = vis.data.aggs.clone({
      opts: {
        hierarchical: vis.isHierarchical(),
        partialRows:
          typeof vis.type.hasPartialRows === 'function'
            ? vis.type.hasPartialRows(vis)
            : vis.type.hasPartialRows,
      },
    });

    searchSource?.setField('aggs', aggs);
  }

  const visExpressionAst = await vis.type.toExpressionAst(vis, params);
  const searchSourceExpressionAst = searchSource?.toExpressionAst({
    asDatatable: vis.type.fetchDatatable,
  });

  const expression = {
    ...visExpressionAst,
    chain: [
      buildExpressionFunction<ExpressionFunctionKibana>('kibana', {}).toAst(),
      ...(searchSourceExpressionAst?.chain ?? []),
      ...visExpressionAst.chain,
    ],
  };

  return expression;
};
