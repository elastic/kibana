/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AS_CODE_DATA_VIEW_SPEC_TYPE } from '@kbn/as-code-data-views-schema';
import { toStoredTags } from '@kbn/as-code-shared-transforms';
import type { SavedObjectReference } from '@kbn/core/server';
import {
  injectReferences,
  parseSearchSourceJSON,
  type SerializedSearchSourceFields,
} from '@kbn/data-plugin/common';
import type { DiscoverSession, DiscoverSessionTab } from '@kbn/saved-search-plugin/common';
import { fromStoredTab, toStoredSort, toStoredTab } from '../../common/embeddable/transform_utils';
import type { DiscoverSessionClient } from './api_client';
import { toApiControlPanels, toControlGroupJson } from './control_panels';
import { fromApiVisContext, toApiVisContext } from './vis_context';

// The HTTP path uses this adapter because Discover still works with saved-search-shaped state.
// Removing the legacy persistence path does not remove the need for these conversions.

type ApiResponse = Awaited<ReturnType<DiscoverSessionClient['create']>>;
type ApiResolve = Awaited<ReturnType<DiscoverSessionClient['get']>>['resolve'];
type ApiData = ApiResponse['data'];
type ApiTab = ApiResponse['data']['tabs'][number];

/** Converts API fields and charts; session preparation adds inline IDs and filter defaults. */
export const fromDiscoverSessionApiResponse = (
  response: ApiResponse,
  resolve?: ApiResolve
): DiscoverSession => {
  const tabsWithReferences = response.data.tabs.map(fromApiTab);
  const { references: tagReferences } = toStoredTags({ tags: response.data.tags });

  return {
    id: response.id,
    title: response.data.title,
    description: response.data.description,
    tags: response.data.tags,
    tabs: tabsWithReferences.map(({ tab }) => tab),
    managed: response.meta.managed ?? false,
    references: [...tagReferences, ...tabsWithReferences.flatMap(({ references }) => references)],
    ...(resolve?.outcome !== undefined && { sharingSavedObjectProps: resolve }),
  };
};

/** Converts a Discover session into a create or upsert request body. */
export const toDiscoverSessionApiData = (
  session: Pick<DiscoverSession, 'title' | 'description' | 'tabs' | 'tags'>
): ApiData => ({
  title: session.title,
  description: session.description,
  ...(session.tags !== undefined && { tags: session.tags }),
  tabs: session.tabs.map(toApiTab),
});

/** Rebuilds saved-object references from the API document without rebuilding Discover tabs. */
export const getDiscoverSessionReferences = (data: ApiData): SavedObjectReference[] => {
  const { references: tagReferences } = toStoredTags({ tags: data.tags });
  const tabReferences = data.tabs.flatMap((tab) => {
    const { references } = toStoredTab(tab, { refNamePrefix: `tab_${tab.id}` });
    return references;
  });

  return [...tagReferences, ...tabReferences];
};

const fromApiTab = (
  apiTab: ApiTab
): { tab: DiscoverSessionTab; references: SavedObjectReference[] } => {
  // Reuse the stored-format conversion to rebuild search source fields and references in memory.
  const { state: storedTab, references } = toStoredTab(apiTab, {
    refNamePrefix: `tab_${apiTab.id}`,
  });
  const serializedSearchSource = injectReferences(
    parseSearchSourceJSON(storedTab.kibanaSavedObjectMeta.searchSourceJSON),
    references
  );

  const tab: DiscoverSessionTab = {
    id: apiTab.id,
    label: apiTab.label,
    sort: toStoredSort(apiTab.sort),
    columns: storedTab.columns,
    grid: storedTab.grid,
    viewMode: storedTab.viewMode,
    rowHeight: storedTab.rowHeight,
    headerRowHeight: storedTab.headerRowHeight,
    rowsPerPage: storedTab.rowsPerPage,
    sampleSize: storedTab.sampleSize,
    density: storedTab.density,
    documentsDisplayMode: storedTab.documentsDisplayMode,
    jsonModeSettings: storedTab.jsonModeSettings,
    isTextBasedQuery: storedTab.isTextBasedQuery,
    usesAdHocDataView: apiTab.data_source.type === AS_CODE_DATA_VIEW_SPEC_TYPE,
    serializedSearchSource,
    hideChart: apiTab.hide_chart,
    hideTable: apiTab.hide_table,
    hideAggregatedPreview: apiTab.hide_aggregated_preview,
    esqlApproximation: 'esql_approximation' in apiTab ? apiTab.esql_approximation : undefined,
    timeRestore: apiTab.time_range !== undefined,
    timeRange: apiTab.time_range,
    refreshInterval: apiTab.refresh_interval,
    breakdownField: apiTab.breakdown_field,
    chartInterval: apiTab.chart_interval,
    visContext: fromApiVisContext(apiTab.vis_context, apiTab.breakdown_field),
    controlGroupJson: toControlGroupJson(apiTab.control_panels),
  };

  return {
    references,
    tab,
  };
};

const toApiTab = (tab: DiscoverSessionTab): ApiTab => {
  const { id, label, serializedSearchSource: _searchSource, ...tabAttributes } = tab;
  // Only the search source needs a different shape here. The transformer selects the API fields.
  const storedTab: Parameters<typeof fromStoredTab>[0] = {
    ...tabAttributes,
    kibanaSavedObjectMeta: { searchSourceJSON: JSON.stringify(toApiSearchSource(tab)) },
  };
  const apiTab = fromStoredTab(storedTab);
  const visContext = toApiVisContext(tab.visContext);
  const controlPanels = toApiControlPanels(tab.controlGroupJson);

  return {
    id,
    label,
    ...apiTab,
    hide_chart: tab.hideChart,
    hide_table: tab.hideTable,
    ...(tab.hideAggregatedPreview !== undefined && {
      hide_aggregated_preview: tab.hideAggregatedPreview,
    }),
    ...(tab.breakdownField !== undefined && { breakdown_field: tab.breakdownField }),
    ...(tab.chartInterval !== undefined && {
      chart_interval: tab.chartInterval as NonNullable<ApiTab['chart_interval']>,
    }),
    ...(tab.timeRestore && tab.timeRange !== undefined && { time_range: tab.timeRange }),
    ...(tab.refreshInterval !== undefined && { refresh_interval: tab.refreshInterval }),
    ...(visContext !== undefined && { vis_context: visContext }),
    ...(controlPanels !== undefined && { control_panels: controlPanels }),
    ...(tab.isTextBasedQuery &&
      tab.esqlApproximation !== undefined && { esql_approximation: tab.esqlApproximation }),
  };
};

/** Removes the ID only from filters targeting the tab's inline Data View. */
const toApiSearchSource = (tab: DiscoverSessionTab): SerializedSearchSourceFields => {
  const searchSource = tab.serializedSearchSource;
  const inlineDataViewId = getInlineDataViewId(searchSource);

  if (
    tab.isTextBasedQuery ||
    inlineDataViewId === undefined ||
    !Array.isArray(searchSource.filter)
  ) {
    return searchSource;
  }

  const filter = searchSource.filter.map((storedFilter) => {
    if (storedFilter.meta.index !== inlineDataViewId) {
      return storedFilter;
    }

    const { index: _inlineDataViewId, ...meta } = storedFilter.meta;
    return { ...storedFilter, meta };
  });

  return { ...searchSource, filter };
};

/** Returns the tab's inline Data View ID. */
const getInlineDataViewId = (searchSource: SerializedSearchSourceFields): string | undefined => {
  const { index } = searchSource;
  return index && typeof index !== 'string' ? index.id : undefined;
};
