/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { buildExpression, buildExpressionFunction } from '@kbn/expressions-plugin/common';
import type { DataViewsContract } from '@kbn/data-views-plugin/common';
import {
  ExpressionFunctionKibana,
  ExpressionFunctionKibanaContext,
  QueryState,
  aggregateQueryToAst,
  timerangeToAst,
} from '..';

import type { Query, AggregateQuery } from './types';

function isOfAggregateQueryType(query: AggregateQuery | Query): query is AggregateQuery {
  return Boolean(query && 'sql' in query);
}

function getAggregateQueryMode(query: AggregateQuery): string {
  return Object.keys(query)[0];
}

function getIndexPatternFromSQLQuery(sqlQuery?: string): string {
  const match = sqlQuery?.match(/FROM\s+(\w+)/);
  if (match) {
    return match[1];
  }
  return '';
}

interface Args extends QueryState {
  dataViewsService: DataViewsContract;
}

/**
 * Converts QueryState to expression AST
 * @param filters array of kibana filters
 * @param query kibana query or aggregate query
 * @param time kibana time range
 */
export async function queryStateToExpressionAst({ filters, query, time, dataViewsService }: Args) {
  const kibana = buildExpressionFunction<ExpressionFunctionKibana>('kibana', {});
  const kibanaContext = buildExpressionFunction<ExpressionFunctionKibanaContext>('kibana_context', {
    timeRange: time && timerangeToAst(time),
  });
  const ast = buildExpression([kibana, kibanaContext]).toAst();

  if (query && isOfAggregateQueryType(query)) {
    const mode = getAggregateQueryMode(query);
    if (mode === 'sql') {
      const idxPattern = getIndexPatternFromSQLQuery(query.sql);
      const dataView = await dataViewsService.find(idxPattern);
      if (dataView && dataView.length) {
        const timeFieldName = dataView[0].timeFieldName;
        const essql = aggregateQueryToAst(query, timeFieldName);

        if (essql) {
          ast.chain.push(essql);
        }
      } else {
        throw new Error(`No data view found for index pattern ${idxPattern}`);
      }
    }
  }
  return ast;
}
