/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { Adapters } from '@kbn/inspector-plugin/common';
import type { SavedSearch, SortOrder } from '@kbn/saved-search-plugin/public';
import { BehaviorSubject, filter, firstValueFrom, map, merge, scan } from 'rxjs';
import { reportPerformanceMetricEvent } from '@kbn/ebt-tools';
import { isEqual } from 'lodash';
import type { DiscoverAppState } from '../services/discover_app_state_container';
import { updateVolatileSearchSource } from './update_search_source';
import { getRawRecordType } from './get_raw_record_type';
import {
  checkHitCount,
  sendCompleteMsg,
  sendErrorMsg,
  sendErrorTo,
  sendLoadingMsg,
  sendLoadingMoreMsg,
  sendLoadingMoreFinishedMsg,
  sendResetMsg,
} from '../hooks/use_saved_search_messages';
import { fetchDocuments } from './fetch_documents';
import { FetchStatus } from '../../types';
import { DataMsg, RecordRawType, SavedSearchData } from '../services/discover_data_state_container';
import { DiscoverServices } from '../../../build_services';
import { fetchTextBased } from './fetch_text_based';
import { InternalState } from '../services/discover_internal_state_container';

export interface FetchDeps {
  abortController: AbortController;
  getAppState: () => DiscoverAppState;
  getInternalState: () => InternalState;
  initialFetchStatus: FetchStatus;
  inspectorAdapters: Adapters;
  savedSearch: SavedSearch;
  searchSessionId: string;
  services: DiscoverServices;
  useNewFieldsApi: boolean;
}

/**
 * This function starts fetching all required queries in Discover. This will be the query to load the individual
 * documents as well as any other requests that might be required to load the main view.
 *
 * This method returns a promise, which will resolve (without a value), as soon as all queries that have been started
 * have been completed (failed or successfully).
 */
export async function fetchAll(
  dataSubjects: SavedSearchData,
  reset = false,
  fetchDeps: FetchDeps
): Promise<void> {
  const {
    initialFetchStatus,
    getAppState,
    getInternalState,
    services,
    inspectorAdapters,
    savedSearch,
    abortController,
  } = fetchDeps;
  const { data } = services;
  const searchSource = savedSearch.searchSource.createChild();

  try {
    const dataView = (await searchSource.getDataView())!;
    const query = getAppState().query;
    const prevQuery = dataSubjects.documents$.getValue().query;
    const recordRawType = getRawRecordType(query);
    const useTextBased = recordRawType === RecordRawType.PLAIN;
    if (reset) {
      sendResetMsg(dataSubjects, initialFetchStatus, recordRawType);
    }

    if (recordRawType === RecordRawType.DOCUMENT) {
      // Update the base searchSource, base for all child fetches
      updateVolatileSearchSource(searchSource, {
        dataView,
        services,
        sort: getAppState().sort as SortOrder[],
        customFilters: getInternalState().customFilters,
      });
    }

    // Mark all subjects as loading
    sendLoadingMsg(dataSubjects.main$, { recordRawType });
    sendLoadingMsg(dataSubjects.documents$, { recordRawType, query });
    // histogram will send `loading` for totalHits$

    // Start fetching all required requests
    const shouldFetchTextBased = useTextBased && !!query;
    const response = shouldFetchTextBased
      ? fetchTextBased(
          query,
          dataView,
          data,
          services.expressions,
          inspectorAdapters,
          abortController.signal
        )
      : fetchDocuments(searchSource, fetchDeps);
    const fetchType = shouldFetchTextBased ? 'fetchTextBased' : 'fetchDocuments';
    const startTime = window.performance.now();
    // Handle results of the individual queries and forward the results to the corresponding dataSubjects
    response
      .then(({ records, textBasedQueryColumns, interceptedWarnings, textBasedHeaderWarning }) => {
        if (services.analytics) {
          const duration = window.performance.now() - startTime;
          reportPerformanceMetricEvent(services.analytics, {
            eventName: 'discoverFetchAllRequestsOnly',
            duration,
            meta: { fetchType },
          });
        }

        if (shouldFetchTextBased) {
          dataSubjects.totalHits$.next({
            fetchStatus: FetchStatus.COMPLETE,
            result: records.length,
            recordRawType,
          });
        } else {
          const currentTotalHits = dataSubjects.totalHits$.getValue();
          // If the total hits (or chart) query is still loading, emit a partial
          // hit count that's at least our retrieved document count
          if (currentTotalHits.fetchStatus === FetchStatus.LOADING && !currentTotalHits.result) {
            // trigger `partial` only for the first request (if no total hits value yet)
            dataSubjects.totalHits$.next({
              fetchStatus: FetchStatus.PARTIAL,
              result: records.length,
              recordRawType,
            });
          }
        }
        /**
         * The partial state for text based query languages is necessary in case the query has changed
         * In the follow up useTextBasedQueryLanguage hook in this case new columns are added to AppState
         * So the data table shows the new columns of the table. The partial state was introduced to prevent
         * To frequent change of state causing the table to re-render to often, which causes race conditions
         * So it takes too long, a bad user experience, also a potential flakniess in tests
         */
        const fetchStatus =
          useTextBased && (!prevQuery || !isEqual(query, prevQuery))
            ? FetchStatus.PARTIAL
            : FetchStatus.COMPLETE;

        dataSubjects.documents$.next({
          fetchStatus,
          result: records,
          textBasedQueryColumns,
          textBasedHeaderWarning,
          interceptedWarnings,
          recordRawType,
          query,
        });

        checkHitCount(dataSubjects.main$, records.length);
      })
      // In the case that the request was aborted (e.g. a refresh), swallow the abort error
      .catch((e) => {
        if (!abortController.signal.aborted) throw e;
      })
      // Only the document query should send its errors to main$, to cause the full Discover app
      // to get into an error state. The other queries will not cause all of Discover to error out
      // but their errors will be shown in-place (e.g. of the chart).
      .catch(sendErrorTo(dataSubjects.documents$, dataSubjects.main$));

    // Return a promise that will resolve once all the requests have finished or failed
    return firstValueFrom(
      merge(
        fetchStatusByType(dataSubjects.documents$, 'documents'),
        fetchStatusByType(dataSubjects.totalHits$, 'totalHits')
      ).pipe(scan(toRequestFinishedMap, {}), filter(allRequestsFinished))
    ).then(() => {
      // Send a complete message to main$ once all queries are done and if main$
      // is not already in an ERROR state, e.g. because the document query has failed.
      // This will only complete main$, if it hasn't already been completed previously
      // by a query finding no results.
      if (dataSubjects.main$.getValue().fetchStatus !== FetchStatus.ERROR) {
        sendCompleteMsg(dataSubjects.main$);
      }
    });
  } catch (error) {
    sendErrorMsg(dataSubjects.main$, error);
    // We also want to return a resolved promise in an error case, since it just indicates we're done with querying.
    return Promise.resolve();
  }
}

