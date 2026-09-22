/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AnalyticsServiceSetup } from '@kbn/core/public';
import {
  MAX_DIMENSIONS_REACHED_EVENT_TYPE,
  METRIC_AGGREGATION_CONFIG_CHANGED_EVENT_TYPE,
  METRICS_ESQL_QUERY_FAILURE_EVENT_TYPE,
  METRICS_INFO_EVENT_TYPE,
} from './constants';

export const registerMetricsEbtEvents = (analytics: AnalyticsServiceSetup) => {
  analytics.registerEventType({
    eventType: MAX_DIMENSIONS_REACHED_EVENT_TYPE,
    schema: {
      max_dimensions: {
        type: 'integer',
        _meta: {
          description: 'Maximum number of dimensions allowed in the Metrics experience',
        },
      },
    },
  });

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
          index_names: {
            type: 'integer',
            _meta: {
              description: 'Count of METRICS_INFO rows where index_name had more than one value',
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
          units: {
            type: 'integer',
            _meta: {
              description: 'Count of METRICS_INFO rows where unit had more than one value',
            },
          },
        },
      },
    },
  });

  analytics.registerEventType({
    eventType: METRIC_AGGREGATION_CONFIG_CHANGED_EVENT_TYPE,
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

  // Only bounded, non-sensitive values: never the query text or the
  // Elasticsearch failure reason, both of which can carry user data.
  analytics.registerEventType({
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
};
