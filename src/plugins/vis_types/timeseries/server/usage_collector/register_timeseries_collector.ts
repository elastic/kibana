/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getStats, TimeseriesUsage } from './get_usage_collector';
import type { UsageCollectionSetup } from '../../../../usage_collection/server';
import type { HomeServerPluginSetup } from '../../../../home/server';

export function registerTimeseriesUsageCollector(
  collectorSet: UsageCollectionSetup,
  home?: HomeServerPluginSetup
) {
  const collector = collectorSet.makeUsageCollector<TimeseriesUsage | undefined>({
    type: 'vis_type_timeseries',
    isReady: () => true,
    schema: {
      timeseries_use_last_value_mode_total: {
        type: 'long',
        _meta: { description: 'Number of TSVB visualizations using "last value" as a time range' },
      },
      timeseries_use_es_indices_total: {
        type: 'long',
        _meta: { description: 'Number of TSVB visualizations using elasticsearch indices' },
      },
      timeseries_table_use_aggregate_function: {
        type: 'long',
        _meta: { description: 'Number of TSVB table visualizations using aggregate function' },
      },
      timeseries_types: {
        table: { type: 'long' },
        gauge: { type: 'long' },
        markdown: { type: 'long' },
        top_n: { type: 'long' },
        timeseries: { type: 'long' },
        metric: { type: 'long' },
      },
    },
    fetch: async ({ soClient }) => await getStats(soClient, home),
  });

  collectorSet.registerCollector(collector);
}
