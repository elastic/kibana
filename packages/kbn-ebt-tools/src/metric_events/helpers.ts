/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { AnalyticsClient } from '@kbn/analytics-client';
import { type MetricEvent, METRIC_EVENT_SCHEMA } from './schema';

const METRIC_EVENT_TYPE = 'metric';

/**
 * Register the `metrics` event type
 * @param analytics The {@link AnalyticsClient} during the setup phase (it has the method `registerEventType`)
 * @private To be called only by core's Analytics Service
 */
export function registerMetricEventType(analytics: Pick<AnalyticsClient, 'registerEventType'>) {
  analytics.registerEventType<MetricEvent>({
    eventType: METRIC_EVENT_TYPE,
    schema: METRIC_EVENT_SCHEMA,
  });
}

/**
 * Report a `metrics` event type.
 * @param analytics The {@link AnalyticsClient} to report the events.
 * @param eventData The data to send, conforming the structure of a {@link MetricEvent}.
 */
export function reportMetricEvent(
  analytics: Pick<AnalyticsClient, 'reportEvent'>,
  eventData: MetricEvent
) {
  analytics.reportEvent(METRIC_EVENT_TYPE, eventData);
}