export async function fetchMoreDocuments(
  dataSubjects: SavedSearchData,
  fetchDeps: FetchDeps
): Promise<void> {
  try {
    const { getAppState, getInternalState, services, savedSearch } = fetchDeps;
    const searchSource = savedSearch.searchSource.createChild();

    const dataView = (await searchSource.getDataView())!;
    const query = getAppState().query;
    const recordRawType = getRawRecordType(query);

    if (recordRawType === RecordRawType.PLAIN) {
      // not supported yet
      return;
    }

    const lastDocuments = dataSubjects.documents$.getValue().result || [];
    const lastDocumentSort = lastDocuments[lastDocuments.length - 1]?.raw?.sort;

    if (!lastDocumentSort) {
      return;
    }

    searchSource.setField('searchAfter', lastDocumentSort);

    // Mark as loading
    sendLoadingMoreMsg(dataSubjects.documents$);

    // Update the searchSource
    updateVolatileSearchSource(searchSource, {
      dataView,
      services,
      sort: getAppState().sort as SortOrder[],
      customFilters: getInternalState().customFilters,
    });

    // Fetch more documents
    const { records, interceptedWarnings } = await fetchDocuments(searchSource, fetchDeps);

    // Update the state and finish the loading state
    sendLoadingMoreFinishedMsg(dataSubjects.documents$, {
      moreRecords: records,
      interceptedWarnings,
    });
  } catch (error) {
    sendLoadingMoreFinishedMsg(dataSubjects.documents$, {
      moreRecords: [],
      interceptedWarnings: undefined,
    });
    sendErrorTo(dataSubjects.main$)(error);
  }
}

const fetchStatusByType = <T extends DataMsg>(subject: BehaviorSubject<T>, type: string) =>
  subject.pipe(map(({ fetchStatus }) => ({ type, fetchStatus })));

const toRequestFinishedMap = (
  currentMap: Record<string, boolean>,
  { type, fetchStatus }: { type: string; fetchStatus: FetchStatus }
) => ({
  ...currentMap,
  [type]: [FetchStatus.COMPLETE, FetchStatus.ERROR].includes(fetchStatus),
});

const allRequestsFinished = (requests: Record<string, boolean>) =>
  Object.values(requests).every((finished) => finished);
