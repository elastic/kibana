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

import _, { each, reject } from 'lodash';
import { i18n } from '@kbn/i18n';
import { SavedObjectsClientCommon } from '../..';
import { DuplicateField, SavedObjectNotFound } from '../../../../kibana_utils/common';

import {
  ES_FIELD_TYPES,
  KBN_FIELD_TYPES,
  IIndexPattern,
  FieldFormatNotFoundError,
} from '../../../common';
import { findByTitle } from '../utils';
import { IndexPatternMissingIndices } from '../lib';
import { IndexPatternField, IIndexPatternFieldList, FieldList } from '../fields';
import { createFieldsFetcher } from './_fields_fetcher';
import { formatHitProvider } from './format_hit';
import { flattenHitWrapper } from './flatten_hit';
import { OnNotification, OnError, IIndexPatternsApiClient, IndexPatternAttributes } from '../types';
import { FieldFormatsStartCommon, FieldFormat } from '../../field_formats';
import { PatternCache } from './_pattern_cache';
import { expandShorthand, FieldMappingSpec, MappingObject } from '../../field_mapping';
import { IndexPatternSpec, TypeMeta, FieldSpec, SourceFilter } from '../types';
import { SerializedFieldFormat } from '../../../../expressions/common';

const MAX_ATTEMPTS_TO_RESOLVE_CONFLICTS = 3;
const savedObjectType = 'index-pattern';

interface IndexPatternDeps {
  savedObjectsClient: SavedObjectsClientCommon;
  apiClient: IIndexPatternsApiClient;
  patternCache: PatternCache;
  fieldFormats: FieldFormatsStartCommon;
  onNotification: OnNotification;
  onError: OnError;
  shortDotsEnable: boolean;
  metaFields: string[];
}

export class IndexPattern implements IIndexPattern {
  public id?: string;
  public title: string = '';
  public fieldFormatMap: any;
  public typeMeta?: TypeMeta;
  public fields: IIndexPatternFieldList & { toSpec: () => FieldSpec[] };
  public timeFieldName: string | undefined;
  public intervalName: string | undefined;
  public type: string | undefined;
  public formatHit: any;
  public formatField: any;
  public flattenHit: any;
  public metaFields: string[];

  private version: string | undefined;
  private savedObjectsClient: SavedObjectsClientCommon;
  private patternCache: PatternCache;
  public sourceFilters?: SourceFilter[];
  private originalBody: { [key: string]: any } = {};
  public fieldsFetcher: any; // probably want to factor out any direct usage and change to private
  private shortDotsEnable: boolean = false;
  private fieldFormats: FieldFormatsStartCommon;
  private onNotification: OnNotification;
  private onError: OnError;
  private apiClient: IIndexPatternsApiClient;

  private mapping: MappingObject = expandShorthand({
    title: ES_FIELD_TYPES.TEXT,
    timeFieldName: ES_FIELD_TYPES.KEYWORD,
    intervalName: ES_FIELD_TYPES.KEYWORD,
    fields: 'json',
    sourceFilters: 'json',
    fieldFormatMap: {
      type: ES_FIELD_TYPES.TEXT,
      _serialize: (map = {}) => {
        const serialized = _.transform(map, this.serializeFieldFormatMap);
        return _.isEmpty(serialized) ? undefined : JSON.stringify(serialized);
      },
      _deserialize: (map = '{}') => {
        return _.mapValues(JSON.parse(map), (mapping) => {
          return this.deserializeFieldFormatMap(mapping);
        });
      },
    },
    type: ES_FIELD_TYPES.KEYWORD,
    typeMeta: 'json',
  });

