/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { AnalyticsClient } from '@kbn/analytics-client';
import { type PerformanceMetricEvent, METRIC_EVENT_SCHEMA } from './schema';

const PERFORMANCE_METRIC_EVENT_TYPE = 'performance_metric';

/**
 * Register the `performance_metric` event type
 * @param analytics The {@link AnalyticsClient} during the setup phase (it has the method `registerEventType`)
 * @private To be called only by core's Analytics Service
 */
export function registerPerformanceMetricEventType(
  analytics: Pick<AnalyticsClient, 'registerEventType'>
) {
  analytics.registerEventType<PerformanceMetricEvent>({
    eventType: PERFORMANCE_METRIC_EVENT_TYPE,
    schema: METRIC_EVENT_SCHEMA,
  });
}

/**
 * Report a `performance_metric` event type.
 * @param analytics The {@link AnalyticsClient} to report the events.
 * @param eventData The data to send, conforming the structure of a {@link MetricEvent}.
 */
export function reportPerformanceMetricEvent(
  analytics: Pick<AnalyticsClient, 'reportEvent'>,
  eventData: PerformanceMetricEvent
) {
  analytics.reportEvent(PERFORMANCE_METRIC_EVENT_TYPE, eventData);
}
