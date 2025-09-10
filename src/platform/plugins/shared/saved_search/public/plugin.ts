/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  ContentManagementPublicSetup,
  ContentManagementPublicStart,
} from '@kbn/content-management-plugin/public';
import type { SOWithMetadata } from '@kbn/content-management-utils';
import type { CoreSetup, CoreStart, Plugin, StartServicesAccessor } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { EmbeddableSetup, EmbeddableStart } from '@kbn/embeddable-plugin/public';
import type { ExpressionsSetup } from '@kbn/expressions-plugin/public';
import { i18n } from '@kbn/i18n';
import type { OnSaveProps } from '@kbn/saved-objects-plugin/public';
import type { SavedObjectTaggingOssPluginStart } from '@kbn/saved-objects-tagging-oss-plugin/public';
import type { SpacesApi } from '@kbn/spaces-plugin/public';
import { once } from 'lodash';
import { LATEST_VERSION, SavedSearchType } from '../common';
import { kibanaContext } from '../common/expressions';
import type {
  DiscoverSession,
  SavedSearch,
  SavedSearchAttributes,
  SerializableSavedSearch,
} from '../common/types';
import { getKibanaContext } from './expressions/kibana_context';
import type { SavedSearchesServiceDeps } from './service/saved_searches_service';
import type { SaveSavedSearchOptions, saveSavedSearch } from './service/save_saved_searches';
import type {
  SaveDiscoverSessionOptions,
  SaveDiscoverSessionParams,
  saveDiscoverSession,
} from './service/save_discover_session';
import type { SavedSearchUnwrapResult } from './service/to_saved_search';
import { getNewSavedSearch } from '../common/service/get_new_saved_search';

/**
 * Saved search plugin public Setup contract
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SavedSearchPublicPluginSetup {}

/**
 * Saved search plugin public Start contract
 */
export interface SavedSearchPublicPluginStart {
  get: <Serialized extends boolean = false>(
    savedSearchId: string,
    serialized?: Serialized
  ) => Promise<Serialized extends true ? SerializableSavedSearch : SavedSearch>;
  getDiscoverSession: (discoverSessionId: string) => Promise<DiscoverSession>;
  getNew: () => ReturnType<typeof getNewSavedSearch>;
  getAll: () => Promise<Array<SOWithMetadata<SavedSearchAttributes>>>;
  save: (
    savedSearch: SavedSearch,
    options?: SaveSavedSearchOptions
  ) => ReturnType<typeof saveSavedSearch>;
  saveDiscoverSession: (
    discoverSession: SaveDiscoverSessionParams,
    options?: SaveDiscoverSessionOptions
  ) => ReturnType<typeof saveDiscoverSession>;
  checkForDuplicateTitle: (
    props: Pick<OnSaveProps, 'newTitle' | 'isTitleDuplicateConfirmed' | 'onTitleDuplicate'>
  ) => Promise<void>;
  byValueToSavedSearch: <Serialized extends boolean = false>(
    result: SavedSearchUnwrapResult,
    serialized?: Serialized
  ) => Promise<Serialized extends true ? SerializableSavedSearch : SavedSearch>;
}

/**
 * Saved search plugin public Setup dependencies
 */
export interface SavedSearchPublicSetupDependencies {
  embeddable: EmbeddableSetup;
  contentManagement: ContentManagementPublicSetup;
  expressions: ExpressionsSetup;
}

/**
 * Saved search plugin public Start dependencies
 */
export interface SavedSearchPublicStartDependencies {
  data: DataPublicPluginStart;
  spaces?: SpacesApi;
  savedObjectsTaggingOss?: SavedObjectTaggingOssPluginStart;
  contentManagement: ContentManagementPublicStart;
  embeddable: EmbeddableStart;
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
  public setup(
    { getStartServices }: CoreSetup,
    { contentManagement, expressions }: SavedSearchPublicSetupDependencies
  ) {
    contentManagement.registry.register({
      id: SavedSearchType,
      version: {
        latest: LATEST_VERSION,
      },
      name: i18n.translate('savedSearch.contentManagementType', {
        defaultMessage: 'Discover session',
      }),
    });

    expressions.registerFunction(
      getKibanaContext({ getStartServices } as {
        getStartServices: StartServicesAccessor<
          SavedSearchPublicStartDependencies,
          SavedSearchPublicPluginStart
        >;
      })
    );

    expressions.registerType(kibanaContext);

    return {};
  }

  public start(
    _: CoreStart,
    {
      data: { search },
      spaces,
      savedObjectsTaggingOss,
      contentManagement: { client: contentManagement },
    }: SavedSearchPublicStartDependencies
  ): SavedSearchPublicPluginStart {
    const deps: SavedSearchesServiceDeps = {
      search,
      spaces,
      savedObjectsTaggingOss,
      contentManagement,
    };

    return {
      get: async (savedSearchId, serialized) => {
        const service = await getSavedSearchesService(deps);
        return service.get(savedSearchId, serialized);
      },
      getDiscoverSession: async (discoverSessionId) => {
        const service = await getSavedSearchesService(deps);
        return service.getDiscoverSession(discoverSessionId);
      },
      getAll: async () => {
        const service = await getSavedSearchesService(deps);
        return service.getAll();
      },
      getNew: () => {
        return getNewSavedSearch({ searchSource: search.searchSource });
      },
      save: async (savedSearch, options) => {
        const service = await getSavedSearchesService(deps);
        return service.save(savedSearch, options);
      },
      saveDiscoverSession: async (discoverSession, options) => {
        const service = await getSavedSearchesService(deps);
        return service.saveDiscoverSession(discoverSession, options);
      },
      checkForDuplicateTitle: async (props) => {
        const service = await getSavedSearchesService(deps);
        return service.checkForDuplicateTitle(props);
      },
      byValueToSavedSearch: async (result, serialized) => {
        const service = await getSavedSearchesService(deps);
        return service.byValueToSavedSearch(result, serialized);
      },
    };
  }
}

const getSavedSearchesService = once(async (deps: SavedSearchesServiceDeps) => {
  const { SavedSearchesService } = await import('./service/saved_searches_service');
  return new SavedSearchesService(deps);
});
