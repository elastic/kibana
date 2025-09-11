/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { SavedObjectTaggingOssPluginStart } from '@kbn/saved-objects-tagging-oss-plugin/public';
import type { SpacesApi } from '@kbn/spaces-plugin/public';
import type { OnSaveProps } from '@kbn/saved-objects-plugin/public';
import { SavedSearchType } from '../../common';
import type { SavedSearchCrudTypes } from '../../common/content_management';
import type { SavedSearch, SerializableSavedSearch } from '../../common/types';
import { createGetSavedSearchDeps } from './create_get_saved_search_deps';
import { getDiscoverSession } from '../../common/service/get_discover_session';
import { getSavedSearch } from '../../common/service/get_saved_searches';
import type { SaveSavedSearchOptions } from './save_saved_searches';
import { saveSavedSearch } from './save_saved_searches';
import type {
  SaveDiscoverSessionOptions,
  SaveDiscoverSessionParams,
} from './save_discover_session';
import { saveDiscoverSession } from './save_discover_session';
import type { SavedSearchUnwrapResult } from './to_saved_search';
import { checkForDuplicateTitle } from './check_for_duplicate_title';
import { byValueToSavedSearch } from './to_saved_search';

export interface SavedSearchesServiceDeps {
  search: DataPublicPluginStart['search'];
  contentManagement: ContentManagementPublicStart['client'];
  spaces?: SpacesApi;
  savedObjectsTaggingOss?: SavedObjectTaggingOssPluginStart;
}

export class SavedSearchesService {
  constructor(private deps: SavedSearchesServiceDeps) {}

  get = <Serialized extends boolean = false>(
    savedSearchId: string,
    serialized?: Serialized
  ): Promise<Serialized extends true ? SerializableSavedSearch : SavedSearch> => {
    return getSavedSearch(savedSearchId, createGetSavedSearchDeps(this.deps), serialized);
  };

  getDiscoverSession = (discoverSessionId: string) => {
    return getDiscoverSession(discoverSessionId, createGetSavedSearchDeps(this.deps));
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

  saveDiscoverSession = (
    discoverSession: SaveDiscoverSessionParams,
    options: SaveDiscoverSessionOptions = {}
  ) => {
    const { contentManagement, savedObjectsTaggingOss } = this.deps;
    return saveDiscoverSession(
      discoverSession,
      options,
      contentManagement,
      savedObjectsTaggingOss?.getTaggingApi()
    );
  };

  checkForDuplicateTitle = (
    props: Pick<OnSaveProps, 'newTitle' | 'isTitleDuplicateConfirmed' | 'onTitleDuplicate'>
  ): Promise<void> => {
    return checkForDuplicateTitle({
      title: props.newTitle,
      isTitleDuplicateConfirmed: props.isTitleDuplicateConfirmed,
      onTitleDuplicate: props.onTitleDuplicate,
      contentManagement: this.deps.contentManagement,
    });
  };

  byValueToSavedSearch = <Serialized extends boolean = false>(
    result: SavedSearchUnwrapResult,
    serialized?: Serialized
  ): Promise<Serialized extends true ? SerializableSavedSearch : SavedSearch> => {
    return byValueToSavedSearch(result, this.deps, serialized);
  };
}
