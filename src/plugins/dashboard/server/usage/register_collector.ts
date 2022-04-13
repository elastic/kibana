/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
      panelsByValue: {
        total: {
          type: 'long',
        },
        by_type: {
          DYNAMIC_KEY: {
            type: 'long',
            _meta: {
              description:
                'Collection of telemetry metrics for different panel types which are added to dashboard by "value".',
            },
          },
        },
      },
      panelsByReference: {
        total: {
          type: 'long',
        },
        by_type: {
          DYNAMIC_KEY: {
            type: 'long',
            _meta: {
              description:
                'Collection of telemetry metrics for different panel types which are added to dashboard by "reference".',
            },
          },
        },
      },
      embeddable: {
        DYNAMIC_KEY: {
          type: 'long',
          _meta: {
            description:
              'Collection of telemetry metrics that embeddable service reports. Embeddable service internally calls each embeddable, which in turn calls its dynamic actions, which calls each drill down attached to that embeddable.',
          },
        },
      },
    },
  });

  usageCollection.registerCollector(dashboardCollector);
}
