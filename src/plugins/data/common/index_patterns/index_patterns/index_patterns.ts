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

import { i18n } from '@kbn/i18n';
import { SavedObjectsClientCommon } from '../..';

import { createIndexPatternCache } from '.';
import { IndexPattern } from './index_pattern';
import {
  createEnsureDefaultIndexPattern,
  EnsureDefaultIndexPattern,
} from './ensure_default_index_pattern';
import {
  OnNotification,
  OnError,
  OnUnsupportedTimePattern,
  UiSettingsCommon,
  IIndexPatternsApiClient,
  GetFieldsOptions,
  IndexPatternSpec,
} from '../types';
import { FieldFormatsStartCommon } from '../../field_formats';
import { UI_SETTINGS, SavedObject } from '../../../common';

const indexPatternCache = createIndexPatternCache();
const MAX_ATTEMPTS_TO_RESOLVE_CONFLICTS = 3;
const savedObjectType = 'index-pattern';

type IndexPatternCachedFieldType = 'id' | 'title';

export interface IndexPatternSavedObjectAttrs {
  title: string;
}

interface IndexPatternsServiceDeps {
  uiSettings: UiSettingsCommon;
  savedObjectsClient: SavedObjectsClientCommon;
  apiClient: IIndexPatternsApiClient;
  fieldFormats: FieldFormatsStartCommon;
  onNotification: OnNotification;
  onError: OnError;
  onRedirectNoIndexPattern?: () => void;
  onUnsupportedTimePattern: OnUnsupportedTimePattern;
}

export class IndexPatternsService {
  private config: UiSettingsCommon;
  private savedObjectsClient: SavedObjectsClientCommon;
  private savedObjectsCache?: Array<SavedObject<IndexPatternSavedObjectAttrs>> | null;
  private apiClient: IIndexPatternsApiClient;
  private fieldFormats: FieldFormatsStartCommon;
  private onNotification: OnNotification;
  private onError: OnError;
  private onUnsupportedTimePattern: OnUnsupportedTimePattern;
  ensureDefaultIndexPattern: EnsureDefaultIndexPattern;

  constructor({
    uiSettings,
    savedObjectsClient,
    apiClient,
    fieldFormats,
    onNotification,
    onError,
    onUnsupportedTimePattern,
    onRedirectNoIndexPattern = () => {},
  }: IndexPatternsServiceDeps) {
    this.apiClient = apiClient;
    this.config = uiSettings;
    this.savedObjectsClient = savedObjectsClient;
    this.fieldFormats = fieldFormats;
    this.onNotification = onNotification;
    this.onError = onError;
    this.onUnsupportedTimePattern = onUnsupportedTimePattern;
    this.ensureDefaultIndexPattern = createEnsureDefaultIndexPattern(
      uiSettings,
      onRedirectNoIndexPattern
    );
  }

  private async refreshSavedObjectsCache() {
    this.savedObjectsCache = await this.savedObjectsClient.find<IndexPatternSavedObjectAttrs>({
      type: 'index-pattern',
      fields: ['title'],
      perPage: 10000,
    });
  }

  getIds = async (refresh: boolean = false) => {
    if (!this.savedObjectsCache || refresh) {
      await this.refreshSavedObjectsCache();
    }
    if (!this.savedObjectsCache) {
      return [];
    }
    return this.savedObjectsCache.map((obj) => obj?.id);
  };

