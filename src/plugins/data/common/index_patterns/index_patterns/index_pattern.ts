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
import { SavedObjectsClientCommon } from '../..';
import { DuplicateField } from '../../../../kibana_utils/common';

import {
  ES_FIELD_TYPES,
  KBN_FIELD_TYPES,
  IIndexPattern,
  FieldFormatNotFoundError,
} from '../../../common';
import { IndexPatternField, IIndexPatternFieldList, fieldList } from '../fields';
import { formatHitProvider } from './format_hit';
import { flattenHitWrapper } from './flatten_hit';
import { FieldFormatsStartCommon, FieldFormat } from '../../field_formats';
import { expandShorthand, MappingObject } from '../../field_mapping';
import { IndexPatternSpec, TypeMeta, FieldSpec, SourceFilter } from '../types';
import { SerializedFieldFormat } from '../../../../expressions/common';

const savedObjectType = 'index-pattern';

interface IndexPatternDeps {
  spec?: IndexPatternSpec;
  savedObjectsClient: SavedObjectsClientCommon;
  fieldFormats: FieldFormatsStartCommon;
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

  // todo rename
  public version: string | undefined;
  private savedObjectsClient: SavedObjectsClientCommon;
  public sourceFilters?: SourceFilter[];
  // todo make read  only, update via  method or factor out
  public originalBody: { [key: string]: any } = {};
  private shortDotsEnable: boolean = false;
  private fieldFormats: FieldFormatsStartCommon;

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

  constructor({
    spec = {},
    savedObjectsClient,
    fieldFormats,
    shortDotsEnable = false,
    metaFields = [],
  }: IndexPatternDeps) {
    // set dependencies
    this.savedObjectsClient = savedObjectsClient;
    this.fieldFormats = fieldFormats;
    // set config
    this.shortDotsEnable = shortDotsEnable;
    this.metaFields = metaFields;
    // initialize functionality
    this.fields = fieldList([], this.shortDotsEnable);

    this.flattenHit = flattenHitWrapper(this, metaFields);
    this.formatHit = formatHitProvider(
      this,
      fieldFormats.getDefaultInstance(KBN_FIELD_TYPES.STRING)
    );
    this.formatField = this.formatHit.formatField;

    // set values
    this.id = spec.id;
    const fieldFormatMap = this.fieldSpecsToFieldFormatMap(spec.fields);

    this.version = spec.version;

    this.title = spec.title || '';
    this.timeFieldName = spec.timeFieldName;
    this.sourceFilters = spec.sourceFilters;

    this.fields.replaceAll(spec.fields || []);
    this.type = spec.type;
    this.typeMeta = spec.typeMeta;

    this.fieldFormatMap = _.mapValues(fieldFormatMap, (mapping) => {
      return this.deserializeFieldFormatMap(mapping);
    });
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

  private fieldSpecsToFieldFormatMap = (fldList: IndexPatternSpec['fields'] = []) =>
    fldList.reduce<Record<string, SerializedFieldFormat>>((col, fieldSpec) => {
      if (fieldSpec.format) {
        col[fieldSpec.name] = { ...fieldSpec.format };
      }
      return col;
    }, {});

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

  public toSpec(): IndexPatternSpec {
    return {
      id: this.id,
      version: this.version,

      title: this.title,
      timeFieldName: this.timeFieldName,
      sourceFilters: this.sourceFilters,
      fields: this.fields.toSpec({ getFormatterForField: this.getFormatterForField.bind(this) }),
      typeMeta: this.typeMeta,
      type: this.type,
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
  }

  removeScriptedField(fieldName: string) {
    const field = this.fields.getByName(fieldName);
    if (field) {
      this.fields.remove(field);
    }
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
      typeMeta: this.mapping.typeMeta._serialize!(this.typeMeta),
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
}
