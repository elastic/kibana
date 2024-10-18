/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, endWith, map, skipUntil, Subject, takeUntil } from 'rxjs';
import type { CoreService } from '@kbn/core-base-server-internal';
import type { InternalHttpServiceSetup } from '@kbn/core-http-server-internal';
import type { InternalMetricsServiceSetup } from '@kbn/core-metrics-server-internal';

/** @internal */
export interface SetupDeps {
  http: InternalHttpServiceSetup;
  metrics: InternalMetricsServiceSetup;
}

/** @internal */
export type InternalRateLimiterSetup = void;

/** @internal */
export type InternalRateLimiterStart = void;

/** @internal */
export class HttpRateLimiterService
  implements CoreService<InternalRateLimiterSetup, InternalRateLimiterStart>
{
  private overloaded$ = new BehaviorSubject(false);
  private ready$ = new Subject<boolean>();
  private stopped$ = new Subject<boolean>();

  public setup({ http, metrics }: SetupDeps): InternalRateLimiterSetup {
    const { elu } = http.rateLimiter;
    if (elu === false) {
      return;
    }

    metrics
      .getEluMetrics$()
      .pipe(
        skipUntil(this.ready$),
        takeUntil(this.stopped$),
        map(({ short, medium, long }) => short >= elu && medium >= elu && long >= elu),
        endWith(false)
      )
      .subscribe(this.overloaded$);

    http.server.ext('onRequest', (_request, toolkit) => {
      if (!this.overloaded$.getValue()) {
        return toolkit.continue;
      }

      return toolkit
        .response({
          statusCode: 429,
          body: 'Server is overloaded',
        })
        .takeover();
    });
  }

  public start(): InternalRateLimiterStart {
    this.ready$.next(true);
    this.ready$.complete();
  }

  public stop(): void {
    this.stopped$.next(true);
    this.stopped$.complete();
  }
}
