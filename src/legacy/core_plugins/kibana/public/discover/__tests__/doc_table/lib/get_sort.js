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

import { getSort } from '../../../np_ready/angular/doc_table/lib/get_sort';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';

const defaultSort = [{ time: 'desc' }];
let indexPattern;

describe('docTable', function() {
  beforeEach(ngMock.module('kibana'));

  beforeEach(
    ngMock.inject(function(Private) {
      indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);
    })
  );

  describe('getSort function', function() {
    it('should be a function', function() {
      expect(getSort).to.be.a(Function);
    });

    it('should return an array of objects', function() {
      expect(getSort([['bytes', 'desc']], indexPattern)).to.eql([{ bytes: 'desc' }]);

      delete indexPattern.timeFieldName;
      expect(getSort([['bytes', 'desc']], indexPattern)).to.eql([{ bytes: 'desc' }]);
    });

    it('should passthrough arrays of objects', () => {
      expect(getSort([{ bytes: 'desc' }], indexPattern)).to.eql([{ bytes: 'desc' }]);
    });

    it('should sort by the default when passed an unsortable field', function() {
      expect(getSort(['non-sortable', 'asc'], indexPattern)).to.eql(defaultSort);
      expect(getSort(['lol_nope', 'asc'], indexPattern)).to.eql(defaultSort);

      delete indexPattern.timeFieldName;
      expect(getSort(['non-sortable', 'asc'], indexPattern)).to.eql([{ _score: 'desc' }]);
    });

    it('should sort in reverse chrono order otherwise on time based patterns', function() {
      expect(getSort([], indexPattern)).to.eql(defaultSort);
      expect(getSort(['foo'], indexPattern)).to.eql(defaultSort);
      expect(getSort({ foo: 'bar' }, indexPattern)).to.eql(defaultSort);
    });

    it('should sort by score on non-time patterns', function() {
      delete indexPattern.timeFieldName;

      expect(getSort([], indexPattern)).to.eql([{ _score: 'desc' }]);
      expect(getSort(['foo'], indexPattern)).to.eql([{ _score: 'desc' }]);
      expect(getSort({ foo: 'bar' }, indexPattern)).to.eql([{ _score: 'desc' }]);
    });
  });

  describe('getSort.array function', function() {
    it('should have an array method', function() {
      expect(getSort.array).to.be.a(Function);
    });

    it('should return an array of arrays for sortable fields', function() {
      expect(getSort.array([['bytes', 'desc']], indexPattern)).to.eql([['bytes', 'desc']]);
    });

    it('should return an array of arrays from an array of elasticsearch sort objects', function() {
      expect(getSort.array([{ bytes: 'desc' }], indexPattern)).to.eql([['bytes', 'desc']]);
    });

    it('should sort by the default when passed an unsortable field', function() {
      expect(getSort.array([{ 'non-sortable': 'asc' }], indexPattern)).to.eql([['time', 'desc']]);
      expect(getSort.array([{ lol_nope: 'asc' }], indexPattern)).to.eql([['time', 'desc']]);

      delete indexPattern.timeFieldName;
      expect(getSort.array([{ 'non-sortable': 'asc' }], indexPattern)).to.eql([['_score', 'desc']]);
    });

    it('should sort by the default when passed an empty sort', () => {
      expect(getSort.array([], indexPattern)).to.eql([['time', 'desc']]);

      delete indexPattern.timeFieldName;
      expect(getSort.array([], indexPattern)).to.eql([['_score', 'desc']]);
    });
  });
});
