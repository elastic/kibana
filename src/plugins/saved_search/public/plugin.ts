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
import {
  EmbeddableSetup,
  EmbeddableStart,
  registerSavedObjectToPanelMethod,
} from '@kbn/embeddable-plugin/public';
import {
  getSavedSearch,
  saveSavedSearch,
  SaveSavedSearchOptions,
  getNewSavedSearch,
  SavedSearchUnwrapResult,
  SearchByValueInput,
  SavedSearchByValueAttributes,
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
import {
  savedObjectToEmbeddableAttributes,
  splitReferences,
} from './services/saved_searches/saved_search_attribute_service';
import { SEARCH_EMBEDDABLE_TYPE } from '@kbn/discover-utils';
import { createGetSavedSearchDeps } from './services/saved_searches/create_get_saved_search_deps';
import { getSearchSavedObject } from '../common/service/get_saved_searches';
import { saveSearchSavedObject } from './services/saved_searches/save_saved_searches';
import { OnSaveProps } from '@kbn/saved-objects-plugin/public';
import { checkForDuplicateTitle } from './services/saved_searches/check_for_duplicate_title';

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
    attributeService: unknown;
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
  embeddable: EmbeddableSetup;
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
    { contentManagement, expressions, embeddable }: SavedSearchPublicSetupDependencies
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

    embeddable.registerSavedObjectToPanelMethod<SavedSearchAttributes, SearchByValueInput>(
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

    embeddable.registerReactEmbeddableFactory(SEARCH_EMBEDDABLE_TYPE, async () => {
      // const startServices = await getStartServices();
      const [{ getSearchEmbeddableFactory }, [coreStart, depsStart]] = await Promise.all([
        import('./embeddable/get_search_embeddable_factory'),
        getStartServices(),
      ]);
      return getSearchEmbeddableFactory({ services: depsStart });
    });

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
        attributeService: {
          saveMethod: async (
            attributes: SavedSearchByValueAttributes,
            savedObjectId?: string
          ): Promise<string> => {
            const { references, attributes: attrs } = splitReferences(attributes);
            const id = await saveSearchSavedObject(
              savedObjectId,
              attrs,
              references,
              deps.contentManagement
            );
            return id;
          },
          unwrapMethod: async (savedObjectId: string): Promise<SavedSearchUnwrapResult> => {
            const so = await getSearchSavedObject(savedObjectId, createGetSavedSearchDeps(deps));

            return {
              attributes: savedObjectToEmbeddableAttributes(so.item),
              metaInfo: {
                sharingSavedObjectProps: so.meta,
                managed: so.item.managed,
              },
            };
          },
          checkForDuplicateTitle: (props: OnSaveProps) => {
            return checkForDuplicateTitle({
              title: props.newTitle,
              isTitleDuplicateConfirmed: props.isTitleDuplicateConfirmed,
              onTitleDuplicate: props.onTitleDuplicate,
              contentManagement: deps.contentManagement,
            });
          },
        }, // TODO: ???
        toSavedSearch: async (id: string | undefined, result: SavedSearchUnwrapResult) => {
          return toSavedSearch(id, result, deps);
        },
      },
    };
  }
}
