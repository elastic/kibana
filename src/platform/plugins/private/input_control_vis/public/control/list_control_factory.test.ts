/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { listControlFactory, ListControl } from './list_control_factory';
import { ControlParams, CONTROL_TYPES } from '../editor_utils';
import { getDepsMock, getSearchSourceMock } from '../test_utils';

describe('listControlFactory', () => {
  const searchSourceMock = getSearchSourceMock();
  const deps = getDepsMock({
    searchSource: {
      create: searchSourceMock,
    },
  });

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
      listControl = await listControlFactory(controlParams, useTimeFilter, deps);
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
      listControl = await listControlFactory(controlParams, useTimeFilter, deps);
    });

    test('should pass in timeout parameters from injected vars', async () => {
      await listControl.fetch();
      expect(searchSourceMock).toHaveBeenCalledWith({
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
      listControl = await listControlFactory(controlParams, useTimeFilter, deps);

      const parentControlParams: ControlParams = {
        id: 'parent',
        fieldName: 'myField',
        options: {} as any,
        type: CONTROL_TYPES.LIST,
        label: 'test',
        indexPattern: {} as any,
        parent: 'parent',
      };
      parentControl = await listControlFactory(parentControlParams, useTimeFilter, deps);
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
});
