/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  ContentManagementPublicSetup,
  ContentManagementPublicStart,
} from '@kbn/content-management-plugin/public';
import type { SOWithMetadata } from '@kbn/content-management-utils';
import { CoreSetup, CoreStart, Plugin, StartServicesAccessor } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { EmbeddableSetup, EmbeddableStart } from '@kbn/embeddable-plugin/public';
import { ExpressionsSetup } from '@kbn/expressions-plugin/public';
import { i18n } from '@kbn/i18n';
import { OnSaveProps } from '@kbn/saved-objects-plugin/public';
import type { SavedObjectTaggingOssPluginStart } from '@kbn/saved-objects-tagging-oss-plugin/public';
import type { SpacesApi } from '@kbn/spaces-plugin/public';
import { LATEST_VERSION, SavedSearchType } from '../common';
import { kibanaContext } from '../common/expressions';
import { SavedSearch, SavedSearchAttributes, SerializableSavedSearch } from '../common/types';
import { getKibanaContext } from './expressions/kibana_context';
import {
  getNewSavedSearch,
  SavedSearchUnwrapResult,
  saveSavedSearch,
  SaveSavedSearchOptions,
  byValueToSavedSearch,
} from './services/saved_searches';
import { checkForDuplicateTitle } from './services/saved_searches/check_for_duplicate_title';
import { SavedSearchesService } from './services/saved_searches/saved_searches_service';

/**
 * Saved search plugin public Setup contract
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SavedSearchPublicPluginSetup {}

/**
 * Saved search plugin public Setup contract
 */
export interface SavedSearchPublicPluginStart {
  get: <Serialized extends boolean = false>(
    savedSearchId: string,
    serialized?: Serialized
  ) => Promise<Serialized extends true ? SerializableSavedSearch : SavedSearch>;
  getNew: () => ReturnType<typeof getNewSavedSearch>;
  getAll: () => Promise<Array<SOWithMetadata<SavedSearchAttributes>>>;
  save: (
    savedSearch: SavedSearch,
    options?: SaveSavedSearchOptions
  ) => ReturnType<typeof saveSavedSearch>;
  checkForDuplicateTitle: (
    props: Pick<OnSaveProps, 'newTitle' | 'isTitleDuplicateConfirmed' | 'onTitleDuplicate'>
  ) => Promise<void>;
  byValueToSavedSearch: <Serialized extends boolean = false>(
    result: SavedSearchUnwrapResult,
    serialized?: Serialized
  ) => Promise<Serialized extends true ? SerializableSavedSearch : SavedSearch>;
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
      get: <Serialized extends boolean = false>(
        savedSearchId: string,
        serialized?: Serialized
      ): Promise<Serialized extends true ? SerializableSavedSearch : SavedSearch> =>
        service.get(savedSearchId, serialized),
      getAll: () => service.getAll(),
      getNew: () => service.getNew(),
      save: (savedSearch: SavedSearch, options?: SaveSavedSearchOptions) => {
        return service.save(savedSearch, options);
      },
      checkForDuplicateTitle: (
        props: Pick<OnSaveProps, 'newTitle' | 'isTitleDuplicateConfirmed' | 'onTitleDuplicate'>
      ) => {
        return checkForDuplicateTitle({
          title: props.newTitle,
          isTitleDuplicateConfirmed: props.isTitleDuplicateConfirmed,
          onTitleDuplicate: props.onTitleDuplicate,
          contentManagement: deps.contentManagement,
        });
      },
      byValueToSavedSearch: async <
        Serialized extends boolean = boolean,
        ReturnType = Serialized extends true ? SerializableSavedSearch : SavedSearch
      >(
        result: SavedSearchUnwrapResult,
        serialized?: Serialized
      ): Promise<ReturnType> => {
        return (await byValueToSavedSearch(result, deps, serialized)) as ReturnType;
      },
    };
  }
}
