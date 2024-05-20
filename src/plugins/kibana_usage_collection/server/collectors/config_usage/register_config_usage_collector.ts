/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { ConfigUsageData, CoreUsageDataStart } from '@kbn/core/server';

export function registerConfigUsageCollector(
  usageCollection: UsageCollectionSetup,
  getCoreUsageDataService: () => CoreUsageDataStart
) {
  const collector = usageCollection.makeUsageCollector<ConfigUsageData | undefined>({
    type: 'kibana_config_usage',
    isReady: () => typeof getCoreUsageDataService() !== 'undefined',
    /**
     * No schema for this collector.
     * This collector will collect non-default configs from all plugins.
     * Mapping each config to the schema is inconvenient for developers
     * and would result in 100's of extra field mappings.
     *
     * We'll experiment with flattened type and runtime fields before comitting to a schema.
     */
    schema: {},
    fetch: async () => {
      const coreUsageDataService = getCoreUsageDataService();
      if (!coreUsageDataService) {
        return;
      }

      return await coreUsageDataService.getConfigsUsageData();
    },
  });

  usageCollection.registerCollector(collector);
}
