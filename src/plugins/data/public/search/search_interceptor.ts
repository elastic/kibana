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

import { trimEnd } from 'lodash';
import { createHash } from 'crypto';
import { BehaviorSubject, throwError, timer, Subscription, defer, from, Observable } from 'rxjs';
import { finalize, filter } from 'rxjs/operators';
import { Toast, CoreStart, ToastsSetup, CoreSetup } from 'kibana/public';
import { getCombinedSignal, AbortError } from '../../common/utils';
import {
  IEsSearchRequest,
  IEsSearchResponse,
  ISearchOptions,
  ES_SEARCH_STRATEGY,
} from '../../common/search';
import { getLongQueryNotification } from './long_query_notification';
import { SearchUsageCollector } from './collectors';

const LONG_QUERY_NOTIFICATION_DELAY = 10000;

export interface SearchInterceptorDeps {
  toasts: ToastsSetup;
  http: CoreSetup['http'];
  uiSettings: CoreSetup['uiSettings'];
  startServices: Promise<[CoreStart, any, unknown]>;
  usageCollector?: SearchUsageCollector;
}

export enum SearchStatus {
  Running,
  Done,
  Error,
  Timeout,
  Expired,
  Canceled,
}

interface RequestInfo {
  searchId?: string;
  status: SearchStatus;
}

interface SessionInfo {
  requests: Record<string, RequestInfo>;
  abortSignals?: AbortSignal[];
  status: SearchStatus;
}

export class SearchInterceptor {
  private readonly idMapping: Map<string, SessionInfo>;

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
   * The current long-running toast (if there is one).
   * @internal
   */
  protected longRunningToast?: Toast;

  /**
   * @internal
   */
  protected application!: CoreStart['application'];

  /**
   * This class should be instantiated with a `requestTimeout` corresponding with how many ms after
   * requests are initiated that they should automatically cancel.
   * @param toasts The `core.notifications.toasts` service
   * @param application  The `core.application` service
   * @param requestTimeout Usually config value `elasticsearch.requestTimeout`
   */
  constructor(
    protected readonly deps: SearchInterceptorDeps,
    protected readonly requestTimeout?: number
  ) {
    this.idMapping = new Map();

    this.deps.http.addLoadingCountSource(this.pendingCount$);

    this.deps.startServices.then(([coreStart]) => {
      this.application = coreStart.application;
    });

    // When search requests go out, a notification is scheduled allowing users to continue the
    // request past the timeout. When all search requests complete, we remove the notification.
    this.getPendingCount$()
      .pipe(filter((count) => count === 0))
      .subscribe(this.hideToast);
  }

  private createHash(keys: Record<any, any>) {
    return createHash(`sha256`).update(JSON.stringify(keys)).digest('hex');
  }

  protected onRequestStart(
    request: IEsSearchRequest,
    sessionId: string | undefined,
    timeoutSignal: AbortSignal,
    searchId: string = new Date().getTime().toString()
  ) {
    if (sessionId && searchId && request.params && request.params.body) {
      let sessionInfo = this.idMapping.get(sessionId);

      // Create session info for a new session
      if (!sessionInfo) {
        sessionInfo = {
          abortSignals: [],
          requests: {},
          status: SearchStatus.Running,
        };
        this.idMapping.set(sessionId, sessionInfo);
      }

      // Reopen a complete session, if a new search is run. We know this can happen because of follow up requests.
      if (sessionInfo.status === SearchStatus.Done) {
        sessionInfo.status = SearchStatus.Running;
      }

      // Listen to search timeouts
      timeoutSignal.addEventListener('abort', () => {
        if (sessionInfo?.status === SearchStatus.Running) {
          sessionInfo.status = SearchStatus.Timeout;
          this.onSessionTimeout();
        }
      });

      // Add request info to the session
      sessionInfo.requests[this.createHash(request.params.body)] = {
        status: SearchStatus.Running,
        searchId,
      };
    }
  }

