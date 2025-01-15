/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isOfAggregateQueryType, Query } from '@kbn/es-query';
import { buildExpression, buildExpressionFunction } from '@kbn/expressions-plugin/common';
import {
  ExpressionFunctionKibana,
  ExpressionFunctionKibanaContext,
  QueryState,
  aggregateQueryToAst,
  queryToAst,
  filtersToAst,
  timerangeToAst,
} from '..';

interface Args extends QueryState {
  timeFieldName?: string;
  inputQuery?: Query;
  titleForInspector?: string;
  descriptionForInspector?: string;
}

/**
 * Converts QueryState to expression AST
 * @param filters array of kibana filters
 * @param query kibana query or aggregate query
 * @param inputQuery
 * @param time kibana time range
 * @param dataView
 * @param titleForInspector
 * @param descriptionForInspector
 */
export function textBasedQueryStateToExpressionAst({
  filters,
  query,
  inputQuery,
  time,
  timeFieldName,
  titleForInspector,
  descriptionForInspector,
}: Args) {
  const kibana = buildExpressionFunction<ExpressionFunctionKibana>('kibana', {});
  let q;
  if (inputQuery) {
    q = inputQuery;
  }
  const kibanaContext = buildExpressionFunction<ExpressionFunctionKibanaContext>('kibana_context', {
    q: q && queryToAst(q),
    timeRange: time && timerangeToAst(time),
    filters: filters && filtersToAst(filters),
  });
  const ast = buildExpression([kibana, kibanaContext]).toAst();

  if (query && isOfAggregateQueryType(query)) {
    const esql = aggregateQueryToAst({
      query,
      timeField: timeFieldName,
      titleForInspector,
      descriptionForInspector,
    });

    if (esql) {
      ast.chain.push(esql);
    }
  }
  return ast;
}
