/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Query } from '@kbn/es-query';
import type { QueryState } from '..';
interface Args extends QueryState {
  timeFieldName?: string;
  inputQuery?: Query;
  titleForInspector?: string;
  descriptionForInspector?: string;
  ignoreGlobalFilters?: boolean;
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
export declare function textBasedQueryStateToExpressionAst({
  filters,
  query,
  inputQuery,
  time,
  timeFieldName,
  titleForInspector,
  descriptionForInspector,
  ignoreGlobalFilters,
}: Args): import('@kbn/expressions-plugin/common').ExpressionAstExpression;
export {};