  protected onRequestComplete(request: IEsSearchRequest, sessionId?: string) {
    if (sessionId && request.params && request.params.body) {
      const sessionInfo = this.idMapping.get(sessionId);
      sessionInfo!.requests[this.createHash(request.params.body)].status = SearchStatus.Done;

      // Mark session as done, if all requests are done
      Object.values(sessionInfo!.requests)
        .map((requestInfo) => requestInfo.status === SearchStatus.Done)
        .every(() => {
          sessionInfo!.status = SearchStatus.Done;
        });
    }
  }

  protected onRequestError(request: IEsSearchRequest, sessionId?: string) {
    if (sessionId && request.params && request.params.body) {
      const sessionInfo = this.idMapping.get(sessionId);

      if (sessionInfo) {
        // Mark request as errored, don't update session status
        sessionInfo.requests[this.createHash(request.params.body)].status = SearchStatus.Error;
      }
    }
  }

  private onSessionTimeout() {
    this.deps.toasts.addDanger({
      title: 'Your query timed out',
    });
  }

  /**
   * Returns an `Observable` over the current number of pending searches. This could mean that one
   * of the search requests is still in flight, or that it has only received partial responses.
   */
  public getPendingCount$() {
    return this.pendingCount$.asObservable();
  }

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

      const { timeoutSignal, combinedSignal, cleanup } = this.setupTimers(options);
      this.pendingCount$.next(this.pendingCount$.getValue() + 1);

      this.onRequestStart(request, options?.sessionId, timeoutSignal);

      const res$ = this.runSearch(request, combinedSignal, options?.strategy);
      res$.subscribe({
        error: () => {
          this.onRequestError(request, options?.sessionId);
        },
        complete: () => {
          this.onRequestComplete(request, options?.sessionId);
        },
      });
      return res$.pipe(
        finalize(() => {
          this.pendingCount$.next(this.pendingCount$.getValue() - 1);
          cleanup();
        })
      );
    });
  }

  protected setupTimers(options?: ISearchOptions) {
    // Schedule this request to automatically timeout after some interval
    const timeoutController = new AbortController();
    const { signal: timeoutSignal } = timeoutController;
    const timeout$ = timer(this.requestTimeout);
    const subscription = timeout$.subscribe(() => {
      timeoutController.abort();
    });
    this.timeoutSubscriptions.add(subscription);

    // Schedule the notification to allow users to cancel or wait beyond the timeout
    const notificationSubscription = timer(LONG_QUERY_NOTIFICATION_DELAY).subscribe(this.showToast);

    // Get a combined `AbortSignal` that will be aborted whenever the first of the following occurs:
    // 1. The user manually aborts (via `cancelPending`)
    // 2. The request times out
    // 3. The passed-in signal aborts (e.g. when re-fetching, or whenever the app determines)
    const signals = [
      this.abortController.signal,
      timeoutSignal,
      ...(options?.abortSignal ? [options.abortSignal] : []),
    ];

    const combinedSignal = getCombinedSignal(signals);
    const cleanup = () => {
      this.timeoutSubscriptions.remove(subscription);
      notificationSubscription.unsubscribe();
    };

    combinedSignal.addEventListener('abort', cleanup);

    return {
      timeoutSignal,
      combinedSignal,
      cleanup,
    };
  }

  /**
   *  @internal
   */
  protected showToast = () => {
    if (this.longRunningToast) return;
    this.longRunningToast = this.deps.toasts.addInfo(
      {
        title: 'Your query is taking a while',
        text: getLongQueryNotification({
          application: this.application,
        }),
      },
      {
        toastLifeTimeMs: 1000000,
      }
    );
  };

  /**
   *  @internal
   */
  protected hideToast = () => {
    if (this.longRunningToast) {
      this.deps.toasts.remove(this.longRunningToast);
      delete this.longRunningToast;
      if (this.deps.usageCollector) {
        this.deps.usageCollector.trackLongQueryDialogDismissed();
      }
    }
  };
}

export type ISearchInterceptor = PublicMethodsOf<SearchInterceptor>;
