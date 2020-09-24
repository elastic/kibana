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

import sinon from 'sinon';

import { CoreSetup } from 'src/core/public';
import { FieldFormat as FieldFormatImpl } from '../../common/field_formats';
import { IFieldType, FieldSpec } from '../../common/index_patterns';
import { FieldFormatsStart } from '../field_formats';
import { IndexPattern, indexPatterns, KBN_FIELD_TYPES, fieldList } from '../';
import { getFieldFormatsRegistry } from '../test_utils';
import { setFieldFormats } from '../services';

setFieldFormats(({
  getDefaultInstance: () =>
    ({
      getConverterFor: () => (value: any) => value,
      convert: (value: any) => JSON.stringify(value),
    } as FieldFormatImpl),
} as unknown) as FieldFormatsStart);

export function getStubIndexPattern(
  pattern: string,
  getConfig: (cfg: any) => any,
  timeField: string | null,
  fields: FieldSpec[] | IFieldType[],
  core: CoreSetup
): IndexPattern {
  return (new StubIndexPattern(
    pattern,
    getConfig,
    timeField,
    fields,
    core
  ) as unknown) as IndexPattern;
}

export class StubIndexPattern {
  id: string;
  title: string;
  popularizeField: Function;
  timeFieldName: string | null;
  isTimeBased: () => boolean;
  getConfig: (cfg: any) => any;
  getNonScriptedFields: Function;
  getScriptedFields: Function;
  getFieldByName: Function;
  getSourceFiltering: Function;
  metaFields: string[];
  fieldFormatMap: Record<string, any>;
  getComputedFields: Function;
  flattenHit: Function;
  formatHit: Record<string, any>;
  fieldsFetcher: Record<string, any>;
  formatField: Function;
  getFormatterForField: () => { convert: Function };
  _reindexFields: Function;
  stubSetFieldFormat: Function;
  fields?: FieldSpec[];

  constructor(
    pattern: string,
    getConfig: (cfg: any) => any,
    timeField: string | null,
    fields: FieldSpec[] | IFieldType[],
    core: CoreSetup
  ) {
    const registeredFieldFormats = getFieldFormatsRegistry(core);

    this.id = pattern;
    this.title = pattern;
    this.popularizeField = sinon.stub();
    this.timeFieldName = timeField;
    this.isTimeBased = () => Boolean(this.timeFieldName);
    this.getConfig = getConfig;
    this.getNonScriptedFields = sinon.spy(IndexPattern.prototype.getNonScriptedFields);
    this.getScriptedFields = sinon.spy(IndexPattern.prototype.getScriptedFields);
    this.getFieldByName = sinon.spy(IndexPattern.prototype.getFieldByName);
    this.getSourceFiltering = sinon.stub();
    this.metaFields = ['_id', '_type', '_source'];
    this.fieldFormatMap = {};

    this.getComputedFields = IndexPattern.prototype.getComputedFields.bind(this);
    this.flattenHit = indexPatterns.flattenHitWrapper(
      (this as unknown) as IndexPattern,
      this.metaFields
    );
    this.formatHit = indexPatterns.formatHitProvider(
      (this as unknown) as IndexPattern,
      registeredFieldFormats.getDefaultInstance(KBN_FIELD_TYPES.STRING)
    );
    this.fieldsFetcher = { apiClient: { baseUrl: '' } };
    this.formatField = this.formatHit.formatField;
    this.getFormatterForField = () => ({
      convert: () => '',
    });

    this._reindexFields = function () {
      this.fields = fieldList((this.fields || fields) as FieldSpec[], false);
    };

    this.stubSetFieldFormat = function (
      fieldName: string,
      id: string,
      params: Record<string, any>
    ) {
      const FieldFormat = registeredFieldFormats.getType(id);
      this.fieldFormatMap[fieldName] = new FieldFormat!(params);
      this._reindexFields();
    };

    this._reindexFields();

    return this;
  }
}
