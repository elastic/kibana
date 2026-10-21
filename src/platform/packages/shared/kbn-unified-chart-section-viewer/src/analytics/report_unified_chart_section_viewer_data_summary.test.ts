/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AnalyticsServiceStart } from '@kbn/core/public';
import { createUnifiedChartSectionViewerTelemetry } from './report_unified_chart_section_viewer_data_summary';
import {
  METRICS_ESQL_QUERY_FAILURE_EVENT_TYPE,
  METRICS_PROFILE_TELEMETRY_NAME,
} from '../components/observability/metrics/telemetry';

describe('createUnifiedChartSectionViewerTelemetry', () => {
  it('reports metric aggregation configuration changes', () => {
    const analytics = {
      reportEvent: jest.fn(),
    } as unknown as AnalyticsServiceStart;
    const telemetry = createUnifiedChartSectionViewerTelemetry(analytics);

    telemetry.trackAggregationConfigChanged({
      metric_type: 'counter',
      previous_aggregation: 'sum',
      new_aggregation: 'max',
    });

    expect(analytics.reportEvent).toHaveBeenCalledWith(
      'discover_metrics_aggregation_config_changed',
      {
        metric_type: 'counter',
        previous_aggregation: 'sum',
        new_aggregation: 'max',
      }
    );
  });

  it('reports ES|QL query failures', () => {
    const analytics = {
      reportEvent: jest.fn(),
    } as unknown as AnalyticsServiceStart;
    const telemetry = createUnifiedChartSectionViewerTelemetry(analytics);

    telemetry.trackEsqlQueryFailure({
      error_type: 'circuit_breaking_exception',
      error_category: 'resource_limit',
      status_code: 429,
      query_type: 'TS',
      profile: METRICS_PROFILE_TELEMETRY_NAME,
    });

    expect(analytics.reportEvent).toHaveBeenCalledWith(METRICS_ESQL_QUERY_FAILURE_EVENT_TYPE, {
      error_type: 'circuit_breaking_exception',
      error_category: 'resource_limit',
      status_code: 429,
      query_type: 'TS',
      profile: METRICS_PROFILE_TELEMETRY_NAME,
    });
  });

  it('does not report ES|QL query failures without an analytics service', () => {
    const telemetry = createUnifiedChartSectionViewerTelemetry();

    expect(() =>
      telemetry.trackEsqlQueryFailure({
        error_category: 'unknown',
        query_type: 'unknown',
        profile: METRICS_PROFILE_TELEMETRY_NAME,
      })
    ).not.toThrow();
  });
});
