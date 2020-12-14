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
import { getSortForSearchSource } from './get_sort_for_search_source';
// @ts-ignore
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import { IndexPattern } from '../../../../kibana_services';
import { SortOrder } from '../components/table_header/helpers';

describe('getSortForSearchSource function', function () {
  let indexPattern: IndexPattern;
  beforeEach(() => {
    indexPattern = FixturesStubbedLogstashIndexPatternProvider() as IndexPattern;
  });
  test('should be a function', function () {
    expect(typeof getSortForSearchSource === 'function').toBeTruthy();
  });

  test('should return an object to use for searchSource when columns are given', function () {
    const cols = [['bytes', 'desc']] as SortOrder[];
    expect(getSortForSearchSource(cols, indexPattern)).toEqual([{ bytes: 'desc' }]);
    expect(getSortForSearchSource(cols, indexPattern, 'asc')).toEqual([{ bytes: 'desc' }]);
    delete indexPattern.timeFieldName;
    expect(getSortForSearchSource(cols, indexPattern)).toEqual([{ bytes: 'desc' }]);
    expect(getSortForSearchSource(cols, indexPattern, 'asc')).toEqual([{ bytes: 'desc' }]);
  });

  test('should return an object to use for searchSource when no columns are given', function () {
    const cols = [] as SortOrder[];
    expect(getSortForSearchSource(cols, indexPattern)).toEqual([{ _doc: 'desc' }]);
    expect(getSortForSearchSource(cols, indexPattern, 'asc')).toEqual([{ _doc: 'asc' }]);
    delete indexPattern.timeFieldName;
    expect(getSortForSearchSource(cols, indexPattern)).toEqual([{ _score: 'desc' }]);
    expect(getSortForSearchSource(cols, indexPattern, 'asc')).toEqual([{ _score: 'asc' }]);
  });
});
