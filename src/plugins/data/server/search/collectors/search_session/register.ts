/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Logger } from 'kibana/server';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { fetchProvider } from './fetch';

export interface ReportedUsage {
  transientCount: number;
  persistedCount: number;
  totalCount: number;
}

export function registerUsageCollector(
  usageCollection: UsageCollectionSetup,
  kibanaIndex: string,
  logger: Logger
) {
  try {
    const collector = usageCollection.makeUsageCollector<ReportedUsage>({
      type: 'search-session',
      isReady: () => true,
      fetch: fetchProvider(kibanaIndex, logger),
      schema: {
        transientCount: { type: 'long' },
        persistedCount: { type: 'long' },
        totalCount: { type: 'long' },
      },
    });
    usageCollection.registerCollector(collector);
  } catch (err) {
    return; // kibana plugin is not enabled (test environment)
  }
}
