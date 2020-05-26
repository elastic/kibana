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

import { BehaviorSubject, throwError, timer, Subscription, defer, fromEvent } from 'rxjs';
import { takeUntil, finalize, filter, mergeMapTo } from 'rxjs/operators';
import { ApplicationStart, Toast, ToastsStart } from 'kibana/public';
import { getCombinedSignal } from '../../common/utils';
import { IKibanaSearchRequest } from '../../common/search';
import { ISearchGeneric, ISearchOptions } from './i_search';
import { RequestTimeoutError } from './request_timeout_error';
import { getLongQueryNotification } from './long_query_notification';

export class SearchInterceptor {
  /**
   * `abortController` used to signal all searches to abort.
   */
  protected abortController = new AbortController();

  /**
   * The number of pending search requests.
   */
  private pendingCount = 0;

  /**
   * Observable that emits when the number of pending requests changes.
   */
  private pendingCount$ = new BehaviorSubject(this.pendingCount);

  /**
   * The subscriptions from scheduling the automatic timeout for each request.
   */
  protected timeoutSubscriptions: Set<Subscription> = new Set();

  /**
   * The current long-running toast (if there is one).
   */
  protected longRunningToast?: Toast;

  /**
   * This class should be instantiated with a `requestTimeout` corresponding with how many ms after
   * requests are initiated that they should automatically cancel.
   * @param toasts The `core.notifications.toasts` service
   * @param application  The `core.application` service
   * @param requestTimeout Usually config value `elasticsearch.requestTimeout`
   */
  constructor(
    protected readonly toasts: ToastsStart,
    protected readonly application: ApplicationStart,
    protected readonly requestTimeout?: number
  ) {
    // When search requests go out, a notification is scheduled allowing users to continue the
    // request past the timeout. When all search requests complete, we remove the notification.
    this.getPendingCount$()
      .pipe(filter((count) => count === 0))
      .subscribe(this.hideToast);
  }

  /**
   * Returns an `Observable` over the current number of pending searches. This could mean that one
   * of the search requests is still in flight, or that it has only received partial responses.
   */
  public getPendingCount$ = () => {
    return this.pendingCount$.asObservable();
  };

  /**
   * Searches using the given `search` method. Overrides the `AbortSignal` with one that will abort
   * either when `cancelPending` is called, when the request times out, or when the original
   * `AbortSignal` is aborted. Updates the `pendingCount` when the request is started/finalized.
   */
  public search = (
    search: ISearchGeneric,
    request: IKibanaSearchRequest,
    options?: ISearchOptions
  ) => {
    // Defer the following logic until `subscribe` is actually called
    return defer(() => {
      this.pendingCount$.next(++this.pendingCount);

      // Schedule this request to automatically timeout after some interval
      const timeoutController = new AbortController();
      const { signal: timeoutSignal } = timeoutController;
      const timeout$ = timer(this.requestTimeout);
      const subscription = timeout$.subscribe(() => timeoutController.abort());
      this.timeoutSubscriptions.add(subscription);

      // If the request timed out, throw a `RequestTimeoutError`
      const timeoutError$ = fromEvent(timeoutSignal, 'abort').pipe(
        mergeMapTo(throwError(new RequestTimeoutError()))
      );

      // Schedule the notification to allow users to cancel or wait beyond the timeout
      const notificationSubscription = timer(10000).subscribe(this.showToast);

      // Get a combined `AbortSignal` that will be aborted whenever the first of the following occurs:
      // 1. The user manually aborts (via `cancelPending`)
      // 2. The request times out
      // 3. The passed-in signal aborts (e.g. when re-fetching, or whenever the app determines)
      const signals = [
        this.abortController.signal,
        timeoutSignal,
        ...(options?.signal ? [options.signal] : []),
      ];
      const combinedSignal = getCombinedSignal(signals);

      return search(request as any, { ...options, signal: combinedSignal }).pipe(
        takeUntil(timeoutError$),
        finalize(() => {
          this.pendingCount$.next(--this.pendingCount);
          this.timeoutSubscriptions.delete(subscription);
          notificationSubscription.unsubscribe();
        })
      );
    });
  };

  protected showToast = () => {
    if (this.longRunningToast) return;
    this.longRunningToast = this.toasts.addInfo(
      {
        title: 'Your query is taking awhile',
        text: getLongQueryNotification({
          application: this.application,
        }),
      },
      {
        toastLifeTimeMs: 1000000,
      }
    );
  };

  protected hideToast = () => {
    if (this.longRunningToast) {
      this.toasts.remove(this.longRunningToast);
      delete this.longRunningToast;
    }
  };
}
