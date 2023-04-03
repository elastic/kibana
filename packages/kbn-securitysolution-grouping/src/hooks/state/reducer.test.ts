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
import { defaultGroup, GroupsPagingSettingsById, LOCAL_STORAGE_GROUPING_KEY } from '../..';

const groupingOptions = [
  { label: 'ruleName', key: 'kibana.alert.rule.name' },
  { label: 'userName', key: 'user.name' },
  { label: 'hostName', key: 'host.name' },
  { label: 'sourceIP', key: 'source.ip' },
];

const groupingId = 'test-table';

const groupById = {
  [groupingId]: {
    ...defaultGroup,
    pagingSettings: {
      ...defaultGroup.pagingSettings,
      ['host.name']: {
        ...defaultGroup.pagingSettings.none,
      },
    },
    options: groupingOptions,
    activeGroups: ['host.name'],
  },
};

const setItem = jest.spyOn(window.localStorage.__proto__, 'setItem');
const getItem = jest.spyOn(window.localStorage.__proto__, 'getItem');

describe('grouping reducer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('updateGroupOptions, initializes group with defaults and provided newOptionList', () => {
    const { result } = renderHook(() => useReducer(groupsReducerWithStorage, initialState));
    let [groupingState, dispatch] = result.current;
    expect(groupingState.groupById).toEqual({});
    act(() => {
      dispatch(groupActions.updateGroupOptions({ id: groupingId, newOptionList: groupingOptions }));
    });
    [groupingState, dispatch] = result.current;
    expect(groupingState.groupById[groupingId]).toEqual({
      ...defaultGroup,
      options: groupingOptions,
    });

    expect(getItem).toHaveBeenCalledTimes(2);
    expect(setItem).toHaveBeenCalledWith(
      LOCAL_STORAGE_GROUPING_KEY,
      JSON.stringify(groupingState.groupById)
    );
  });
  it('updateActiveGroups', () => {
    const { result } = renderHook(() =>
      useReducer(groupsReducerWithStorage, {
        ...initialState,
        groupById,
      })
    );
    let [groupingState, dispatch] = result.current;
    expect(groupingState.groupById[groupingId].activeGroups).toEqual(['host.name']);
    act(() => {
      dispatch(groupActions.updateActiveGroups({ id: groupingId, activeGroups: ['user.name'] }));
    });
    [groupingState, dispatch] = result.current;
    expect(groupingState.groupById[groupingId].activeGroups).toEqual(['user.name']);
  });
  it('updateGroupActivePage', () => {
    const { result } = renderHook(() =>
      useReducer(groupsReducerWithStorage, {
        ...initialState,
        groupById,
      })
    );
    let [groupingState, dispatch] = result.current;
    let pagingSettings: GroupsPagingSettingsById =
      groupingState.groupById[groupingId].pagingSettings;
    expect(pagingSettings['host.name'].activePage).toEqual(0);
    act(() => {
      dispatch(
        groupActions.updateGroupActivePage({
          id: groupingId,
          activePage: 12,
          selectedGroup: 'host.name',
        })
      );
    });
    [groupingState, dispatch] = result.current;
    pagingSettings = groupingState.groupById[groupingId].pagingSettings;
    expect(pagingSettings['host.name'].activePage).toEqual(12);
  });
  it('updateGroupItemsPerPage', () => {
    const { result } = renderHook(() =>
      useReducer(groupsReducerWithStorage, {
        ...initialState,
        groupById,
      })
    );
    let [groupingState, dispatch] = result.current;
    act(() => {
      dispatch(groupActions.updateGroupOptions({ id: groupingId, newOptionList: groupingOptions }));
    });
    [groupingState, dispatch] = result.current;
    let pagingSettings: GroupsPagingSettingsById =
      groupingState.groupById[groupingId].pagingSettings;
    expect(pagingSettings['host.name'].itemsPerPage).toEqual(25);
    act(() => {
      dispatch(
        groupActions.updateGroupItemsPerPage({
          id: groupingId,
          itemsPerPage: 12,
          selectedGroup: 'host.name',
        })
      );
    });
    [groupingState, dispatch] = result.current;
    pagingSettings = groupingState.groupById[groupingId].pagingSettings;
    expect(pagingSettings['host.name'].itemsPerPage).toEqual(12);
  });
});
