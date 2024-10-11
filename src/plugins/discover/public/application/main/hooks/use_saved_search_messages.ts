/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BehaviorSubject } from 'rxjs';
import type { DataTableRecord } from '@kbn/discover-utils/src/types';
import type { SearchResponseWarning } from '@kbn/search-response-warnings';
import { FetchStatus } from '../../types';
import type {
  DataDocuments$,
  DataMain$,
  DataMsg,
  DataTotalHits$,
  SavedSearchData,
} from '../state_management/discover_data_state_container';

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
  main$.next({ fetchStatus: FetchStatus.COMPLETE, foundDocuments, error: undefined });
}

/**
 * Send PARTIAL message via main observable when first result is returned
 */
export function sendPartialMsg(main$: DataMain$) {
  if (main$.getValue().fetchStatus === FetchStatus.LOADING) {
    main$.next({ fetchStatus: FetchStatus.PARTIAL });
  }
}

/**
 * Send LOADING message via main observable
 */
export function sendLoadingMsg<T extends DataMsg>(
  data$: BehaviorSubject<T>,
  props?: Omit<T, 'fetchStatus'>
) {
  if (data$.getValue().fetchStatus !== FetchStatus.LOADING) {
    data$.next({ ...props, fetchStatus: FetchStatus.LOADING } as T);
  }
}

/**
 * Send LOADING_MORE message via main observable
 */
export function sendLoadingMoreMsg(documents$: DataDocuments$) {
  if (documents$.getValue().fetchStatus !== FetchStatus.LOADING_MORE) {
    documents$.next({ ...documents$.getValue(), fetchStatus: FetchStatus.LOADING_MORE });
  }
}

/**
 * Finishing LOADING_MORE message
 */
export function sendLoadingMoreFinishedMsg(
  documents$: DataDocuments$,
  {
    moreRecords,
    interceptedWarnings,
  }: {
    moreRecords: DataTableRecord[];
    interceptedWarnings: SearchResponseWarning[] | undefined;
  }
) {
  const currentValue = documents$.getValue();
  if (currentValue.fetchStatus === FetchStatus.LOADING_MORE) {
    documents$.next({
      ...currentValue,
      fetchStatus: FetchStatus.COMPLETE,
      result: moreRecords?.length
        ? [...(currentValue.result || []), ...moreRecords]
        : currentValue.result,
      interceptedWarnings,
    });
  }
}

/**
 * Send ERROR message
 */
export function sendErrorMsg(data$: DataMain$ | DataDocuments$ | DataTotalHits$, error?: Error) {
  data$.next({ fetchStatus: FetchStatus.ERROR, error });
}

/**
 * Sends a RESET message to all data subjects
 * Needed when data view is switched or a new runtime field is added
 */
export function sendResetMsg(data: SavedSearchData, initialFetchStatus: FetchStatus) {
  data.main$.next({ fetchStatus: initialFetchStatus, foundDocuments: undefined });
  data.documents$.next({ fetchStatus: initialFetchStatus, result: [] });
  data.totalHits$.next({ fetchStatus: initialFetchStatus, result: undefined });
}

/**
 * Method to create an error handler that will forward the received error
 * to the specified subjects. It will ignore AbortErrors.
 */
export const sendErrorTo = (...errorSubjects: Array<DataMain$ | DataDocuments$>) => {
  return (error: Error) => {
    if (error instanceof Error && error.name === 'AbortError') {
      return;
    }

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
