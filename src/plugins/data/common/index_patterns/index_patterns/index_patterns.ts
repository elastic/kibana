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
import { SavedObjectsClientCommon, DuplicateIndexPatternError } from '../..';

import { createIndexPatternCache } from '.';
import { IndexPattern } from './index_pattern';
import {
  createEnsureDefaultIndexPattern,
  EnsureDefaultIndexPattern,
} from './ensure_default_index_pattern';
import {
  OnNotification,
  OnError,
  UiSettingsCommon,
  IIndexPatternsApiClient,
  GetFieldsOptions,
  IndexPatternSpec,
  IndexPatternAttributes,
  FieldSpec,
} from '../types';
import { FieldFormatsStartCommon } from '../../field_formats';
import { UI_SETTINGS, SavedObject } from '../../../common';
import { SavedObjectNotFound } from '../../../../kibana_utils/common';
import { IndexPatternMissingIndices } from '../lib';
import { findByTitle } from '../utils';

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
}

export class IndexPatternsService {
  private config: UiSettingsCommon;
  private savedObjectsClient: SavedObjectsClientCommon;
  private savedObjectsCache?: Array<SavedObject<IndexPatternSavedObjectAttrs>> | null;
  private apiClient: IIndexPatternsApiClient;
  private fieldFormats: FieldFormatsStartCommon;
  private onNotification: OnNotification;
  private onError: OnError;
  ensureDefaultIndexPattern: EnsureDefaultIndexPattern;

