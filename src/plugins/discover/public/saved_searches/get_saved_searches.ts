/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObjectsStart } from '../../../../core/public';
import type { DataPublicPluginStart } from '../../../data/public';
import type { SavedSearchAttributes, SavedSearch } from './types';

import { SAVED_SEARCH_TYPE } from './constants';
import { fromSavedSearchAttributes } from './saved_searches_utils';
import { injectSearchSourceReferences, parseSearchSourceJSON } from '../../../data/public';

interface GetSavedSearchDependencies {
  search: DataPublicPluginStart['search'];
  savedObjectsClient: SavedObjectsStart['client'];
}

const getEmptySavedSearch = ({
  search,
}: {
  search: DataPublicPluginStart['search'];
}): SavedSearch => ({
  searchSource: search.searchSource.createEmpty(),
});

const findSavedSearch = async (
  savedSearchId: string,
  { search, savedObjectsClient }: GetSavedSearchDependencies
) => {
  const { saved_object: savedSearch } = await savedObjectsClient.resolve<SavedSearchAttributes>(
    SAVED_SEARCH_TYPE,
    savedSearchId
  );

  if (savedSearch) {
    const parsedSearchSourceJSON = parseSearchSourceJSON(
      savedSearch.attributes.kibanaSavedObjectMeta.searchSourceJSON
    );
    const searchSourceValues = injectSearchSourceReferences(
      parsedSearchSourceJSON as Parameters<typeof injectSearchSourceReferences>[0],
      savedSearch.references
    );

    const searchSource = await search.searchSource.create(searchSourceValues);

    return fromSavedSearchAttributes(savedSearchId, savedSearch.attributes, searchSource);
  }
};

/** @public **/
export const getSavedSearch = async (
  savedSearchId: string | undefined,
  dependencies: GetSavedSearchDependencies
) => {
  if (savedSearchId) {
    const savedSearch = await findSavedSearch(savedSearchId, dependencies);

    if (savedSearch) {
      return savedSearch;
    }
  }

  return getEmptySavedSearch(dependencies);
};
