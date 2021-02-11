/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginInitializerContext } from 'kibana/server';
import { UsageCollectionSetup } from '../../../../usage_collection/server';
import { fetchProvider } from './fetch';

export interface Usage {
  successCount: number;
  errorCount: number;
  totalDuration: number;
}

export async function registerUsageCollector(
  usageCollection: UsageCollectionSetup,
  context: PluginInitializerContext
) {
  try {
    const collector = usageCollection.makeUsageCollector<Usage>({
      type: 'search',
      isReady: () => true,
      fetch: fetchProvider(context.config.legacy.globalConfig$),
      schema: {
        successCount: { type: 'long' },
        errorCount: { type: 'long' },
        totalDuration: { type: 'long' },
      },
    });
    usageCollection.registerCollector(collector);
  } catch (err) {
    return; // kibana plugin is not enabled (test environment)
  }
}
