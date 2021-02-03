/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { EmbeddablePersistableStateService } from 'src/plugins/embeddable/common';

import { collectDashboardTelemetry, DashboardCollectorData } from './dashboard_telemetry';

export function registerDashboardUsageCollector(
  usageCollection: UsageCollectionSetup,
  embeddableService: EmbeddablePersistableStateService
) {
  const dashboardCollector = usageCollection.makeUsageCollector<DashboardCollectorData>({
    type: 'dashboard',
    isReady: () => true,
    fetch: async ({ soClient }) => {
      return await collectDashboardTelemetry(soClient, embeddableService);
    },
    schema: {
      panels: { type: 'long' },
      panelsByValue: { type: 'long' },
      lensByValue: {
        DYNAMIC_KEY: {
          type: 'long',
        },
      },
      visualizationByValue: {
        DYNAMIC_KEY: {
          type: 'long',
        },
      },
    },
  });

  usageCollection.registerCollector(dashboardCollector);
}
