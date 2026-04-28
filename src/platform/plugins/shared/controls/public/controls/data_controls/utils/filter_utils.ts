/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FetchContext } from '@kbn/presentation-publishing';
import { getEsQueryConfig } from '@kbn/data-plugin/public';
import { buildEsQuery, isOfQueryType } from '@kbn/es-query';
import type { BoolQuery } from '@kbn/es-query';
import { coreServices } from '../../../services/kibana_services';

export const getFetchContextFilters = (fetchContext: FetchContext, useGlobalFilters?: boolean) => {
  if (!useGlobalFilters) {
    return [];
  }
  return fetchContext.filters;
};

/**
 * Builds an Elasticsearch DSL `bool` filter from the dashboard's fetch context that can be passed
 * to the ES|QL `_query` endpoint as `params.filter`, pre-filtering the ES|QL pipeline before it runs.
 * The global query is always included; ad-hoc filters are gated by `useGlobalFilters` so the control
 * can opt out of the dashboard filter bar (matching the field-based options list behavior).
 *
 * Returns `undefined` when there is nothing to pre-filter.
 */
export const buildESQLPreFilter = (
  fetchContext: Pick<FetchContext, 'query' | 'filters'>,
  useGlobalFilters?: boolean
): { bool: BoolQuery } | undefined => {
  const filters = getFetchContextFilters(fetchContext as FetchContext, useGlobalFilters);
  // The global query may itself be ES|QL on ES|QL-backed dashboards; in that case there is
  // nothing to translate to a DSL pre-filter.
  const globalQuery = isOfQueryType(fetchContext.query) ? fetchContext.query : undefined;
  if (!filters?.length && !globalQuery) return undefined;
  const config = getEsQueryConfig(coreServices.uiSettings);
  return buildEsQuery(undefined, globalQuery ?? [], filters ?? [], config);
};

export const getFetchContextTimeRange = (
  fetchContext: FetchContext,
  useGlobalFilters?: boolean
) => {
  if (!useGlobalFilters || !fetchContext.timeslice) {
    return fetchContext.timeRange;
  }
  const [fromTimestamp, toTimestamp] = fetchContext.timeslice;
  return {
    from: new Date(fromTimestamp).toISOString(),
    to: new Date(toTimestamp).toISOString(),
  };
};
