/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { AnalyticsClient } from '@kbn/analytics-client';
import { MetricEvent, METRIC_EVENT_SCHEMA } from './schema';

const METRIC_EVENT_TYPE = 'metric';

export function registerMetricEvent(analytics: AnalyticsClient) {
  analytics.registerEventType({
    eventType: METRIC_EVENT_TYPE,
    schema: METRIC_EVENT_SCHEMA,
  });
}

export function reportMetricEvent(analytics: AnalyticsClient, eventData: MetricEvent) {
  analytics.reportEvent(METRIC_EVENT_TYPE, eventData);
}
