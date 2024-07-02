/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SerializedSearchSourceFields } from '@kbn/data-plugin/common';
import { SavedSearch, SavedSearchAttributes } from '.';
import { SerializableSavedSearch } from './types';

export const fromSavedSearchAttributes = <
  Serialized extends boolean = false,
  ReturnType = Serialized extends true ? SerializableSavedSearch : SavedSearch
>(
  id: string | undefined,
  attributes: SavedSearchAttributes,
  tags: string[] | undefined,
  searchSource: SavedSearch['searchSource'] | SerializedSearchSourceFields,
  managed: boolean,
  serialized: Serialized = false as Serialized
) =>
  ({
    id,
    ...(serialized
      ? { serializedSearchSource: searchSource as SerializedSearchSourceFields }
      : { searchSource }),
    title: attributes.title,
    sort: attributes.sort,
    columns: attributes.columns,
    description: attributes.description,
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
    visContext: attributes.visContext,
    managed,
  } as ReturnType);
