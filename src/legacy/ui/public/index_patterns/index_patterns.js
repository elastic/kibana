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

import { fieldFormats } from '../registry/field_formats';

import { IndexPatternMissingIndices } from './errors';
import { IndexPattern } from './_index_pattern';
import { createIndexPatternCache } from './_pattern_cache';
import { indexPatternsGetProvider } from './_get';
import { FieldsFetcher } from './fields_fetcher';
import { IndexPatternsApiClient } from './index_patterns_api_client';

export class IndexPatterns {
  constructor(basePath, config, savedObjectsClient) {
    const getProvider = indexPatternsGetProvider(savedObjectsClient);
    const apiClient = new IndexPatternsApiClient(basePath);

    this.config = config;
    this.savedObjectsClient = savedObjectsClient;

    this.errors = {
      MissingIndices: IndexPatternMissingIndices
    };

    this.fieldsFetcher = new FieldsFetcher(apiClient, config.get('metaFields'));
    this.cache = createIndexPatternCache();
    this.getIds = getProvider('id');
    this.getTitles = getProvider('attributes.title');
    this.getFields = getProvider.multiple;
    this.fieldFormats = fieldFormats;
  }


  get = (id) => {
    if (!id) return this.make();

    const cache = this.cache.get(id);
    return cache || this.cache.set(id, this.make(id));
  };

  getDefault = async () => {
    const defaultIndexPatternId = this.config.get('defaultIndex');
    if (defaultIndexPatternId) {
      return await this.get(defaultIndexPatternId);
    }

    return null;
  };

  make = (id) => {
    return (new IndexPattern(id,
      this.config,
      this.savedObjectsClient,
      this.cache,
      this.fieldsFetcher,
      this.getIds,
    )).init();
  };

  delete = (pattern) => {
    this.getIds.clearCache();
    return pattern.destroy();
  };
}

// add angular service for backward compatibility
import { uiModules } from '../modules';
const module = uiModules.get('kibana/index_patterns');
let _service;
module.service('indexPatterns', function (chrome) {
  if (!_service) _service = new IndexPatterns(chrome.getBasePath(), chrome.getUiSettingsClient(), chrome.getSavedObjectsClient());
  return _service;
});

export const IndexPatternsProvider = (chrome) => {
  if (!_service) _service = new IndexPatterns(chrome.getBasePath(), chrome.getUiSettingsClient(), chrome.getSavedObjectsClient());
  return _service;
};
