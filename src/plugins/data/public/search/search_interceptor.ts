/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { memoize } from 'lodash';
import { BehaviorSubject, throwError, defer, from, Observable } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { PublicMethodsOf } from '@kbn/utility-types';
import { CoreStart, CoreSetup, ToastsSetup } from 'kibana/public';
import { i18n } from '@kbn/i18n';
import { BatchedFunc, BfetchPublicSetup } from 'src/plugins/bfetch/public';
import {
  IKibanaSearchRequest,
  IKibanaSearchResponse,
  ISearchOptions,
  ISearchOptionsSerializable,
} from '../../common';
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
import { AbortError, KibanaServerError } from '../../../kibana_utils/public';
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
   * Observable that emits when the number of pending requests changes.
   * @internal
   */
  protected pendingCount$ = new BehaviorSubject(0);

  /**
   * @internal
   */
  protected application!: CoreStart['application'];
  private batchedFetch!: BatchedFunc<
    { request: IKibanaSearchRequest; options: ISearchOptionsSerializable },
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
  protected handleSearchError(
    e: KibanaServerError | AbortError,
    options?: ISearchOptions,
    isTimeout?: boolean
  ): Error {
    if (isTimeout || e.message === 'Request timed out') {
      // Handle a client or a server side timeout
      const err = new SearchTimeoutError(e, this.getTimeoutMode());

      // Show the timeout error here, so that it's shown regardless of how an application chooses to handle errors.
      // The timeout error is shown any time a request times out, or once per session, if the request is part of a session.
      this.showTimeoutError(err, options?.sessionId);
      return err;
    } else if (e instanceof AbortError) {
      // In the case an application initiated abort, throw the existing AbortError.
      return e;
    } else if (isEsError(e)) {
      if (isPainlessError(e)) {
        return new PainlessError(e, options?.indexPattern);
      } else {
        return new EsError(e);
      }
    } else {
      return e instanceof Error ? e : new Error(e.message);
    }
  }

  /**
   * @internal
   * @throws `AbortError` | `ErrorLike`
   */
  protected runSearch(
    request: IKibanaSearchRequest,
    options?: ISearchOptions
  ): Promise<IKibanaSearchResponse> {
    const { abortSignal, sessionId, ...requestOptions } = options || {};
    const combined = {
      ...requestOptions,
      ...this.deps.session.getSearchOptions(sessionId),
    };
    const serializableOptions: ISearchOptionsSerializable = {};

    if (combined.sessionId !== undefined) serializableOptions.sessionId = combined.sessionId;
    if (combined.isRestore !== undefined) serializableOptions.isRestore = combined.isRestore;
    if (combined.legacyHitsTotal !== undefined)
      serializableOptions.legacyHitsTotal = combined.legacyHitsTotal;
    if (combined.strategy !== undefined) serializableOptions.strategy = combined.strategy;
    if (combined.isStored !== undefined) serializableOptions.isStored = combined.isStored;

    return this.batchedFetch(
      {
        request,
        options: serializableOptions,
      },
      abortSignal
    );
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
   * either when the request times out, or when the original `AbortSignal` is aborted. Updates
   * `pendingCount$` when the request is started/finalized.
   *
   * @param request
   * @options
   * @returns `Observable` emitting the search response or an error.
   */
  public search(
    request: IKibanaSearchRequest,
    options: ISearchOptions = {}
  ): Observable<IKibanaSearchResponse> {
    // Defer the following logic until `subscribe` is actually called
    return defer(() => {
      if (options.abortSignal?.aborted) {
        return throwError(new AbortError());
      }

      this.pendingCount$.next(this.pendingCount$.getValue() + 1);
      return from(this.runSearch(request, options)).pipe(
        catchError((e: Error | AbortError) => {
          return throwError(this.handleSearchError(e, options));
        }),
        finalize(() => {
          this.pendingCount$.next(this.pendingCount$.getValue() - 1);
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
