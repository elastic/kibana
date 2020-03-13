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

import { BehaviorSubject, fromEvent, throwError } from 'rxjs';
import { mergeMap, takeUntil, finalize } from 'rxjs/operators';
import { getCombinedSignal } from '../../common/utils';
import { IKibanaSearchRequest } from '../../common/search';
import { ISearchGeneric, ISearchOptions } from './i_search';
import { RequestTimeoutError } from './request_timeout_error';

export class SearchInterceptor {
  /**
   * `abortController` used to signal all searches to abort.
   */
  private abortController = new AbortController();

  /**
   * Observable that emits when the number of pending requests changes.
   */
  private pendingCount$ = new BehaviorSubject(0);

  /**
   * The IDs from `setTimeout` when scheduling the automatic timeout for each request.
   */
  private timeoutIds: Set<number> = new Set();

  /**
   * This class should be instantiated with a `requestTimeout` corresponding with how many ms after
   * requests are initiated that they should automatically cancel.
   * @param requestTimeout Usually config value `elasticsearch.requestTimeout`
   */
  constructor(private readonly requestTimeout?: number) {}

  /**
   * Abort our `AbortController`, which in turn aborts any intercepted searches.
   */
  public cancelPending = () => {
    this.abortController.abort();
    this.abortController = new AbortController();
  };

  /**
   * Un-schedule timing out all of the searches intercepted.
   */
  public runBeyondTimeout = () => {
    this.timeoutIds.forEach(clearTimeout);
    this.timeoutIds.clear();
  };

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
    // Schedule this request to automatically timeout after some interval
    const timeoutController = new AbortController();
    const { signal: timeoutSignal } = timeoutController;
    const timeoutId = window.setTimeout(() => {
      timeoutController.abort();
    }, this.requestTimeout);
    this.addTimeoutId(timeoutId);

    // Get a combined `AbortSignal` that will be aborted whenever the first of the following occurs:
    // 1. The user manually aborts (via `cancelPending`)
    // 2. The request times out
    // 3. The passed-in signal aborts (e.g. when re-fetching, or whenever the app determines)
    const signals = [this.abortController.signal, timeoutSignal, options?.signal];
    const combinedSignal = getCombinedSignal(signals.filter(Boolean));

    // If the request timed out, throw a `RequestTimeoutError`
    const timeoutError$ = fromEvent(timeoutSignal, 'abort').pipe(
      mergeMap(() => throwError(new RequestTimeoutError()))
    );

    return search(request as any, { ...options, signal: combinedSignal }).pipe(
      takeUntil(timeoutError$),
      finalize(() => this.removeTimeoutId(timeoutId))
    );
  };

  private addTimeoutId(id: number) {
    this.timeoutIds.add(id);
    this.pendingCount$.next(this.timeoutIds.size);
  }

  private removeTimeoutId(id: number) {
    this.timeoutIds.delete(id);
    this.pendingCount$.next(this.timeoutIds.size);
  }
}
