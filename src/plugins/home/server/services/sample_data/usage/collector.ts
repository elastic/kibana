/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { PluginInitializerContext } from 'kibana/server';
import { first } from 'rxjs/operators';
import { fetchProvider, TelemetryResponse } from './collector_fetch';
import { UsageCollectionSetup } from '../../../../../usage_collection/server';

export async function makeSampleDataUsageCollector(
  usageCollection: UsageCollectionSetup,
  context: PluginInitializerContext
) {
  let index: string;
  try {
    const config = await context.config.legacy.globalConfig$.pipe(first()).toPromise();
    index = config.kibana.index;
  } catch (err) {
    return; // kibana plugin is not enabled (test environment)
  }
  const collector = usageCollection.makeUsageCollector<TelemetryResponse>({
    type: 'sample-data',
    fetch: fetchProvider(index),
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
