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
import type { CoreService } from '@kbn/core-base-server-internal';
import type { KibanaRequest, OnPreAuthHandler } from '@kbn/core-http-server';
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

  private handler: OnPreAuthHandler = (request, response, toolkit) => {
    if (!this.shouldBeThrottled(request)) {
      return toolkit.next();
    }

    return response.customError({
      statusCode: 429,
      body: 'Server is overloaded',
    });
  };

  private shouldBeThrottled(request: KibanaRequest): boolean {
    return !request.route.options.excludeFromRateLimiter && this.overloaded$.getValue();
  }

  private watch(
    metrics$: Observable<EluMetrics>,
    { elu, term }: InternalHttpServiceSetup['rateLimiter']
  ) {
    metrics$
      .pipe(
        skipUntil(this.ready$),
        takeUntil(this.stopped$),
        map(
          ({ short, medium, long }) =>
            short >= elu && (term === 'short' || medium >= elu) && (term !== 'long' || long >= elu)
        ),
        endWith(false)
      )
      .subscribe(this.overloaded$);
  }

  public setup({ http, metrics }: SetupDeps): InternalRateLimiterSetup {
    if (!http.rateLimiter.enabled) {
      return;
    }

    this.watch(metrics.getEluMetrics$(), http.rateLimiter);
    http.registerOnPreAuth(this.handler);
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
