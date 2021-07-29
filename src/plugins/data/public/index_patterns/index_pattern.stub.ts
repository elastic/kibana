/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import sinon from 'sinon';

import { CoreSetup } from 'src/core/public';
import { SerializedFieldFormat } from 'src/plugins/expressions/public';
import { IFieldType, FieldSpec } from '../../common/index_patterns';
import { IndexPattern, indexPatterns, KBN_FIELD_TYPES, fieldList } from '../';
import { getFieldFormatsRegistry } from '../test_utils';

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
  getFormatterForField: () => { convert: Function; toJSON: Function };
  _reindexFields: Function;
  stubSetFieldFormat: Function;
  fields?: FieldSpec[];
  setFieldFormat: (fieldName: string, format: SerializedFieldFormat) => void;

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

    this.setFieldFormat = (fieldName: string, format: SerializedFieldFormat) => {
      this.fieldFormatMap[fieldName] = format;
    };

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
      toJSON: () => '{}',
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
