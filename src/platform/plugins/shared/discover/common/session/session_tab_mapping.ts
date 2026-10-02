/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AS_CODE_DATA_VIEW_SPEC_TYPE } from '@kbn/as-code-data-views-schema';
import {
  discoverSessionApiClassicTabSchema,
  type DiscoverSessionApiClassicTab,
  type DiscoverSessionApiEsqlTab,
  type DiscoverSessionApiTab,
  type DiscoverSessionApiTabBase,
} from '@kbn/as-code-discover-schema';
import type { SerializedSearchSourceFields } from '@kbn/data-plugin/common';
import { DiscoverTabType } from '@kbn/discover-session-constants';
import { isFilterPinned, isOfAggregateQueryType, unpinFilter } from '@kbn/es-query';
import type { DiscoverSessionTab } from '@kbn/saved-search-plugin/common';
import type { DiscoverSessionTabAttributes } from '@kbn/saved-search-plugin/server';
import { isDiscoverSessionEsqlTab } from './type_guards';
import { fromStoredSearchAndTable } from './search_and_table_mapping';
import { fromStoredTabTypeState } from './tab_type_state';

// "Stored" names the saved tab format, not a persistence step (see search_and_table_mapping.ts).

type TabWithoutTypeState =
  | Omit<DiscoverSessionApiClassicTab, 'type'>
  | Omit<DiscoverSessionApiEsqlTab, 'type'>;

/** Session display, time, and query settings in the stored format. */
type StoredSessionSettings = Pick<
  DiscoverSessionTabAttributes,
  | 'hideChart'
  | 'hideTable'
  | 'hideAggregatedPreview'
  | 'breakdownField'
  | 'chartInterval'
  | 'timeRestore'
  | 'timeRange'
  | 'refreshInterval'
  | 'usesAdHocDataView'
  | 'esqlApproximation'
>;

/** Maps API display, time, and query settings to tab fields, including inline Data View usage. */
export const toStoredSessionSettings = (tab: DiscoverSessionApiTab): StoredSessionSettings => ({
  hideChart: tab.hide_chart,
  hideTable: tab.hide_table,
  ...('hide_aggregated_preview' in tab &&
    tab.hide_aggregated_preview !== undefined && {
      hideAggregatedPreview: tab.hide_aggregated_preview,
    }),
  breakdownField: tab.breakdown_field,
  ...('chart_interval' in tab &&
    tab.chart_interval !== undefined && { chartInterval: tab.chart_interval }),
  timeRestore: tab.time_range !== undefined,
  timeRange: tab.time_range,
  refreshInterval: tab.refresh_interval,
  usesAdHocDataView: tab.data_source.type === AS_CODE_DATA_VIEW_SPEC_TYPE,
  ...('esql_approximation' in tab &&
    tab.esql_approximation !== undefined && { esqlApproximation: tab.esql_approximation }),
});

const fromStoredCommonSessionSettings = (
  tab: DiscoverSessionTab | DiscoverSessionTabAttributes
) => ({
  hide_chart: tab.hideChart ?? false,
  hide_table: tab.hideTable ?? false,
  ...(tab.breakdownField !== undefined && {
    breakdown_field: tab.breakdownField,
  }),
  ...(tab.timeRestore && tab.timeRange !== undefined && { time_range: tab.timeRange }),
  ...(tab.refreshInterval !== undefined && {
    refresh_interval: tab.refreshInterval,
  }),
});

/** Maps Classic session settings, including the field statistics preview preference. */
export const fromStoredClassicSessionSettings = (
  tab: DiscoverSessionTab | DiscoverSessionTabAttributes
) => ({
  ...fromStoredCommonSessionSettings(tab),
  ...(tab.chartInterval !== undefined && {
    chart_interval: discoverSessionApiClassicTabSchema.shape.chart_interval
      .catch('auto')
      .parse(tab.chartInterval),
  }),
  ...(tab.hideAggregatedPreview !== undefined && {
    hide_aggregated_preview: tab.hideAggregatedPreview,
  }),
});

/** Maps ES|QL session settings, including approximation when present. */
export const fromStoredEsqlSessionSettings = (
  tab: DiscoverSessionTab | DiscoverSessionTabAttributes
) => ({
  ...fromStoredCommonSessionSettings(tab),
  ...(tab.esqlApproximation !== undefined && {
    esql_approximation: tab.esqlApproximation,
  }),
});

/** Applies tab type settings, rejecting Metrics settings on Classic tabs. */
export const applySessionTabTypeState = (
  apiTab: TabWithoutTypeState,
  tabTypeState: DiscoverSessionTabAttributes['tabTypeState']
): DiscoverSessionApiTab => {
  const apiTabTypeState = fromStoredTabTypeState(tabTypeState);

  if (apiTabTypeState.type === DiscoverTabType.Default) {
    return { ...apiTab, ...apiTabTypeState };
  }

  if (!isDiscoverSessionEsqlTab(apiTab)) {
    throw new Error(`Tab "${apiTab.label}" with ID "${apiTab.id}" requires an ES|QL data source.`);
  }

  return { ...apiTab, ...apiTabTypeState };
};

/**
 * Maps session search and table state to public API fields, keeping pinned conditions and
 * omitting inline IDs without changing the original filters.
 */
export const fromStoredSessionSearchAndTable = (
  tab: DiscoverSessionTab | DiscoverSessionTabAttributes,
  searchSource: SerializedSearchSourceFields
): DiscoverSessionApiTabBase => {
  if (isOfAggregateQueryType(searchSource.query)) {
    return fromStoredSearchAndTable(tab, searchSource);
  }

  const transformedTab = fromStoredSearchAndTable(tab, pinnedFiltersToAppFilters(searchSource));
  if (isDiscoverSessionEsqlTab(transformedTab)) {
    return transformedTab;
  }

  const { index } = searchSource;
  const inlineDataViewId = index && typeof index !== 'string' ? index.id : undefined;
  return {
    ...transformedTab,
    filters: omitInlineDataViewIdFromFilters(transformedTab.filters, inlineDataViewId),
  };
};

/** Keeps pinned conditions in session exports without changing the original filters. */
export const pinnedFiltersToAppFilters = (searchSource: SerializedSearchSourceFields) => {
  const { filter: filters } = searchSource;

  if (!Array.isArray(filters) || !filters.some(isFilterPinned)) {
    return searchSource;
  }

  return {
    ...searchSource,
    filter: filters.map(unpinFilter),
  };
};

/** Omits references to the current inline view, leaving references to other views unchanged. */
const omitInlineDataViewIdFromFilters = (
  filters: DiscoverSessionApiClassicTab['filters'],
  inlineDataViewId: string | undefined
) => {
  if (inlineDataViewId === undefined) {
    return filters;
  }

  return filters.map((filter) => {
    if (filter.data_view_id !== inlineDataViewId) {
      return filter;
    }

    const { data_view_id: _inlineDataViewId, ...filterWithoutDataViewId } = filter;
    return filterWithoutDataViewId;
  });
};
