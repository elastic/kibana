/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  BehaviorSubject,
  endWith,
  map,
  skipUntil,
  type Observable,
  Subject,
  takeUntil,
} from 'rxjs';
import type { Lifecycle, Request } from '@hapi/hapi';
import type { CoreService } from '@kbn/core-base-server-internal';
import { isKibanaRequest } from '@kbn/core-http-router-server-internal';
import type { InternalHttpServiceSetup } from '@kbn/core-http-server-internal';
import type { EluMetrics } from '@kbn/core-metrics-server';
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

  private handler: Lifecycle.Method = (request, toolkit) => {
    if (!this.shouldBeThrottled(request)) {
      return toolkit.continue;
    }

    return toolkit
      .response({
        statusCode: 429,
        body: 'Server is overloaded',
      })
      .takeover();
  };

  private shouldBeThrottled(request: Request): boolean {
    return (
      isKibanaRequest(request) &&
      !request.route.options.excludeFromRateLimiter &&
      this.overloaded$.getValue()
    );
  }

  private watch(metrics$: Observable<EluMetrics>, threshold: number) {
    metrics$
      .pipe(
        skipUntil(this.ready$),
        takeUntil(this.stopped$),
        map(
          ({ short, medium, long }) =>
            short >= threshold && medium >= threshold && long >= threshold
        ),
        endWith(false)
      )
      .subscribe(this.overloaded$);
  }

  public setup({ http, metrics }: SetupDeps): InternalRateLimiterSetup {
    if (http.rateLimiter.elu === false) {
      return;
    }

    this.watch(metrics.getEluMetrics$(), http.rateLimiter.elu);
    http.server.ext('onRequest', this.handler);
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