  getTitles = async (refresh: boolean = false): Promise<string[]> => {
    if (!this.savedObjectsCache || refresh) {
      await this.refreshSavedObjectsCache();
    }
    if (!this.savedObjectsCache) {
      return [];
    }
    return this.savedObjectsCache.map((obj) => obj?.attributes?.title);
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
    const defaultIndexPatternId = await this.config.get('defaultIndex');
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

  async specToIndexPattern(spec: IndexPatternSpec) {
    const shortDotsEnable = await this.config.get(UI_SETTINGS.SHORT_DOTS_ENABLE);
    const metaFields = await this.config.get(UI_SETTINGS.META_FIELDS);

    const indexPattern = new IndexPattern(spec.id, {
      savedObjectsClient: this.savedObjectsClient,
      apiClient: this.apiClient,
      patternCache: indexPatternCache,
      fieldFormats: this.fieldFormats,
      indexPatternsService: this,
      onNotification: this.onNotification,
      onError: this.onError,
      onUnsupportedTimePattern: this.onUnsupportedTimePattern,
      shortDotsEnable,
      metaFields,
    });

    indexPattern.initFromSpec(spec);
    return indexPattern;
  }

  async save(indexPattern: IndexPattern, saveAttempts: number = 0): Promise<void | Error> {
    if (!indexPattern.id) return;
    const shortDotsEnable = await this.config.get(UI_SETTINGS.SHORT_DOTS_ENABLE);
    const metaFields = await this.config.get(UI_SETTINGS.META_FIELDS);

    const body = indexPattern.prepBody();

    const originalChangedKeys: string[] = [];
    Object.entries(body).forEach(([key, value]) => {
      if (value !== indexPattern.originalBody[key]) {
        originalChangedKeys.push(key);
      }
    });

    return this.savedObjectsClient
      .update(savedObjectType, indexPattern.id, body, { version: indexPattern.version })
      .then((resp) => {
        indexPattern.id = resp.id;
        indexPattern.version = resp.version;
      })
      .catch((err) => {
        if (err?.res?.status === 409 && saveAttempts++ < MAX_ATTEMPTS_TO_RESOLVE_CONFLICTS) {
          const samePattern = new IndexPattern(indexPattern.id, {
            savedObjectsClient: this.savedObjectsClient,
            apiClient: this.apiClient,
            patternCache: indexPatternCache,
            fieldFormats: this.fieldFormats,
            indexPatternsService: this,
            onNotification: this.onNotification,
            onError: this.onError,
            onUnsupportedTimePattern: this.onUnsupportedTimePattern,
            shortDotsEnable,
            metaFields,
          });

          return samePattern.init().then(() => {
            // What keys changed from now and what the server returned
            const updatedBody = samePattern.prepBody();

            // Build a list of changed keys from the server response
            // and ensure we ignore the key if the server response
            // is the same as the original response (since that is expected
            // if we made a change in that key)

            const serverChangedKeys: string[] = [];
            Object.entries(updatedBody).forEach(([key, value]) => {
              if (value !== (body as any)[key] && value !== indexPattern.originalBody[key]) {
                serverChangedKeys.push(key);
              }
            });

            let unresolvedCollision = false;
            for (const originalKey of originalChangedKeys) {
              for (const serverKey of serverChangedKeys) {
                if (originalKey === serverKey) {
                  unresolvedCollision = true;
                  break;
                }
              }
            }

            if (unresolvedCollision) {
              const title = i18n.translate('data.indexPatterns.unableWriteLabel', {
                defaultMessage:
                  'Unable to write index pattern! Refresh the page to get the most up to date changes for this index pattern.',
              });

              this.onNotification({ title, color: 'danger' });
              throw err;
            }

            // Set the updated response on this object
            serverChangedKeys.forEach((key) => {
              (indexPattern as any)[key] = (samePattern as any)[key];
            });
            indexPattern.version = samePattern.version;

            // Clear cache
            indexPatternCache.clear(indexPattern.id!);

            // Try the save again
            return this.save(indexPattern, saveAttempts);
          });
        }
        throw err;
      });
  }

  async make(id?: string): Promise<IndexPattern> {
    const shortDotsEnable = await this.config.get(UI_SETTINGS.SHORT_DOTS_ENABLE);
    const metaFields = await this.config.get(UI_SETTINGS.META_FIELDS);

    const indexPattern = new IndexPattern(id, {
      savedObjectsClient: this.savedObjectsClient,
      apiClient: this.apiClient,
      patternCache: indexPatternCache,
      fieldFormats: this.fieldFormats,
      indexPatternsService: this,
      onNotification: this.onNotification,
      onError: this.onError,
      onUnsupportedTimePattern: this.onUnsupportedTimePattern,
      shortDotsEnable,
      metaFields,
    });

    return indexPattern.init();
  }

  /**
   * Deletes an index pattern from .kibana index
   * @param indexPatternId: Id of kibana Index Pattern to delete
   */
  async delete(indexPatternId: string) {
    indexPatternCache.clear(indexPatternId);
    return this.savedObjectsClient.delete('index-pattern', indexPatternId);
  }
}

export type IndexPatternsContract = PublicMethodsOf<IndexPatternsService>;
