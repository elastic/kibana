/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { capitalize } from 'lodash';
import {
  BehaviorSubject,
  distinctUntilChanged,
  endWith,
  map,
  skipUntil,
  type Observable,
  Subject,
  takeUntil,
} from 'rxjs';
import type { CoreService } from '@kbn/core-base-server-internal';
import type { OnPreAuthHandler } from '@kbn/core-http-server';
import type { InternalHttpServiceSetup } from '@kbn/core-http-server-internal';
import type { EluMetrics } from '@kbn/core-metrics-server';
import { EluTerm, type InternalMetricsServiceSetup } from '@kbn/core-metrics-server-internal';

const RATE_LIMITER_POLICY = 'elu';

/** @internal */
export interface SetupDeps {
  http: InternalHttpServiceSetup;
  metrics: InternalMetricsServiceSetup;
}

type RateLimiterState = { overloaded: false } | { overloaded: true; retryAfter: number };

/** @internal */
export type InternalRateLimiterSetup = void;

/** @internal */
export type InternalRateLimiterStart = void;

/** @internal */
export class HttpRateLimiterService
  implements CoreService<InternalRateLimiterSetup, InternalRateLimiterStart>
{
  private state$ = new BehaviorSubject<RateLimiterState>({
    overloaded: false,
  });
  private ready$ = new Subject<boolean>();
  private stopped$ = new Subject<boolean>();

  private handler: OnPreAuthHandler = (request, response, toolkit) => {
    const state = this.state$.getValue();
    if (request.route.options.excludeFromRateLimiter || !state.overloaded) {
      return toolkit.next();
    }

    const timeout = Math.ceil((state.retryAfter - Date.now()) / 1000);

    return response.customError({
      statusCode: 429,
      body: 'Server is overloaded',
      headers: {
        'Retry-After': `${timeout}`,
        RateLimit: `"${RATE_LIMITER_POLICY}";r=0;t=${timeout}`,
      },
    });
  };

  private watch(
    metrics$: Observable<EluMetrics>,
    { elu, term }: InternalHttpServiceSetup['rateLimiter']
  ) {
    const period = EluTerm[capitalize(term)];

    metrics$
      .pipe(
        skipUntil(this.ready$),
        takeUntil(this.stopped$),
        map(
          ({ short, medium, long }) =>
            short >= elu && (term === 'short' || medium >= elu) && (term !== 'long' || long >= elu)
        ),
        endWith(false),
        map((overloaded) =>
          overloaded
            ? {
                overloaded,
                retryAfter: Date.now() + period,
              }
            : { overloaded }
        ),
        distinctUntilChanged(
          (previous, current) =>
            previous.overloaded === current.overloaded &&
            (!previous.overloaded || previous.retryAfter - Date.now() > 0)
        )
      )
      .subscribe(this.state$);
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
