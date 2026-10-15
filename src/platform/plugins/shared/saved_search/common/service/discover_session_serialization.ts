/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectReference } from '@kbn/core-saved-objects-server';
import {
  extractReferences,
  injectReferences,
  parseSearchSourceJSON,
} from '@kbn/data-plugin/common';
import type {
  DataGridDensity,
  DocumentsDisplayMode,
  JsonModeSettings,
} from '@kbn/unified-data-table';
import type { DiscoverSessionAttributes } from '../../server';
import type { DiscoverSession, SortOrder } from '../types';

/** Stored Discover session attributes and the references extracted from its tabs. */
export interface StoredDiscoverSession {
  attributes: DiscoverSessionAttributes;
  references: SavedObjectReference[];
}

/** Converts session tabs to stored attributes, extracting their search source references. */
export const serializeDiscoverSession = (
  session: Pick<DiscoverSession, 'title' | 'description' | 'tabs'>
): StoredDiscoverSession => {
  const references: SavedObjectReference[] = [];

  const tabs: DiscoverSessionAttributes['tabs'] = session.tabs.map((tab) => {
    const [serializedSearchSource, searchSourceReferences] = extractReferences(
      tab.serializedSearchSource,
      { refNamePrefix: `tab_${tab.id}` }
    );

    references.push(...searchSourceReferences);

    return {
      id: tab.id,
      label: tab.label,
      attributes: {
        sort: tab.sort,
        columns: tab.columns,
        grid: tab.grid,
        hideChart: tab.hideChart,
        hideTable: tab.hideTable,
        isTextBasedQuery: tab.isTextBasedQuery,
        usesAdHocDataView: tab.usesAdHocDataView,
        kibanaSavedObjectMeta: {
          searchSourceJSON: JSON.stringify(serializedSearchSource),
        },
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
        tabTypeState: tab.tabTypeState,
      },
    };
  });

  return {
    attributes: {
      title: session.title,
      description: session.description,
      tabs,
    },
    references,
  };
};

/** A stored session with the saved object fields that Discover keeps in memory. */
export interface StoredDiscoverSessionObject extends StoredDiscoverSession {
  id: string;
  managed?: boolean;
  sharingSavedObjectProps?: DiscoverSession['sharingSavedObjectProps'];
}

/** Restores a Discover session from stored attributes; callers add tags from the references. */
export const deserializeDiscoverSession = ({
  id,
  attributes,
  references,
  managed,
  sharingSavedObjectProps,
}: StoredDiscoverSessionObject): DiscoverSession => ({
  id,
  title: attributes.title,
  description: attributes.description,
  tabs: attributes.tabs.map((tab) => ({
    id: tab.id,
    label: tab.label,
    sort: tab.attributes.sort as SortOrder[],
    columns: tab.attributes.columns,
    grid: tab.attributes.grid,
    hideChart: tab.attributes.hideChart,
    hideTable: tab.attributes.hideTable,
    isTextBasedQuery: tab.attributes.isTextBasedQuery,
    usesAdHocDataView: tab.attributes.usesAdHocDataView,
    serializedSearchSource: injectReferences(
      parseSearchSourceJSON(tab.attributes.kibanaSavedObjectMeta?.searchSourceJSON ?? '{}'),
      references
    ),
    viewMode: tab.attributes.viewMode,
    hideAggregatedPreview: tab.attributes.hideAggregatedPreview,
    rowHeight: tab.attributes.rowHeight,
    headerRowHeight: tab.attributes.headerRowHeight,
    esqlApproximation: tab.attributes.esqlApproximation,
    timeRestore: tab.attributes.timeRestore,
    timeRange: tab.attributes.timeRange,
    refreshInterval: tab.attributes.refreshInterval,
    rowsPerPage: tab.attributes.rowsPerPage,
    sampleSize: tab.attributes.sampleSize,
    breakdownField: tab.attributes.breakdownField,
    chartInterval: tab.attributes.chartInterval,
    density: tab.attributes.density as DataGridDensity,
    documentsDisplayMode: tab.attributes.documentsDisplayMode as DocumentsDisplayMode,
    jsonModeSettings: tab.attributes.jsonModeSettings as JsonModeSettings,
    visContext: tab.attributes.visContext,
    controlGroupJson: tab.attributes.controlGroupJson,
    tabTypeState: tab.attributes.tabTypeState,
  })),
  managed: Boolean(managed),
  references,
  sharingSavedObjectProps,
});
