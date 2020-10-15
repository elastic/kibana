/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { CoreStart, Plugin } from 'src/core/public';

import './index.scss';
import {
  createSavedObjectClass,
  SavedObjectDecoratorRegistry,
  SavedObjectDecoratorConfig,
} from './saved_object';
import { DataPublicPluginStart } from '../../data/public';
import { PER_PAGE_SETTING, LISTING_LIMIT_SETTING } from '../common';
import { SavedObject } from './types';

export interface SavedObjectSetup {
  registerDecorator: (config: SavedObjectDecoratorConfig<any>) => void;
}

export interface SavedObjectsStart {
  SavedObjectClass: new (raw: Record<string, any>) => SavedObject;
  settings: {
    getPerPage: () => number;
    getListingLimit: () => number;
  };
}

export interface SavedObjectsStartDeps {
  data: DataPublicPluginStart;
}

export class SavedObjectsPublicPlugin
  implements Plugin<SavedObjectSetup, SavedObjectsStart, object, SavedObjectsStartDeps> {
  private decoratorRegistry = new SavedObjectDecoratorRegistry();

  public setup(): SavedObjectSetup {
    return {
      registerDecorator: (config) => this.decoratorRegistry.register(config),
    };
  }
  public start(core: CoreStart, { data }: SavedObjectsStartDeps) {
    return {
      SavedObjectClass: createSavedObjectClass(
        {
          indexPatterns: data.indexPatterns,
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
    };
  }
}
