/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import type { SpacesApi } from '@kbn/spaces-plugin/public';
import type { SavedObjectTaggingOssPluginStart } from '@kbn/saved-objects-tagging-oss-plugin/public';
import { getSavedSearch, saveSavedSearch, SaveSavedSearchOptions, getNewSavedSearch } from '.';
import type { SavedSearchCrudTypes } from '../../../common/content_management';
import { SavedSearchType } from '../../../common';
import type { SavedSearch } from '../../../common/types';
import { createGetSavedSearchDeps } from './create_get_saved_search_deps';

export interface SavedSearchesServiceDeps {
  search: DataPublicPluginStart['search'];
  contentManagement: ContentManagementPublicStart['client'];
  spaces?: SpacesApi;
  savedObjectsTaggingOss?: SavedObjectTaggingOssPluginStart;
}

export class SavedSearchesService {
  constructor(private deps: SavedSearchesServiceDeps) {}

  get = (savedSearchId: string) => {
    return getSavedSearch(savedSearchId, createGetSavedSearchDeps(this.deps));
  };
  getAll = async () => {
    const { contentManagement } = this.deps;
    const result = await contentManagement.search<
      SavedSearchCrudTypes['SearchIn'],
      SavedSearchCrudTypes['SearchOut']
    >({
      contentTypeId: SavedSearchType,
      query: {},
    });
    return result.hits;
  };
  getNew = () => getNewSavedSearch({ searchSource: this.deps.search.searchSource });

  find = async (search: string) => {
    const { contentManagement } = this.deps;
    const result = await contentManagement.search<
      SavedSearchCrudTypes['SearchIn'],
      SavedSearchCrudTypes['SearchOut']
    >({
      contentTypeId: SavedSearchType,
      query: {
        text: search,
      },
      options: {
        searchFields: ['title'],
        fields: ['title'],
      },
    });
    return result.hits;
  };

  save = (savedSearch: SavedSearch, options: SaveSavedSearchOptions = {}) => {
    const { contentManagement, savedObjectsTaggingOss } = this.deps;
    return saveSavedSearch(
      savedSearch,
      options,
      contentManagement,
      savedObjectsTaggingOss?.getTaggingApi()
    );
  };
}
