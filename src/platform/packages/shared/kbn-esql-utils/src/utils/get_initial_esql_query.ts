/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView } from '@kbn/data-views-plugin/public';
import { type Query, escapeQuotes } from '@kbn/es-query';

const getFilterBySearchText = (query?: Query) => {
  if (!query) {
    return '';
  }
  const searchTextFunc =
    query.language === 'kuery' ? 'KQL' : query.language === 'lucene' ? 'QSTR' : '';

  if (searchTextFunc && query.query) {
    const escapedQuery =
      typeof query.query === 'string' && query.language === 'lucene'
        ? escapeQuotes(query.query)
        : query.query;
    return `${searchTextFunc}("""${escapedQuery}""")`;
  }
  return '';
};

const getFinalWhereClause = (timeFilter?: string, queryFilter?: string) => {
  if (timeFilter && queryFilter) {
    return ` | WHERE ${timeFilter} AND ${queryFilter}`;
  }
  return timeFilter || queryFilter ? ` | WHERE ${timeFilter || queryFilter}` : '';
};

/**
 * Builds an ES|QL query for the provided dataView
 * If there is @timestamp field in the index, we don't add the WHERE clause
 * If there is no @timestamp and there is a dataView timeFieldName, we add the WHERE clause with the timeFieldName
 * @param dataView
 */
export function getInitialESQLQuery(dataView: DataView, query?: Query): string {
  const hasAtTimestampField = dataView?.fields?.getByName?.('@timestamp')?.type === 'date';
  const timeFieldName = dataView?.timeFieldName;
  const filterByTimeParams =
    !hasAtTimestampField && timeFieldName
      ? `${timeFieldName} >= ?_tstart AND ${timeFieldName} <= ?_tend`
      : '';

  const filterBySearchText = getFilterBySearchText(query);

  const whereClause = getFinalWhereClause(filterByTimeParams, filterBySearchText);
  return `FROM ${dataView.getIndexPattern()}${whereClause} | LIMIT 10`;
}
