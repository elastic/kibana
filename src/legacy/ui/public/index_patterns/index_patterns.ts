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

// @ts-ignore
import { fieldFormats } from '../registry/field_formats';

import { IndexPattern } from './_index_pattern';
import { createIndexPatternCache } from './_pattern_cache';
import { IndexPatternsApiClient } from './index_patterns_api_client';
import { SavedObjectsClient, SimpleSavedObject } from '../saved_objects';
import { UiSettingsClient } from '../../../../core/public';

const indexPatternCache = createIndexPatternCache();
const apiClient = new IndexPatternsApiClient();

export class IndexPatterns {
  fieldFormats: fieldFormats;

  private config: UiSettingsClient;
  private savedObjectsClient: SavedObjectsClient;
  private savedObjectsCache?: Array<SimpleSavedObject<{}>> | null;

  constructor(config: UiSettingsClient, savedObjectsClient: SavedObjectsClient) {
    this.config = config;
    this.savedObjectsClient = savedObjectsClient;
  }

  private async loadSavedObjects() {
    this.savedObjectsCache = (await this.savedObjectsClient.find({
      type: 'index-pattern',
      fields: [],
      perPage: 10000,
    })).savedObjects;
  }

  getIds = async (refresh: boolean) => {
    if (!this.savedObjectsCache || refresh) {
      await this.loadSavedObjects();
    }
    if (this.savedObjectsCache) {
      return this.savedObjectsCache.map(obj => _.get(obj, 'id'));
    }
  };

  getTitles = async (refresh: boolean) => {
    if (!this.savedObjectsCache || refresh) {
      await this.loadSavedObjects();
    }
    if (this.savedObjectsCache) {
      return this.savedObjectsCache.map(obj => _.get(obj, 'attributes.title'));
    }
  };

  clearCache = (id?: string) => {
    this.savedObjectsCache = null;
    if (id) {
      indexPatternCache.clear(id);
    } else {
      indexPatternCache.clearAll();
    }
  };

  getDefault = async () => {
    const defaultIndexPatternId = this.config.get('defaultIndex');
    if (defaultIndexPatternId) {
      return await this.get(defaultIndexPatternId);
    }

    return null;
  };

  get = (id?: string) => {
    if (!id) return this.make();

    const cache = indexPatternCache.get(id);
    return cache || indexPatternCache.set(id, this.make(id));
  };

  make = (id?: string) => {
    return new IndexPattern(
      id,
      (cfg: any) => this.config.get(cfg),
      this.savedObjectsClient,
      apiClient,
      indexPatternCache
    ).init();
  };
}

// add angular service for backward compatibility
// @ts-ignore
import { uiModules } from '../modules';

const module = uiModules.get('kibana/index_patterns');
let _service: any;
module.service('indexPatterns', function(chrome: any) {
  if (!_service)
    _service = new IndexPatterns(chrome.getUiSettingsClient(), chrome.getSavedObjectsClient());
  return _service;
});

export const IndexPatternsProvider = (chrome: any) => {
  if (!_service)
    _service = new IndexPatterns(chrome.getUiSettingsClient(), chrome.getSavedObjectsClient());
  return _service;
};
