/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
import {
  defer,
  EMPTY,
  expand,
  from,
  fromEvent,
  switchMap,
  takeUntil,
  tap,
  throwError,
  timer,
} from 'rxjs';
import { AbortError } from '@kbn/kibana-utils-plugin/common';
import type { IKibanaSearchResponse } from '@kbn/search-types';
import type { IAsyncSearchOptions } from '..';
import { isAbortResponse, isRunningResponse } from '..';

export const pollSearch = <Response extends IKibanaSearchResponse>(
  search: () => Promise<Response>,
  cancel?: () => Promise<void>,
  { pollInterval, abortSignal }: IAsyncSearchOptions = {}
): Observable<Response> => {
  return defer(() => {
    if (abortSignal?.aborted) {
      throw new AbortError();
    }

    const safeCancel = () =>
      cancel?.().catch((e) => {
        console.error(e); // eslint-disable-line no-console
      });

    if (cancel) {
      abortSignal?.addEventListener('abort', safeCancel, { once: true });
    }

    const aborted$ = (abortSignal ? fromEvent(abortSignal, 'abort') : EMPTY).pipe(
      switchMap((e) => throwError(() => new AbortError((e.target as AbortSignal)?.reason)))
    );

    return from(search()).pipe(
      expand((response) => {
        return isRunningResponse(response)
          ? timer(pollInterval ?? 0).pipe(switchMap(() => search()))
          : EMPTY;
      }),
      tap((response) => {
        if (isAbortResponse(response)) {
          throw new AbortError();
        }
      }),
      takeUntil<Response>(aborted$)
    );
  });
};
