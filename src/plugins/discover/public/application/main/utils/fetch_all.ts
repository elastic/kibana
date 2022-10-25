/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { DataPublicPluginStart, ISearchSource } from '@kbn/data-plugin/public';
import { Adapters } from '@kbn/inspector-plugin/common';
import { ReduxLikeStateContainer } from '@kbn/kibana-utils-plugin/common';
import { DataViewType } from '@kbn/data-views-plugin/public';
import type { SavedSearch, SortOrder } from '@kbn/saved-search-plugin/public';
import { getRawRecordType } from './get_raw_record_type';
import {
  sendCompleteMsg,
  sendErrorMsg,
  sendLoadingMsg,
  sendNoResultsFoundMsg,
  sendPartialMsg,
  sendResetMsg,
} from '../hooks/use_saved_search_messages';
import { updateSearchSource } from './update_search_source';
import { fetchDocuments } from './fetch_documents';
import { fetchTotalHits } from './fetch_total_hits';
import { fetchChart } from './fetch_chart';
import { AppState } from '../services/discover_state';
import { FetchStatus } from '../../types';
import {
  DataCharts$,
  DataDocuments$,
  DataMain$,
  DataTotalHits$,
  RecordRawType,
  SavedSearchData,
} from '../hooks/use_saved_search';
import { DiscoverServices } from '../../../build_services';
import { fetchSql } from './fetch_sql';

export interface FetchDeps {
  abortController: AbortController;
  appStateContainer: ReduxLikeStateContainer<AppState>;
  data: DataPublicPluginStart;
  initialFetchStatus: FetchStatus;
  inspectorAdapters: Adapters;
  savedSearch: SavedSearch;
  searchSessionId: string;
  services: DiscoverServices;
  useNewFieldsApi: boolean;
}

/**
 * This function starts fetching all required queries in Discover. This will be the query to load the individual
 * documents, and depending on whether a chart is shown either the aggregation query to load the chart data
 * or a query to retrieve just the total hits.
 *
 * This method returns a promise, which will resolve (without a value), as soon as all queries that have been started
 * have been completed (failed or successfully).
 */
export function fetchAll(
  dataSubjects: SavedSearchData,
  searchSource: ISearchSource,
  reset = false,
  fetchDeps: FetchDeps
): Promise<void> {
  const { initialFetchStatus, appStateContainer, services, useNewFieldsApi, data } = fetchDeps;

  /**
   * Method to create an error handler that will forward the received error
   * to the specified subjects. It will ignore AbortErrors and will use the data
   * plugin to show a toast for the error (e.g. allowing better insights into shard failures).
   */
  const sendErrorTo = (
    ...errorSubjects: Array<DataMain$ | DataDocuments$ | DataTotalHits$ | DataCharts$>
  ) => {
    return (error: Error) => {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }

      data.search.showError(error);
      errorSubjects.forEach((subject) => sendErrorMsg(subject, error));
    };
  };

  try {
    const dataView = searchSource.getField('index')!;
    if (reset) {
      sendResetMsg(dataSubjects, initialFetchStatus);
    }
    const { hideChart, sort, query } = appStateContainer.getState();
    const recordRawType = getRawRecordType(query);
    const useSql = recordRawType === RecordRawType.PLAIN;

    if (recordRawType === RecordRawType.DOCUMENT) {
      // Update the base searchSource, base for all child fetches
      updateSearchSource(searchSource, false, {
        dataView,
        services,
        sort: sort as SortOrder[],
        useNewFieldsApi,
      });
    }

    // Mark all subjects as loading
    sendLoadingMsg(dataSubjects.main$, recordRawType);
    sendLoadingMsg(dataSubjects.documents$, recordRawType, query);
    sendLoadingMsg(dataSubjects.totalHits$, recordRawType);
    sendLoadingMsg(dataSubjects.charts$, recordRawType);

    const isChartVisible =
      !hideChart && dataView.isTimeBased() && dataView.type !== DataViewType.ROLLUP;

    // Start fetching all required requests
    const documents =
      useSql && query
        ? fetchSql(query, services.dataViews, data, services.expressions)
        : fetchDocuments(searchSource.createCopy(), fetchDeps);
    const charts =
      isChartVisible && !useSql ? fetchChart(searchSource.createCopy(), fetchDeps) : undefined;
    const totalHits =
      !isChartVisible && !useSql ? fetchTotalHits(searchSource.createCopy(), fetchDeps) : undefined;
    /**
     * This method checks the passed in hit count and will send a PARTIAL message to main$
     * if there are results, indicating that we have finished some of the requests that have been
     * sent. If there are no results we already COMPLETE main$ with no results found, so Discover
     * can show the "no results" screen. We know at that point, that the other query returning
     * will neither carry any data, since there are no documents.
     */
    const checkHitCount = (hitsCount: number) => {
      if (hitsCount > 0) {
        sendPartialMsg(dataSubjects.main$);
      } else {
        sendNoResultsFoundMsg(dataSubjects.main$);
      }
    };

    // Handle results of the individual queries and forward the results to the corresponding dataSubjects

    documents
      .then((docs) => {
        // If the total hits (or chart) query is still loading, emit a partial
        // hit count that's at least our retrieved document count
        if (dataSubjects.totalHits$.getValue().fetchStatus === FetchStatus.LOADING) {
          dataSubjects.totalHits$.next({
            fetchStatus: FetchStatus.PARTIAL,
            result: docs.length,
            recordRawType,
          });
        }

        dataSubjects.documents$.next({
          fetchStatus: FetchStatus.COMPLETE,
          result: docs,
          recordRawType,
          query,
        });

        checkHitCount(docs.length);
      })
      // Only the document query should send its errors to main$, to cause the full Discover app
      // to get into an error state. The other queries will not cause all of Discover to error out
      // but their errors will be shown in-place (e.g. of the chart).
      .catch(sendErrorTo(dataSubjects.documents$, dataSubjects.main$));

    charts
      ?.then((chart) => {
        dataSubjects.charts$.next({
          fetchStatus: FetchStatus.COMPLETE,
          response: chart.response,
          recordRawType,
        });

        checkHitCount(chart.totalHits);
      })
      .catch(sendErrorTo(dataSubjects.charts$, dataSubjects.totalHits$));

    totalHits
      ?.then((hitCount) => {
        dataSubjects.totalHits$.next({
          fetchStatus: FetchStatus.COMPLETE,
          result: hitCount,
          recordRawType,
        });
        checkHitCount(hitCount);
      })
      .catch(sendErrorTo(dataSubjects.totalHits$));

    // Return a promise that will resolve once all the requests have finished or failed
    return Promise.allSettled([documents, charts, totalHits]).then(() => {
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
