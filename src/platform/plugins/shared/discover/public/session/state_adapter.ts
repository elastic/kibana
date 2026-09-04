/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AS_CODE_DATA_VIEW_SPEC_TYPE, type AsCodeDataView } from '@kbn/as-code-data-views-schema';
import { fromStoredDataView } from '@kbn/as-code-data-views-transforms';
import { toStoredTags } from '@kbn/as-code-shared-transforms';
import type { SavedObjectReference } from '@kbn/core-saved-objects-common';
import {
  injectReferences,
  parseSearchSourceJSON,
  type SerializedSearchSourceFields,
} from '@kbn/data-plugin/common';
import type { DiscoverSession, DiscoverSessionTab } from '@kbn/saved-search-plugin/common';
import { stableStringify } from '@kbn/std';
import { v4 as uuidv4 } from 'uuid';
import { fromStoredTab, toStoredSort, toStoredTab } from '../../common/embeddable/transform_utils';
import type { DiscoverSessionClient } from './api_client';
import { toApiControlPanels, toControlGroupJson } from './control_panels';
import { toApiVisContext, toRuntimeVisContext } from './vis_context';

type ApiResponse = Awaited<ReturnType<DiscoverSessionClient['get']>>;
type ApiData = ApiResponse['data'];
type ApiTab = ApiResponse['data']['tabs'][number];

/** Converts an API response into the state used while Discover is running. */
export const fromDiscoverSessionApiResponse = (
  response: ApiResponse,
  requestedId?: string,
  previousTabs: DiscoverSessionTab[] = []
): DiscoverSession => {
  const previousTabsById = new Map(previousTabs.map((tab) => [tab.id, tab]));
  const inlineRuntimeIdsBySpec = new Map<string, string>();
  const materializedTabs = response.data.tabs.map((tab) =>
    fromApiTab(tab, previousTabsById.get(tab.id), inlineRuntimeIdsBySpec)
  );
  const { references: tagReferences } = toStoredTags({ tags: response.data.tags });

  return {
    id: response.id,
    title: response.data.title,
    description: response.data.description,
    tags: response.data.tags,
    tabs: materializedTabs.map(({ tab }) => tab),
    managed: response.meta.managed ?? false,
    references: [...tagReferences, ...materializedTabs.flatMap(({ references }) => references)],
    ...(requestedId !== undefined &&
      requestedId !== response.id && {
        sharingSavedObjectProps: { outcome: 'aliasMatch', aliasTargetId: response.id },
      }),
  };
};

/** Converts Discover's runtime state into a create or upsert request body. */
export const toDiscoverSessionApiData = (
  session: Pick<DiscoverSession, 'title' | 'description' | 'tabs' | 'tags'>
): ApiData => ({
  title: session.title,
  description: session.description,
  ...(session.tags !== undefined && { tags: session.tags }),
  tabs: session.tabs.map(toApiTab),
});

/** Converts one API tab into Discover runtime state. */
const fromApiTab = (
  apiTab: ApiTab,
  previousTab: DiscoverSessionTab | undefined,
  inlineRuntimeIdsBySpec: Map<string, string>
): { tab: DiscoverSessionTab; references: SavedObjectReference[] } => {
  const { state, references } = toStoredTab(apiTab, { refNamePrefix: `tab_${apiTab.id}` });
  const serializedSearchSource = toRuntimeSearchSource(
    apiTab,
    injectReferences(
      parseSearchSourceJSON(state.kibanaSavedObjectMeta.searchSourceJSON),
      references
    ),
    previousTab,
    inlineRuntimeIdsBySpec
  );

  const tab: DiscoverSessionTab = {
    id: apiTab.id,
    label: apiTab.label,
    sort: toStoredSort(apiTab.sort),
    columns: state.columns,
    grid: state.grid,
    hideChart: apiTab.hide_chart,
    hideTable: apiTab.hide_table,
    isTextBasedQuery: state.isTextBasedQuery,
    usesAdHocDataView: apiTab.data_source.type === AS_CODE_DATA_VIEW_SPEC_TYPE,
    serializedSearchSource,
    viewMode: state.viewMode,
    hideAggregatedPreview: apiTab.hide_aggregated_preview,
    rowHeight: state.rowHeight,
    headerRowHeight: state.headerRowHeight,
    esqlApproximation: 'esql_approximation' in apiTab ? apiTab.esql_approximation : undefined,
    timeRestore: apiTab.time_range !== undefined,
    timeRange: apiTab.time_range,
    refreshInterval: apiTab.refresh_interval,
    rowsPerPage: state.rowsPerPage,
    sampleSize: state.sampleSize,
    breakdownField: apiTab.breakdown_field,
    chartInterval: apiTab.chart_interval,
    density: state.density,
    documentsDisplayMode: state.documentsDisplayMode,
    jsonModeSettings: state.jsonModeSettings,
    visContext: toRuntimeVisContext(apiTab, previousTab),
    controlGroupJson: toControlGroupJson(apiTab.control_panels),
  };

  return {
    references,
    tab,
  };
};

