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
import type { TabState } from './types';
import { getAllowedSampleSize } from '../../../../utils/get_allowed_sample_size';
import { DEFAULT_TAB_STATE } from './constants';

export const fromSavedObjectTabToTabState = ({
  tab,
  existingTab,
}: {
  tab: DiscoverSessionTab;
  existingTab?: TabState;
}): TabState => ({
  ...DEFAULT_TAB_STATE,
  ...existingTab,
  id: tab.id,
  label: tab.label,
  initialInternalState: {
    serializedSearchSource: tab.serializedSearchSource,
    visContext: tab.visContext,
    controlGroupJson: tab.controlGroupJson,
  },
  initialAppState: {
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
    density: tab.density,
  },
  globalState: {
    timeRange: tab.timeRestore ? tab.timeRange : existingTab?.globalState.timeRange,
    refreshInterval: tab.timeRange ? tab.refreshInterval : existingTab?.globalState.refreshInterval,
  },
});

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
  timeRestore: tab.timeRestore,
  timeRange: tab.timeRange,
  refreshInterval: tab.refreshInterval,
  rowsPerPage: tab.rowsPerPage,
  sampleSize: tab.sampleSize,
  breakdownField: tab.breakdownField,
  density: tab.density,
  visContext: tab.visContext,
  controlGroupJson: tab.controlGroupJson,
});

export const fromTabStateToSavedObjectTab = ({
  tab,
  timeRestore,
  services,
}: {
  tab: TabState;
  timeRestore: boolean;
  services: DiscoverServices;
}): DiscoverSessionTab => {
  const allowedSampleSize = getAllowedSampleSize(
    tab.initialAppState?.sampleSize,
    services.uiSettings
  );

  return {
    id: tab.id,
    label: tab.label,
    sort: (tab.initialAppState?.sort ?? []) as SortOrder[],
    columns: tab.initialAppState?.columns ?? [],
    grid: tab.initialAppState?.grid ?? {},
    hideChart: tab.initialAppState?.hideChart ?? false,
    isTextBasedQuery: isOfAggregateQueryType(tab.initialAppState?.query),
    usesAdHocDataView: isObject(tab.initialInternalState?.serializedSearchSource?.index),
    serializedSearchSource: tab.initialInternalState?.serializedSearchSource ?? {},
    viewMode: tab.initialAppState?.viewMode,
    hideAggregatedPreview: tab.initialAppState?.hideAggregatedPreview,
    rowHeight: tab.initialAppState?.rowHeight,
    headerRowHeight: tab.initialAppState?.headerRowHeight,
    timeRestore,
    timeRange: timeRestore ? tab.globalState.timeRange : undefined,
    refreshInterval: timeRestore ? tab.globalState.refreshInterval : undefined,
    rowsPerPage: tab.initialAppState?.rowsPerPage,
    sampleSize:
      tab.initialAppState?.sampleSize && tab.initialAppState.sampleSize === allowedSampleSize
        ? tab.initialAppState.sampleSize
        : undefined,
    breakdownField: tab.initialAppState?.breakdownField,
    density: tab.initialAppState?.density,
    visContext: tab.initialInternalState?.visContext,
    controlGroupJson: tab.initialInternalState?.controlGroupJson,
  };
};

export const fromSavedSearchToSavedObjectTab = ({
  tab,
  savedSearch,
  services,
}: {
  tab: Pick<TabState, 'id' | 'label'>;
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
    timeRestore: savedSearch.timeRestore,
    timeRange: savedSearch.timeRange,
    refreshInterval: savedSearch.refreshInterval,
    rowsPerPage: savedSearch.rowsPerPage,
    sampleSize:
      savedSearch.sampleSize && savedSearch.sampleSize === allowedSampleSize
        ? savedSearch.sampleSize
        : undefined,
    breakdownField: savedSearch.breakdownField,
    density: savedSearch.density,
    visContext: savedSearch.visContext,
    controlGroupJson: savedSearch.controlGroupJson,
  };
};
