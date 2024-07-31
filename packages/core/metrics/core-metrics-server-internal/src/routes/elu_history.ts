/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { IRouter } from '@kbn/core-http-server';
import type { OpsMetrics } from '@kbn/core-metrics-server';
import type { Observable } from 'rxjs';
import { HistoryWindow } from './history_window';

interface ELUHistoryResponse {
  /**
   * Event-loop utilization averaged over a set of sample buckets
   * @remark 3 windows borrows from the `os` module's concept of load but is not necessarily windows of 1m, 5m, 15m. The
   *         actual time range covered is determined by our collection interval (configured via `ops.interval`, default 5s)
   *         and the number of samples held in each window. So by default short: 15s, medium: 30s and long 60s.
   */
  history: {
    /** The history for the short window */
    short: number;
    /** The history for the medium window */
    medium: number;
    /** The history for the long window */
    long: number;
  };
}

const HISTORY_WINDOW_SIZE_SHORT = 3;
const HISTORY_WINDOW_SIZE_MED = 6;
const HISTORY_WINDOW_SIZE_LONG = 12;

/**
 * Intended for exposing metrics over HTTP that we do not want to include in the /api/stats endpoint, yet.
 */
export function registerEluHistoryRoute(router: IRouter, metrics$: Observable<OpsMetrics>) {
  const eluHistoryWindow = new HistoryWindow(HISTORY_WINDOW_SIZE_LONG);

  metrics$.subscribe((metrics) => {
    eluHistoryWindow.addObservation(metrics.process.event_loop_utilization.utilization);
  });

  router.versioned
    .get({
      access: 'public', // Public but needs to remain undocumented
      path: '/api/_elu_history',
      options: {
        authRequired: false,
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: false,
      },
      async (ctx, req, res) => {
        const body: ELUHistoryResponse = {
          history: {
            short: eluHistoryWindow.getAverage(HISTORY_WINDOW_SIZE_SHORT),
            medium: eluHistoryWindow.getAverage(HISTORY_WINDOW_SIZE_MED),
            long: eluHistoryWindow.getAverage(HISTORY_WINDOW_SIZE_LONG),
          },
        };
        return res.ok({ body });
      }
    );
}
