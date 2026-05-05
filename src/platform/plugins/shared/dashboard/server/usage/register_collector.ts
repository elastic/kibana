/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { DashboardCollectorData } from './types';
import { collectDashboardTelemetry } from './dashboard_telemetry';

export function registerDashboardUsageCollector(
  usageCollection: UsageCollectionSetup,
  getTaskManager: Promise<TaskManagerStartContract>
) {
  const dashboardCollector = usageCollection.makeUsageCollector<DashboardCollectorData>({
    type: 'dashboard',
    isReady: () => true,
    fetch: async () => {
      const taskManager = await getTaskManager;

      return await collectDashboardTelemetry(taskManager);
    },
    schema: {
      access_mode: {
        DYNAMIC_KEY: {
          total: {
            type: 'long',
            _meta: {
              description: 'The number of dashboards that have an applied access mode.',
            },
          },
        },
      },
      panels: {
        total: { type: 'long' },
        by_reference: { type: 'long' },
        by_value: { type: 'long' },
        by_type: {
          DYNAMIC_KEY: {
            total: {
              type: 'long',
              _meta: {
                description: 'The number of panels that have been added to all dashboards.',
              },
            },
            by_reference: {
              type: 'long',
              _meta: {
                description:
                  'The number of "by reference" panels that have been added to all dashboards.',
              },
            },
            by_value: {
              type: 'long',
              _meta: {
                description:
                  'The number of "by value" panels that have been added to all dashboards.',
              },
            },
            details: {
              DYNAMIC_KEY: {
                type: 'long',
                _meta: {
                  description:
                    'Collection of telemetry metrics that embeddable service reports. Embeddable service internally calls each embeddable, which in turn calls its dynamic actions, which calls each drill down attached to that embeddable.',
                },
              },
            },
          },
        },
      },
      controls: {
        total: {
          type: 'long',
          _meta: {
            description: 'The total number of pinned controls',
          },
        },
        by_type: {
          DYNAMIC_KEY: {
            total: {
              type: 'long',
              _meta: {
                description: 'The number of pinned controls of this specific type',
              },
            },
          },
        },
      },
      sections: {
        total: {
          type: 'long',
          _meta: {
            description:
              'Collection of telemetry metrics that count the number of collapsible sections on all dashboards',
          },
        },
      },
    },
  });

  usageCollection.registerCollector(dashboardCollector);
}
