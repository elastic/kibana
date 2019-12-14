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

import { rangeControlFactory } from './range_control_factory';

let esSearchResponse;
class MockSearchSource {
  setParent() {}
  setField() {}
  async fetch() {
    return esSearchResponse;
  }
}

jest.mock('ui/timefilter', () => ({
  createFilter: jest.fn(),
}));

jest.mock('../../../../core_plugins/data/public/legacy', () => ({
  start: {
    indexPatterns: {
      indexPatterns: {
        get: () => ({
          fields: {
            getByName: name => {
              const fields = { myNumberField: { name: 'myNumberField' } };
              return fields[name];
            },
          },
        }),
      },
    },
    filter: {
      filterManager: {
        fieldName: 'myNumberField',
        getIndexPattern: () => ({
          fields: {
            getByName: name => {
              const fields = { myNumberField: { name: 'myNumberField' } };
              return fields[name];
            },
          },
        }),
        getAppFilters: jest.fn().mockImplementation(() => []),
        getGlobalFilters: jest.fn().mockImplementation(() => []),
      },
    },
  },
}));

const mockKbnApi = {
  SearchSource: MockSearchSource,
};

describe('fetch', () => {
  const controlParams = {
    id: '1',
    fieldName: 'myNumberField',
    options: {},
  };
  const useTimeFilter = false;

  let rangeControl;
  beforeEach(async () => {
    rangeControl = await rangeControlFactory(controlParams, mockKbnApi, useTimeFilter);
  });

  test('should set min and max from aggregation results', async () => {
    esSearchResponse = {
      aggregations: {
        maxAgg: { value: 100 },
        minAgg: { value: 10 },
      },
    };
    await rangeControl.fetch();

    expect(rangeControl.isEnabled()).toBe(true);
    expect(rangeControl.min).toBe(10);
    expect(rangeControl.max).toBe(100);
  });

  test('should disable control when there are 0 hits', async () => {
    // ES response when the query does not match any documents
    esSearchResponse = {
      aggregations: {
        maxAgg: { value: null },
        minAgg: { value: null },
      },
    };
    await rangeControl.fetch();

    expect(rangeControl.isEnabled()).toBe(false);
  });

  test('should disable control when response is empty', async () => {
    // ES response for dashboardonly user who does not have read permissions on index is 200 (which is weird)
    // and there is not aggregations key
    esSearchResponse = {};
    await rangeControl.fetch();

    expect(rangeControl.isEnabled()).toBe(false);
  });
});
