/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { get, trimEnd, debounce } from 'lodash';
import {
  BehaviorSubject,
  throwError,
  timer,
  Subscription,
  defer,
  from,
  Observable,
  NEVER,
} from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { CoreStart, CoreSetup, ToastsSetup } from 'kibana/public';
import { KbnError } from 'src/plugins/kibana_utils/common';
import {
  getCombinedSignal,
  AbortError,
  IEsSearchRequest,
  IEsSearchResponse,
  ISearchOptions,
  ES_SEARCH_STRATEGY,
} from '../../common';
import { SearchUsageCollector } from './collectors';
import { SearchTimeoutError, PainlessError, isPainlessError, TimeoutErrorMode } from './errors';
import { toMountPoint } from '../../../kibana_react/public';

export interface SearchInterceptorDeps {
  http: CoreSetup['http'];
  uiSettings: CoreSetup['uiSettings'];
  startServices: Promise<[CoreStart, any, unknown]>;
  toasts: ToastsSetup;
  usageCollector?: SearchUsageCollector;
}

export class SearchInterceptor {
  /**
   * `abortController` used to signal all searches to abort.
   *  @internal
   */
  protected abortController = new AbortController();

  /**
   * Observable that emits when the number of pending requests changes.
   * @internal
   */
  protected pendingCount$ = new BehaviorSubject(0);

  /**
   * The subscriptions from scheduling the automatic timeout for each request.
   * @internal
   */
  protected timeoutSubscriptions: Subscription = new Subscription();

  /**
   * @internal
   */
  protected application!: CoreStart['application'];

  /*
   * @internal
   */
  constructor(protected readonly deps: SearchInterceptorDeps) {
    this.deps.http.addLoadingCountSource(this.pendingCount$);

    this.deps.startServices.then(([coreStart]) => {
      this.application = coreStart.application;
    });
  }

  protected getTimeoutMode() {
    return TimeoutErrorMode.UPGRADE;
  }

  protected getSearchError(
    e: any,
    request: IEsSearchRequest,
    timeoutSignal: AbortSignal,
    appAbortSignal?: AbortSignal
  ) {
    if (timeoutSignal.aborted || get(e, 'body.message') === 'Request timed out') {
      const err = new SearchTimeoutError(e, this.getTimeoutMode());
      this.showTimeoutError(err);
      // Handle a client or a server side timeout
      return err;
    } else if (appAbortSignal?.aborted) {
      // In the case an application initiated abort, throw the existing AbortError.
      return e;
    } else if (isPainlessError(e)) {
      return new PainlessError(e, request);
    } else {
      return e;
    }
  }

  public showError(e: Error | KbnError) {
    if (e instanceof AbortError) return;

    if (e instanceof PainlessError) {
      this.deps.toasts.addDanger({
        title: 'Search Error',
        text: toMountPoint(e.getErrorMessage(this.application)),
      });
      return;
    }

    if (e instanceof SearchTimeoutError) {
      // this.deps.toasts.addDanger({
      //   title: 'Timeout',
      //   text: toMountPoint(e.getErrorMessage(this.application)),
      // });
      return;
    }

    this.deps.toasts.addDanger({
      title: 'Search Error',
      text: e.message,
    });
  }

  /**
   * @internal
   */
  protected runSearch(
    request: IEsSearchRequest,
    signal: AbortSignal,
    strategy?: string
  ): Observable<IEsSearchResponse> {
    const { id, ...searchRequest } = request;
    const path = trimEnd(`/internal/search/${strategy || ES_SEARCH_STRATEGY}/${id || ''}`, '/');
    const body = JSON.stringify(searchRequest);
    return from(
      this.deps.http.fetch({
        method: 'POST',
        path,
        body,
        signal,
      })
    );
  }

  /**
   * Searches using the given `search` method. Overrides the `AbortSignal` with one that will abort
   * either when `cancelPending` is called, when the request times out, or when the original
   * `AbortSignal` is aborted. Updates `pendingCount$` when the request is started/finalized.
   */
  public search(
    request: IEsSearchRequest,
    options?: ISearchOptions
  ): Observable<IEsSearchResponse> {
    // Defer the following logic until `subscribe` is actually called
    return defer(() => {
      if (options?.abortSignal?.aborted) {
        return throwError(new AbortError());
      }

      const { timeoutSignal, combinedSignal, cleanup } = this.setupAbortSignal({
        abortSignal: options?.abortSignal,
      });
      this.pendingCount$.next(this.pendingCount$.getValue() + 1);

      return this.runSearch(request, combinedSignal, options?.strategy).pipe(
        catchError((e: any) => {
          return throwError(this.getSearchError(e, request, timeoutSignal, options?.abortSignal));
        }),
        finalize(() => {
          this.pendingCount$.next(this.pendingCount$.getValue() - 1);
          cleanup();
        })
      );
    });
  }

  /**
   * @internal
   */
  protected setupAbortSignal({
    abortSignal,
    timeout,
  }: {
    abortSignal?: AbortSignal;
    timeout?: number;
  }) {
    // Schedule this request to automatically timeout after some interval
    const timeoutController = new AbortController();
    const { signal: timeoutSignal } = timeoutController;
    const timeout$ = timeout ? timer(timeout) : NEVER;
    const subscription = timeout$.subscribe(() => {
      timeoutController.abort();
    });
    this.timeoutSubscriptions.add(subscription);

    // Get a combined `AbortSignal` that will be aborted whenever the first of the following occurs:
    // 1. The user manually aborts (via `cancelPending`)
    // 2. The request times out
    // 3. The passed-in signal aborts (e.g. when re-fetching, or whenever the app determines)
    const signals = [
      this.abortController.signal,
      timeoutSignal,
      ...(abortSignal ? [abortSignal] : []),
    ];

    const combinedSignal = getCombinedSignal(signals);
    const cleanup = () => {
      subscription.unsubscribe();
    };

    combinedSignal.addEventListener('abort', cleanup);

    return {
      combinedSignal,
      timeoutSignal,
      cleanup,
    };
  }

  // Right now we are debouncing but we will hook this up with background sessions to show only one
  // error notification per session.
  protected showTimeoutError = debounce(
    (e: SearchTimeoutError) => {
      this.deps.toasts.addDanger({
        title: 'Timed out',
        text: toMountPoint(e.getErrorMessage(this.application)),
      });
    },
    60000,
    {
      leading: true,
    }
  );
}

export type ISearchInterceptor = PublicMethodsOf<SearchInterceptor>;
