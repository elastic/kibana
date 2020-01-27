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

import { listControlFactory, ListControl } from './list_control_factory';
import { ControlParams, CONTROL_TYPES } from '../editor_utils';
import { getDepsMock } from '../components/editor/__tests__/get_deps_mock';
import { getSearchSourceMock } from '../components/editor/__tests__/get_search_service_mock';

const MockSearchSource = getSearchSourceMock();
const deps = getDepsMock();

jest.doMock('./create_search_source.ts', () => ({
  createSearchSource: MockSearchSource,
}));

describe('hasValue', () => {
  const controlParams: ControlParams = {
    id: '1',
    fieldName: 'myField',
    options: {} as any,
    type: CONTROL_TYPES.LIST,
    label: 'test',
    indexPattern: {} as any,
    parent: 'parent',
  };
  const useTimeFilter = false;

  let listControl: ListControl;
  beforeEach(async () => {
    listControl = await listControlFactory(controlParams, useTimeFilter, MockSearchSource, deps);
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

describe('fetch', () => {
  const controlParams: ControlParams = {
    id: '1',
    fieldName: 'myField',
    options: {} as any,
    type: CONTROL_TYPES.LIST,
    label: 'test',
    indexPattern: {} as any,
    parent: 'parent',
  };
  const useTimeFilter = false;

  let listControl: ListControl;
  beforeEach(async () => {
    listControl = await listControlFactory(controlParams, useTimeFilter, MockSearchSource, deps);
  });

  test('should pass in timeout parameters from injected vars', async () => {
    await listControl.fetch();
    expect(MockSearchSource).toHaveBeenCalledWith({
      timeout: `1000ms`,
      terminate_after: 100000,
    });
  });

  test('should set selectOptions to results of terms aggregation', async () => {
    await listControl.fetch();
    expect(listControl.selectOptions).toEqual([
      'Zurich Airport',
      'Xi an Xianyang International Airport',
    ]);
  });
});

describe('fetch with ancestors', () => {
  const controlParams: ControlParams = {
    id: '1',
    fieldName: 'myField',
    options: {} as any,
    type: CONTROL_TYPES.LIST,
    label: 'test',
    indexPattern: {} as any,
    parent: 'parent',
  };
  const useTimeFilter = false;

  let listControl: ListControl;
  let parentControl;
  beforeEach(async () => {
    listControl = await listControlFactory(controlParams, useTimeFilter, MockSearchSource, deps);

    const parentControlParams: ControlParams = {
      id: 'parent',
      fieldName: 'myField',
      options: {} as any,
      type: CONTROL_TYPES.LIST,
      label: 'test',
      indexPattern: {} as any,
      parent: 'parent',
    };
    parentControl = await listControlFactory(
      parentControlParams,
      useTimeFilter,
      MockSearchSource,
      deps
    );
    parentControl.clear();
    listControl.setAncestors([parentControl]);
  });

  describe('ancestor does not have value', () => {
    test('should disable control', async () => {
      await listControl.fetch();
      expect(listControl.isEnabled()).toBe(false);
    });

    test('should reset lastAncestorValues', async () => {
      listControl.lastAncestorValues = 'last ancestor value';
      await listControl.fetch();
      expect(listControl.lastAncestorValues).toBeUndefined();
    });
  });
});
