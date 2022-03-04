/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { UsageCollectionSetup } from '../../../../../usage_collection/server';
import { fetchProvider, TelemetryResponse } from './collector_fetch';

export function makeSampleDataUsageCollector(
  usageCollection: UsageCollectionSetup,
  kibanaIndex: string
) {
  const collector = usageCollection.makeUsageCollector<TelemetryResponse>({
    type: 'sample-data',
    fetch: fetchProvider(kibanaIndex),
    isReady: () => true,
    schema: {
      installed: { type: 'array', items: { type: 'keyword' } },
      last_install_date: { type: 'date' },
      last_install_set: { type: 'keyword' },
      last_uninstall_date: { type: 'date' },
      last_uninstall_set: { type: 'keyword' },
      uninstalled: { type: 'array', items: { type: 'keyword' } },
    },
  });

  usageCollection.registerCollector(collector);
}
