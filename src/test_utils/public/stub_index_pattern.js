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
import { IndexPatternProvider, getRoutes } from 'ui/index_patterns/_index_pattern';
import { formatHit } from 'ui/index_patterns/_format_hit';
import { getComputedFields } from 'ui/index_patterns/_get_computed_fields';
import { fieldFormats } from 'ui/registry/field_formats';
import { IndexPatternsFlattenHitProvider } from 'ui/index_patterns/_flatten_hit';
import { FieldList } from 'ui/index_patterns/_field_list';

export default function (Private) {

  const flattenHit = Private(IndexPatternsFlattenHitProvider);
  const IndexPattern = Private(IndexPatternProvider);

  function StubIndexPattern(pattern, timeField, fields) {
    this.id = pattern;
    this.title = pattern;
    this.popularizeField = sinon.stub();
    this.timeFieldName = timeField;
    this.isTimeBased = () => Boolean(this.timeFieldName);
    this.getNonScriptedFields = sinon.spy(IndexPattern.prototype.getNonScriptedFields);
    this.getScriptedFields = sinon.spy(IndexPattern.prototype.getScriptedFields);
    this.getSourceFiltering = sinon.stub();
    this.metaFields = ['_id', '_type', '_source'];
    this.fieldFormatMap = {};
    this.routes = getRoutes();

    this.getComputedFields = getComputedFields.bind(this);
    this.flattenHit = flattenHit(this);
    this.formatHit = formatHit(this, fieldFormats.getDefaultInstance('string'));
    this.formatField = this.formatHit.formatField;

    this._reindexFields = function () {
      this.fields = new FieldList(this, this.fields || fields);
    };

    this.stubSetFieldFormat = function (fieldName, id, params) {
      const FieldFormat = fieldFormats.byId[id];
      this.fieldFormatMap[fieldName] = new FieldFormat(params);
      this._reindexFields();
    };

    this._reindexFields();
  }

  return StubIndexPattern;
}
