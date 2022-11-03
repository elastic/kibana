/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AnalyticsClient } from '@kbn/analytics-client';
import { PerformanceMetricEvent, reportPerformanceMetricEvent } from '@kbn/ebt-tools';
import { Optional } from 'utility-types';

export interface PerfArgs {
  analytics?: Pick<AnalyticsClient, 'reportEvent'>;
  eventData: Optional<PerformanceMetricEvent, 'duration'>;
}

export async function withReportPerformanceMetric<T>(perfArgs: PerfArgs, cb: () => Promise<T>) {
  const start = performance.now();
  const response = await cb();
  const end = performance.now();

  if (perfArgs.analytics) {
    reportPerformanceMetricEvent(perfArgs.analytics, {
      ...perfArgs.eventData,
      duration: end - start,
    });
  }

  return response;
}