  constructor({
    uiSettings,
    savedObjectsClient,
    apiClient,
    fieldFormats,
    onNotification,
    onError,
    onRedirectNoIndexPattern = () => {},
  }: IndexPatternsServiceDeps) {
    this.apiClient = apiClient;
    this.config = uiSettings;
    this.savedObjectsClient = savedObjectsClient;
    this.fieldFormats = fieldFormats;
    this.onNotification = onNotification;
    this.onError = onError;
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

  clearCache = (id?: string) => {
    this.savedObjectsCache = null;
    if (id) {
      indexPatternCache.clear(id);
    } else {
      indexPatternCache.clearAll();
    }
  };

  // rename
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

  setDefault = async (id: string, force = false) => {
    if (force || !this.config.get('defaultIndex')) {
      await this.config.set('defaultIndex', id);
    }
  };

  private isFieldRefreshRequired(specs?: FieldSpec[]): boolean {
    if (!specs) {
      return true;
    }

    return specs.every((spec) => {
      // See https://github.com/elastic/kibana/pull/8421
      const hasFieldCaps = 'aggregatable' in spec && 'searchable' in spec;

      // See https://github.com/elastic/kibana/pull/11969
      const hasDocValuesFlag = 'readFromDocValues' in spec;

      return !hasFieldCaps || !hasDocValuesFlag;
    });
  }

  getFieldsForWildcard = async (options: GetFieldsOptions = {}) => {
    const metaFields = await this.config.get(UI_SETTINGS.META_FIELDS);
    return this.apiClient.getFieldsForWildcard({
      pattern: options.pattern,
      metaFields,
      type: options.type,
      params: options.params || {},
    });
  };

  getFieldsForIndexPattern = async (
    indexPattern: IndexPattern | IndexPatternSpec,
    options: GetFieldsOptions = {}
  ) =>
    this.getFieldsForWildcard({
      pattern: indexPattern.title as string,
      ...options,
      type: indexPattern.type,
      params: indexPattern.typeMeta && indexPattern.typeMeta.params,
    });

  // grab fields, grab scripted fields, mash together
  refreshFields = async (indexPattern: IndexPattern) => {
    const fields = await this.getFieldsForIndexPattern(indexPattern);
    const scripted = indexPattern.getScriptedFields().map((field) => field.spec);
    indexPattern.fields.replaceAll([...fields, ...scripted]);
  };

  private refreshFieldSpecArray = async (
    fields: FieldSpec[],
    id: string,
    title: string,
    options: GetFieldsOptions
  ) => {
    const scriptdFields = fields.filter((field) => field.scripted);
    try {
      const newFields = await this.getFieldsForWildcard(options);
      return [...newFields, ...scriptdFields];
    } catch (err) {
      if (err instanceof IndexPatternMissingIndices) {
        this.onNotification({ title: (err as any).message, color: 'danger', iconType: 'alert' });
        return [];
      }

      this.onError(err, {
        title: i18n.translate('data.indexPatterns.fetchFieldErrorTitle', {
          defaultMessage: 'Error fetching fields for index pattern {title} (ID: {id})',
          values: { id, title },
        }),
      });
    }
    return fields;
  };

  get = async (id: string): Promise<IndexPattern> => {
    const cache = indexPatternCache.get(id);
    if (cache) {
      return cache;
    }

    const {
      version,
      attributes: {
        title,
        timeFieldName,
        intervalName,
        fields,
        sourceFilters,
        fieldFormatMap,
        typeMeta,
        type,
      },
    } = await this.savedObjectsClient.get<IndexPatternAttributes>(savedObjectType, id);

    if (!version) {
      throw new SavedObjectNotFound(savedObjectType, id, 'management/kibana/indexPatterns');
    }

    const parsedFieldFormatMap = fieldFormatMap ? JSON.parse(fieldFormatMap) : {};
    let parsedFields = fields ? JSON.parse(fields) : [];
    const parsedTypeMeta = typeMeta ? JSON.parse(typeMeta) : undefined;

    const isFieldRefreshRequired = this.isFieldRefreshRequired(parsedFields);
    let isSaveRequired = isFieldRefreshRequired;
    try {
      parsedFields = isFieldRefreshRequired
        ? await this.refreshFieldSpecArray(parsedFields, id, title, {
            pattern: title,
            metaFields: await this.config.get(UI_SETTINGS.META_FIELDS),
            type,
            params: parsedTypeMeta && parsedTypeMeta.params,
          })
        : parsedFields;
    } catch (err) {
      isSaveRequired = false;
      if (err instanceof IndexPatternMissingIndices) {
        this.onNotification({
          title: (err as any).message,
          color: 'danger',
          iconType: 'alert',
        });
      } else {
        this.onError(err, {
          title: i18n.translate('data.indexPatterns.fetchFieldErrorTitle', {
            defaultMessage: 'Error fetching fields for index pattern {title} (ID: {id})',
            values: { id, title },
          }),
        });
      }
    }

    Object.entries(parsedFieldFormatMap).forEach(([fieldName, value]) => {
      const field = parsedFields.find((fld: FieldSpec) => fld.name === fieldName);
      if (field) {
        field.format = value;
      }
    });

    const spec: IndexPatternSpec = {
      id,
      version,
      title,
      timeFieldName,
      intervalName,
      fields: parsedFields,
      sourceFilters: sourceFilters ? JSON.parse(sourceFilters) : undefined,
      typeMeta: parsedTypeMeta,
      type,
    };

    const indexPattern = await this.specToIndexPattern(spec);
    indexPatternCache.set(id, indexPattern);
    if (isSaveRequired) {
      try {
        this.save(indexPattern);
      } catch (err) {
        this.onError(err, {
          title: i18n.translate('data.indexPatterns.fetchFieldSaveErrorTitle', {
            defaultMessage:
              'Error saving after fetching fields for index pattern {title} (ID: {id})',
            values: {
              id: indexPattern.id,
              title: indexPattern.title,
            },
          }),
        });
      }
    }
    // todo better way to do this
    indexPattern.originalBody = indexPattern.prepBody();
    return indexPattern;
  };

  // new index pattern
  // initFromSpec (redundant)
  async specToIndexPattern(spec: IndexPatternSpec) {
    const shortDotsEnable = await this.config.get(UI_SETTINGS.SHORT_DOTS_ENABLE);
    const metaFields = await this.config.get(UI_SETTINGS.META_FIELDS);

    return new IndexPattern({
      spec,
      savedObjectsClient: this.savedObjectsClient,
      fieldFormats: this.fieldFormats,
      shortDotsEnable,
      metaFields,
    });
  }

  async newIndexPattern(spec: IndexPatternSpec, skipFetchFields = false): Promise<IndexPattern> {
    const shortDotsEnable = await this.config.get(UI_SETTINGS.SHORT_DOTS_ENABLE);
    const metaFields = await this.config.get(UI_SETTINGS.META_FIELDS);

    const indexPattern = new IndexPattern({
      spec,
      savedObjectsClient: this.savedObjectsClient,
      fieldFormats: this.fieldFormats,
      shortDotsEnable,
      metaFields,
    });

    if (!skipFetchFields) {
      await this.refreshFields(indexPattern);
    }

    return indexPattern;
  }

  async newIndexPatternAndSave(spec: IndexPatternSpec, override = false, skipFetchFields = false) {
    const indexPattern = await this.newIndexPattern(spec, skipFetchFields);
    await this.create(indexPattern, override);
    await this.setDefault(indexPattern.id as string);
    return indexPattern;
  }

  async create(indexPattern: IndexPattern, override = false) {
    const dupe = await findByTitle(this.savedObjectsClient, indexPattern.title);
    if (dupe) {
      if (override) {
        await this.delete(dupe.id);
      } else {
        throw new DuplicateIndexPatternError(`Duplicate index pattern: ${indexPattern.title}`);
      }
    }

    const body = indexPattern.prepBody();
    const response = await this.savedObjectsClient.create(savedObjectType, body, {
      id: indexPattern.id,
    });
    indexPattern.id = response.id;
    indexPatternCache.set(indexPattern.id, indexPattern);
    return indexPattern;
  }

  async save(indexPattern: IndexPattern, saveAttempts: number = 0): Promise<void | Error> {
    if (!indexPattern.id) return;

    // get the list of attributes
    const body = indexPattern.prepBody();

    // get changed keys
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
      .catch(async (err) => {
        if (err?.res?.status === 409 && saveAttempts++ < MAX_ATTEMPTS_TO_RESOLVE_CONFLICTS) {
          const samePattern = await this.get(indexPattern.id as string);
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
        }
        throw err;
      });
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
