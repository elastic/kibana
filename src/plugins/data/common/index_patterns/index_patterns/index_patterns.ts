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

const indexPatternCache = createIndexPatternCache();

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

  private refreshFields = async (
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
    const savedObjectType = 'index-pattern';
    const metaFields = await this.config.get(UI_SETTINGS.META_FIELDS);

    const cache = indexPatternCache.get(id);
    if (cache) {
      return cache;
    }

    //
    // const indexPattern = await this.make(id);
    // get saved object, convert to spec, create new IndexPattern instance
    //
    //  progress - no longer calls `make`, no longer calls `init`
    // todo - create index pattern isn't  showing field list
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

    let parsedFields = fields ? JSON.parse(fields) : [];
    const parsedTypeMeta = typeMeta ? JSON.parse(typeMeta) : undefined;
    parsedFields = this.isFieldRefreshRequired(parsedFields)
      ? await this.refreshFields(parsedFields, id, title, {
          pattern: title,
          metaFields,
          type,
          params: parsedTypeMeta && parsedTypeMeta.params,
        })
      : parsedFields;
    const parsedFieldFormatMap = fieldFormatMap ? JSON.parse(fieldFormatMap) : {};

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

    // return indexPatternCache.set(id, indexPattern);
    const indexPattern = await this.specToIndexPattern(spec);
    indexPatternCache.set(id, indexPattern);
    return indexPattern;
  };

  async specToIndexPattern(spec: IndexPatternSpec) {
    const shortDotsEnable = await this.config.get(UI_SETTINGS.SHORT_DOTS_ENABLE);
    const metaFields = await this.config.get(UI_SETTINGS.META_FIELDS);

    const indexPattern = new IndexPattern({
      spec,
      savedObjectsClient: this.savedObjectsClient,
      apiClient: this.apiClient,
      patternCache: indexPatternCache,
      fieldFormats: this.fieldFormats,
      onNotification: this.onNotification,
      onError: this.onError,
      shortDotsEnable,
      metaFields,
    });

    indexPattern.initFromSpec(spec);
    return indexPattern;
  }

  async create(spec: IndexPatternSpec): Promise<IndexPattern> {
    const shortDotsEnable = await this.config.get(UI_SETTINGS.SHORT_DOTS_ENABLE);
    const metaFields = await this.config.get(UI_SETTINGS.META_FIELDS);

    const indexPattern = new IndexPattern({
      spec,
      savedObjectsClient: this.savedObjectsClient,
      apiClient: this.apiClient,
      patternCache: indexPatternCache,
      fieldFormats: this.fieldFormats,
      onNotification: this.onNotification,
      onError: this.onError,
      shortDotsEnable,
      metaFields,
    });

    await indexPattern._fetchFields();
    await indexPattern.create();

    return indexPattern;
  }

  async make(id?: string): Promise<IndexPattern> {
    const shortDotsEnable = await this.config.get(UI_SETTINGS.SHORT_DOTS_ENABLE);
    const metaFields = await this.config.get(UI_SETTINGS.META_FIELDS);

    const indexPattern = new IndexPattern({
      spec: { id },
      savedObjectsClient: this.savedObjectsClient,
      apiClient: this.apiClient,
      patternCache: indexPatternCache,
      fieldFormats: this.fieldFormats,
      onNotification: this.onNotification,
      onError: this.onError,
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
