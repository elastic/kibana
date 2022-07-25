/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { buildExpression, buildExpressionFunction } from '@kbn/expressions-plugin/common';
import {
  ExpressionFunctionKibana,
  ExpressionFunctionKibanaContext,
  filtersToAst,
  QueryState,
  queryToAst,
  timerangeToAst,
} from '..';

/**
 * Converts QueryState to expression AST
 * @param filters array of kibana filters
 * @param query kibana query
 * @param time kibana time range
 */
export function queryStateToExpressionAst({ filters, query, time }: QueryState) {
  const kibana = buildExpressionFunction<ExpressionFunctionKibana>('kibana', {});
  const kibanaContext = buildExpressionFunction<ExpressionFunctionKibanaContext>('kibana_context', {
    q: query && queryToAst(query),
    filters: filters && filtersToAst(filters),
    timeRange: time && timerangeToAst(time),
  });

  const ast = buildExpression([kibana, kibanaContext]);
  return ast;
}
