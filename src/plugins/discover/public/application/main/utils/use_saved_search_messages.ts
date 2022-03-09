/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FetchStatus } from '../../types';
import {
  DataCharts$,
  DataDocuments$,
  DataMain$,
  DataTotalHits$,
  SavedSearchData,
} from './use_saved_search';

/**
 * Sends COMPLETE message to the main$ observable with the information
 * that no documents have been found, allowing Discover to show a no
 * results message.
 */
export function sendNoResultsFoundMsg(main$: DataMain$) {
  sendCompleteMsg(main$, false);
}

/**
 * Send COMPLETE message via main observable used when
 * 1.) first fetch resolved, and there are no documents
 * 2.) all fetches resolved, and there are documents
 */
export function sendCompleteMsg(main$: DataMain$, foundDocuments = true) {
  if (main$.getValue().fetchStatus === FetchStatus.COMPLETE) {
    return;
  }
  main$.next({
    fetchStatus: FetchStatus.COMPLETE,
    foundDocuments,
    error: undefined,
  });
}

/**
 * Send PARTIAL message via main observable when first result is returned
 */
export function sendPartialMsg(main$: DataMain$) {
  if (main$.getValue().fetchStatus === FetchStatus.LOADING) {
    main$.next({
      fetchStatus: FetchStatus.PARTIAL,
    });
  }
}

/**
 * Send LOADING message via main observable
 */
export function sendLoadingMsg(data$: DataMain$ | DataDocuments$ | DataTotalHits$ | DataCharts$) {
  if (data$.getValue().fetchStatus !== FetchStatus.LOADING) {
    data$.next({
      fetchStatus: FetchStatus.LOADING,
    });
  }
}

/**
 * Send ERROR message
 */
export function sendErrorMsg(
  data$: DataMain$ | DataDocuments$ | DataTotalHits$ | DataCharts$,
  error: Error
) {
  data$.next({
    fetchStatus: FetchStatus.ERROR,
    error,
  });
}

/**
 * Sends a RESET message to all data subjects
 * Needed when index pattern is switched or a new runtime field is added
 */
export function sendResetMsg(data: SavedSearchData, initialFetchStatus: FetchStatus) {
  data.main$.next({
    fetchStatus: initialFetchStatus,
    foundDocuments: undefined,
  });
  data.documents$.next({
    fetchStatus: initialFetchStatus,
    result: [],
  });
  data.charts$.next({
    fetchStatus: initialFetchStatus,
    chartData: undefined,
    bucketInterval: undefined,
  });
  data.totalHits$.next({
    fetchStatus: initialFetchStatus,
    result: undefined,
  });
}
