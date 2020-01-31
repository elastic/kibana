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

import expect from '@kbn/expect';
import { reject } from 'lodash';
import ngMock from 'ng_mock';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import { BaseParamType } from '../../param_types/base';
import { FieldParamType } from '../../param_types/field';

describe('Field', function() {
  let indexPattern;

  beforeEach(ngMock.module('kibana'));
  // fetch out deps
  beforeEach(
    ngMock.inject(function(Private) {
      indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);
    })
  );

  describe('constructor', function() {
    it('it is an instance of BaseParamType', function() {
      const aggParam = new FieldParamType({
        name: 'field',
        type: 'field',
      });

      expect(aggParam).to.be.a(BaseParamType);
    });
  });

  describe('getAvailableFields', function() {
    it('should return only aggregatable fields by default', function() {
      const aggParam = new FieldParamType({
        name: 'field',
        type: 'field',
      });

      const fields = aggParam.getAvailableFields(indexPattern.fields);
      expect(fields).to.not.have.length(0);
      for (const field of fields) {
        expect(field.aggregatable).to.be(true);
      }
    });

    it('should return all fields if onlyAggregatable is false', function() {
      const aggParam = new FieldParamType({
        name: 'field',
        type: 'field',
      });

      aggParam.onlyAggregatable = false;

      const fields = aggParam.getAvailableFields(indexPattern.fields);
      const nonAggregatableFields = reject(fields, 'aggregatable');
      expect(nonAggregatableFields).to.not.be.empty();
    });
  });
});
