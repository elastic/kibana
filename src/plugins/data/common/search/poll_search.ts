/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { customEvents } from '@kbn/custom-events';
import { from, Observable, timer, defer, fromEvent, EMPTY } from 'rxjs';
import { expand, map, switchMap, takeUntil, takeWhile, tap } from 'rxjs/operators';
import type {
  IAsyncSearchOptions,
  IKibanaSearchResponse,
} from '../../../../../src/plugins/data/common';
import { isErrorResponse, isPartialResponse } from '../../../../../src/plugins/data/common';
import { AbortError } from '../../../../../src/plugins/kibana_utils/common';

export const pollSearch = <Response extends IKibanaSearchResponse>(
  search: () => Promise<Response>,
  cancel?: () => void,
  { pollInterval = 1000, abortSignal, strategy }: IAsyncSearchOptions = {}
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

    const reportInfo = {
      strategy: strategy || 'default',
      status: '',
      timeTookMs: new Date().getTime(),
      pollCount: 0,
      resHitCount: 0,
      resAggCount: 0,
    };

    return from(search()).pipe(
      expand(() => timer(pollInterval).pipe(switchMap(search))),
      tap((response) => {
        if (isErrorResponse(response)) {
          throw response ? new Error('Received partial response') : new AbortError();
        }
      }),
      tap(() => {
        reportInfo.pollCount++;
      }),
      takeWhile<Response>(isPartialResponse, true),
      tap((response) => {
        // need to make sure this only works on FE
        reportInfo.timeTookMs = new Date().getTime() - reportInfo.timeTookMs;
        reportInfo.status = isErrorResponse(response) ? 'err' : 'ok';
        const { hits, aggregations } = response.rawResponse;
        reportInfo.resHitCount = hits?.hits?.length ?? 0;
        reportInfo.resAggCount = aggregations ? Object.keys(aggregations).length : 0;
        customEvents?.reportCustomEvent('search-done', reportInfo);
      }),
      takeUntil<Response>(aborted$)
    );
  });
};
