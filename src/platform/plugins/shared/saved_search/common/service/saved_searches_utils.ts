/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectReference } from '@kbn/core-saved-objects-server';
import { SerializedSearchSourceFields } from '@kbn/data-plugin/common';
import { pick } from 'lodash';
import type { SavedSearch, SavedSearchAttributes } from '..';
import { fromSavedSearchAttributes as fromSavedSearchAttributesCommon } from '..';
import { SerializableSavedSearch } from '../types';

export { getSavedSearchFullPathUrl, getSavedSearchUrl } from '..';

export const fromSavedSearchAttributes = (
  id: string | undefined,
  attributes: SavedSearchAttributes,
  tags: string[] | undefined,
  references: SavedObjectReference[] | undefined,
  searchSource: SavedSearch['searchSource'] | SerializedSearchSourceFields,
  sharingSavedObjectProps: SavedSearch['sharingSavedObjectProps'],
  managed: boolean,
  serialized: boolean = false
): SavedSearch | SerializableSavedSearch => ({
  ...fromSavedSearchAttributesCommon(id, attributes, tags, searchSource, managed, serialized),
  sharingSavedObjectProps,
  references,
});

export const toSavedSearchAttributes = (
  savedSearch: SavedSearch,
  searchSourceJSON: string
): SavedSearchAttributes => ({
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
  timeRestore: savedSearch.timeRestore ?? false,
  timeRange: savedSearch.timeRange ? pick(savedSearch.timeRange, ['from', 'to']) : undefined,
  refreshInterval: savedSearch.refreshInterval,
  rowsPerPage: savedSearch.rowsPerPage,
  sampleSize: savedSearch.sampleSize,
  density: savedSearch.density,
  breakdownField: savedSearch.breakdownField,
  visContext: savedSearch.visContext,
});
