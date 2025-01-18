/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { fetchProvider, Usage } from './fetch';

export function makeKQLUsageCollector(
  usageCollection: UsageCollectionSetup,
  getIndexForType: (type: string) => Promise<string>
) {
  const kqlUsageCollector = usageCollection.makeUsageCollector<Usage>({
    type: 'kql',
    fetch: fetchProvider(getIndexForType),
    isReady: () => true,
    schema: {
      optInCount: { type: 'long' },
      optOutCount: { type: 'long' },
      defaultQueryLanguage: { type: 'keyword' },
    },
  });

  usageCollection.registerCollector(kqlUsageCollector);
}
