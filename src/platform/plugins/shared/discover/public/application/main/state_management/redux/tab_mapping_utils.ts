/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ISearchSource } from '@kbn/data-plugin/common';
import type { DiscoverSessionTab } from '@kbn/saved-search-plugin/common';
import type { SortOrder } from '@kbn/saved-search-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import { isOfAggregateQueryType } from '@kbn/es-query';
import { isObject } from 'lodash';
import { createDataSource } from '../../../../../common/data_sources';
import type { DiscoverServices } from '../../../../build_services';
import type { DiscoverAppState, TabState } from './types';
import { getAllowedSampleSize } from '../../../../utils/get_allowed_sample_size';
import { DEFAULT_TAB_STATE } from './constants';
import { createSearchSource } from '../utils/create_search_source';

export const fromSavedObjectTabToTabState = ({
  tab,
  existingTab,
  initialAppState,
}: {
  tab: DiscoverSessionTab;
  existingTab?: TabState;
  initialAppState?: DiscoverAppState;
}): TabState => {
  const appState: DiscoverAppState = initialAppState ?? {
    columns: tab.columns,
    filters: tab.serializedSearchSource.filter,
    grid: tab.grid,
    hideChart: tab.hideChart,
    dataSource: createDataSource({
      query: tab.serializedSearchSource.query,
      dataView: tab.serializedSearchSource.index,
    }),
    query: tab.serializedSearchSource.query,
    sort: tab.sort,
    viewMode: tab.viewMode,
    hideAggregatedPreview: tab.hideAggregatedPreview,
    rowHeight: tab.rowHeight,
    headerRowHeight: tab.headerRowHeight,
    rowsPerPage: tab.rowsPerPage,
    sampleSize: tab.sampleSize,
    breakdownField: tab.breakdownField,
    interval: tab.chartInterval,
    density: tab.density,
  };

  return {
    ...DEFAULT_TAB_STATE,
    ...existingTab,
    id: tab.id,
    label: tab.label,
    initialInternalState: {
      serializedSearchSource: tab.serializedSearchSource,
    },
    appState,
    previousAppState: existingTab?.appState ?? appState,
    globalState: {
      timeRange: tab.timeRestore ? tab.timeRange : existingTab?.globalState.timeRange,
      refreshInterval: tab.timeRange
        ? tab.refreshInterval
        : existingTab?.globalState.refreshInterval,
    },
    attributes: {
      ...DEFAULT_TAB_STATE.attributes,
      visContext: tab.visContext,
      controlGroupJson: tab.controlGroupJson,
      timeRestore: tab.timeRestore ?? false,
    },
  };
};

export const fromSavedObjectTabToSearchSource = async ({
  tab,
  services,
}: {
  tab: DiscoverSessionTab;
  services: DiscoverServices;
}): Promise<ISearchSource> => {
  return services.data.search.searchSource.create(tab.serializedSearchSource);
};

export const fromTabStateToSavedObjectTab = ({
  tab,
  dataView,
  overrideTimeRestore,
  services,
}: {
  tab: TabState;
  dataView: DataView | undefined;
  overrideTimeRestore?: boolean;
  services: DiscoverServices;
}): DiscoverSessionTab => {
  const allowedSampleSize = getAllowedSampleSize(tab.appState.sampleSize, services.uiSettings);
  const serializedSearchSource = dataView
    ? createSearchSource({
        dataView,
        appState: tab.appState,
        globalState: tab.globalState,
        services,
      }).getSerializedFields()
    : tab.initialInternalState?.serializedSearchSource;
  const timeRestore = overrideTimeRestore ?? tab.attributes.timeRestore ?? false;

  return {
    id: tab.id,
    label: tab.label,
    sort: (tab.appState.sort ?? []) as SortOrder[],
    columns: tab.appState.columns ?? [],
    grid: tab.appState.grid ?? {},
    hideChart: tab.appState.hideChart ?? false,
    isTextBasedQuery: isOfAggregateQueryType(tab.appState.query),
    usesAdHocDataView: isObject(serializedSearchSource?.index),
    serializedSearchSource: serializedSearchSource ?? {},
    viewMode: tab.appState.viewMode,
    hideAggregatedPreview: tab.appState.hideAggregatedPreview ?? false,
    rowHeight: tab.appState.rowHeight,
    headerRowHeight: tab.appState.headerRowHeight,
    timeRestore,
    timeRange: timeRestore ? tab.globalState.timeRange : undefined,
    refreshInterval: timeRestore ? tab.globalState.refreshInterval : undefined,
    rowsPerPage: tab.appState.rowsPerPage,
    sampleSize:
      tab.appState.sampleSize && tab.appState.sampleSize === allowedSampleSize
        ? tab.appState.sampleSize
        : undefined,
    breakdownField: tab.appState.breakdownField || '', // TODO: check saving Discover Session with undefined
    chartInterval: tab.appState.interval || 'auto',
    density: tab.appState.density,
    visContext: tab.attributes.visContext,
    controlGroupJson: tab.attributes.controlGroupJson,
  };
};
