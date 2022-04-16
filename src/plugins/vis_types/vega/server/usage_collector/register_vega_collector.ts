/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { getStats, VegaUsage } from './get_usage_collector';
import type { ConfigObservable, VisTypeVegaPluginSetupDependencies } from '../types';

export function registerVegaUsageCollector(
  collectorSet: UsageCollectionSetup,
  config: ConfigObservable,
  dependencies: Pick<VisTypeVegaPluginSetupDependencies, 'home'>
) {
  const collector = collectorSet.makeUsageCollector<VegaUsage | undefined>({
    type: 'vis_type_vega',
    isReady: () => true,
    schema: {
      vega_lib_specs_total: { type: 'long' },
      vega_lite_lib_specs_total: { type: 'long' },
      vega_use_map_total: { type: 'long' },
    },
    fetch: async ({ soClient }) => await getStats(soClient, dependencies),
  });

  collectorSet.registerCollector(collector);
}
