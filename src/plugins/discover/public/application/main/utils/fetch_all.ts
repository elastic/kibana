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
  sendResetMsg,
} from '../hooks/use_saved_search_messages';
import { fetchDocuments } from './fetch_documents';
import { FetchStatus } from '../../types';
import { DataMsg, RecordRawType, SavedSearchData } from '../services/discover_data_state_container';
import { DiscoverServices } from '../../../build_services';
import { fetchSql } from './fetch_sql';

export interface FetchDeps {
  abortController: AbortController;
  getAppState: () => DiscoverAppState;
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
  fetchDeps: FetchDeps
): Promise<void> {
  const { initialFetchStatus, getAppState, services, inspectorAdapters, savedSearch } = fetchDeps;
  const { data } = services;
  const searchSource = savedSearch.searchSource.createChild();

  try {
    const dataView = searchSource.getField('index')!;
    const query = getAppState().query;
    const prevQuery = dataSubjects.documents$.getValue().query;
    const recordRawType = getRawRecordType(query);
    if (reset) {
      sendResetMsg(dataSubjects, initialFetchStatus, recordRawType);
    }
    const useSql = recordRawType === RecordRawType.PLAIN;

    if (recordRawType === RecordRawType.DOCUMENT) {
      // Update the base searchSource, base for all child fetches
      updateVolatileSearchSource(searchSource, {
        dataView,
        services,
        sort: getAppState().sort as SortOrder[],
      });
    }

    // Mark all subjects as loading
    sendLoadingMsg(dataSubjects.main$, { recordRawType });
    sendLoadingMsg(dataSubjects.documents$, { recordRawType, query });
    sendLoadingMsg(dataSubjects.totalHits$, { recordRawType });

    // Start fetching all required requests
    const response =
      useSql && query
        ? fetchSql(query, dataView, data, services.expressions, inspectorAdapters)
        : fetchDocuments(searchSource, fetchDeps);
    const fetchType = useSql && query ? 'fetchSql' : 'fetchDocuments';
    const startTime = window.performance.now();
    // Handle results of the individual queries and forward the results to the corresponding dataSubjects
    response
      .then(({ records, textBasedQueryColumns }) => {
        if (services.analytics) {
          const duration = window.performance.now() - startTime;
          reportPerformanceMetricEvent(services.analytics, {
            eventName: 'discoverFetchAllRequestsOnly',
            duration,
            meta: { fetchType },
          });
        }
        // If the total hits (or chart) query is still loading, emit a partial
        // hit count that's at least our retrieved document count
        if (dataSubjects.totalHits$.getValue().fetchStatus === FetchStatus.LOADING) {
          dataSubjects.totalHits$.next({
            fetchStatus: FetchStatus.PARTIAL,
            result: records.length,
            recordRawType,
          });
        }
        /**
         * The partial state for text based query languages is necessary in case the query has changed
         * In the follow up useTextBasedQueryLanguage hook in this case new columns are added to AppState
         * So the data table shows the new columns of the table. The partial state was introduced to prevent
         * To frequent change of state causing the table to re-render to often, which causes race conditions
         * So it takes too long, a bad user experience, also a potential flakniess in tests
         */
        const fetchStatus =
          useSql && (!prevQuery || !isEqual(query, prevQuery))
            ? FetchStatus.PARTIAL
            : FetchStatus.COMPLETE;

        dataSubjects.documents$.next({
          fetchStatus,
          result: records,
          textBasedQueryColumns,
          recordRawType,
          query,
        });

        checkHitCount(dataSubjects.main$, records.length);
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
