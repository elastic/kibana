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

import { getSort, getSortArray } from './get_sort';
// @ts-ignore
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import { IndexPattern } from '../../../../kibana_services';

describe('docTable', function () {
  let indexPattern: IndexPattern;

  beforeEach(() => {
    indexPattern = FixturesStubbedLogstashIndexPatternProvider() as IndexPattern;
  });

  describe('getSort function', function () {
    test('should be a function', function () {
      expect(typeof getSort === 'function').toBeTruthy();
    });

    test('should return an array of objects', function () {
      expect(getSort([['bytes', 'desc']], indexPattern)).toEqual([{ bytes: 'desc' }]);

      delete indexPattern.timeFieldName;
      expect(getSort([['bytes', 'desc']], indexPattern)).toEqual([{ bytes: 'desc' }]);
    });

    test('should passthrough arrays of objects', () => {
      expect(getSort([{ bytes: 'desc' }], indexPattern)).toEqual([{ bytes: 'desc' }]);
    });

    test('should return an empty array when passed an unsortable field', function () {
      expect(getSort([['non-sortable', 'asc']], indexPattern)).toEqual([]);
      expect(getSort([['lol_nope', 'asc']], indexPattern)).toEqual([]);

      delete indexPattern.timeFieldName;
      expect(getSort([['non-sortable', 'asc']], indexPattern)).toEqual([]);
    });

    test('should return an empty array ', function () {
      expect(getSort([], indexPattern)).toEqual([]);
      expect(getSort([['foo', 'bar']], indexPattern)).toEqual([]);
      expect(getSort([{ foo: 'bar' }], indexPattern)).toEqual([]);
    });
  });

  describe('getSortArray function', function () {
    test('should have an array method', function () {
      expect(getSortArray).toBeInstanceOf(Function);
    });

    test('should return an array of arrays for sortable fields', function () {
      expect(getSortArray([['bytes', 'desc']], indexPattern)).toEqual([['bytes', 'desc']]);
    });

    test('should return an array of arrays from an array of elasticsearch sort objects', function () {
      expect(getSortArray([{ bytes: 'desc' }], indexPattern)).toEqual([['bytes', 'desc']]);
    });

    test('should sort by an empty array when an unsortable field is given', function () {
      expect(getSortArray([{ 'non-sortable': 'asc' }], indexPattern)).toEqual([]);
      expect(getSortArray([{ lol_nope: 'asc' }], indexPattern)).toEqual([]);

      delete indexPattern.timeFieldName;
      expect(getSortArray([{ 'non-sortable': 'asc' }], indexPattern)).toEqual([]);
    });

    test('should return an empty array when passed an empty sort array', () => {
      expect(getSortArray([], indexPattern)).toEqual([]);

      delete indexPattern.timeFieldName;
      expect(getSortArray([], indexPattern)).toEqual([]);
    });
  });
});
