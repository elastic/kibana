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

import { listControlFactory } from './list_control_factory';

const mockField = {
  name: 'myField',
  format: {
    convert: (val) => { return val; }
  }
};

const mockIndexPattern = {
  fields: {
    byName: {
      myField: mockField,
    }
  }
};

const mockKbnApi = {
  indexPatterns: {
    get: async () => {
      return mockIndexPattern;
    }
  },
  queryFilter: {
    getAppFilters: () => {
      return [];
    },
    getGlobalFilters: () => {
      return [];
    }
  }
};

describe('hasValue', () => {
  const controlParams = {
    id: '1',
    fieldName: 'myField',
    options: {}
  };
  const useTimeFilter = false;

  let listControl;
  beforeEach(async () => {
    listControl = await listControlFactory(controlParams, mockKbnApi, useTimeFilter);
  });

  test('should be false when control has no value', () => {
    expect(listControl.hasValue()).toBe(false);
  });

  test('should be true when control has value', () => {
    listControl.set([{ value: 'selected option', label: 'selection option' }]);
    expect(listControl.hasValue()).toBe(true);
  });

  test('should be true when control has value that is the string "false"', () => {
    listControl.set([{ value: 'false', label: 'selection option' }]);
    expect(listControl.hasValue()).toBe(true);
  });
});
