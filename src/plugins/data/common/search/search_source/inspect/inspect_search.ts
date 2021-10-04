/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EMPTY, Observable } from 'rxjs';
import { catchError, finalize, first, last, tap } from 'rxjs/operators';
import { JSONObject } from 'puppeteer';
import { IKibanaSearchResponse, ISearchOptions } from '../../types';
import { getRequestInspectorStats, getResponseInspectorStats } from './inspector_stats';
import { ISearchSource } from '../types';

export function inspectSearch(
  s$: Observable<IKibanaSearchResponse<any>>,
  options: ISearchOptions,
  requestBody: JSONObject,
  dataView: { title?: string; id?: string },
  searchSource?: ISearchSource
) {
  const { id, title, description, adapter } = options.inspector || { title: '' };

  const requestResponder = adapter?.start(title, {
    id,
    description,
    searchSessionId: options.sessionId,
  });

  const trackRequestBody = () => {
    try {
      requestResponder?.json(requestBody);
    } catch (e) {} // eslint-disable-line no-empty
  };

  // Track request stats on first emit, swallow errors
  const first$ = s$
    .pipe(
      first(undefined, null),
      tap(() => {
        requestResponder?.stats(getRequestInspectorStats(dataView.title, dataView.id));
        trackRequestBody();
      }),
      catchError(() => {
        trackRequestBody();
        return EMPTY;
      }),
      finalize(() => {
        first$.unsubscribe();
      })
    )
    .subscribe();

  // Track response stats on last emit, as well as errors
  const last$ = s$
    .pipe(
      catchError((e) => {
        requestResponder?.error({ json: e });
        return EMPTY;
      }),
      last(undefined, null),
      tap((finalResponse) => {
        if (finalResponse) {
          requestResponder?.stats(
            getResponseInspectorStats(finalResponse.rawResponse, searchSource)
          );
          requestResponder?.ok({ json: finalResponse });
        }
      }),
      finalize(() => {
        last$.unsubscribe();
      })
    )
    .subscribe();

  return s$;
}
