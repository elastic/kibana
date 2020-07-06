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
// TODO: We should not be importing from the data plugin directly here; this is only necessary
// because it is one of the few places that we need to access the IndexPattern class itself, rather
// than just the type. Doing this as a temporary measure; it will be left behind when migrating to NP.

import {
  IndexPattern,
  indexPatterns,
  KBN_FIELD_TYPES,
  getIndexPatternFieldListCreator,
} from '../../plugins/data/public';

import { setFieldFormats } from '../../plugins/data/public/services';

setFieldFormats({
  getDefaultInstance: () => ({
    getConverterFor: () => (value) => value,
    convert: (value) => JSON.stringify(value),
  }),
});

import { getFieldFormatsRegistry } from './stub_field_formats';

export default function StubIndexPattern(pattern, getConfig, timeField, fields, core) {
  const registeredFieldFormats = getFieldFormatsRegistry(core);
  const createFieldList = getIndexPatternFieldListCreator({
    fieldFormats: {
      getDefaultInstance: () => ({
        convert: (val) => String(val),
      }),
    },
    toastNotifications: {
      addDanger: () => {},
    },
  });

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
  this.flattenHit = indexPatterns.flattenHitWrapper(this, this.metaFields);
  this.formatHit = indexPatterns.formatHitProvider(
    this,
    registeredFieldFormats.getDefaultInstance(KBN_FIELD_TYPES.STRING)
  );
  this.fieldsFetcher = { apiClient: { baseUrl: '' } };
  this.formatField = this.formatHit.formatField;

  this._reindexFields = function () {
    this.fields = createFieldList(this, this.fields || fields, false);
  };

  this.stubSetFieldFormat = function (fieldName, id, params) {
    const FieldFormat = registeredFieldFormats.getType(id);
    this.fieldFormatMap[fieldName] = new FieldFormat(params);
    this._reindexFields();
  };

  this._reindexFields();
}
