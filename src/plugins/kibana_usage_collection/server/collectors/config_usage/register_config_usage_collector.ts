/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { UsageCollectionSetup } from '../../../../usage_collection/server';
import { ConfigUsageData, CoreUsageDataStart } from '../../../../../core/server';

export function registerConfigUsageCollector(
  usageCollection: UsageCollectionSetup,
  getCoreUsageDataService: () => CoreUsageDataStart
) {

  const collector = usageCollection.makeUsageCollector<ConfigUsageData | undefined>({
    type: 'kibana_config_usage',
    isReady: () => typeof getCoreUsageDataService() !== 'undefined',
    schema: {
      // DYNAMIC_KEY: {
      //   type: 'text',
      //   _meta: {
      //     description:
      //       'Translation file hash. If the hash is different it indicates that a custom translation file is used',
      //   },
      // },
    },
    fetch: async () => {
      const coreUsageDataService = getCoreUsageDataService()
      if (!coreUsageDataService) {
        return;
      }

      return await coreUsageDataService.getConfigsUsageData();
    }
  });

  usageCollection.registerCollector(collector);
}
