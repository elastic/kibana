/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ISearchStartSearchSource } from '@kbn/data-plugin/common';
import { injectReferences, parseSearchSourceJSON } from '@kbn/data-plugin/common';
// these won't exist in on server
import type { SpacesApi } from '@kbn/spaces-plugin/public';
import type { SavedObjectsTaggingApi } from '@kbn/saved-objects-tagging-oss-plugin/public';
import { i18n } from '@kbn/i18n';
import type { Reference } from '@kbn/content-management-utils';
import type { SavedSearch, SavedSearchAttributes } from '../types';
import { SavedSearchType as SAVED_SEARCH_TYPE } from '..';
import { fromSavedSearchAttributes } from './saved_searches_utils';
import type { SavedSearchCrudTypes } from '../content_management';

export interface GetSavedSearchDependencies {
  searchSourceCreate: ISearchStartSearchSource['create'];
  getSavedSrch: (id: string) => Promise<SavedSearchCrudTypes['GetOut']>;
  spaces?: SpacesApi;
  savedObjectsTagging?: SavedObjectsTaggingApi;
}

const getSavedSearchUrlConflictMessage = async (json: string) =>
  i18n.translate('savedSearch.legacyURLConflict.errorMessage', {
    defaultMessage: `This search has the same URL as a legacy alias. Disable the alias to resolve this error : {json}`,
    values: { json },
  });

export const getSearchSavedObject = async (
  savedSearchId: string,
  { spaces, getSavedSrch }: GetSavedSearchDependencies
) => {
  const so = await getSavedSrch(savedSearchId);

  // @ts-expect-error
  if (so.error) {
    throw new Error(`Could not locate that search (id: ${savedSearchId})`);
  }

  if (so.meta.outcome === 'conflict') {
    throw new Error(
      await getSavedSearchUrlConflictMessage(
        JSON.stringify({
          targetType: SAVED_SEARCH_TYPE,
          sourceId: savedSearchId,
          // front end only
          targetSpace: (await spaces?.getActiveSpace())?.id,
        })
      )
    );
  }

  return so;
};

export const convertToSavedSearch = async (
  {
    savedSearchId,
    attributes,
    references,
    sharingSavedObjectProps,
    managed,
  }: {
    savedSearchId: string | undefined;
    attributes: SavedSearchAttributes;
    references: Reference[];
    sharingSavedObjectProps: SavedSearch['sharingSavedObjectProps'];
    managed: boolean | undefined;
  },
  { searchSourceCreate, savedObjectsTagging }: GetSavedSearchDependencies
) => {
  const parsedSearchSourceJSON = parseSearchSourceJSON(
    attributes.kibanaSavedObjectMeta?.searchSourceJSON ?? '{}'
  );

  const searchSourceValues = injectReferences(
    parsedSearchSourceJSON as Parameters<typeof injectReferences>[0],
    references
  );

  // front end only
  const tags = savedObjectsTagging
    ? savedObjectsTagging.ui.getTagIdsFromReferences(references)
    : undefined;

  const returnVal = fromSavedSearchAttributes(
    savedSearchId,
    attributes,
    tags,
    references,
    await searchSourceCreate(searchSourceValues),
    sharingSavedObjectProps,
    Boolean(managed)
  );

  return returnVal;
};

export const getSavedSearch = async (savedSearchId: string, deps: GetSavedSearchDependencies) => {
  const so = await getSearchSavedObject(savedSearchId, deps);
  const savedSearch = await convertToSavedSearch(
    {
      savedSearchId,
      attributes: so.item.attributes,
      references: so.item.references,
      sharingSavedObjectProps: so.meta,
      managed: so.item.managed,
    },
    deps
  );

  return savedSearch;
};

/**
 * Returns a new saved search
 * Used when e.g. Discover is opened without a saved search id
 * @param search
 */
export const getNewSavedSearch = ({
  searchSource,
}: {
  searchSource: ISearchStartSearchSource;
}): SavedSearch => ({
  searchSource: searchSource.createEmpty(),
  managed: false,
});