  constructor(
    id: string | undefined,
    {
      savedObjectsClient,
      apiClient,
      patternCache,
      fieldFormats,
      onNotification,
      onError,
      shortDotsEnable = false,
      metaFields = [],
    }: IndexPatternDeps
  ) {
    this.id = id;
    this.savedObjectsClient = savedObjectsClient;
    this.patternCache = patternCache;
    this.fieldFormats = fieldFormats;
    this.onNotification = onNotification;
    this.onError = onError;

    this.shortDotsEnable = shortDotsEnable;
    this.metaFields = metaFields;

    this.fields = new FieldList(this, [], this.shortDotsEnable, this.onNotification);

    this.apiClient = apiClient;
    this.fieldsFetcher = createFieldsFetcher(this, apiClient, metaFields);
    this.flattenHit = flattenHitWrapper(this, metaFields);
    this.formatHit = formatHitProvider(
      this,
      fieldFormats.getDefaultInstance(KBN_FIELD_TYPES.STRING)
    );
    this.formatField = this.formatHit.formatField;
  }

  private serializeFieldFormatMap(flat: any, format: string, field: string | undefined) {
    if (format && field) {
      flat[field] = format;
    }
  }

  private deserializeFieldFormatMap(mapping: any) {
    try {
      return this.fieldFormats.getInstance(mapping.id, mapping.params);
    } catch (err) {
      if (err instanceof FieldFormatNotFoundError) {
        return undefined;
      } else {
        throw err;
      }
    }
  }

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

  private async indexFields(specs?: FieldSpec[]) {
    if (!this.id) {
      return;
    }

    if (this.isFieldRefreshRequired(specs)) {
      await this.refreshFields();
    } else {
      if (specs) {
        this.fields.replaceAll(specs);
      }
    }
  }

  public initFromSpec(spec: IndexPatternSpec) {
    // create fieldFormatMap from field list
    const fieldFormatMap: Record<string, SerializedFieldFormat> = {};
    if (_.isArray(spec.fields)) {
      spec.fields.forEach((field: FieldSpec) => {
        if (field.format) {
          fieldFormatMap[field.name as string] = { ...field.format };
        }
      });
    }

    this.version = spec.version;

    this.title = spec.title || '';
    this.timeFieldName = spec.timeFieldName;
    this.sourceFilters = spec.sourceFilters;

    this.fields.replaceAll(spec.fields || []);
    this.typeMeta = spec.typeMeta;

    this.fieldFormatMap = _.mapValues(fieldFormatMap, (mapping) => {
      return this.deserializeFieldFormatMap(mapping);
    });

    return this;
  }

  private updateFromElasticSearch(response: any) {
    if (!response.found) {
      throw new SavedObjectNotFound(savedObjectType, this.id, 'management/kibana/indexPatterns');
    }

    _.forOwn(this.mapping, (fieldMapping: FieldMappingSpec, name: string | undefined) => {
      if (!fieldMapping._deserialize || !name) {
        return;
      }

      response[name] = fieldMapping._deserialize(response[name]);
    });

    this.title = response.title;
    this.timeFieldName = response.timeFieldName;
    this.intervalName = response.intervalName;
    this.sourceFilters = response.sourceFilters;
    this.fieldFormatMap = response.fieldFormatMap;
    this.type = response.type;
    this.typeMeta = response.typeMeta;

    if (!this.title && this.id) {
      this.title = this.id;
    }
    this.version = response.version;

    return this.indexFields(response.fields);
  }

  getComputedFields() {
    const scriptFields: any = {};
    if (!this.fields) {
      return {
        storedFields: ['*'],
        scriptFields,
        docvalueFields: [],
      };
    }

    // Date value returned in "_source" could be in any number of formats
    // Use a docvalue for each date field to ensure standardized formats when working with date fields
    // indexPattern.flattenHit will override "_source" values when the same field is also defined in "fields"
    const docvalueFields = reject(this.fields.getByType('date'), 'scripted').map(
      (dateField: any) => {
        return {
          field: dateField.name,
          format:
            dateField.esTypes && dateField.esTypes.indexOf('date_nanos') !== -1
              ? 'strict_date_time'
              : 'date_time',
        };
      }
    );

    each(this.getScriptedFields(), function (field) {
      scriptFields[field.name] = {
        script: {
          source: field.script,
          lang: field.lang,
        },
      };
    });

    return {
      storedFields: ['*'],
      scriptFields,
      docvalueFields,
    };
  }

