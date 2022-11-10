/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SerializableRecord } from '@kbn/utility-types';
import type { Filter, TimeRange, Query, AggregateQuery } from '@kbn/es-query';
import type { GlobalQueryStateFromUrl, RefreshInterval } from '@kbn/data-plugin/public';
import type { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/public';
import { setStateToKbnUrl } from '@kbn/kibana-utils-plugin/public';
import { DataViewSpec } from '@kbn/data-views-plugin/public';
import type { VIEW_MODE } from './components/view_mode_toggle';

export const DISCOVER_APP_LOCATOR = 'DISCOVER_APP_LOCATOR';

export interface DiscoverAppLocatorParams extends SerializableRecord {
  /**
   * Optionally set saved search ID.
   */
  savedSearchId?: string;

  /**
   * Optionally set index pattern / data view ID.
   */
  dataViewId?: string;
  /**
   * Duplication of dataViewId
   * @deprecated
   */
  indexPatternId?: string;
  dataViewSpec?: DataViewSpec;

  /**
   * Optionally set the time range in the time picker.
   */
  timeRange?: TimeRange;

  /**
   * Optionally set the refresh interval.
   */
  refreshInterval?: RefreshInterval & SerializableRecord;

  /**
   * Optionally apply filters.
   */
  filters?: Filter[];

  /**
   * Optionally set a query.
   */
  query?: Query | AggregateQuery;

  /**
   * If not given, will use the uiSettings configuration for `storeInSessionStorage`. useHash determines
   * whether to hash the data in the url to avoid url length issues.
   */
  useHash?: boolean;

  /**
   * Background search session id
   */
  searchSessionId?: string;

  /**
   * Columns displayed in the table
   */
  columns?: string[];

  /**
   * Used interval of the histogram
   */
  interval?: string;

  /**
   * Array of the used sorting [[field,direction],...]
   */
  sort?: string[][];

  /**
   * id of the used saved query
   */
  savedQuery?: string;
  /**
   * Table view: Documents vs Field Statistics
   */
  viewMode?: VIEW_MODE;
  /**
   * Hide mini distribution/preview charts when in Field Statistics mode
   */
  hideAggregatedPreview?: boolean;
}

export type DiscoverAppLocator = LocatorPublic<DiscoverAppLocatorParams>;

export interface DiscoverAppLocatorDependencies {
  useHash: boolean;
}

/**
 * Location state of scoped history (history instance of Kibana Platform application service)
 */
export interface MainHistoryLocationState {
  dataViewSpec?: DataViewSpec;
}

export class DiscoverAppLocatorDefinition implements LocatorDefinition<DiscoverAppLocatorParams> {
  public readonly id = DISCOVER_APP_LOCATOR;

  constructor(protected readonly deps: DiscoverAppLocatorDependencies) {}

  public readonly getLocation = async (params: DiscoverAppLocatorParams) => {
    const {
      useHash = this.deps.useHash,
      filters,
      dataViewId,
      indexPatternId,
      dataViewSpec,
      query,
      refreshInterval,
      savedSearchId,
      timeRange,
      searchSessionId,
      columns,
      savedQuery,
      sort,
      interval,
      viewMode,
      hideAggregatedPreview,
    } = params;
    const savedSearchPath = savedSearchId ? `view/${encodeURIComponent(savedSearchId)}` : '';
    const appState: {
      query?: Query | AggregateQuery;
      filters?: Filter[];
      index?: string;
      columns?: string[];
      interval?: string;
      sort?: string[][];
      savedQuery?: string;
      viewMode?: string;
      hideAggregatedPreview?: boolean;
    } = {};
    const queryState: GlobalQueryStateFromUrl = {};
    const { isFilterPinned } = await import('@kbn/es-query');

    if (query) appState.query = query;
    if (filters && filters.length) appState.filters = filters?.filter((f) => !isFilterPinned(f));
    if (indexPatternId) appState.index = indexPatternId;
    if (dataViewId) appState.index = dataViewId;
    if (columns) appState.columns = columns;
    if (savedQuery) appState.savedQuery = savedQuery;
    if (sort) appState.sort = sort;
    if (interval) appState.interval = interval;

    if (timeRange) queryState.time = timeRange;
    if (filters && filters.length) queryState.filters = filters?.filter((f) => isFilterPinned(f));
    if (refreshInterval) queryState.refreshInterval = refreshInterval;
    if (viewMode) appState.viewMode = viewMode;
    if (hideAggregatedPreview) appState.hideAggregatedPreview = hideAggregatedPreview;

    const state: MainHistoryLocationState = {};
    if (dataViewSpec) {
      state.dataViewSpec = dataViewSpec;
    }

    let path = `#/${savedSearchPath}`;
    path = setStateToKbnUrl<GlobalQueryStateFromUrl>('_g', queryState, { useHash }, path);
    path = setStateToKbnUrl('_a', appState, { useHash }, path);

    if (searchSessionId) {
      path = `${path}&searchSessionId=${searchSessionId}`;
    }

    return {
      app: 'discover',
      path,
      state,
    };
  };
}
