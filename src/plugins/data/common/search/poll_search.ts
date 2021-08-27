/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { defer, EMPTY, from, fromEvent, Observable, timer } from 'rxjs';
import { expand, map, switchMap, takeUntil, takeWhile, tap } from 'rxjs/operators';
import { AbortError } from '../../../kibana_utils/common/abort_utils';
import type { IAsyncSearchOptions } from './strategies/ese_search/types';
import type { IKibanaSearchResponse } from './types';
import { isErrorResponse, isPartialResponse } from './utils';

export const pollSearch = <Response extends IKibanaSearchResponse>(
  search: () => Promise<Response>,
  cancel?: () => void,
  { pollInterval = 1000, abortSignal }: IAsyncSearchOptions = {}
): Observable<Response> => {
  return defer(() => {
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
      expand(() => timer(pollInterval).pipe(switchMap(search))),
      tap((response) => {
        if (isErrorResponse(response)) {
          throw response ? new Error('Received partial response') : new AbortError();
        }
      }),
      takeWhile<Response>(isPartialResponse, true),
      takeUntil<Response>(aborted$)
    );
  });
};
