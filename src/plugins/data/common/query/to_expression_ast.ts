/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import {
  isOfAggregateQueryType,
  getAggregateQueryMode,
  Query,
  getIndexPatternFromSQLQuery,
} from '@kbn/es-query';
import { buildExpression, buildExpressionFunction } from '@kbn/expressions-plugin/common';
import type { DataViewsContract, DataView } from '@kbn/data-views-plugin/common';
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
  dataViewsService: DataViewsContract;
  inputQuery?: Query;
  adHocDataView?: DataView;
}

/**
 * Converts QueryState to expression AST
 * @param filters array of kibana filters
 * @param query kibana query or aggregate query
 * @param time kibana time range
 */
export async function queryStateToExpressionAst({
  filters,
  query,
  inputQuery,
  time,
  dataViewsService,
  adHocDataView,
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
    const mode = getAggregateQueryMode(query);
    // sql query
    if (mode === 'sql' && 'sql' in query) {
      const idxPattern = getIndexPatternFromSQLQuery(query.sql);
      const idsTitles = await dataViewsService.getIdsWithTitle();

      let dataViewId = idsTitles.find(({ title }) => title === idxPattern)?.id;
      // use ad-hoc data view if exists
      if (!dataViewId && adHocDataView?.title === idxPattern) {
        dataViewId = adHocDataView.id;
      }

      if (dataViewId) {
        const dataView = await dataViewsService.get(dataViewId);
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
