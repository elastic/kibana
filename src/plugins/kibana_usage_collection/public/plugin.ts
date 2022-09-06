/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import type { CoreSetup, Plugin } from '@kbn/core/public';
import type { TelemetryPluginSetup } from '@kbn/telemetry-plugin/public';
import { registerEbtCounters } from './ebt_counters';

interface KibanaUsageCollectionPluginsDepsSetup {
  usageCollection: UsageCollectionSetup;
  telemetry?: TelemetryPluginSetup;
}

export class KibanaUsageCollectionPlugin implements Plugin {
  public setup(
    coreSetup: CoreSetup,
    { usageCollection, telemetry }: KibanaUsageCollectionPluginsDepsSetup
  ) {
    if (!telemetry) {
      // If the telemetry plugin is disabled, let's set optIn false to flush the queues.
      coreSetup.analytics.optIn({ global: { enabled: false } });
    }
    registerEbtCounters(coreSetup.analytics, usageCollection);
  }

  public start() {}

  public stop() {}
}
