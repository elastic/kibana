/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectReference } from '@kbn/core-saved-objects-server';
import type { SerializedSearchSourceFields } from '@kbn/data-plugin/common';
import { pick } from 'lodash';
import type { SavedSearch } from '..';
import type { SavedSearchAttributes, SerializableSavedSearch } from '../types';
import { extractTabs } from './extract_tabs';
import type { DiscoverSessionAttributes } from '../../server';

export const fromDiscoverSessionAttributesToSavedSearch = <
  Serialized extends boolean = false,
  ReturnType = Serialized extends true ? SerializableSavedSearch : SavedSearch
>(
  id: string | undefined,
  { title, description, tabs }: DiscoverSessionAttributes,
  tags: string[] | undefined,
  searchSource: SavedSearch['searchSource'] | SerializedSearchSourceFields,
  managed: boolean,
  serialized: Serialized = false as Serialized,
  sharingSavedObjectProps?: SavedSearch['sharingSavedObjectProps'],
  references?: SavedObjectReference[]
) => {
  const [{ attributes }] = tabs;
  return {
    id,
    ...(serialized ? { serializedSearchSource: searchSource } : { searchSource }),
    title,
    sort: attributes.sort,
    columns: attributes.columns,
    description,
    tags,
    grid: attributes.grid,
    hideChart: attributes.hideChart,
    viewMode: attributes.viewMode,
    hideAggregatedPreview: attributes.hideAggregatedPreview,
    rowHeight: attributes.rowHeight,
    headerRowHeight: attributes.headerRowHeight,
    isTextBasedQuery: attributes.isTextBasedQuery,
    usesAdHocDataView: attributes.usesAdHocDataView,
    timeRestore: attributes.timeRestore,
    timeRange: attributes.timeRange,
    refreshInterval: attributes.refreshInterval,
    rowsPerPage: attributes.rowsPerPage,
    sampleSize: attributes.sampleSize,
    breakdownField: attributes.breakdownField,
    chartInterval: attributes.chartInterval,
    visContext: attributes.visContext,
    controlGroupJson: attributes.controlGroupJson,
    density: attributes.density,
    tabs,
    managed,
    sharingSavedObjectProps,
    references,
  } as ReturnType;
};

export const toSavedSearchAttributes = (
  savedSearch: SavedSearch,
  searchSourceJSON: string
): SavedSearchAttributes =>
  extractTabs({
    kibanaSavedObjectMeta: { searchSourceJSON },
    title: savedSearch.title ?? '',
    sort: savedSearch.sort ?? [],
    columns: savedSearch.columns ?? [],
    description: savedSearch.description ?? '',
    grid: savedSearch.grid ?? {},
    hideChart: savedSearch.hideChart ?? false,
    viewMode: savedSearch.viewMode,
    hideAggregatedPreview: savedSearch.hideAggregatedPreview,
    rowHeight: savedSearch.rowHeight,
    headerRowHeight: savedSearch.headerRowHeight,
    isTextBasedQuery: savedSearch.isTextBasedQuery ?? false,
    usesAdHocDataView: savedSearch.usesAdHocDataView,
    controlGroupJson: savedSearch.controlGroupJson,
    timeRestore: savedSearch.timeRestore ?? false,
    timeRange: savedSearch.timeRange ? pick(savedSearch.timeRange, ['from', 'to']) : undefined,
    refreshInterval: savedSearch.refreshInterval,
    rowsPerPage: savedSearch.rowsPerPage,
    sampleSize: savedSearch.sampleSize,
    density: savedSearch.density,
    breakdownField: savedSearch.breakdownField,
    chartInterval: savedSearch.chartInterval,
    visContext: savedSearch.visContext,
  });
