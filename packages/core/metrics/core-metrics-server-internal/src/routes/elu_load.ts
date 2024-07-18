/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IRouter } from '@kbn/core-http-server';
import { performance, EventLoopUtilization } from 'perf_hooks';
import type { Observable } from 'rxjs';
import { LoadWindow } from './load_window';

interface Response {
  /**
   * Event-loop utilization averaged over a set of sample buckets
   * @remark 3 load windows borrows from the `os` module's concept of load but is not necessarily windows of 1m, 5m, 15m. The
   *         actual time range covered is determined by our collection interval (configured via `ops.interval`, default 5s)
   *         and the number of samples held in each window. So by default short: 15s, medium: 30s and long 60s.
   */
  load: {
    /** The load for the short window */
    short: number;
    /** The load for the medium window */
    medium: number;
    /** The load for the long window */
    long: number;
  };
}

const LOAD_WINDOW_SIZE_SHORT = 3;
const LOAD_WINDOW_SIZE_MED = 6;
const LOAD_WINDOW_SIZE_LONG = 12;

/**
 * Intended for exposing metrics over HTTP that we do not want to include in the /api/stats endpoint, yet.
 */
export function registerEluLoadRoute(router: IRouter, tick$: Observable<unknown>) {
  let elu: undefined | EventLoopUtilization;
  const loadWindow = new LoadWindow(LOAD_WINDOW_SIZE_LONG);

  tick$.subscribe(() => {
    elu = performance.eventLoopUtilization(elu);
    loadWindow.addObservation(elu.utilization);
  });

  router.versioned
    .get({
      access: 'public', // Public but needs to remain undocumented
      path: '/api/_elu_load',
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
        const body: Response = {
          load: {
            short: loadWindow.getAverage(LOAD_WINDOW_SIZE_SHORT),
            medium: loadWindow.getAverage(LOAD_WINDOW_SIZE_MED),
            long: loadWindow.getAverage(LOAD_WINDOW_SIZE_LONG),
          },
        };
        return res.ok({ body });
      }
    );
}
