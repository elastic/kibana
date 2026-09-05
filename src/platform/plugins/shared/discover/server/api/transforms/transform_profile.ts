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
import type { DiscoverSessionApiProfile } from '../schema';

type StoredTabTypeState = DiscoverSessionTabAttributes['tabTypeState'];

export const transformProfileIn = (profile: DiscoverSessionApiProfile): StoredTabTypeState => {
  if (profile.type === DiscoverTabType.Default) {
    return undefined;
  }

  return {
    type: DiscoverTabType.Metrics,
    dimensions: profile.dimensions,
    searchTerm: profile.search_term,
    counterAggregation: profile.counter_aggregation,
    gaugeAggregation: profile.gauge_aggregation,
    histogramPercentile: profile.histogram_percentile,
  };
};

export const transformProfileOut = (state: StoredTabTypeState): DiscoverSessionApiProfile => {
  if (state === undefined) {
    return { type: DiscoverTabType.Default };
  }

  return {
    type: DiscoverTabType.Metrics,
    dimensions: state.dimensions,
    search_term: state.searchTerm,
    counter_aggregation: state.counterAggregation,
    gauge_aggregation: state.gaugeAggregation,
    histogram_percentile: state.histogramPercentile,
  };
};
