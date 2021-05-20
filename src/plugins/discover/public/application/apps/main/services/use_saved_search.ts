/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { useMemo, useEffect, useRef, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { merge, Subject, BehaviorSubject } from 'rxjs';
import { debounceTime, tap, filter } from 'rxjs/operators';
import { isEqual } from 'lodash';
import { DiscoverServices } from '../../../../build_services';
import { DiscoverSearchSessionManager } from './discover_search_session';
import {
  IndexPattern,
  isCompleteResponse,
  SearchSource,
  tabifyAggResponse,
} from '../../../../../../data/common';
import { SavedSearch } from '../../../../saved_searches';
import { AppState, GetStateReturn } from './discover_state';
import { ElasticSearchHit } from '../../../doc_views/doc_views_types';
import { RequestAdapter } from '../../../../../../inspector/public';
import { fetchStatuses } from '../../../components/constants';
import { AutoRefreshDoneFn, search } from '../../../../../../data/public';
import { calcFieldCounts } from '../utils/calc_field_counts';
import { SEARCH_ON_PAGE_LOAD_SETTING } from '../../../../../common';
import { validateTimeRange } from '../utils/validate_time_range';
import { updateSearchSource } from '../utils/update_search_source';
import { SortOrder } from '../../../../saved_searches/types';
import { applyAggsToSearchSource, getDimensions } from '../utils';
import { buildPointSeriesData, Chart } from '../components/chart/point_series';
import { TimechartBucketInterval } from '../components/timechart_header/timechart_header';

export interface UseSavedSearch {
  refetch$: Subject<unknown>;
  savedSearch$: SavedSearchSubject;
  shouldSearchOnPageLoad: () => boolean;
}

export interface SavedSearchSubjectMessage {
  bucketInterval?: TimechartBucketInterval;
  chartData?: Chart;
  fetchCounter?: number;
  fetchError?: Error;
  fieldCounts?: Record<string, number>;
  hits?: number;
  inspectorAdapters?: { requests: RequestAdapter };
  rows?: ElasticSearchHit[];
  state: string;
}

export type SavedSearchSubject = BehaviorSubject<SavedSearchSubjectMessage>;

export const useSavedSearch = ({
  indexPattern,
  savedSearch,
  searchSessionManager,
  searchSource,
  services,
  state,
  stateContainer,
  useNewFieldsApi,
}: {
  indexPattern: IndexPattern;
  savedSearch: SavedSearch;
  searchSessionManager: DiscoverSearchSessionManager;
  searchSource: SearchSource;
  services: DiscoverServices;
  state: AppState;
  stateContainer: GetStateReturn;
  useNewFieldsApi: boolean;
}): UseSavedSearch => {
  const { data, filterManager, uiSettings } = services;
  const timefilter = data.query.timefilter.timefilter;

  const shouldSearchOnPageLoad = useCallback(() => {
    // A saved search is created on every page load, so we check the ID to see if we're loading a
    // previously saved search or if it is just transient
    return (
      uiSettings.get(SEARCH_ON_PAGE_LOAD_SETTING) ||
      savedSearch.id !== undefined ||
      timefilter.getRefreshInterval().pause === false ||
      searchSessionManager.hasSearchSessionIdInURL()
    );
  }, [uiSettings, savedSearch.id, searchSessionManager, timefilter]);

  const savedSearch$: SavedSearchSubject = useMemo(
    () =>
      new BehaviorSubject({
        state: shouldSearchOnPageLoad() ? fetchStatuses.LOADING : fetchStatuses.UNINITIALIZED,
      }),
    [shouldSearchOnPageLoad]
  );

  const refs = useRef<{
    abortController?: AbortController;
    appState: AppState;
    // handler emitted by `timefilter.getAutoRefreshFetch$()`
    // to notify when data completed loading and to start a new autorefresh loop
    autoRefreshDoneCb?: AutoRefreshDoneFn;
    fetchCounter: number;
    fetchStatus: string;
    fieldCounts: Record<string, number>;
  }>({
    fetchCounter: 0,
    fieldCounts: {},
    appState: state,
    fetchStatus: shouldSearchOnPageLoad() ? fetchStatuses.LOADING : fetchStatuses.UNINITIALIZED,
  });
  const refetch$ = useMemo(() => new Subject(), []);

  const fetchAll = useCallback(
    (reset = false) => {
      if (!validateTimeRange(timefilter.getTime(), services.toastNotifications)) {
        return Promise.reject();
      }
      const inspectorAdapters = { requests: new RequestAdapter() };

      if (refs.current.abortController) refs.current.abortController.abort();
      refs.current.abortController = new AbortController();

      refs.current.fetchStatus = fetchStatuses.LOADING;
      if (reset) {
        // triggered e.g. when runtime field was added, changed, deleted, index pattern was switched
        savedSearch$.next({
          state: fetchStatuses.LOADING,
          rows: [],
          fieldCounts: {},
          fetchCounter: ++refs.current.fetchCounter,
        });
      } else {
        savedSearch$.next({
          state: fetchStatuses.LOADING,
          fetchCounter: ++refs.current.fetchCounter,
        });
      }

      const { sort } = stateContainer.appStateContainer.getState();
      updateSearchSource({
        volatileSearchSource: searchSource,
        indexPattern,
        services,
        sort: sort as SortOrder[],
        useNewFieldsApi,
        showUnmappedFields: useNewFieldsApi,
      });
      const chartAggConfigs =
        indexPattern.timeFieldName && !state.hideChart
          ? applyAggsToSearchSource(searchSource, state.interval!, data)
          : undefined;

      if (!chartAggConfigs) {
        searchSource.removeField('aggs');
      }

      const searchSourceFetch$ = searchSource.fetch$({
        abortSignal: refs.current.abortController.signal,
        sessionId: searchSessionManager.getNextSearchSessionId(),
        inspector: {
          adapter: inspectorAdapters.requests,
          title: i18n.translate('discover.inspectorRequestDataTitle', {
            defaultMessage: 'data',
          }),
          description: i18n.translate('discover.inspectorRequestDescriptionDocument', {
            defaultMessage: 'This request queries Elasticsearch to fetch the data for the search.',
          }),
        },
      });

      searchSourceFetch$.subscribe(
        (res) => {
          if (!isCompleteResponse(res)) {
            return;
          }
          const documents = res.rawResponse.hits.hits;

          const newFieldCounts = calcFieldCounts(
            reset ? {} : refs.current.fieldCounts,
            documents,
            indexPattern
          );

          const message: SavedSearchSubjectMessage = {
            state: fetchStatuses.COMPLETE,
            rows: documents,
            inspectorAdapters,
            fieldCounts: newFieldCounts,
            hits: res.rawResponse.hits.total as number,
          };

          refs.current.fieldCounts = newFieldCounts;
          refs.current.fetchStatus = fetchStatuses.COMPLETE;

          if (chartAggConfigs) {
            const bucketAggConfig = chartAggConfigs!.aggs[1];
            const tabifiedData = tabifyAggResponse(chartAggConfigs, res.rawResponse);
            const dimensions = getDimensions(chartAggConfigs, data);
            if (!dimensions) {
              return;
            }
            message.bucketInterval =
              bucketAggConfig && search.aggs.isDateHistogramBucketAggConfig(bucketAggConfig)
                ? bucketAggConfig.buckets?.getInterval()
                : undefined;
            message.chartData = buildPointSeriesData(tabifiedData, dimensions);
          }
          savedSearch$.next(message);
        },
        (error) => {
          if (error instanceof Error && error.name === 'AbortError') return;
          data.search.showError(error);
          refs.current.fetchStatus = fetchStatuses.ERROR;
          savedSearch$.next({
            state: fetchStatuses.ERROR,
            inspectorAdapters,
            fetchError: error,
          });
        },
        () => {
          refs.current.autoRefreshDoneCb?.();
          refs.current.autoRefreshDoneCb = undefined;
        }
      );
    },
    [
      timefilter,
      services,
      stateContainer.appStateContainer,
      searchSource,
      indexPattern,
      useNewFieldsApi,
      state.hideChart,
      state.interval,
      data,
      searchSessionManager,
      savedSearch$,
    ]
  );

  /**
   * This part takes care of triggering the data fetching by creating and subscribing
   * to an observable of various possible changes in state
   */
  useEffect(() => {
    const fetch$ = merge(
      refetch$,
      filterManager.getFetches$(),
      timefilter.getFetch$(),
      timefilter.getAutoRefreshFetch$().pipe(
        tap((done) => {
          refs.current.autoRefreshDoneCb = done;
        }),
        filter(() => refs.current.fetchStatus !== fetchStatuses.LOADING)
      ),
      data.query.queryString.getUpdates$(),
      searchSessionManager.newSearchSessionIdFromURL$
    ).pipe(debounceTime(100));

    const subscription = fetch$.subscribe({
      next: (val) => {
        fetchAll(val === 'reset');
      },
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [
    data.query.queryString,
    filterManager,
    refetch$,
    searchSessionManager.newSearchSessionIdFromURL$,
    timefilter,
    fetchAll,
  ]);

  /**
   * Track state changes that should trigger a fetch
   */
  useEffect(() => {
    let triggerFetch = false;
    let resetFieldCounts = false;
    if (state.hideChart !== refs.current.appState.hideChart && !state.hideChart) {
      // chart was hidden, now it should be displayed, so data is needed
      triggerFetch = true;
    } else if (state.interval !== refs.current.appState.interval) {
      // inverval of chart was changed
      triggerFetch = true;
    } else if (!isEqual(state.sort, refs.current.appState.sort)) {
      // sorting of document table was changed
      triggerFetch = true;
    }
    if (!isEqual(state.index, refs.current.appState.index)) {
      // different index was selected
      triggerFetch = true;
      resetFieldCounts = true;
    }
    refs.current.appState = state;
    if (triggerFetch) {
      refetch$.next(resetFieldCounts ? 'reset' : '');
    }
  }, [refetch$, state.interval, state.sort, state]);

  return {
    refetch$,
    savedSearch$,
    shouldSearchOnPageLoad,
  };
};
