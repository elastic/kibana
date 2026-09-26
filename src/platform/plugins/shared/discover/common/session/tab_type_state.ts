/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DiscoverTabType } from '@kbn/discover-session-constants';
import type { DiscoverSessionTabAttributes } from '@kbn/saved-search-plugin/server';
import type { DiscoverSessionApiTabTypeState } from '@kbn/as-code-discover-schema';

type StoredTabTypeState = DiscoverSessionTabAttributes['tabTypeState'];

/** Converts API tab settings to saved state; default tabs have no type-specific state. */
export const toStoredTabTypeState = (
  apiTabTypeState: DiscoverSessionApiTabTypeState
): StoredTabTypeState => {
  switch (apiTabTypeState.type) {
    case DiscoverTabType.Default:
      // Default tabs have no tabTypeState in the saved object.
      return undefined;
    case DiscoverTabType.Metrics:
      return {
        type: DiscoverTabType.Metrics,
        dimensions: apiTabTypeState.dimensions,
        searchTerm: apiTabTypeState.search_term,
        counterAggregation: apiTabTypeState.counter_aggregation,
        gaugeAggregation: apiTabTypeState.gauge_aggregation,
        histogramPercentile: apiTabTypeState.histogram_percentile,
      };
  }
};

/** Converts saved tab settings to declarative fields without deciding where they can be used. */
export const fromStoredTabTypeState = (
  tabTypeState: StoredTabTypeState
): DiscoverSessionApiTabTypeState => {
  switch (tabTypeState?.type) {
    case undefined:
      // The API always includes a type, using default when the saved object has no tabTypeState.
      return { type: DiscoverTabType.Default };
    case DiscoverTabType.Metrics:
      return {
        type: DiscoverTabType.Metrics,
        dimensions: tabTypeState.dimensions,
        search_term: tabTypeState.searchTerm,
        counter_aggregation: tabTypeState.counterAggregation,
        gauge_aggregation: tabTypeState.gaugeAggregation,
        histogram_percentile: tabTypeState.histogramPercentile,
      };
  }
};
