/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { SpacesApi } from '@kbn/spaces-plugin/public';
import type { SavedObjectTaggingOssPluginStart } from '@kbn/saved-objects-tagging-oss-plugin/public';
import { i18n } from '@kbn/i18n';
import type {
  ContentManagementPublicSetup,
  ContentManagementPublicStart,
} from '@kbn/content-management-plugin/public';
import type { SOWithMetadata } from '@kbn/content-management-utils';
import {
  getSavedSearch,
  saveSavedSearch,
  SaveSavedSearchOptions,
  getNewSavedSearch,
} from './services/saved_searches';
import { SavedSearch, SavedSearchAttributes } from '../common/types';
import { SavedSearchType, LATEST_VERSION } from '../common';
import type { SavedSearchCrudTypes } from '../common/content_management';

/**
 * Data plugin public Setup contract
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SavedSearchPublicPluginSetup {}

/**
 * Data plugin public Setup contract
 */
export interface SavedSearchPublicPluginStart {
  get: (savedSearchId: string) => ReturnType<typeof getSavedSearch>;
  getNew: () => ReturnType<typeof getNewSavedSearch>;
  getAll: () => Promise<Array<SOWithMetadata<SavedSearchAttributes>>>;
  save: (
    savedSearch: SavedSearch,
    options?: SaveSavedSearchOptions
  ) => ReturnType<typeof saveSavedSearch>;
}

/**
 * Data plugin public Setup contract
 */
export interface SavedSearchPublicSetupDependencies {
  contentManagement: ContentManagementPublicSetup;
}

/**
 * Data plugin public Setup contract
 */
export interface SavedSearchPublicStartDependencies {
  data: DataPublicPluginStart;
  spaces?: SpacesApi;
  savedObjectsTagging?: SavedObjectTaggingOssPluginStart;
  contentManagement: ContentManagementPublicStart;
}

export class SavedSearchPublicPlugin
  implements
    Plugin<
      SavedSearchPublicPluginSetup,
      SavedSearchPublicPluginStart,
      SavedSearchPublicSetupDependencies,
      SavedSearchPublicStartDependencies
    >
{
  public setup(core: CoreSetup, { contentManagement }: SavedSearchPublicSetupDependencies) {
    contentManagement.registry.register({
      id: SavedSearchType,
      version: {
        latest: LATEST_VERSION,
      },
      name: i18n.translate('savedSearch.contentManagementType', {
        defaultMessage: 'Saved search',
      }),
    });

    return {};
  }

  public start(
    core: CoreStart,
    {
      data: { search },
      spaces,
      savedObjectsTagging,
      contentManagement: { client: contentManagement },
    }: SavedSearchPublicStartDependencies
  ): SavedSearchPublicPluginStart {
    return {
      get: (savedSearchId: string) => {
        return getSavedSearch(savedSearchId, {
          search,
          contentManagement,
          spaces,
          savedObjectsTagging: savedObjectsTagging?.getTaggingApi(),
        });
      },
      getAll: async () => {
        // todo this is loading a list
        const result = await contentManagement.search<
          SavedSearchCrudTypes['SearchIn'],
          SavedSearchCrudTypes['SearchOut']
        >({
          contentTypeId: SavedSearchType,
          // perPage: 10000,
          // todo
          query: {},
        });
        return result.hits;
      },
      getNew: () => getNewSavedSearch({ search }),
      save: (savedSearch, options = {}) => {
        return saveSavedSearch(
          savedSearch,
          options,
          contentManagement,
          savedObjectsTagging?.getTaggingApi()
        );
      },
    };
  }
}
