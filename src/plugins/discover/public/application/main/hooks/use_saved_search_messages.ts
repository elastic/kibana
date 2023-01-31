/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { BehaviorSubject } from 'rxjs';
import { FetchStatus } from '../../types';
import type {
  DataDocuments$,
  DataMain$,
  DataMsg,
  DataTotalHits$,
  SavedSearchData,
} from '../services/discover_data_state_container';
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
export function sendLoadingMsg<T extends DataMsg>(
  data$: BehaviorSubject<T>,
  props: Omit<T, 'fetchStatus'>
) {
  if (data$.getValue().fetchStatus !== FetchStatus.LOADING) {
    data$.next({
      ...props,
      fetchStatus: FetchStatus.LOADING,
    } as T);
  }
}

/**
 * Send ERROR message
 */
export function sendErrorMsg(data$: DataMain$ | DataDocuments$ | DataTotalHits$, error: Error) {
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
  data.totalHits$.next({
    fetchStatus: initialFetchStatus,
    result: undefined,
    recordRawType,
  });
}

/**
 * Method to create an error handler that will forward the received error
 * to the specified subjects. It will ignore AbortErrors and will use the data
 * plugin to show a toast for the error (e.g. allowing better insights into shard failures).
 */
export const sendErrorTo = (
  data: DataPublicPluginStart,
  ...errorSubjects: Array<DataMain$ | DataDocuments$>
) => {
  return (error: Error) => {
    if (error instanceof Error && error.name === 'AbortError') {
      return;
    }

    data.search.showError(error);
    errorSubjects.forEach((subject) => sendErrorMsg(subject, error));
  };
};

/**
 * This method checks the passed in hit count and will send a PARTIAL message to main$
 * if there are results, indicating that we have finished some of the requests that have been
 * sent. If there are no results we already COMPLETE main$ with no results found, so Discover
 * can show the "no results" screen. We know at that point, that the other query returning
 * will neither carry any data, since there are no documents.
 */
export const checkHitCount = (main$: DataMain$, hitsCount: number) => {
  if (hitsCount > 0) {
    sendPartialMsg(main$);
  } else {
    sendNoResultsFoundMsg(main$);
  }
};
