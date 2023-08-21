/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isQuery, isTimeRange } from '@kbn/data-plugin/common';
import { Filter, isFilterPinned, Query, TimeRange } from '@kbn/es-query';
import { EmbeddableInput, IEmbeddable } from '@kbn/embeddable-plugin/public';
import { DashboardDrilldownOptions } from '@kbn/presentation-util-plugin/public';

import { DashboardAppLocatorParams } from './locator';

interface EmbeddableQueryInput extends EmbeddableInput {
  query?: Query;
  filters?: Filter[];
  timeRange?: TimeRange;
}

export const getDashboardLocatorParams = (
  source: IEmbeddable<EmbeddableQueryInput>,
  options: DashboardDrilldownOptions
): Partial<DashboardAppLocatorParams> => {
  const params: DashboardAppLocatorParams = {};

  const input = source.getInput();
  if (isQuery(input.query) && options.useCurrentFilters) {
    params.query = input.query;
  }

  // if useCurrentDashboardDataRange is enabled, then preserve current time range
  // if undefined is passed, then destination dashboard will figure out time range itself
  // for brush event this time range would be overwritten
  if (isTimeRange(input.timeRange) && options.useCurrentDateRange) {
    params.timeRange = input.timeRange;
  }

  // if useCurrentDashboardFilters enabled, then preserve all the filters (pinned, unpinned, and from controls)
  // otherwise preserve only pinned
  params.filters = options.useCurrentFilters
    ? input.filters
    : input.filters?.filter((f) => isFilterPinned(f));

  return params;
};