  async init() {
    if (!this.id) {
      return this; // no id === no elasticsearch document
    }

    const savedObject = await this.savedObjectsClient.get<IndexPatternAttributes>(
      savedObjectType,
      this.id
    );

    const response = {
      version: savedObject.version,
      found: savedObject.version ? true : false,
      title: savedObject.attributes.title,
      timeFieldName: savedObject.attributes.timeFieldName,
      intervalName: savedObject.attributes.intervalName,
      fields: savedObject.attributes.fields,
      sourceFilters: savedObject.attributes.sourceFilters,
      fieldFormatMap: savedObject.attributes.fieldFormatMap,
      typeMeta: savedObject.attributes.typeMeta,
      type: savedObject.attributes.type,
    };
    // Do this before we attempt to update from ES since that call can potentially perform a save
    this.originalBody = this.prepBody();
    await this.updateFromElasticSearch(response);
    // Do it after to ensure we have the most up to date information
    this.originalBody = this.prepBody();

    return this;
  }

  public toSpec(): IndexPatternSpec {
    return {
      id: this.id,
      version: this.version,

      title: this.title,
      timeFieldName: this.timeFieldName,
      sourceFilters: this.sourceFilters,
      fields: this.fields.toSpec(),
      typeMeta: this.typeMeta,
    };
  }

  // Get the source filtering configuration for that index.
  getSourceFiltering() {
    return {
      excludes: (this.sourceFilters && this.sourceFilters.map((filter: any) => filter.value)) || [],
    };
  }

  async addScriptedField(name: string, script: string, fieldType: string = 'string', lang: string) {
    const scriptedFields = this.getScriptedFields();
    const names = _.map(scriptedFields, 'name');

    if (_.includes(names, name)) {
      throw new DuplicateField(name);
    }

    this.fields.add({
      name,
      script,
      type: fieldType,
      scripted: true,
      lang,
      aggregatable: true,
      searchable: true,
      count: 0,
      readFromDocValues: false,
    });

    await this.save();
  }

  removeScriptedField(fieldName: string) {
    const field = this.fields.getByName(fieldName);
    if (field) {
      this.fields.remove(field);
    }
    return this.save();
  }

  async popularizeField(fieldName: string, unit = 1) {
    /**
     * This function is just used by Discover and it's high likely to be removed in the near future
     * It doesn't use the save function to skip the error message that's displayed when
     * a user adds several columns in a higher frequency that the changes can be persisted to ES
     * resulting in 409 errors
     */
    if (!this.id) return;
    const field = this.fields.getByName(fieldName);
    if (!field) {
      return;
    }
    const count = Math.max((field.count || 0) + unit, 0);
    if (field.count === count) {
      return;
    }
    field.count = count;

    try {
      const res = await this.savedObjectsClient.update(savedObjectType, this.id, this.prepBody(), {
        version: this.version,
      });
      this.version = res.version;
    } catch (e) {
      // no need for an error message here
    }
  }

  getNonScriptedFields() {
    return [...this.fields.getAll().filter((field) => !field.scripted)];
  }

  getScriptedFields() {
    return [...this.fields.getAll().filter((field) => field.scripted)];
  }

  isTimeBased(): boolean {
    return !!this.timeFieldName && (!this.fields || !!this.getTimeField());
  }

  isTimeNanosBased(): boolean {
    const timeField: any = this.getTimeField();
    return timeField && timeField.esTypes && timeField.esTypes.indexOf('date_nanos') !== -1;
  }

  isTimeBasedWildcard(): boolean {
    return this.isTimeBased() && this.isWildcard();
  }

  getTimeField() {
    if (!this.timeFieldName || !this.fields || !this.fields.getByName) return undefined;
    return this.fields.getByName(this.timeFieldName) || undefined;
  }

  getFieldByName(name: string): IndexPatternField | undefined {
    if (!this.fields || !this.fields.getByName) return undefined;
    return this.fields.getByName(name);
  }

  getAggregationRestrictions() {
    return this.typeMeta?.aggs;
  }

  isWildcard() {
    return _.includes(this.title, '*');
  }

