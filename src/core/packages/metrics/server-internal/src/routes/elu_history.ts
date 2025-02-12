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
import { EluMetrics } from '@kbn/core-metrics-server';

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

  router.versioned
    .get({
      access: 'internal',
      enableQueryVersion: true,
      path: '/api/_elu_history',
      options: {
        authRequired: false,
        excludeFromRateLimiter: true,
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
