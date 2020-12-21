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
import { getDefaultSort } from './get_default_sort';
// @ts-ignore
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import { IndexPattern } from '../../../../kibana_services';

describe('getDefaultSort function', function () {
  let indexPattern: IndexPattern;
  beforeEach(() => {
    indexPattern = FixturesStubbedLogstashIndexPatternProvider() as IndexPattern;
  });
  test('should be a function', function () {
    expect(typeof getDefaultSort === 'function').toBeTruthy();
  });

  test('should return default sort for an index pattern with timeFieldName', function () {
    expect(getDefaultSort(indexPattern, 'desc')).toEqual([['time', 'desc']]);
    expect(getDefaultSort(indexPattern, 'asc')).toEqual([['time', 'asc']]);
  });

  test('should return default sort for an index pattern without timeFieldName', function () {
    delete indexPattern.timeFieldName;
    expect(getDefaultSort(indexPattern, 'desc')).toEqual([]);
    expect(getDefaultSort(indexPattern, 'asc')).toEqual([]);
  });
});
