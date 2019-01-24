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

import expect from 'expect.js';
import { RangeFilterManager } from './range_filter_manager';

describe('RangeFilterManager', function () {

  const controlId = 'control1';

  describe('createFilter', function () {
    const indexPatternId = '1';
    const fieldMock = {
      name: 'field1'
    };
    const indexPatternMock = {
      id: indexPatternId,
      fields: {
        byName: {
          field1: fieldMock
        }
      }
    };
    const queryFilterMock = {};
    let filterManager;
    beforeEach(() => {
      filterManager = new RangeFilterManager(controlId, 'field1', indexPatternMock, queryFilterMock);
    });

    test('should create range filter from slider value', function () {
      const newFilter = filterManager.createFilter({ min: 1, max: 3 });
      expect(newFilter).to.have.property('meta');
      expect(newFilter.meta.index).to.be(indexPatternId);
      expect(newFilter.meta.controlledBy).to.be(controlId);
      expect(newFilter).to.have.property('range');
      expect(JSON.stringify(newFilter.range, null, '')).to.be('{"field1":{"gte":1,"lte":3}}');
    });
  });

  describe('getValueFromFilterBar', function () {
    const indexPatternMock = {};
    const queryFilterMock = {};
    let filterManager;
    beforeEach(() => {
      class MockFindFiltersRangeFilterManager extends RangeFilterManager {
        constructor(controlId, fieldName, indexPattern, queryFilter) {
          super(controlId, fieldName, indexPattern, queryFilter);
          this.mockFilters = [];
        }
        findFilters() {
          return this.mockFilters;
        }
        setMockFilters(mockFilters) {
          this.mockFilters = mockFilters;
        }
      }
      filterManager = new MockFindFiltersRangeFilterManager(controlId, 'field1', indexPatternMock, queryFilterMock);
    });

    test('should extract value from range filter', function () {
      filterManager.setMockFilters([
        {
          range: {
            field1: {
              gte: 1,
              lte: 3
            }
          }
        }
      ]);
      const value = filterManager.getValueFromFilterBar();
      expect(value).to.be.a('object');
      expect(value).to.have.property('min');
      expect(value.min).to.be(1);
      expect(value).to.have.property('max');
      expect(value.max).to.be(3);
    });

    test('should return undefined when filter value can not be extracted from Kibana filter', function () {
      filterManager.setMockFilters([
        {
          range: {
            myFieldWhichIsNotField1: {
              gte: 1,
              lte: 3
            }
          }
        }
      ]);
      expect(filterManager.getValueFromFilterBar()).to.eql(undefined);
    });
  });

});

