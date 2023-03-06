/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { act, renderHook } from '@testing-library/react-hooks';
import { useReducer } from 'react';
import { groupActions, groupsReducerWithStorage, initialState } from '.';
import { defaultGroup } from '@kbn/securitysolution-grouping/src';

const groupingOptions = [
  { label: 'ruleName', key: 'kibana.alert.rule.name' },
  { label: 'userName', key: 'user.name' },
  { label: 'hostName', key: 'host.name' },
  { label: 'sourceIP', key: 'source.ip' },
];

const setItem = jest.spyOn(global.localStorage, 'setItem');
const getItem = jest.spyOn(global.localStorage, 'getItem');
describe('grouping reducer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('updateGroupOptions', () => {
    it('Creates a new default', () => {
      const { result } = renderHook(() => useReducer(groupsReducerWithStorage, initialState));
      let [groupingState, dispatch] = result.current;
      console.log({ groupingState });
      expect(true).toBeTruthy();
      act(() => {
        dispatch(groupActions.updateGroupOptions({ id: 'testId', newOptionList: groupingOptions }));
      });
      [groupingState, dispatch] = result.current;
      expect(groupingState.groupById.testId).toEqual({ ...defaultGroup, options: groupingOptions });
      console.log('after', { groupingState });
    });
  });
});
