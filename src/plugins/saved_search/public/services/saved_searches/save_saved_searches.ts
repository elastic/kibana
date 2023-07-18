/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObjectsTaggingApi } from '@kbn/saved-objects-tagging-oss-plugin/public';
import type { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import type { SavedSearch } from './types';
import { SAVED_SEARCH_TYPE } from './constants';
import { toSavedSearchAttributes } from '../../../common/service/saved_searches_utils';
import type { SavedSearchCrudTypes } from '../../../common/content_management';

export interface SaveSavedSearchOptions {
  onTitleDuplicate?: () => void;
  isTitleDuplicateConfirmed?: boolean;
  copyOnSave?: boolean;
}

const hasDuplicatedTitle = async (
  title: string,
  contentManagement: ContentManagementPublicStart['client']
): Promise<boolean | void> => {
  if (!title) {
    return;
  }

  const response = await contentManagement.search<
    SavedSearchCrudTypes['SearchIn'],
    SavedSearchCrudTypes['SearchOut']
  >({
    contentTypeId: SAVED_SEARCH_TYPE,
    query: {
      text: `"${title}"`,
    },
    options: {
      searchFields: ['title'],
      fields: ['title'],
    },
  });

  return response.hits.some((obj) => obj.attributes.title.toLowerCase() === title.toLowerCase());
};

/** @internal **/
export const saveSavedSearch = async (
  savedSearch: SavedSearch,
  options: SaveSavedSearchOptions,
  contentManagement: ContentManagementPublicStart['client'],
  savedObjectsTagging: SavedObjectsTaggingApi | undefined
): Promise<string | undefined> => {
  const isNew = options.copyOnSave || !savedSearch.id;

  if (savedSearch.title) {
    if (
      isNew &&
      !options.isTitleDuplicateConfirmed &&
      options.onTitleDuplicate &&
      (await hasDuplicatedTitle(savedSearch.title, contentManagement))
    ) {
      options.onTitleDuplicate();
      return;
    }
  }

  const { searchSourceJSON, references: originalReferences } = savedSearch.searchSource.serialize();
  const references = savedObjectsTagging
    ? savedObjectsTagging.ui.updateTagsReferences(originalReferences, savedSearch.tags ?? [])
    : originalReferences;
  const resp = isNew
    ? await contentManagement.create<
        SavedSearchCrudTypes['CreateIn'],
        SavedSearchCrudTypes['CreateOut']
      >({
        contentTypeId: SAVED_SEARCH_TYPE,
        data: toSavedSearchAttributes(savedSearch, searchSourceJSON),
        options: {
          references,
        },
      })
    : await contentManagement.update<
        SavedSearchCrudTypes['UpdateIn'],
        SavedSearchCrudTypes['UpdateOut']
      >({
        contentTypeId: SAVED_SEARCH_TYPE,
        id: savedSearch.id!,
        data: toSavedSearchAttributes(savedSearch, searchSourceJSON),
        options: {
          references,
        },
      });

  return resp.item.id;
};
