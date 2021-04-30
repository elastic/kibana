/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { getStats, TimeseriesUsage } from './get_usage_collector';

export function registerTimeseriesUsageCollector(collectorSet: UsageCollectionSetup) {
  const collector = collectorSet.makeUsageCollector<TimeseriesUsage | undefined>({
    type: 'vis_type_timeseries',
    isReady: () => true,
    schema: {
      timeseries_use_last_value_mode_total: {
        type: 'long',
        _meta: { description: 'Number of TSVB visualizations using "last value" as a time range' },
      },
    },
    fetch: async ({ soClient }) => await getStats(soClient),
  });

  collectorSet.registerCollector(collector);
}
