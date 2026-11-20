/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FILTERS, isEsqlFilter, isFilterDisabled, type Filter } from '@kbn/es-query';
import {
  appendToESQLQuery,
  appendWhereClauseToESQLQuery,
  escapeEsqlColumnName,
  escapeStringValue,
  getComputedColumnsInOutput,
} from '@kbn/esql-utils';

// The WHERE needs the type of the column, but the clicked value has it: it is a cell of that column.
// Without a type the WHERE helper casts the column to string, which can't be compared with a number
const getKibanaFieldType = (value: unknown) =>
  typeof value === 'number' || typeof value === 'boolean' ? typeof value : 'string';

const getEsqlLiteral = (value: unknown) =>
  typeof value === 'string' ? escapeStringValue(value) : String(value);

const applyEsqlFilter = (query: string, filter: Filter): string => {
  const { key, negate = false, params, type } = filter.meta;
  if (!key) return query;

  if (type === FILTERS.EXISTS) {
    return (
      appendWhereClauseToESQLQuery(query, key, null, negate ? 'is_null' : 'is_not_null') ?? query
    );
  }

  if (type === FILTERS.PHRASES && Array.isArray(params)) {
    // the WHERE helper uses MATCH for several values, which can't be used on computed columns
    const inClause = `${escapeEsqlColumnName(key)} IN (${params.map(getEsqlLiteral).join(', ')})`;
    return appendToESQLQuery(query, `| WHERE ${negate ? `NOT (${inClause})` : inClause}`);
  }

  const value = (params as { query?: unknown } | undefined)?.query;
  if (value === undefined) return query;

  return (
    appendWhereClauseToESQLQuery(
      query,
      key,
      value,
      negate ? '-' : '+',
      getKibanaFieldType(value)
    ) ?? query
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
