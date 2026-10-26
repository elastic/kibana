/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AnalyticsServiceSetup } from '@kbn/core/public';
import { METRICS_ESQL_QUERY_FAILURE_EVENT_TYPE } from './constants';
import { registerMetricsEbtEvents } from './metrics_ebt_events';

describe('registerMetricsEbtEvents', () => {
  const registerEvents = () => {
    const analytics = {
      registerEventType: jest.fn(),
    } as unknown as AnalyticsServiceSetup;

    registerMetricsEbtEvents(analytics);

    return analytics;
  };

  it('registers the metric aggregation configuration change event', () => {
    const analytics = registerEvents();

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

  it('registers the ES|QL query failure event', () => {
    const analytics = registerEvents();

    expect(analytics.registerEventType).toHaveBeenCalledWith({
      eventType: METRICS_ESQL_QUERY_FAILURE_EVENT_TYPE,
      schema: {
        error_type: {
          type: 'keyword',
          _meta: {
            description:
              'Elasticsearch error type of the failed ES|QL query, read from the cause chain so a generic wrapper does not hide the reason (e.g. circuit_breaking_exception, verification_exception, parsing_exception)',
            optional: true,
          },
        },
        error_category: {
          type: 'keyword',
          _meta: {
            description:
              'High-level failure classification: user_input, resource_limit, application, or unknown',
          },
        },
        status_code: {
          type: 'integer',
          _meta: {
            description: 'HTTP status returned by Elasticsearch, when one could be recovered',
            optional: true,
          },
        },
        query_type: {
          type: 'keyword',
          _meta: {
            description: 'ES|QL source command of the failed query: TS, FROM, or unknown',
          },
        },
        profile: {
          type: 'keyword',
          _meta: {
            description: 'Discover profile that owns the failing chart section, to allow filtering',
          },
        },
      },
    });
  });
});
