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
import { createSavedObjectClass } from './saved_object';
import { DataPublicPluginStart } from '../../data/public';
import { PER_PAGE_SETTING, LISTING_LIMIT_SETTING } from '../common';

export interface SavedObjectsStart {
  SavedObjectClass: any;
  settings: {
    getPerPage: () => number;
    getListingLimit: () => number;
  };
}

export interface SavedObjectsStartDeps {
  data: DataPublicPluginStart;
}

export class SavedObjectsPublicPlugin
  implements Plugin<void, SavedObjectsStart, object, SavedObjectsStartDeps> {
  public setup() {}
  public start(core: CoreStart, { data }: SavedObjectsStartDeps) {
    return {
      SavedObjectClass: createSavedObjectClass({
        indexPatterns: data.indexPatterns,
        savedObjectsClient: core.savedObjects.client,
        search: data.search,
        chrome: core.chrome,
        overlays: core.overlays,
      }),
      settings: {
        getPerPage: () => core.uiSettings.get(PER_PAGE_SETTING),
        getListingLimit: () => core.uiSettings.get(LISTING_LIMIT_SETTING),
      },
    };
  }
}
