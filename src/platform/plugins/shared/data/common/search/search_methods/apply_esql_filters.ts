/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FILTERS, isEsqlFilter, isFilterDisabled, type Filter } from '@kbn/es-query';
import { appendWhereClauseToESQLQuery, getComputedColumnsInOutput } from '@kbn/esql-utils';

const applyEsqlFilter = (query: string, filter: Filter): string => {
  const { key, negate = false, params, type, esql } = filter.meta;
  if (!key) return query;

  if (type === FILTERS.EXISTS) {
    return (
      appendWhereClauseToESQLQuery(query, key, null, negate ? 'is_null' : 'is_not_null') ?? query
    );
  }

  // phrase filters have the value in `params.query`, phrases ones have the list of values as `params`
  const value =
    type === FILTERS.PHRASES ? params : (params as { query?: unknown } | undefined)?.query;
  if (value === undefined) return query;

  return (
    appendWhereClauseToESQLQuery(query, key, value, negate ? '-' : '+', esql?.type, esql?.esType) ??
    query
  );
};

/**
 * Filters on columns created by an ES|QL query can't be DSL, so they are appended as WHERE
 * clauses at the end of the queries whose output has the column. The other queries ignore them.
 */
export const applyEsqlFilters = (query: string, filters: Filter[]): string => {
  const esqlFilters = filters.filter((filter) => isEsqlFilter(filter) && !isFilterDisabled(filter));
  if (!esqlFilters.length) return query;

  const columns = getComputedColumnsInOutput(query);
  return esqlFilters
    .filter(({ meta }) => meta.key && columns.has(meta.key))
    .reduce(applyEsqlFilter, query);
};
