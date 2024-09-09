/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isOfAggregateQueryType, Query } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { QueryState } from '..';
import { textBasedQueryStateToExpressionAst } from './text_based_query_state_to_ast';

interface Args extends QueryState {
  dataView?: DataView;
  inputQuery?: Query;
  timeFieldName?: string;
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
export async function textBasedQueryStateToAstWithValidation({
  filters,
  query,
  inputQuery,
  time,
  dataView,
  titleForInspector,
  descriptionForInspector,
}: Args) {
  let ast;
  if (query && isOfAggregateQueryType(query)) {
    ast = textBasedQueryStateToExpressionAst({
      filters,
      query,
      inputQuery,
      time,
      timeFieldName: dataView?.timeFieldName,
      titleForInspector,
      descriptionForInspector,
    });
  }
  return ast;
}
