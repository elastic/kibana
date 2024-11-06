/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Adapters } from '@kbn/inspector-plugin/common';
import type { SavedSearch, SortOrder } from '@kbn/saved-search-plugin/public';
import { BehaviorSubject, combineLatest, filter, firstValueFrom, switchMap } from 'rxjs';
import { reportPerformanceMetricEvent } from '@kbn/ebt-tools';
import { isEqual } from 'lodash';
import { isOfAggregateQueryType } from '@kbn/es-query';
import type { DiscoverAppState } from '../state_management/discover_app_state_container';
import { updateVolatileSearchSource } from './update_search_source';
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
import { DataMsg, SavedSearchData } from '../state_management/discover_data_state_container';
import { DiscoverServices } from '../../../build_services';
import { fetchEsql } from './fetch_esql';
import { InternalState } from '../state_management/discover_internal_state_container';

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
export function fetchAll(
  dataSubjects: SavedSearchData,
  reset = false,
  fetchDeps: FetchDeps,
  onFetchRecordsComplete?: () => Promise<void>
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
  const { data, expressions, profilesManager } = services;
  const searchSource = savedSearch.searchSource.createChild();

  try {
    const dataView = searchSource.getField('index')!;
    const query = getAppState().query;
    const prevQuery = dataSubjects.documents$.getValue().query;
    const isEsqlQuery = isOfAggregateQueryType(query);

    if (reset) {
      sendResetMsg(dataSubjects, initialFetchStatus);
    }

    if (!isEsqlQuery) {
      // Update the base searchSource, base for all child fetches
      updateVolatileSearchSource(searchSource, {
        dataView,
        services,
        sort: getAppState().sort as SortOrder[],
        customFilters: getInternalState().customFilters,
      });
    }

    // Mark all subjects as loading
    sendLoadingMsg(dataSubjects.main$);
    sendLoadingMsg(dataSubjects.documents$, { query });
    sendLoadingMsg(dataSubjects.totalHits$, {
      result: dataSubjects.totalHits$.getValue().result,
    });

    // Start fetching all required requests
    const response = isEsqlQuery
      ? fetchEsql({
          query,
          dataView,
          abortSignal: abortController.signal,
          inspectorAdapters,
          data,
          expressions,
          profilesManager,
        })
      : fetchDocuments(searchSource, fetchDeps);
    const fetchType = isEsqlQuery ? 'fetchTextBased' : 'fetchDocuments';
    const startTime = window.performance.now();

    // Handle results of the individual queries and forward the results to the corresponding dataSubjects
    response
      .then(({ records, esqlQueryColumns, interceptedWarnings, esqlHeaderWarning }) => {
        if (services.analytics) {
          const duration = window.performance.now() - startTime;
          reportPerformanceMetricEvent(services.analytics, {
            eventName: 'discoverFetchAllRequestsOnly',
            duration,
            meta: { fetchType },
          });
        }

        if (isEsqlQuery) {
          dataSubjects.totalHits$.next({
            fetchStatus: FetchStatus.COMPLETE,
            result: records.length,
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
            });
          }
        }

        /**
         * The partial state for ES|QL mode is necessary in case the query has changed
         * In the follow up useEsqlMode hook in this case new columns are added to AppState
         * So the data table shows the new columns of the table. The partial state was introduced to prevent
         * To frequent change of state causing the table to re-render to often, which causes race conditions
         * So it takes too long, a bad user experience, also a potential flakniess in tests
         */
        const fetchStatus =
          isEsqlQuery && (!prevQuery || !isEqual(query, prevQuery))
            ? FetchStatus.PARTIAL
            : FetchStatus.COMPLETE;

        dataSubjects.documents$.next({
          fetchStatus,
          result: records,
          esqlQueryColumns,
          esqlHeaderWarning,
          interceptedWarnings,
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
      combineLatest([
        isComplete(dataSubjects.documents$).pipe(switchMap(async () => onFetchRecordsComplete?.())),
        isComplete(dataSubjects.totalHits$),
      ])
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
    const dataView = searchSource.getField('index')!;
    const query = getAppState().query;
    const isEsqlQuery = isOfAggregateQueryType(query);

    if (isEsqlQuery) {
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

const isComplete = <T extends DataMsg>(subject: BehaviorSubject<T>) => {
  return subject.pipe(
    filter(({ fetchStatus }) => [FetchStatus.COMPLETE, FetchStatus.ERROR].includes(fetchStatus))
  );
};
