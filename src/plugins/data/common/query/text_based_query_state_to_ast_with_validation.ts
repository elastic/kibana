/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import {
  isOfAggregateQueryType,
  Query,
  getTimeFieldFromTextBasedQuery,
  removeCustomFilteringFromQuery,
} from '@kbn/es-query';
import type { DataViewsContract } from '@kbn/data-views-plugin/common';
import type { QueryState } from '..';
import { textBasedQueryStateToExpressionAst } from './text_based_query_state_to_ast';

interface Args extends QueryState {
  dataViewsService: DataViewsContract;
  inputQuery?: Query;
  timeFieldName?: string;
}

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
    const timeField = getTimeFieldFromTextBasedQuery(query);
    const finalQuery = removeCustomFilteringFromQuery(query, timeField);

    ast = textBasedQueryStateToExpressionAst({
      filters,
      query: finalQuery,
      inputQuery,
      time,
      timeFieldName: timeField,
    });
  }
  return ast;
}
