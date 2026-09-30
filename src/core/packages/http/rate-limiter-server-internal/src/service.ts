/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { capitalize, omit, isEqual } from 'lodash';
import {
  BehaviorSubject,
  distinctUntilChanged,
  endWith,
  filter,
  map,
  skipUntil,
  type Observable,
  scan,
  Subject,
  takeUntil,
} from 'rxjs';
import type { CoreService } from '@kbn/core-base-server-internal';
import type { OnPreAuthHandler } from '@kbn/core-http-server';
import type { InternalHttpServiceSetup } from '@kbn/core-http-server-internal';
import type { EluMetrics } from '@kbn/core-metrics-server';
import { EluTerm, type InternalMetricsServiceSetup } from '@kbn/core-metrics-server-internal';
import { type ServiceStatus, ServiceStatusLevels } from '@kbn/core-status-common';

const RATE_LIMITER_POLICY = 'elu';

/** @internal */
export interface SetupDeps {
  http: InternalHttpServiceSetup;
  metrics: InternalMetricsServiceSetup;
}

interface State {
  overloaded: boolean;
  retryAfter?: number;
  timestamp: number;
}

/** @internal */
export interface InternalRateLimiterSetup {
  status$: Observable<ServiceStatus | undefined>;
}

/** @internal */
export type InternalRateLimiterStart = void;

/** @internal */
export class HttpRateLimiterService
  implements CoreService<InternalRateLimiterSetup, InternalRateLimiterStart>
{
  private status$ = new BehaviorSubject<ServiceStatus | undefined>(undefined);
  private state$ = new BehaviorSubject<State | undefined>(undefined);
  private ready$ = new Subject<boolean>();
  private stopped$ = new Subject<boolean>();

  private handler: OnPreAuthHandler = (request, response, toolkit) => {
    const state = this.state$.getValue();
    if (request.route.options.excludeFromRateLimiter || !state?.overloaded) {
      return toolkit.next();
    }

    const timeout = state.retryAfter
      ? Math.max(Math.ceil((state.retryAfter - Date.now()) / 1000), 0)
      : 0;

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
        map((overloaded) => ({
          overloaded,
          timestamp: Date.now(),
        })),
        scan((previous: State | undefined, current: State) => {
          if (!current.overloaded) {
            return current;
          }

          const interval = previous?.timestamp ? current.timestamp - previous.timestamp : 0;
          const retryAfter =
            previous?.retryAfter && previous.retryAfter - current.timestamp > interval
              ? previous.retryAfter
              : current.timestamp + period + interval;

          return {
            ...current,
            retryAfter,
          };
        }, undefined),
        filter(Boolean),
        distinctUntilChanged((previous, current) =>
          isEqual(omit(previous, 'timestamp'), omit(current, 'timestamp'))
        )
      )
      .subscribe(this.state$);

    this.state$
      .pipe(
        map((state) => !!state?.overloaded),
        distinctUntilChanged(),
        map((overloaded) =>
          overloaded
            ? {
                level: ServiceStatusLevels.degraded,
                summary: 'http server is rate-limited due to high load',
              }
            : {
                level: ServiceStatusLevels.available,
                summary: 'http server is available',
              }
        )
      )
      .subscribe(this.status$);
  }

  public setup({ http, metrics }: SetupDeps): InternalRateLimiterSetup {
    if (http.rateLimiter.enabled) {
      this.watch(metrics.getEluMetrics$(), http.rateLimiter);
      http.registerOnPreAuth(this.handler);
    }

    return {
      status$: this.status$,
    };
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
