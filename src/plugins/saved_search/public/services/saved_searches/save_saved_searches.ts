/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { SavedObjectsStart } from '@kbn/core/public';
import type { SavedSearch, SavedSearchAttributes } from './types';

import { SAVED_SEARCH_TYPE } from './constants';
import { toSavedSearchAttributes } from './saved_searches_utils';

export interface SaveSavedSearchOptions {
  onTitleDuplicate?: () => void;
  isTitleDuplicateConfirmed?: boolean;
  copyOnSave?: boolean;
}

const hasDuplicatedTitle = async (
  title: string,
  savedObjectsClient: SavedObjectsStart['client']
): Promise<boolean | void> => {
  if (!title) {
    return;
  }

  const response = await savedObjectsClient.find({
    type: SAVED_SEARCH_TYPE,
    perPage: 10,
    search: `"${title}"`,
    searchFields: ['title'],
    fields: ['title'],
  });

  return response.savedObjects.some(
    (obj) => obj.get('title').toLowerCase() === title.toLowerCase()
  );
};

/** @internal **/
export const saveSavedSearch = async (
  savedSearch: SavedSearch,
  options: SaveSavedSearchOptions,
  savedObjectsClient: SavedObjectsStart['client']
): Promise<string | undefined> => {
  const isNew = options.copyOnSave || !savedSearch.id;

  if (savedSearch.title) {
    if (
      isNew &&
      !options.isTitleDuplicateConfirmed &&
      options.onTitleDuplicate &&
      (await hasDuplicatedTitle(savedSearch.title, savedObjectsClient))
    ) {
      options.onTitleDuplicate();
      return;
    }
  }

  const { searchSourceJSON, references } = savedSearch.searchSource.serialize();
  const resp = isNew
    ? await savedObjectsClient.create<SavedSearchAttributes>(
        SAVED_SEARCH_TYPE,
        toSavedSearchAttributes(savedSearch, searchSourceJSON),
        {
          references,
        }
      )
    : await savedObjectsClient.update<SavedSearchAttributes>(
        SAVED_SEARCH_TYPE,
        savedSearch.id!,
        toSavedSearchAttributes(savedSearch, searchSourceJSON),
        {
          references,
        }
      );

  return resp?.id;
};
