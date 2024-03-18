/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, CoreStart, Plugin, StartServicesAccessor } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { SpacesApi } from '@kbn/spaces-plugin/public';
import type { SavedObjectTaggingOssPluginStart } from '@kbn/saved-objects-tagging-oss-plugin/public';
import { ExpressionsSetup } from '@kbn/expressions-plugin/public';
import { i18n } from '@kbn/i18n';
import type {
  ContentManagementPublicSetup,
  ContentManagementPublicStart,
} from '@kbn/content-management-plugin/public';
import type { SOWithMetadata } from '@kbn/content-management-utils';
import { EmbeddableStart, registerSavedObjectToPanelMethod } from '@kbn/embeddable-plugin/public';
import {
  getSavedSearch,
  saveSavedSearch,
  SaveSavedSearchOptions,
  getNewSavedSearch,
  SavedSearchUnwrapResult,
  SearchByValueInput,
} from './services/saved_searches';
import { SavedSearch, SavedSearchAttributes } from '../common/types';
import { SavedSearchType, LATEST_VERSION } from '../common';
import { SavedSearchesService } from './services/saved_searches/saved_searches_service';
import { kibanaContext } from '../common/expressions';
import { getKibanaContext } from './expressions/kibana_context';
import {
  type SavedSearchAttributeService,
  getSavedSearchAttributeService,
  toSavedSearch,
} from './services/saved_searches';
import { savedObjectToEmbeddableAttributes } from './services/saved_searches/saved_search_attribute_service';

/**
 * Saved search plugin public Setup contract
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SavedSearchPublicPluginSetup {}

/**
 * Saved search plugin public Setup contract
 */
export interface SavedSearchPublicPluginStart {
  get: (savedSearchId: string) => ReturnType<typeof getSavedSearch>;
  getNew: () => ReturnType<typeof getNewSavedSearch>;
  getAll: () => Promise<Array<SOWithMetadata<SavedSearchAttributes>>>;
  save: (
    savedSearch: SavedSearch,
    options?: SaveSavedSearchOptions
  ) => ReturnType<typeof saveSavedSearch>;
  byValue: {
    attributeService: SavedSearchAttributeService;
    toSavedSearch: (
      id: string | undefined,
      result: SavedSearchUnwrapResult
    ) => Promise<SavedSearch>;
  };
}

/**
 * Saved search plugin public Setup contract
 */
export interface SavedSearchPublicSetupDependencies {
  contentManagement: ContentManagementPublicSetup;
  expressions: ExpressionsSetup;
}

/**
 * Saved search plugin public Setup contract
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
        defaultMessage: 'Saved search',
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

    registerSavedObjectToPanelMethod<SavedSearchAttributes, SearchByValueInput>(
      SavedSearchType,
      (savedObject) => {
        if (!savedObject.managed) {
          return { savedObjectId: savedObject.id };
        }

        return {
          attributes: savedObjectToEmbeddableAttributes(savedObject),
        };
      }
    );

    return {};
  }

  public start(
    _: CoreStart,
    {
      data: { search },
      spaces,
      savedObjectsTaggingOss,
      contentManagement: { client: contentManagement },
      embeddable,
    }: SavedSearchPublicStartDependencies
  ): SavedSearchPublicPluginStart {
    const deps = { search, spaces, savedObjectsTaggingOss, contentManagement, embeddable };
    const service = new SavedSearchesService(deps);

    return {
      get: (savedSearchId: string) => service.get(savedSearchId),
      getAll: () => service.getAll(),
      getNew: () => service.getNew(),
      save: (savedSearch: SavedSearch, options?: SaveSavedSearchOptions) => {
        return service.save(savedSearch, options);
      },
      byValue: {
        attributeService: getSavedSearchAttributeService(deps),
        toSavedSearch: async (id: string | undefined, result: SavedSearchUnwrapResult) => {
          return toSavedSearch(id, result, deps);
        },
      },
    };
  }
}
