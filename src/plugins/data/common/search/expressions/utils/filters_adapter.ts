/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Filter } from '@kbn/es-query';
import { ExpressionValueFilter } from '@kbn/expressions-plugin/common';

function getGroupFromFilter(filter: Filter) {
  const { meta } = filter;
  const { group } = meta ?? {};
  return group;
}

function range(filter: Filter): ExpressionValueFilter {
  const { query } = filter;
  const { range: rangeQuery } = query ?? {};
  const column = Object.keys(rangeQuery)[0];
  const { gte: from, lte: to } = rangeQuery[column] ?? {};
  return {
    filterGroup: getGroupFromFilter(filter),
    from,
    to,
    column,
    type: 'filter',
    filterType: 'time',
    and: [],
  };
}

function luceneQueryString(filter: Filter): ExpressionValueFilter {
  const { query } = filter;
  const { query_string: queryString } = query ?? {};
  const { query: queryValue } = queryString;

  return {
    filterGroup: getGroupFromFilter(filter),
    query: queryValue,
    type: 'filter',
    filterType: 'luceneQueryString',
    and: [],
  };
}

function term(filter: Filter): ExpressionValueFilter {
  const { query } = filter;
  const { term: termQuery } = query ?? {};
  const column = Object.keys(termQuery)[0];
  const { value } = termQuery[column] ?? {};

  return {
    filterGroup: getGroupFromFilter(filter),
    column,
    value,
    type: 'filter',
    filterType: 'exactly',
    and: [],
  };
}

const adapters = { range, term, luceneQueryString };

export function adaptToExpressionValueFilter(filter: Filter): ExpressionValueFilter {
  const { query = {} } = filter;
  const filterType = Object.keys(query)[0] as keyof typeof adapters;
  const adapt = adapters[filterType];
  if (!adapt || typeof adapt !== 'function') {
    throw new Error(`Unknown filter type: ${filterType}`);
  }
  return adapt(filter);
}
