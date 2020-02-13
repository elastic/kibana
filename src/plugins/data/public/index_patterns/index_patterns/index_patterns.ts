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

import {
  SavedObjectsClientContract,
  SimpleSavedObject,
  IUiSettingsClient,
  HttpStart,
} from 'src/core/public';

import { createIndexPatternCache } from './_pattern_cache';
import { IndexPattern } from './index_pattern';
import { IndexPatternsApiClient, GetFieldsOptions } from './index_patterns_api_client';

const indexPatternCache = createIndexPatternCache();

type IndexPatternCachedFieldType = 'id' | 'title';

export class IndexPatternsService {
  private config: IUiSettingsClient;
  private savedObjectsClient: SavedObjectsClientContract;
  private savedObjectsCache?: Array<SimpleSavedObject<Record<string, any>>> | null;
  private apiClient: IndexPatternsApiClient;

  constructor(
    config: IUiSettingsClient,
    savedObjectsClient: SavedObjectsClientContract,
    http: HttpStart
  ) {
    this.apiClient = new IndexPatternsApiClient(http);
    this.config = config;
    this.savedObjectsClient = savedObjectsClient;
  }

  private async refreshSavedObjectsCache() {
    this.savedObjectsCache = (
      await this.savedObjectsClient.find({
        type: 'index-pattern',
        fields: ['title'],
        perPage: 10000,
      })
    ).savedObjects;
  }

  getIds = async (refresh: boolean = false) => {
    if (!this.savedObjectsCache || refresh) {
      await this.refreshSavedObjectsCache();
    }
    if (!this.savedObjectsCache) {
      return [];
    }
    return this.savedObjectsCache.map(obj => obj?.id);
  };

  getTitles = async (refresh: boolean = false): Promise<string[]> => {
    if (!this.savedObjectsCache || refresh) {
      await this.refreshSavedObjectsCache();
    }
    if (!this.savedObjectsCache) {
      return [];
    }
    return this.savedObjectsCache.map(obj => obj?.attributes?.title);
  };

  getFields = async (fields: IndexPatternCachedFieldType[], refresh: boolean = false) => {
    if (!this.savedObjectsCache || refresh) {
      await this.refreshSavedObjectsCache();
    }
    if (!this.savedObjectsCache) {
      return [];
    }
    return this.savedObjectsCache.map((obj: Record<string, any>) => {
      const result: Partial<Record<IndexPatternCachedFieldType, string>> = {};
      fields.forEach(
        (f: IndexPatternCachedFieldType) => (result[f] = obj[f] || obj?.attributes?.[f])
      );
      return result;
    });
  };

  getFieldsForTimePattern = (options: GetFieldsOptions = {}) => {
    return this.apiClient.getFieldsForTimePattern(options);
  };

  getFieldsForWildcard = (options: GetFieldsOptions = {}) => {
    return this.apiClient.getFieldsForWildcard(options);
  };

  clearCache = (id?: string) => {
    this.savedObjectsCache = null;
    if (id) {
      indexPatternCache.clear(id);
    } else {
      indexPatternCache.clearAll();
    }
  };
  getCache = async () => {
    if (!this.savedObjectsCache) {
      await this.refreshSavedObjectsCache();
    }
    return this.savedObjectsCache;
  };

  getDefault = async () => {
    const defaultIndexPatternId = this.config.get('defaultIndex');
    if (defaultIndexPatternId) {
      return await this.get(defaultIndexPatternId);
    }

    return null;
  };

  get = async (id: string): Promise<IndexPattern> => {
    const cache = indexPatternCache.get(id);
    if (cache) {
      return cache;
    }

    const indexPattern = await this.make(id);

    return indexPatternCache.set(id, indexPattern);
  };

  make = (id?: string): Promise<IndexPattern> => {
    const indexPattern = new IndexPattern(
      id,
      (cfg: any) => this.config.get(cfg),
      this.savedObjectsClient,
      this.apiClient,
      indexPatternCache
    );

    return indexPattern.init();
  };
}

export type IndexPatternsContract = PublicMethodsOf<IndexPatternsService>;
