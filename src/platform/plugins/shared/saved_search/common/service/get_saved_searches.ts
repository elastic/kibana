/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ISearchStartSearchSource } from '@kbn/data-plugin/common';
import { injectReferences, parseSearchSourceJSON } from '@kbn/data-plugin/common';
// these won't exist in on server
import type { SpacesApi } from '@kbn/spaces-plugin/public';
import type { SavedObjectsTaggingApi } from '@kbn/saved-objects-tagging-oss-plugin/public';
import { i18n } from '@kbn/i18n';
import type { Reference } from '@kbn/content-management-utils';
import type { SavedSearch, SavedSearchAttributes, SerializableSavedSearch } from '../types';
import { SavedSearchType as SAVED_SEARCH_TYPE } from '..';
import { fromSavedSearchAttributes } from './saved_searches_utils';
import type { SavedSearchCrudTypes } from '../content_management';

export interface GetSavedSearchDependencies {
  searchSourceCreate: ISearchStartSearchSource['create'];
  getSavedSrch: (id: string) => Promise<SavedSearchCrudTypes['GetOut']>;
  handleGetSavedSrchError?: (error: unknown, savedSearchId: string) => void;
  spaces?: SpacesApi;
  savedObjectsTagging?: SavedObjectsTaggingApi;
}

const getSavedSearchUrlConflictMessage = async (json: string) =>
  i18n.translate('savedSearch.legacyURLConflict.errorMessage', {
    defaultMessage: `This Discover session has the same URL as a legacy alias. Disable the alias to resolve this error: {json}`,
    values: { json },
  });

export const getSearchSavedObject = async (
  savedSearchId: string,
  { spaces, getSavedSrch, handleGetSavedSrchError }: GetSavedSearchDependencies
) => {
  try {
    const so = await getSavedSrch(savedSearchId);

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
  } catch (e) {
    handleGetSavedSrchError?.(e, savedSearchId);
    throw e;
  }
};

export const convertToSavedSearch = async <
  Serialized extends boolean = false,
  ReturnType = Serialized extends true ? SerializableSavedSearch : SavedSearch
>(
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
  { searchSourceCreate, savedObjectsTagging }: GetSavedSearchDependencies,
  serialized?: Serialized
): Promise<ReturnType> => {
  const [tab] = attributes.tabs;
  const parsedSearchSourceJSON = parseSearchSourceJSON(
    tab.attributes.kibanaSavedObjectMeta?.searchSourceJSON ?? '{}'
  );

  const searchSourceValues = injectReferences(
    parsedSearchSourceJSON as Parameters<typeof injectReferences>[0],
    references
  );

  // front end only
  const tags = savedObjectsTagging
    ? savedObjectsTagging.ui.getTagIdsFromReferences(references)
    : undefined;

  const searchSource = serialized
    ? searchSourceValues
    : await searchSourceCreate(searchSourceValues);

  const returnVal = fromSavedSearchAttributes(
    savedSearchId,
    attributes,
    tags,
    references,
    searchSource,
    sharingSavedObjectProps,
    Boolean(managed),
    serialized
  );

  return returnVal as ReturnType;
};

export const getSavedSearch = async <
  Serialized extends boolean = false,
  ReturnType = Serialized extends true ? SerializableSavedSearch : SavedSearch
>(
  savedSearchId: string,
  deps: GetSavedSearchDependencies,
  serialized?: Serialized
): Promise<ReturnType> => {
  const so = await getSearchSavedObject(savedSearchId, deps);
  const savedSearch = await convertToSavedSearch(
    {
      savedSearchId,
      attributes: so.item.attributes,
      references: so.item.references,
      sharingSavedObjectProps: so.meta,
      managed: so.item.managed,
    },
    deps,
    serialized
  );

  return savedSearch as ReturnType;
};
