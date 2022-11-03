/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AggregateQuery, Query } from '@kbn/es-query';
import { addLog } from '../../../utils/add_log';
import {
  DataCharts$,
  DataDocuments$,
  DataMain$,
  DataTotalHits$,
  RecordRawType,
  SavedSearchData,
} from '../services/discover_data_state_container';
import { FetchStatus } from '../../types';

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
  const recordRawType = main$.getValue().recordRawType;
  main$.next({
    fetchStatus: FetchStatus.COMPLETE,
    foundDocuments,
    error: undefined,
    recordRawType,
  });
}

/**
 * Send PARTIAL message via main observable when first result is returned
 */
export function sendPartialMsg(main$: DataMain$) {
  if (main$.getValue().fetchStatus === FetchStatus.LOADING) {
    const recordRawType = main$.getValue().recordRawType;
    main$.next({
      fetchStatus: FetchStatus.PARTIAL,
      recordRawType,
    });
  }
}

/**
 * Send LOADING message via main observable
 */
export function sendLoadingMsg(
  data$: DataMain$ | DataDocuments$ | DataTotalHits$ | DataCharts$,
  recordRawType: RecordRawType,
  query?: AggregateQuery | Query
) {
  if (data$.getValue().fetchStatus !== FetchStatus.LOADING) {
    data$.next({
      fetchStatus: FetchStatus.LOADING,
      recordRawType,
      query,
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
  addLog('👁️ error message', error);
  const recordRawType = data$.getValue().recordRawType;
  data$.next({
    fetchStatus: FetchStatus.ERROR,
    error,
    recordRawType,
  });
}

/**
 * Sends a RESET message to all data subjects
 * Needed when data view is switched or a new runtime field is added
 */
export function sendResetMsg(data: SavedSearchData, initialFetchStatus: FetchStatus) {
  const recordRawType = data.main$.getValue().recordRawType;
  data.main$.next({
    fetchStatus: initialFetchStatus,
    foundDocuments: undefined,
    recordRawType,
  });
  data.documents$.next({
    fetchStatus: initialFetchStatus,
    result: [],
    recordRawType,
  });
  data.charts$.next({
    fetchStatus: initialFetchStatus,
    response: undefined,
    recordRawType,
  });
  data.totalHits$.next({
    fetchStatus: initialFetchStatus,
    result: undefined,
    recordRawType,
  });
}
