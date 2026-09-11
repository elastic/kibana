/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AnalyticsServiceSetup } from '@kbn/core/public';
import { registerMetricsEbtEvents } from './metrics_ebt_events';

describe('registerMetricsEbtEvents', () => {
  it('registers the metric aggregation configuration change event', () => {
    const analytics = {
      registerEventType: jest.fn(),
    } as unknown as AnalyticsServiceSetup;

    registerMetricsEbtEvents(analytics);

    expect(analytics.registerEventType).toHaveBeenCalledWith({
      eventType: 'discover_metrics_aggregation_config_changed',
      schema: {
        metric_type: {
          type: 'keyword',
          _meta: {
            description: 'Metric type whose aggregation configuration changed',
          },
        },
        previous_aggregation: {
          type: 'keyword',
          _meta: {
            description: 'Aggregation configuration before the change',
          },
        },
        new_aggregation: {
          type: 'keyword',
          _meta: {
            description: 'Aggregation configuration after the change',
          },
        },
      },
    });
  });
});
