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
import ngMock from 'ng_mock';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import { getComputedFields } from '../_get_computed_fields';

describe('get computed fields', function () {

  let indexPattern;
  let fn;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);
    indexPattern.getComputedFields = getComputedFields.bind(indexPattern);
    fn = indexPattern.getComputedFields;
  }));

  it('should be a function', function () {
    expect(fn).to.be.a(Function);
  });

  it('should request all stored fields', function () {
    expect(fn().storedFields).to.contain('*');
  });

  it('should request date fields as docvalue_fields', function () {
    const docvalueFields = fn().docvalueFields;
    const docvalueFieldNames = docvalueFields.map(field => field.field);

    expect(docvalueFields).to.have.length(3);
    expect(docvalueFieldNames).to.contain('@timestamp');
    expect(docvalueFieldNames).to.contain('time');
    expect(docvalueFieldNames).to.contain('utc_time');
  });

  it('should request date field doc values in date_time format', function () {
    const docvalueFields = fn().docvalueFields;
    const timestampField = docvalueFields.find((field) => field.field === '@timestamp');
    expect(timestampField).to.have.property('format', 'date_time');
  });

  it('should not request scripted date fields as docvalue_fields', function () {
    expect(fn().docvalueFields).to.not.contain('script date');
  });

});
