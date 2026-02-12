/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DiscoverSession, DiscoverSessionTab } from '@kbn/saved-search-plugin/common';
import type { SavedSearch, SortOrder } from '@kbn/saved-search-plugin/public';
import { isOfAggregateQueryType } from '@kbn/es-query';
import { isObject } from 'lodash';
import { createDataSource } from '../../../../../common/data_sources';
import type { DiscoverServices } from '../../../../build_services';
import type { DiscoverAppState, TabState } from './types';
import { getAllowedSampleSize } from '../../../../utils/get_allowed_sample_size';
import { DEFAULT_TAB_STATE } from './constants';
import { parseControlGroupJson } from './utils';

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
      refreshInterval: tab.timeRestore
        ? tab.refreshInterval
        : existingTab?.globalState.refreshInterval,
    },
    attributes: {
      ...DEFAULT_TAB_STATE.attributes,
      timeRestore: tab.timeRestore ?? false,
      visContext: tab.visContext,
      controlGroupState: tab.controlGroupJson
        ? parseControlGroupJson(tab.controlGroupJson)
        : undefined,
    },
  };
};

export const fromSavedObjectTabToSavedSearch = async ({
  tab,
  discoverSession,
  services,
}: {
  discoverSession: DiscoverSession;
  tab: DiscoverSessionTab;
  services: DiscoverServices;
}): Promise<SavedSearch> => ({
  id: discoverSession.id,
  title: discoverSession.title,
  description: discoverSession.description,
  tags: discoverSession.tags,
  managed: discoverSession.managed,
  references: discoverSession.references,
  sharingSavedObjectProps: discoverSession.sharingSavedObjectProps,
  sort: tab.sort,
  columns: tab.columns,
  grid: tab.grid,
  hideChart: tab.hideChart,
  isTextBasedQuery: tab.isTextBasedQuery,
  usesAdHocDataView: tab.usesAdHocDataView,
  searchSource: await services.data.search.searchSource.create(tab.serializedSearchSource),
  viewMode: tab.viewMode,
  hideAggregatedPreview: tab.hideAggregatedPreview,
  rowHeight: tab.rowHeight,
  headerRowHeight: tab.headerRowHeight,
  timeRestore: tab.timeRestore, // managed via Redux state now
  timeRange: tab.timeRange, // managed via Redux state now
  refreshInterval: tab.refreshInterval, // managed via Redux state now
  rowsPerPage: tab.rowsPerPage,
  sampleSize: tab.sampleSize,
  breakdownField: tab.breakdownField,
  chartInterval: tab.chartInterval,
  density: tab.density,
  visContext: tab.visContext, // managed via Redux state now
  controlGroupJson: tab.controlGroupJson, // managed via Redux state now
});

export const fromTabStateToSavedObjectTab = ({
  tab,
  overridenTimeRestore,
  services,
}: {
  tab: TabState;
  overridenTimeRestore?: boolean;
  services: DiscoverServices;
}): DiscoverSessionTab => {
  const allowedSampleSize = getAllowedSampleSize(tab.appState.sampleSize, services.uiSettings);
  const timeRestore = overridenTimeRestore ?? tab.attributes.timeRestore ?? false;

  return {
    id: tab.id,
    label: tab.label,
    sort: (tab.appState.sort ?? []) as SortOrder[],
    columns: tab.appState.columns ?? [],
    grid: tab.appState.grid ?? {},
    hideChart: tab.appState.hideChart ?? false,
    isTextBasedQuery: isOfAggregateQueryType(tab.appState.query),
    usesAdHocDataView: isObject(tab.initialInternalState?.serializedSearchSource?.index),
    serializedSearchSource: tab.initialInternalState?.serializedSearchSource ?? {},
    viewMode: tab.appState.viewMode,
    hideAggregatedPreview: tab.appState.hideAggregatedPreview,
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
    breakdownField: tab.appState.breakdownField,
    chartInterval: tab.appState.interval,
    density: tab.appState.density,
    visContext: tab.attributes.visContext,
    controlGroupJson: tab.attributes.controlGroupState
      ? JSON.stringify(tab.attributes.controlGroupState)
      : undefined,
  };
};

export const fromSavedSearchToSavedObjectTab = ({
  tab,
  savedSearch,
  services,
}: {
  tab: Pick<TabState, 'id' | 'label'> & {
    attributes?: TabState['attributes'];
    globalState?: TabState['globalState'];
  };
  savedSearch: SavedSearch;
  services: DiscoverServices;
}): DiscoverSessionTab => {
  const allowedSampleSize = getAllowedSampleSize(savedSearch.sampleSize, services.uiSettings);

  return {
    id: tab.id,
    label: tab.label,
    sort: savedSearch.sort ?? [],
    columns: savedSearch.columns ?? [],
    grid: savedSearch.grid ?? {},
    hideChart: savedSearch.hideChart ?? false,
    isTextBasedQuery: savedSearch.isTextBasedQuery ?? false,
    usesAdHocDataView: savedSearch.usesAdHocDataView,
    serializedSearchSource: savedSearch.searchSource.getSerializedFields() ?? {},
    viewMode: savedSearch.viewMode,
    hideAggregatedPreview: savedSearch.hideAggregatedPreview,
    rowHeight: savedSearch.rowHeight,
    headerRowHeight: savedSearch.headerRowHeight,
    timeRestore: (tab.attributes ? tab.attributes.timeRestore : savedSearch.timeRestore) ?? false,
    timeRange: tab.attributes
      ? tab.attributes.timeRestore
        ? tab.globalState?.timeRange
        : undefined
      : savedSearch.timeRange,
    refreshInterval: tab.attributes
      ? tab.attributes.timeRestore
        ? tab.globalState?.refreshInterval
        : undefined
      : savedSearch.refreshInterval,
    rowsPerPage: savedSearch.rowsPerPage,
    sampleSize:
      savedSearch.sampleSize && savedSearch.sampleSize === allowedSampleSize
        ? savedSearch.sampleSize
        : undefined,
    breakdownField: savedSearch.breakdownField,
    chartInterval: savedSearch.chartInterval,
    density: savedSearch.density,
    visContext: tab.attributes ? tab.attributes?.visContext : savedSearch.visContext,
    controlGroupJson: tab.attributes
      ? tab.attributes?.controlGroupState
        ? JSON.stringify(tab.attributes.controlGroupState)
        : undefined
      : savedSearch.controlGroupJson,
  };
};
