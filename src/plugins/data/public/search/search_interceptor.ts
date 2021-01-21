/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { get, memoize } from 'lodash';
import { BehaviorSubject, throwError, timer, defer, from, Observable, NEVER } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { PublicMethodsOf } from '@kbn/utility-types';
import { CoreStart, CoreSetup, ToastsSetup } from 'kibana/public';
import { i18n } from '@kbn/i18n';
import { BatchedFunc, BfetchPublicSetup } from 'src/plugins/bfetch/public';
import { IKibanaSearchRequest, IKibanaSearchResponse, ISearchOptions } from '../../common';
import { SearchUsageCollector } from './collectors';
import {
  SearchTimeoutError,
  PainlessError,
  isPainlessError,
  TimeoutErrorMode,
  isEsError,
  EsError,
  getHttpError,
} from './errors';
import { toMountPoint } from '../../../kibana_react/public';
import { AbortError, getCombinedAbortSignal } from '../../../kibana_utils/public';
import { ISessionService } from './session';

export interface SearchInterceptorDeps {
  bfetch: BfetchPublicSetup;
  http: CoreSetup['http'];
  uiSettings: CoreSetup['uiSettings'];
  startServices: Promise<[CoreStart, any, unknown]>;
  toasts: ToastsSetup;
  usageCollector?: SearchUsageCollector;
  session: ISessionService;
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
   * @internal
   */
  protected application!: CoreStart['application'];
  private batchedFetch!: BatchedFunc<
    { request: IKibanaSearchRequest; options: ISearchOptions },
    IKibanaSearchResponse
  >;

  /*
   * @internal
   */
  constructor(protected readonly deps: SearchInterceptorDeps) {
    this.deps.http.addLoadingCountSource(this.pendingCount$);

    this.deps.startServices.then(([coreStart]) => {
      this.application = coreStart.application;
    });

    this.batchedFetch = deps.bfetch.batchedFunction({
      url: '/internal/bsearch',
    });
  }

  /*
   * @returns `TimeoutErrorMode` indicating what action should be taken in case of a request timeout based on license and permissions.
   * @internal
   */
  protected getTimeoutMode() {
    return TimeoutErrorMode.UPGRADE;
  }

  /*
   * @returns `Error` a search service specific error or the original error, if a specific error can't be recognized.
   * @internal
   */
  protected handleSearchError(e: any, timeoutSignal: AbortSignal, options?: ISearchOptions): Error {
    if (timeoutSignal.aborted || get(e, 'body.message') === 'Request timed out') {
      // Handle a client or a server side timeout
      const err = new SearchTimeoutError(e, this.getTimeoutMode());

      // Show the timeout error here, so that it's shown regardless of how an application chooses to handle errors.
      // The timeout error is shown any time a request times out, or once per session, if the request is part of a session.
      this.showTimeoutError(err, options?.sessionId);
      return err;
    } else if (options?.abortSignal?.aborted) {
      // In the case an application initiated abort, throw the existing AbortError.
      return e;
    } else if (isEsError(e)) {
      if (isPainlessError(e)) {
        return new PainlessError(e);
      } else {
        return new EsError(e);
      }
    } else {
      return e;
    }
  }

  /**
   * @internal
   */
  protected runSearch(
    request: IKibanaSearchRequest,
    options?: ISearchOptions
  ): Promise<IKibanaSearchResponse> {
    const { abortSignal, ...requestOptions } = options || {};

    return this.batchedFetch(
      {
        request,
        options: {
          ...requestOptions,
          ...(options?.sessionId && this.deps.session.getSearchOptions(options.sessionId)),
        },
      },
      abortSignal
    );
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

    const selfAbortController = new AbortController();

    // Get a combined `AbortSignal` that will be aborted whenever the first of the following occurs:
    // 1. The user manually aborts (via `cancelPending`)
    // 2. The request times out
    // 3. abort() is called on `selfAbortController`. This is used by session service to abort all pending searches that it tracks
    //    in the current session
    // 4. The passed-in signal aborts (e.g. when re-fetching, or whenever the app determines)
    const signals = [
      this.abortController.signal,
      timeoutSignal,
      selfAbortController.signal,
      ...(abortSignal ? [abortSignal] : []),
    ];

    const { signal: combinedSignal, cleanup: cleanupCombinedSignal } = getCombinedAbortSignal(
      signals
    );
    const cleanup = () => {
      subscription.unsubscribe();
      combinedSignal.removeEventListener('abort', cleanup);
      cleanupCombinedSignal();
    };
    combinedSignal.addEventListener('abort', cleanup);

    return {
      timeoutSignal,
      combinedSignal,
      cleanup,
      abort: () => {
        selfAbortController.abort();
      },
    };
  }

  private showTimeoutErrorToast = (e: SearchTimeoutError, sessionId?: string) => {
    this.deps.toasts.addDanger({
      title: 'Timed out',
      text: toMountPoint(e.getErrorMessage(this.application)),
    });
  };

  private showTimeoutErrorMemoized = memoize(
    this.showTimeoutErrorToast,
    (_: SearchTimeoutError, sessionId: string) => {
      return sessionId;
    }
  );

  /**
   * Show one error notification per session.
   * @internal
   */
  private showTimeoutError = (e: SearchTimeoutError, sessionId?: string) => {
    if (sessionId) {
      this.showTimeoutErrorMemoized(e, sessionId);
    } else {
      this.showTimeoutErrorToast(e, sessionId);
    }
  };

  /**
   * Searches using the given `search` method. Overrides the `AbortSignal` with one that will abort
   * either when `cancelPending` is called, when the request times out, or when the original
   * `AbortSignal` is aborted. Updates `pendingCount$` when the request is started/finalized.
   *
   * @param request
   * @options
   * @returns `Observable` emitting the search response or an error.
   */
  public search(
    request: IKibanaSearchRequest,
    options?: ISearchOptions
  ): Observable<IKibanaSearchResponse> {
    // Defer the following logic until `subscribe` is actually called
    return defer(() => {
      if (options?.abortSignal?.aborted) {
        return throwError(new AbortError());
      }

      const { timeoutSignal, combinedSignal, cleanup } = this.setupAbortSignal({
        abortSignal: options?.abortSignal,
      });
      this.pendingCount$.next(this.pendingCount$.getValue() + 1);
      return from(this.runSearch(request, { ...options, abortSignal: combinedSignal })).pipe(
        catchError((e: Error) => {
          return throwError(this.handleSearchError(e, timeoutSignal, options));
        }),
        finalize(() => {
          this.pendingCount$.next(this.pendingCount$.getValue() - 1);
          cleanup();
        })
      );
    });
  }

  /*
   *
   */
  public showError(e: Error) {
    if (e instanceof AbortError || e instanceof SearchTimeoutError) {
      // The SearchTimeoutError is shown by the interceptor in getSearchError (regardless of how the app chooses to handle errors)
      return;
    } else if (e instanceof EsError) {
      this.deps.toasts.addDanger({
        title: i18n.translate('data.search.esErrorTitle', {
          defaultMessage: 'Cannot retrieve search results',
        }),
        text: toMountPoint(e.getErrorMessage(this.application)),
      });
    } else if (e.constructor.name === 'HttpFetchError') {
      this.deps.toasts.addDanger({
        title: i18n.translate('data.search.httpErrorTitle', {
          defaultMessage: 'Cannot retrieve your data',
        }),
        text: toMountPoint(getHttpError(e.message)),
      });
    } else {
      this.deps.toasts.addError(e, {
        title: 'Search Error',
      });
    }
  }
}

export type ISearchInterceptor = PublicMethodsOf<SearchInterceptor>;
