/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView } from '@kbn/data-views-plugin/public';
import { type Filter, type Query } from '@kbn/es-query';
import { convertFiltersToESQLExpression } from './convert_filters_to_esql';
import { convertQueryToESQLExpression } from './convert_query_to_esql';

const getFinalWhereClause = (
  timeFilter?: string,
  queryFilter?: string,
  filtersExpression?: string
) => {
  const parts = [timeFilter, queryFilter, filtersExpression].filter(Boolean);
  if (parts.length === 0) {
    return '';
  }
  return ` | WHERE ${parts.join(' AND ')}`;
};

/**
 * Matches every index on every remote cluster. TSDB field metadata surfacing from such a broad
 * resolution is not a reliable signal that the user wants a time series query.
 */
const ALL_REMOTES_WILDCARD = '*:*';

const hasUnboundedRemotePattern = (indexPattern: string): boolean =>
  indexPattern.split(',').some((entry) => entry.trim() === ALL_REMOTES_WILDCARD);

/**
 * Builds an ES|QL query for the provided dataView.
 * If there is @timestamp field in the index, we don't add the WHERE clause.
 * If there is no @timestamp and there is a dataView timeFieldName, we add the WHERE clause with the timeFieldName.
 * If the index pattern contains TSDB fields, we add the TS command, otherwise we add the FROM command.
 * `*:*` is an exception: it matches every index on every remote cluster, so TSDB field metadata
 * there is not a reliable signal of time series intent and we fall back to the FROM command.
 * When a timeFieldName exists, a SORT DESC clause on the dataView timeFieldName is appended.
 */
export function getInitialESQLQuery(dataView: DataView, query?: Query, filters?: Filter[]): string {
  const hasAtTimestampField = dataView?.fields?.getByName?.('@timestamp')?.type === 'date';
  const timeFieldName = dataView?.timeFieldName;
  const filterByTimeParams =
    !hasAtTimestampField && timeFieldName
      ? `${timeFieldName} >= ?_tstart AND ${timeFieldName} <= ?_tend`
      : '';

  const filterBySearchText = convertQueryToESQLExpression(query);

  const { esqlExpression: filtersExpression } = filters?.length
    ? convertFiltersToESQLExpression(filters)
    : { esqlExpression: '' };

  const whereClause = getFinalWhereClause(
    filterByTimeParams,
    filterBySearchText,
    filtersExpression || undefined
  );
  const indexPattern = dataView.getIndexPattern();
  const sourceCommand =
    dataView.isTSDBMode() && !hasUnboundedRemotePattern(indexPattern) ? 'TS' : 'FROM';
  const sortClause = timeFieldName ? ` | SORT ${timeFieldName} DESC` : '';

  return `${sourceCommand} ${indexPattern}${sortClause}${whereClause}`;
}
