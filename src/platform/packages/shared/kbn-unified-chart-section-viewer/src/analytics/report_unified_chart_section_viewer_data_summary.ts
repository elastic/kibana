/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AnalyticsServiceStart } from '@kbn/core/public';
import type { MetricsTelemetry } from '../types';
import { METRICS_INFO_EVENT_TYPE } from '../components/observability/metrics/telemetry';

export interface UnifiedChartSectionViewerTelemetry {
  trackMetricsInfo: (telemetryPayload: MetricsTelemetry) => void;
}

export const createUnifiedChartSectionViewerTelemetry = (
  analytics?: AnalyticsServiceStart
): UnifiedChartSectionViewerTelemetry => ({
  trackMetricsInfo: (telemetryPayload: MetricsTelemetry) => {
    if (!analytics) {
      return;
    }
    analytics.reportEvent(METRICS_INFO_EVENT_TYPE, telemetryPayload);
  },
});
