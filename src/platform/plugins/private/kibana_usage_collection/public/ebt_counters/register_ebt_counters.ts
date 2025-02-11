/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AnalyticsServiceSetup } from '@kbn/core/public';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';

export function registerEbtCounters(
  analytics: AnalyticsServiceSetup,
  usageCollection: UsageCollectionSetup
) {
  // The client should complete telemetryCounter$ when shutting down. We shouldn't need to pipe(takeUntil(stop$)).
  analytics.telemetryCounter$.subscribe(({ type, source, event_type: eventType, code, count }) => {
    usageCollection.reportUiCounter(`ebt_counters.${source}`, `${type}_${code}`, eventType, count);
  });
}
