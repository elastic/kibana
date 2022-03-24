/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { i18n } from '@kbn/i18n';
import type { SavedSearchAttributes, SavedSearch } from '../../../common/types';

export const getSavedSearchUrl = (id?: string) => (id ? `#/view/${encodeURIComponent(id)}` : '#/');

export const getSavedSearchFullPathUrl = (id?: string) => `/app/discover${getSavedSearchUrl(id)}`;

export const getSavedSearchUrlConflictMessage = async (savedSearch: SavedSearch) =>
  i18n.translate('discover.savedSearchEmbeddable.legacyURLConflict.errorMessage', {
    defaultMessage: `This search has the same URL as a legacy alias. Disable the alias to resolve this error : {json}`,
    values: {
      json: savedSearch.sharingSavedObjectProps?.errorJSON,
    },
  });

export const throwErrorOnSavedSearchUrlConflict = async (savedSearch: SavedSearch) => {
  if (savedSearch.sharingSavedObjectProps?.errorJSON) {
    throw new Error(await getSavedSearchUrlConflictMessage(savedSearch));
  }
};

export const fromSavedSearchAttributes = (
  id: string,
  attributes: SavedSearchAttributes,
  searchSource: SavedSearch['searchSource'],
  sharingSavedObjectProps: SavedSearch['sharingSavedObjectProps']
): SavedSearch => ({
  id,
  searchSource,
  sharingSavedObjectProps,
  title: attributes.title,
  sort: attributes.sort,
  columns: attributes.columns,
  description: attributes.description,
  grid: attributes.grid,
  hideChart: attributes.hideChart,
  viewMode: attributes.viewMode,
  hideAggregatedPreview: attributes.hideAggregatedPreview,
  rowHeight: attributes.rowHeight,
});

export const toSavedSearchAttributes = (savedSearch: SavedSearch, searchSourceJSON: string) =>
  ({
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
  } as SavedSearchAttributes);
