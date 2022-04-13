/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObjectsStart } from 'kibana/public';
import type { DataPublicPluginStart } from '../../../../data/public';
import type { SavedSearchAttributes, SavedSearch } from './types';

import { SAVED_SEARCH_TYPE } from './constants';
import { fromSavedSearchAttributes } from './saved_searches_utils';
import { injectSearchSourceReferences, parseSearchSourceJSON } from '../../../../data/public';
import { SavedObjectNotFound } from '../../../../kibana_utils/public';

import type { SpacesApi } from '../../../../../../x-pack/plugins/spaces/public';

interface GetSavedSearchDependencies {
  search: DataPublicPluginStart['search'];
  savedObjectsClient: SavedObjectsStart['client'];
  spaces?: SpacesApi;
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
  { search, savedObjectsClient, spaces }: GetSavedSearchDependencies
) => {
  const so = await savedObjectsClient.resolve<SavedSearchAttributes>(
    SAVED_SEARCH_TYPE,
    savedSearchId
  );

  if (!so.saved_object || so.saved_object.error) {
    throw new SavedObjectNotFound(SAVED_SEARCH_TYPE, savedSearchId);
  }

  const savedSearch = so.saved_object;

  const parsedSearchSourceJSON = parseSearchSourceJSON(
    savedSearch.attributes.kibanaSavedObjectMeta?.searchSourceJSON ?? '{}'
  );

  const searchSourceValues = injectSearchSourceReferences(
    parsedSearchSourceJSON as Parameters<typeof injectSearchSourceReferences>[0],
    savedSearch.references
  );

  return fromSavedSearchAttributes(
    savedSearchId,
    savedSearch.attributes,
    await search.searchSource.create(searchSourceValues),
    {
      outcome: so.outcome,
      aliasTargetId: so.alias_target_id,
      aliasPurpose: so.alias_purpose,
      errorJSON:
        so.outcome === 'conflict' && spaces
          ? JSON.stringify({
              targetType: SAVED_SEARCH_TYPE,
              sourceId: savedSearchId,
              targetSpace: (await spaces.getActiveSpace()).id,
            })
          : undefined,
    }
  );
};

/** @public **/
export const getSavedSearch = async (
  savedSearchId: string | undefined,
  dependencies: GetSavedSearchDependencies
) => {
  return savedSearchId
    ? findSavedSearch(savedSearchId, dependencies)
    : getEmptySavedSearch(dependencies);
};