/** Converts one runtime tab into its public API representation. */
const toApiTab = (tab: DiscoverSessionTab): ApiTab => {
  const serializedSearchSource = toApiSearchSource(tab);
  const attributes: Parameters<typeof fromStoredTab>[0] = {
    sort: tab.sort,
    columns: tab.columns,
    grid: tab.grid,
    hideChart: tab.hideChart,
    hideTable: tab.hideTable,
    isTextBasedQuery: tab.isTextBasedQuery,
    usesAdHocDataView: tab.usesAdHocDataView,
    kibanaSavedObjectMeta: { searchSourceJSON: JSON.stringify(serializedSearchSource) },
    viewMode: tab.viewMode,
    hideAggregatedPreview: tab.hideAggregatedPreview,
    rowHeight: tab.rowHeight,
    headerRowHeight: tab.headerRowHeight,
    esqlApproximation: tab.esqlApproximation,
    timeRestore: tab.timeRestore,
    timeRange: tab.timeRange,
    refreshInterval: tab.refreshInterval,
    rowsPerPage: tab.rowsPerPage,
    sampleSize: tab.sampleSize,
    breakdownField: tab.breakdownField,
    chartInterval: tab.chartInterval,
    density: tab.density,
    documentsDisplayMode: tab.documentsDisplayMode,
    jsonModeSettings: tab.jsonModeSettings,
    visContext: tab.visContext,
    controlGroupJson: tab.controlGroupJson,
  };
  const apiTab = fromStoredTab(attributes);
  const visContext = toApiVisContext(tab.visContext);
  const controlPanels = toApiControlPanels(tab.controlGroupJson);

  return {
    id: tab.id,
    label: tab.label,
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

/**
 * The API does not store IDs for inline Data Views. Keep the ID of an unchanged tab; otherwise
 * reuse the ID already assigned to the same spec, or create a new one.
 */
const toRuntimeSearchSource = (
  apiTab: ApiTab,
  searchSource: SerializedSearchSourceFields,
  previousTab: DiscoverSessionTab | undefined,
  inlineRuntimeIdsBySpec: Map<string, string>
): SerializedSearchSourceFields => {
  const { index } = searchSource;
  if (
    apiTab.data_source.type !== AS_CODE_DATA_VIEW_SPEC_TYPE ||
    !index ||
    typeof index === 'string'
  ) {
    return searchSource;
  }

  const specKey = getInlineDataViewSpecKey(apiTab.data_source);
  const previousRuntimeId = getReusablePreviousInlineDataViewId(previousTab, specKey);
  const runtimeId = previousRuntimeId ?? inlineRuntimeIdsBySpec.get(specKey) ?? uuidv4();
  inlineRuntimeIdsBySpec.set(specKey, runtimeId);

  return {
    ...searchSource,
    index: {
      ...index,
      id: runtimeId,
    },
    ...(Array.isArray(searchSource.filter) && {
      filter: searchSource.filter.map((filter) => {
        if (filter.meta.index !== undefined) {
          return filter;
        }

        return {
          ...filter,
          meta: { ...filter.meta, index: runtimeId },
        };
      }),
    }),
  };
};

/** Keeps a tab's runtime ID only while its inline data view spec is unchanged. */
const getReusablePreviousInlineDataViewId = (
  tab: DiscoverSessionTab | undefined,
  currentSpecKey: string
): string | undefined => {
  if (!tab || tab.isTextBasedQuery || !tab.usesAdHocDataView) {
    return undefined;
  }

  const { index } = tab.serializedSearchSource;
  if (!index || typeof index === 'string' || index.id === undefined) {
    return undefined;
  }

  const previousDataView = fromStoredDataView(index);
  if (getInlineDataViewSpecKey(previousDataView) !== currentSpecKey) {
    return undefined;
  }

  return index.id;
};

/**
 * Builds the key used to share a runtime ID. Previous runtime Data Views are converted back to the
 * API shape first, so extra runtime fields do not make an unchanged Data View look different.
 */
const getInlineDataViewSpecKey = (dataView: AsCodeDataView): string => stableStringify(dataView);

/** Removes the inline Data View's runtime ID before converting a classic tab to API state. */
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

/** Returns the ID of a runtime inline data view. */
const getInlineDataViewId = (searchSource: SerializedSearchSourceFields): string | undefined => {
  const { index } = searchSource;
  return index && typeof index !== 'string' ? index.id : undefined;
};
