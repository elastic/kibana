/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObjectsTaggingApi } from '@kbn/saved-objects-tagging-oss-plugin/public';
import type { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import type { Reference } from '@kbn/content-management-utils';
import type { SavedSearchAttributes } from '../../../common';
import type { SavedSearch } from './types';
import { SAVED_SEARCH_TYPE } from './constants';
import { toSavedSearchAttributes } from '../../../common/service/saved_searches_utils';
import type { SavedSearchCrudTypes } from '../../../common/content_management';
import { checkForDuplicateTitle } from './check_for_duplicate_title';

export interface SaveSavedSearchOptions {
  onTitleDuplicate?: () => void;
  isTitleDuplicateConfirmed?: boolean;
  copyOnSave?: boolean;
}

export const saveSearchSavedObject = async (
  id: string | undefined,
  attributes: SavedSearchAttributes,
  references: Reference[] | undefined,
  contentManagement: ContentManagementPublicStart['client']
) => {
  const resp = id
    ? await contentManagement.update<
        SavedSearchCrudTypes['UpdateIn'],
        SavedSearchCrudTypes['UpdateOut']
      >({
        contentTypeId: SAVED_SEARCH_TYPE,
        id,
        data: attributes,
        options: {
          references,
        },
      })
    : await contentManagement.create<
        SavedSearchCrudTypes['CreateIn'],
        SavedSearchCrudTypes['CreateOut']
      >({
        contentTypeId: SAVED_SEARCH_TYPE,
        data: attributes,
        options: {
          references,
        },
      });

  return resp.item.id;
};

/** @internal **/
export const saveSavedSearch = async (
  savedSearch: SavedSearch,
  options: SaveSavedSearchOptions,
  contentManagement: ContentManagementPublicStart['client'],
  savedObjectsTagging: SavedObjectsTaggingApi | undefined
): Promise<string | undefined> => {
  const isNew = options.copyOnSave || !savedSearch.id;

  if (isNew) {
    try {
      await checkForDuplicateTitle({
        title: savedSearch.title,
        isTitleDuplicateConfirmed: options.isTitleDuplicateConfirmed,
        onTitleDuplicate: options.onTitleDuplicate,
        contentManagement,
      });
    } catch {
      return;
    }
  }

  const { searchSourceJSON, references: originalReferences } = savedSearch.searchSource.serialize();
  const references = savedObjectsTagging
    ? savedObjectsTagging.ui.updateTagsReferences(originalReferences, savedSearch.tags ?? [])
    : originalReferences;

  return saveSearchSavedObject(
    isNew ? undefined : savedSearch.id,
    toSavedSearchAttributes(savedSearch, searchSourceJSON),
    references,
    contentManagement
  );
};
