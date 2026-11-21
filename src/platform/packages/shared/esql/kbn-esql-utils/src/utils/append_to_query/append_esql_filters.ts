/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isEsqlFilter, type Filter } from '@kbn/es-query';
import { convertEsqlFiltersToESQLExpression } from '../convert_filters_to_esql';
import { getComputedColumnsInOutput } from '../get_query_summary';
import { appendToESQLQuery } from './utils';

/**
 * Appends the filters on columns created by an ES|QL query (`kind: 'esql'`) as a WHERE at the end of the
 * query. Only the filters of columns that the query outputs are applied, the others are for other queries.
 * @param query The ES|QL query.
 * @param filters The filters, the ones that are not ES|QL ones are ignored.
 * @returns The query with the WHERE, or the same query when there is nothing to apply.
 */
export const appendEsqlFiltersToESQLQuery = async (
  query: string,
  filters: Filter[]
): Promise<string> => {
  const esqlFilters = filters.filter(isEsqlFilter);
  if (!esqlFilters.length) return query;

  // a query whose columns can't be known can't use the filters, but it doesn't have to fail
  const columns = await getComputedColumnsInOutput(query).catch(() => new Set<string>());
  const expression = convertEsqlFiltersToESQLExpression(
    esqlFilters.filter(({ meta }) => meta.key && columns.has(meta.key))
  );

  return expression ? appendToESQLQuery(query, `| WHERE ${expression}`) : query;
};
