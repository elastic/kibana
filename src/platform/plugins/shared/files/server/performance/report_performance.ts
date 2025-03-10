/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PerformanceMetricEvent, reportPerformanceMetricEvent } from '@kbn/ebt-tools';
import { Optional } from 'utility-types';
import { FilesPlugin } from '../plugin';

export interface PerfArgs {
  eventData: Optional<PerformanceMetricEvent, 'duration'>;
}

export async function withReportPerformanceMetric<T>(perfArgs: PerfArgs, cb: () => Promise<T>) {
  const analytics = FilesPlugin.getAnalytics();

  const start = performance.now();
  const response = await cb();
  const end = performance.now();

  if (analytics) {
    reportPerformanceMetricEvent(analytics, {
      ...perfArgs.eventData,
      duration: end - start,
    });
  }

  return response;
}
