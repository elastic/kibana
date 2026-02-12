/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isFilterPinned, type Filter, type Query } from '@kbn/es-query';
import { fromStoredFilter } from '@kbn/as-code-filters-transforms';
import type { AsCodeFilter } from '@kbn/as-code-filters-schema';
import type { HasParentApi, PublishesUnifiedSearch } from '@kbn/presentation-publishing';
import type { DashboardNavigationOptions } from '../../server';
import type { DashboardLocatorParams } from '../types';

/**
 * Extracts dashboard locator parameters from an embeddable API based on drilldown options.
 * This function collects query, time range, and filters from the embeddable and its parent
 * based on the provided drilldown options.
 *
 * @param api - The embeddable API that may publish unified search state and have a parent API.
 * @param options - The drilldown options that control which parameters to include.
 * @returns A partial {@link DashboardLocatorParams} object containing the extracted parameters.
 */
export const getDashboardLocatorParamsFromEmbeddable = (
  api: Partial<PublishesUnifiedSearch & HasParentApi<Partial<PublishesUnifiedSearch>>>,
  options: DashboardNavigationOptions
): Partial<DashboardLocatorParams> => {
  const params: DashboardLocatorParams = {};

  const query = api.parentApi?.query$?.value;
  if (query && options.use_filters) {
    params.query = query as Query;
  }

  // if useCurrentDashboardDataRange is enabled, then preserve current time range
  // if undefined is passed, then destination dashboard will figure out time range itself
  // for brush event this time range would be overwritten
  const timeRange = api.timeRange$?.value ?? api.parentApi?.timeRange$?.value;
  if (timeRange && options.use_time_range) {
    params.time_range = timeRange;
  }

  // Preserve pinned filters separately for `_g.filters` and only include unpinned filters in app state.
  const filters = (api.parentApi?.filters$?.value ?? []) as Filter[];
  const { pinnedFiltersAsCode, filtersAsCode } = filters.reduce(
    (acc, filter) => {
      if (isFilterPinned(filter)) {
        const pinnedAsCode = fromStoredFilter(filter, undefined, false);
        if (pinnedAsCode) acc.pinnedFiltersAsCode.push(pinnedAsCode);
      } else {
        const filterAsCode = fromStoredFilter(filter);
        if (filterAsCode) acc.filtersAsCode.push(filterAsCode);
      }
      return acc;
    },
    { pinnedFiltersAsCode: [] as AsCodeFilter[], filtersAsCode: [] as AsCodeFilter[] }
  );

  params.pinnedFilters = pinnedFiltersAsCode.length ? pinnedFiltersAsCode : undefined;
  params.filters = options.use_filters && filtersAsCode?.length ? filtersAsCode : undefined;

  return params;
};
