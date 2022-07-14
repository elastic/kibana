/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreStart, Plugin } from '@kbn/core/public';

import './index.scss';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import {
  DataViewsPublicPluginStart,
  SavedObjectsClientPublicToCommon,
} from '@kbn/data-views-plugin/public';
import {
  getAllowedTypes,
  getSavedObjectLabel,
  SavedObjectManagementTypeInfo,
} from '@kbn/saved-objects-management-plugin/public';
import { SavedObjectsTaggingApi } from '@kbn/saved-objects-tagging-oss-plugin/public';
import {
  createSavedObjectClass,
  SavedObjectDecoratorRegistry,
  SavedObjectDecoratorConfig,
} from './saved_object';
import { PER_PAGE_SETTING, LISTING_LIMIT_SETTING } from '../common';
import { SavedObject } from './types';
import { setSavedObjects } from './services';

export interface SavedObjectSetup {
  registerDecorator: (config: SavedObjectDecoratorConfig<any>) => void;
  registerSavedObjectsTagging: (savedObjectsTagging: SavedObjectsTaggingApi) => void;
}

export interface SavedObjectsStart {
  /**
   * @deprecated
   * @removeBy 8.8.0
   */
  SavedObjectClass: new (raw: Record<string, any>) => SavedObject;
  /**
   * @deprecated
   * @removeBy 8.8.0
   */
  settings: {
    /**
     * @deprecated
     * @removeBy 8.8.0
     */
    getPerPage: () => number;
    /**
     * @deprecated
     * @removeBy 8.8.0
     */
    getListingLimit: () => number;
  };
  getSavedObjectLabel: typeof getSavedObjectLabel;
  getAllowedTypes: () => Promise<SavedObjectManagementTypeInfo[]>;
  getSavedObjectsTagging: () => SavedObjectsTaggingApi | undefined;
  savedObjectsClient: SavedObjectsClientPublicToCommon;
}

export interface SavedObjectsStartDeps {
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
}

export class SavedObjectsPublicPlugin
  implements Plugin<SavedObjectSetup, SavedObjectsStart, object, SavedObjectsStartDeps>
{
  private decoratorRegistry = new SavedObjectDecoratorRegistry();
  private savedObjectsTagging?: SavedObjectsTaggingApi;

  public setup(): SavedObjectSetup {
    return {
      registerDecorator: (config) => this.decoratorRegistry.register(config),
      registerSavedObjectsTagging: (savedObjectsTagging) => {
        this.savedObjectsTagging = savedObjectsTagging;
      },
    };
  }

  public start(core: CoreStart, { data, dataViews }: SavedObjectsStartDeps) {
    const start = {
      SavedObjectClass: createSavedObjectClass(
        {
          dataViews,
          savedObjectsClient: core.savedObjects.client,
          search: data.search,
          chrome: core.chrome,
          overlays: core.overlays,
        },
        this.decoratorRegistry
      ),
      settings: {
        getPerPage: () => core.uiSettings.get(PER_PAGE_SETTING),
        getListingLimit: () => core.uiSettings.get(LISTING_LIMIT_SETTING),
      },
      getSavedObjectLabel,
      getAllowedTypes: getAllowedTypes.bind(undefined, core.http),
      getSavedObjectsTagging: () => this.savedObjectsTagging,
      savedObjectsClient: new SavedObjectsClientPublicToCommon(core.savedObjects.client),
    };

    setSavedObjects(start);

    return start;
  }
}
