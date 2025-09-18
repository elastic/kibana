/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IRouter } from '@kbn/core-http-server';
import apm from 'elastic-apm-node';
import type { EluMetrics } from '@kbn/core-metrics-server';
import { metrics, ValueType } from '@opentelemetry/api';

interface ELUHistoryResponse {
  /**
   * Event-loop utilization averaged over a set of sample buckets
   * @remark 3 windows borrows from the `os` module's concept of load but is not necessarily windows of 1m, 5m, 15m. The
   *         actual time range covered is determined by our collection interval (configured via `ops.interval`, default 5s)
   *         and the number of samples held in each window. So by default short: 15s, medium: 30s and long 60s.
   */
  history: EluMetrics;
}

/**
 * Intended for exposing metrics over HTTP that we do not want to include in the /api/stats endpoint, yet.
 */
export function registerEluHistoryRoute(router: IRouter, elu: () => EluMetrics) {
  // Report the same metrics to APM
  apm.registerMetric('elu.history.short', () => elu().short);
  apm.registerMetric('elu.history.medium', () => elu().medium);
  apm.registerMetric('elu.history.long', () => elu().long);

  // Report the same metrics to OpenTelemetry
  const meter = metrics.getMeter('kibana.process');
  meter
    // Not calling it 'nodejs.eventloop.utilization.history' to avoid potential issues with the existing metric `nodejs.eventloop.utilization`.
    .createObservableGauge('nodejs.eventloop.history.utilization', {
      description:
        'The event loop utilization averaged over a set of sample buckets: short (3 samples), medium (6), long (12). Use `nodejs.eventloop.history.window` to select the correct window.',
      unit: '1',
      valueType: ValueType.DOUBLE,
    })
    .addCallback((result) => {
      const { short, medium, long } = elu();
      // They categories defined by these attributes are subsets of each other, but since it's a gauge, we won't ever sum them.
      result.observe(short, { 'nodejs.eventloop.history.window': 'short' });
      result.observe(medium, { 'nodejs.eventloop.history.window': 'medium' });
      result.observe(long, { 'nodejs.eventloop.history.window': 'long' });
    });

  router.versioned
    .get({
      access: 'internal',
      enableQueryVersion: true,
      path: '/api/_elu_history',
      options: {
        excludeFromRateLimiter: true,
      },
      security: {
        authz: {
          enabled: false,
          reason: 'This route is used for internal monitoring and does not require authorization.',
        },
        authc: {
          enabled: false,
          reason: 'This route is used for internal monitoring and does not require authentication.',
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: false,
      },
      async (ctx, req, res) => {
        const body: ELUHistoryResponse = {
          history: elu(),
        };
        return res.ok({ body });
      }
    );
}
