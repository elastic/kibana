/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DiscoverTabType } from '@kbn/discover-utils';
import type { DiscoverSessionTabAttributes } from '@kbn/saved-search-plugin/server';
import type { DiscoverSessionApiTabTypeState } from '../schema';

type StoredTabTypeState = DiscoverSessionTabAttributes['tabTypeState'];

export const transformTabTypeStateIn = (
  apiTabTypeState: DiscoverSessionApiTabTypeState
): StoredTabTypeState => {
  if (apiTabTypeState.type === DiscoverTabType.Default) {
    return undefined;
  }

  return {
    type: DiscoverTabType.Metrics,
    dimensions: apiTabTypeState.dimensions,
    searchTerm: apiTabTypeState.search_term,
    counterAggregation: apiTabTypeState.counter_aggregation,
    gaugeAggregation: apiTabTypeState.gauge_aggregation,
    histogramPercentile: apiTabTypeState.histogram_percentile,
  };
};

export const transformTabTypeStateOut = (
  tabTypeState: StoredTabTypeState
): DiscoverSessionApiTabTypeState => {
  if (tabTypeState === undefined) {
    return { type: DiscoverTabType.Default };
  }

  return {
    type: DiscoverTabType.Metrics,
    dimensions: tabTypeState.dimensions,
    search_term: tabTypeState.searchTerm,
    counter_aggregation: tabTypeState.counterAggregation,
    gauge_aggregation: tabTypeState.gaugeAggregation,
    histogram_percentile: tabTypeState.histogramPercentile,
  };
};
