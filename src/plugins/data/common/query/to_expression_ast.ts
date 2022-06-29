/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { isOfAggregateQueryType, getAggregateQueryMode } from '@kbn/es-query';
import { buildExpression, buildExpressionFunction } from '@kbn/expressions-plugin/common';
import type { DataViewsContract } from '@kbn/data-views-plugin/common';
import {
  ExpressionFunctionKibana,
  ExpressionFunctionKibanaContext,
  QueryState,
  aggregateQueryToAst,
  timerangeToAst,
} from '..';

function getIndexPatternFromSQLQuery(sqlQuery?: string): string {
  const sql = sqlQuery?.replaceAll('"', '');
  const matches = sql?.match(/FROM\s+([\w*]+)/);
  if (matches) {
    return matches[1];
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
      const idsTitles = await dataViewsService.getIdsWithTitle();
      const dataViewIdTitle = idsTitles.find(({ title }) => title === idxPattern);
      if (dataViewIdTitle) {
        const dataView = await dataViewsService.get(dataViewIdTitle.id);
        const timeFieldName = dataView.timeFieldName;
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
