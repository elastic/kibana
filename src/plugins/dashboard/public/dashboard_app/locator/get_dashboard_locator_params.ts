/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isFilterPinned, type Query } from '@kbn/es-query';
import type { HasParentApi, PublishesLocalUnifiedSearch } from '@kbn/presentation-publishing';
import type { DashboardDrilldownOptions } from '@kbn/presentation-util-plugin/public';
import type { DashboardLocatorParams } from '../../dashboard_container';

export const getDashboardLocatorParamsFromEmbeddable = (
  api: Partial<PublishesLocalUnifiedSearch & HasParentApi<Partial<PublishesLocalUnifiedSearch>>>,
  options: DashboardDrilldownOptions
): Partial<DashboardLocatorParams> => {
  const params: DashboardLocatorParams = {};

  const query = api.parentApi?.localQuery?.value;
  if (query && options.useCurrentFilters) {
    params.query = query as Query;
  }

  // if useCurrentDashboardDataRange is enabled, then preserve current time range
  // if undefined is passed, then destination dashboard will figure out time range itself
  // for brush event this time range would be overwritten
  const timeRange = api.localTimeRange?.value ?? api.parentApi?.localTimeRange?.value;
  if (timeRange && options.useCurrentDateRange) {
    params.timeRange = timeRange;
  }

  // if useCurrentDashboardFilters enabled, then preserve all the filters (pinned, unpinned, and from controls)
  // otherwise preserve only pinned
  const filters = api.parentApi?.localFilters?.value ?? [];
  params.filters = options.useCurrentFilters ? filters : filters?.filter((f) => isFilterPinned(f));

  return params;
};
