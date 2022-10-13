/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { fetchProvider, Usage } from './fetch';

export function makeKQLUsageCollector(usageCollection: UsageCollectionSetup, kibanaIndex: string) {
  const kqlUsageCollector = usageCollection.makeUsageCollector<Usage>({
    type: 'kql',
    fetch: fetchProvider(kibanaIndex),
    isReady: () => true,
    schema: {
      optInCount: { type: 'long' },
      optOutCount: { type: 'long' },
      defaultQueryLanguage: { type: 'keyword' },
    },
  });

  usageCollection.registerCollector(kqlUsageCollector);
}
