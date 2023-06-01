/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Filter, Query, AggregateQuery } from '@kbn/es-query';
import type { GlobalQueryStateFromUrl } from '@kbn/data-plugin/public';
import type { LocatorDefinition } from '@kbn/share-plugin/public';
import type { SetStateToKbnUrlHashOptions } from '@kbn/kibana-utils-plugin/common/state_management/set_state_to_kbn_url';
import type {
  DiscoverAppLocatorDependencies,
  DiscoverAppLocatorParams,
  MainHistoryLocationState,
} from '@kbn/unified-discover/src/main/types';
import { setStateToKbnUrl } from '@kbn/kibana-utils-plugin/common';
export const DISCOVER_APP_LOCATOR = 'DISCOVER_APP_LOCATOR';

export class DiscoverAppLocatorDefinitionCommon
  implements LocatorDefinition<DiscoverAppLocatorParams>
{
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
      breakdownField,
      isAlertResults,
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
      breakdownField?: string;
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
    if (breakdownField) appState.breakdownField = breakdownField;

    const state: MainHistoryLocationState = {};
    if (dataViewSpec) state.dataViewSpec = dataViewSpec;
    if (isAlertResults) state.isAlertResults = isAlertResults;

    let path = `#/${savedSearchPath}`;
    path = this.setStateToKbnUrl<GlobalQueryStateFromUrl>('_g', queryState, { useHash }, path);
    path = this.setStateToKbnUrl('_a', appState, { useHash }, path);

    if (searchSessionId) {
      path = `${path}&searchSessionId=${searchSessionId}`;
    }

    return {
      app: 'discover',
      path,
      state,
    };
  };
  public setStateToKbnUrl = <State>(
    key: string,
    state: State,
    hashOptions: SetStateToKbnUrlHashOptions,
    rawUrl: string
  ): string => {
    return setStateToKbnUrl<State>(key, state, hashOptions, rawUrl);
  };
}
