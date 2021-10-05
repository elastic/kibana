/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { i18n } from '@kbn/i18n';
import { SAVED_SEARCH_TYPE } from './constants';
import type { SavedSearchAttributes, SavedSearch } from './types';
import type { SpacesApi } from '../../../../../x-pack/plugins/spaces/public';

export const getSavedSearchUrl = (id?: string) => (id ? `#/view/${encodeURIComponent(id)}` : '#/');

export const getSavedSearchFullPathUrl = (id?: string) => `/app/discover${getSavedSearchUrl(id)}`;

export const savedSearchHasUrlConflict = (savedSearch: SavedSearch) =>
  savedSearch?.sharingSavedObject?.outcome === 'conflict';

export const throwErrorOnUrlConflict = async (savedSearch: SavedSearch, spaces?: SpacesApi) => {
  if (savedSearchHasUrlConflict(savedSearch)) {
    throw new Error(
      i18n.translate('discover.savedSearchEmbeddable.legacyURLConflict.errorMessage', {
        defaultMessage: `This search has the same URL as a legacy alias. Disable the alias to resolve this error : {json}`,
        values: {
          json: JSON.stringify({
            sourceId: savedSearch.id,
            targetType: SAVED_SEARCH_TYPE,
            targetSpace: ((await spaces?.getActiveSpace()) ?? {}).id || 'default',
          }),
        },
      })
    );
  }
};

export const fromSavedSearchAttributes = (
  id: string,
  attributes: SavedSearchAttributes,
  searchSource: SavedSearch['searchSource'],
  sharingSavedObject: SavedSearch['sharingSavedObject']
): SavedSearch => ({
  id,
  searchSource,
  sharingSavedObject,
  title: attributes.title,
  sort: attributes.sort,
  columns: attributes.columns,
  description: attributes.description,
  grid: attributes.grid,
  hideChart: attributes.hideChart,
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
});