  prepBody() {
    return {
      title: this.title,
      timeFieldName: this.timeFieldName,
      intervalName: this.intervalName,
      sourceFilters: this.mapping.sourceFilters._serialize!(this.sourceFilters),
      fields: this.mapping.fields._serialize!(this.fields),
      fieldFormatMap: this.mapping.fieldFormatMap._serialize!(this.fieldFormatMap),
      type: this.type,
      typeMeta: this.mapping.typeMeta._serialize!(this.mapping),
    };
  }

  getFormatterForField(field: IndexPatternField | IndexPatternField['spec']): FieldFormat {
    return (
      this.fieldFormatMap[field.name] ||
      this.fieldFormats.getDefaultInstance(
        field.type as KBN_FIELD_TYPES,
        field.esTypes as ES_FIELD_TYPES[]
      )
    );
  }

  async create(allowOverride: boolean = false) {
    const _create = async (duplicateId?: string) => {
      if (duplicateId) {
        this.patternCache.clear(duplicateId);
        await this.savedObjectsClient.delete(savedObjectType, duplicateId);
      }

      const body = this.prepBody();
      const response = await this.savedObjectsClient.create(savedObjectType, body, { id: this.id });

      this.id = response.id;
      return response.id;
    };

    const potentialDuplicateByTitle = await findByTitle(this.savedObjectsClient, this.title);
    // If there is potentially duplicate title, just create it
    if (!potentialDuplicateByTitle) {
      return await _create();
    }

    // We found a duplicate but we aren't allowing override, show the warn modal
    if (!allowOverride) {
      return false;
    }

    return await _create(potentialDuplicateByTitle.id);
  }

  async save(saveAttempts: number = 0): Promise<void | Error> {
    if (!this.id) return;
    const body = this.prepBody();

    const originalChangedKeys: string[] = [];
    Object.entries(body).forEach(([key, value]) => {
      if (value !== this.originalBody[key]) {
        originalChangedKeys.push(key);
      }
    });

    return this.savedObjectsClient
      .update(savedObjectType, this.id, body, { version: this.version })
      .then((resp) => {
        this.id = resp.id;
        this.version = resp.version;
      })
      .catch((err) => {
        if (
          _.get(err, 'res.status') === 409 &&
          saveAttempts++ < MAX_ATTEMPTS_TO_RESOLVE_CONFLICTS
        ) {
          const samePattern = new IndexPattern(this.id, {
            savedObjectsClient: this.savedObjectsClient,
            apiClient: this.apiClient,
            patternCache: this.patternCache,
            fieldFormats: this.fieldFormats,
            onNotification: this.onNotification,
            onError: this.onError,
            shortDotsEnable: this.shortDotsEnable,
            metaFields: this.metaFields,
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
              if (value !== (body as any)[key] && value !== this.originalBody[key]) {
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
              (this as any)[key] = (samePattern as any)[key];
            });
            this.version = samePattern.version;

            // Clear cache
            this.patternCache.clear(this.id!);

            // Try the save again
            return this.save(saveAttempts);
          });
        }
        throw err;
      });
  }

  async _fetchFields() {
    const fields = await this.fieldsFetcher.fetch(this);
    const scripted = this.getScriptedFields().map((field) => field.spec);
    this.fields.replaceAll([...fields, ...scripted]);
  }

  refreshFields() {
    return this._fetchFields()
      .then(() => this.save())
      .catch((err) => {
        // https://github.com/elastic/kibana/issues/9224
        // This call will attempt to remap fields from the matching
        // ES index which may not actually exist. In that scenario,
        // we still want to notify the user that there is a problem
        // but we do not want to potentially make any pages unusable
        // so do not rethrow the error here

        if (err instanceof IndexPatternMissingIndices) {
          this.onNotification({ title: (err as any).message, color: 'danger', iconType: 'alert' });
          return [];
        }

        this.onError(err, {
          title: i18n.translate('data.indexPatterns.fetchFieldErrorTitle', {
            defaultMessage: 'Error fetching fields for index pattern {title} (ID: {id})',
            values: {
              id: this.id,
              title: this.title,
            },
          }),
        });
      });
  }

  toJSON() {
    return this.id;
  }

  toString() {
    return '' + this.toJSON();
  }
}
