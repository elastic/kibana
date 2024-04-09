/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EmbeddableApiContext,
  HasLibraryTransforms,
  PublishesDataLoading,
  SerializedTitles,
} from '@kbn/presentation-publishing';
import { SavedSearchByValueAttributes } from '../services/saved_searches';

export interface HasSavedSearch {
  getSavedSearch: () => SavedSearch | undefined;
}

export const apiHasSavedSearch = (
  api: EmbeddableApiContext['embeddable']
): api is HasSavedSearch => {
  const embeddable = api as HasSavedSearch;
  console.log('apihassavedsearch');
  return Boolean(embeddable.getSavedSearch) && typeof embeddable.getSavedSearch === 'function';
};

export type SearchEmbeddableSerializedState = SerializedTitles & {
  attributes?: SavedSearchByValueAttributes;
};

export type SearchEmbeddableApi = DefaultEmbeddableApi<SearchEmbeddableSerializedState> &
  HasSavedSearch &
  HasLibraryTransforms &
  PublishesDataLoading;
