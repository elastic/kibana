/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { injectReferences, parseSearchSourceJSON } from '@kbn/data-plugin/common';
import type { DataGridDensity } from '@kbn/unified-data-table';
import type { DiscoverSession, SortOrder } from '../types';
import type { GetSavedSearchDependencies } from './get_saved_searches';
import { getSearchSavedObject } from './get_saved_searches';

export const getDiscoverSession = async (
  discoverSessionId: string,
  deps: GetSavedSearchDependencies
): Promise<DiscoverSession> => {
  const so = await getSearchSavedObject(discoverSessionId, deps);
  const discoverSession: DiscoverSession = {
    id: so.item.id,
    title: so.item.attributes.title,
    description: so.item.attributes.description,
    // TODO: so.item.attributes.tabs shouldn't be nullable soon
    tabs: so.item.attributes.tabs!.map((tab) => ({
      id: tab.id,
      label: tab.label,
      sort: tab.attributes.sort as SortOrder[],
      columns: tab.attributes.columns,
      grid: tab.attributes.grid,
      hideChart: tab.attributes.hideChart,
      isTextBasedQuery: tab.attributes.isTextBasedQuery,
      usesAdHocDataView: tab.attributes.usesAdHocDataView,
      serializedSearchSource: injectReferences(
        parseSearchSourceJSON(tab.attributes.kibanaSavedObjectMeta?.searchSourceJSON ?? '{}'),
        so.item.references
      ),
      viewMode: tab.attributes.viewMode,
      hideAggregatedPreview: tab.attributes.hideAggregatedPreview,
      rowHeight: tab.attributes.rowHeight,
      headerRowHeight: tab.attributes.headerRowHeight,
      timeRestore: tab.attributes.timeRestore,
      timeRange: tab.attributes.timeRange,
      refreshInterval: tab.attributes.refreshInterval,
      rowsPerPage: tab.attributes.rowsPerPage,
      sampleSize: tab.attributes.sampleSize,
      breakdownField: tab.attributes.breakdownField,
      chartInterval: tab.attributes.chartInterval,
      density: tab.attributes.density as DataGridDensity,
      visContext: tab.attributes.visContext,
      controlGroupJson: tab.attributes.controlGroupJson,
    })),
    managed: Boolean(so.item.managed),
    tags: deps.savedObjectsTagging
      ? deps.savedObjectsTagging.ui.getTagIdsFromReferences(so.item.references)
      : undefined,
    references: so.item.references,
    sharingSavedObjectProps: so.meta,
  };

  return discoverSession;
};
