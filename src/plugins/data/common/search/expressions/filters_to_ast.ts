/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Filter, FILTERS, fromCombinedFilter } from '@kbn/es-query';
import { buildExpression, buildExpressionFunction } from '@kbn/expressions-plugin/common';
import { ExpressionFunctionKibanaFilter } from './kibana_filter';

export const filtersToAst = (filters: Filter[] | Filter) => {
  return (Array.isArray(filters) ? filters : [filters]).map((filter) => {
    const filterWithQuery =
      filter.meta.type === FILTERS.COMBINED ? fromCombinedFilter(filter) : filter;
    const { meta, $state, query, ...restOfFilters } = filterWithQuery;

    return buildExpression([
      buildExpressionFunction<ExpressionFunctionKibanaFilter>('kibanaFilter', {
        query: JSON.stringify(query || restOfFilters),
        negate: meta.negate,
        disabled: meta.disabled,
      }),
    ]).toAst();
  });
};
