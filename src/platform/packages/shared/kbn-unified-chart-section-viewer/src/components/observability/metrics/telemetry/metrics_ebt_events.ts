/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AnalyticsServiceSetup } from '@kbn/core/public';
import { METRICS_INFO_EVENT_TYPE } from './constants';

export const registerMetricsEbtEvents = (analytics: AnalyticsServiceSetup) => {
  analytics.registerEventType({
    eventType: METRICS_INFO_EVENT_TYPE,
    schema: {
      total_number_of_metrics: {
        type: 'integer',
        _meta: {
          description: 'Number of metric rows returned with METRICS_INFO query',
        },
      },
      total_number_of_dimensions: {
        type: 'integer',
        _meta: {
          description: 'Distinct dimension field names across returned metrics',
        },
      },
      metrics_by_type: {
        type: 'pass_through',
        _meta: {
          description: 'Counts per metric type observed in METRICS_INFO rows',
        },
      },
      units: {
        type: 'pass_through',
        _meta: {
          description: 'Counts per units observed in METRICS_INFO rows',
        },
      },
      multi_value_counts: {
        properties: {
          data_streams: {
            type: 'integer',
            _meta: {
              description: 'Count of METRICS_INFO rows where data_stream had more than one value',
            },
          },
          field_types: {
            type: 'integer',
            _meta: {
              description: 'Count of METRICS_INFO rows where field_type had more than one value',
            },
          },
          metric_types: {
            type: 'integer',
            _meta: {
              description: 'Count of METRICS_INFO rows where metric_type had more than one value',
            },
          },
        },
      },
    },
  });
};
