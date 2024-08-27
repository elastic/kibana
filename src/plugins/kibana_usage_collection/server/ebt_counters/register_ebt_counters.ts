/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { AnalyticsServiceSetup } from '@kbn/core/server';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';

export function registerEbtCounters(
  analytics: AnalyticsServiceSetup,
  usageCollection: UsageCollectionSetup
) {
  // The client should complete telemetryCounter$ when shutting down. We shouldn't need to pipe(takeUntil(stop$)).
  analytics.telemetryCounter$.subscribe(({ type, source, event_type: eventType, code, count }) => {
    // We create one counter per source ('client'|<shipper_name>).
    const domainId = `ebt_counters.${source}`;
    const usageCounter =
      usageCollection.getUsageCounterByDomainId(domainId) ??
      usageCollection.createUsageCounter(domainId);

    usageCounter.incrementCounter({
      counterName: eventType, // the name of the event
      counterType: `${type}_${code}`, // e.g. 'succeeded_200'
      incrementBy: count,
    });
  });
}
