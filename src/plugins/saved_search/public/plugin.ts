/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreStart, Plugin } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { SpacesApi } from '@kbn/spaces-plugin/public';
import type { SavedObjectTaggingOssPluginStart } from '@kbn/saved-objects-tagging-oss-plugin/public';
import { getSavedSearch } from './services/saved_searches';

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
  getNew: () => ReturnType<typeof getSavedSearch>;
}

/**
 * Data plugin public Setup contract
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SavedSearchPublicSetupDependencies {}

/**
 * Data plugin public Setup contract
 */
export interface SavedSearchPublicStartDependencies {
  data: DataPublicPluginStart;
  spaces?: SpacesApi;
  savedObjectsTagging?: SavedObjectTaggingOssPluginStart;
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
  public setup() {
    return {};
  }

  public start(
    core: CoreStart,
    { data, spaces, savedObjectsTagging }: SavedSearchPublicStartDependencies
  ): SavedSearchPublicPluginStart {
    return {
      get: (savedSearchId: string) => {
        return getSavedSearch(savedSearchId, {
          search: data.search,
          savedObjectsClient: core.savedObjects.client,
          spaces,
          savedObjectsTagging: savedObjectsTagging?.getTaggingApi(),
        });
      },
      getNew: () => {
        return getSavedSearch(undefined, {
          search: data.search,
          savedObjectsClient: core.savedObjects.client,
          spaces,
          savedObjectsTagging: savedObjectsTagging?.getTaggingApi(),
        });
      },
    };
  }
}
