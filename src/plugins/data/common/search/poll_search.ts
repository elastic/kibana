/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { from, Observable, timer, defer, fromEvent, EMPTY } from 'rxjs';
import { expand, map, switchMap, takeUntil, takeWhile, tap } from 'rxjs/operators';
import { AbortError } from '@kbn/kibana-utils-plugin/common';
import type { IAsyncSearchOptions, IKibanaSearchResponse } from '..';
import { isAbortResponse, isRunningResponse } from '..';

export const pollSearch = <Response extends IKibanaSearchResponse>(
  search: () => Promise<Response>,
  cancel?: () => void,
  { pollInterval, abortSignal }: IAsyncSearchOptions = {}
): Observable<Response> => {
  const getPollInterval = (elapsedTime: number): number => {
    if (typeof pollInterval === 'number') return pollInterval;
    else {
      // if static pollInterval is not provided, then use default back-off logic
      switch (true) {
        case elapsedTime < 1500:
          return 300;
        case elapsedTime < 5000:
          return 1000;
        case elapsedTime < 20000:
          return 2500;
        default:
          return 5000;
      }
    }
  };

  return defer(() => {
    const startTime = Date.now();

    if (abortSignal?.aborted) {
      throw new AbortError();
    }

    if (cancel) {
      abortSignal?.addEventListener('abort', cancel, { once: true });
    }

    const aborted$ = (abortSignal ? fromEvent(abortSignal, 'abort') : EMPTY).pipe(
      map(() => {
        throw new AbortError();
      })
    );

    return from(search()).pipe(
      expand(() => {
        const elapsedTime = Date.now() - startTime;
        return timer(getPollInterval(elapsedTime)).pipe(switchMap(search));
      }),
      tap((response) => {
        if (isAbortResponse(response)) {
          throw new AbortError();
        }
      }),
      takeWhile<Response>(isRunningResponse, true),
      takeUntil<Response>(aborted$)
    );
  });
};
