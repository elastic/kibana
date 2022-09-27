/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import {
  isOfAggregateQueryType,
  getIndexPatternFromSQLQuery,
  Query,
  AggregateQuery,
} from '@kbn/es-query';
import type { DataViewsContract } from '@kbn/data-views-plugin/common';
import type { QueryState } from '..';
import { textBasedQueryStateToExpressionAst } from './text_based_query_state_to_ast';

interface Args extends QueryState {
  dataViewsService: DataViewsContract;
  inputQuery?: Query;
}

const getIndexPatternFromAggregateQuery = (query: AggregateQuery) => {
  if ('sql' in query) {
    return getIndexPatternFromSQLQuery(query.sql);
  }
};

/**
 * Converts QueryState to expression AST
 * @param filters array of kibana filters
 * @param query kibana query or aggregate query
 * @param time kibana time range
 */
export async function textBasedQueryStateToAstWithValidation({
  filters,
  query,
  inputQuery,
  time,
  dataViewsService,
}: Args) {
  let ast;
  if (query && isOfAggregateQueryType(query)) {
    // sql query
    const idxPattern = getIndexPatternFromAggregateQuery(query);
    const idsTitles = await dataViewsService.getIdsWithTitle();
    const dataViewIdTitle = idsTitles.find(({ title }) => title === idxPattern);

    if (dataViewIdTitle) {
      const dataView = await dataViewsService.get(dataViewIdTitle.id);
      const timeFieldName = dataView.timeFieldName;

      ast = textBasedQueryStateToExpressionAst({
        filters,
        query,
        inputQuery,
        time,
        timeFieldName,
      });
    } else {
      throw new Error(`No data view found for index pattern ${idxPattern}`);
    }
  }
  return ast;
}
