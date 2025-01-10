/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isFilterPinned, type Query } from '@kbn/es-query';
import type { HasParentApi, PublishesUnifiedSearch } from '@kbn/presentation-publishing';
import type { DashboardDrilldownOptions } from '@kbn/presentation-util-plugin/public';
import type { DashboardLocatorParams } from '../../dashboard_container';

export const getDashboardLocatorParamsFromEmbeddable = (
  api: Partial<PublishesUnifiedSearch & HasParentApi<Partial<PublishesUnifiedSearch>>>,
  options: DashboardDrilldownOptions
): Partial<DashboardLocatorParams> => {
  const params: DashboardLocatorParams = {};

  const query = api.parentApi?.query$?.value;
  if (query && options.useCurrentFilters) {
    params.query = query as Query;
  }

  // if useCurrentDashboardDataRange is enabled, then preserve current time range
  // if undefined is passed, then destination dashboard will figure out time range itself
  // for brush event this time range would be overwritten
  const timeRange = api.timeRange$?.value ?? api.parentApi?.timeRange$?.value;
  if (timeRange && options.useCurrentDateRange) {
    params.timeRange = timeRange;
  }

  // if useCurrentDashboardFilters enabled, then preserve all the filters (pinned, unpinned, and from controls)
  // otherwise preserve only pinned
  const filters = api.parentApi?.filters$?.value ?? [];
  params.filters = options.useCurrentFilters ? filters : filters?.filter((f) => isFilterPinned(f));

  return params;
};
