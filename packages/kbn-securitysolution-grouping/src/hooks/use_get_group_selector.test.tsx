/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { act, renderHook } from '@testing-library/react-hooks';

import { useGetGroupSelector } from './use_get_group_selector';
import { initialState } from './state';
import { ActionType, defaultGroup } from '..';
import { METRIC_TYPE } from '@kbn/analytics';

const defaultGroupingOptions = [
  { label: 'ruleName', key: 'kibana.alert.rule.name' },
  { label: 'userName', key: 'user.name' },
  { label: 'hostName', key: 'host.name' },
  { label: 'sourceIP', key: 'source.ip' },
];
const groupingId = 'test-table';
const dispatch = jest.fn();
const defaultArgs = {
  defaultGroupingOptions,
  dispatch,
  fields: [],
  groupingId,
  groupingState: initialState,
  tracker: jest.fn(),
  onGroupChangeCallback: jest.fn(),
};
const customField = 'custom.field';
describe('useGetGroupSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Initializes a group with options', () => {
    renderHook(() => useGetGroupSelector(defaultArgs));

    expect(dispatch).toHaveBeenCalledWith({
      payload: {
        id: groupingId,
        newOptionList: defaultGroupingOptions,
      },
      type: ActionType.updateGroupOptions,
    });
  });

  it('Initializes a group with custom selected group', () => {
    renderHook(() =>
      useGetGroupSelector({
        ...defaultArgs,
        groupingState: {
          groupById: { [groupingId]: { ...defaultGroup, activeGroup: customField } },
        },
      })
    );

    expect(dispatch).toHaveBeenCalledWith({
      payload: {
        id: groupingId,
        newOptionList: [
          ...defaultGroupingOptions,
          {
            key: customField,
            label: customField,
          },
        ],
      },
      type: ActionType.updateGroupOptions,
    });
  });

  it('On group change, does nothing when set to prev selected group', () => {
    const testGroup = {
      [groupingId]: {
        ...defaultGroup,
        options: defaultGroupingOptions,
        activeGroup: 'host.name',
      },
    };
    const { result } = renderHook((props) => useGetGroupSelector(props), {
      initialProps: {
        ...defaultArgs,
        groupingState: {
          groupById: testGroup,
        },
      },
    });
    act(() => result.current.props.onGroupChange('host.name'));
    expect(dispatch).toHaveBeenCalledTimes(0);
  });

  it('On group change, resets active page, sets active group, and leaves options alone', () => {
    const testGroup = {
      [groupingId]: {
        ...defaultGroup,
        options: defaultGroupingOptions,
        activeGroup: 'host.name',
      },
    };
    const { result } = renderHook((props) => useGetGroupSelector(props), {
      initialProps: {
        ...defaultArgs,
        groupingState: {
          groupById: testGroup,
        },
      },
    });
    act(() => result.current.props.onGroupChange('user.name'));
    expect(dispatch).toHaveBeenNthCalledWith(1, {
      payload: {
        id: groupingId,
        activePage: 0,
      },
      type: ActionType.updateGroupActivePage,
    });
    expect(dispatch).toHaveBeenNthCalledWith(2, {
      payload: {
        id: groupingId,
        activeGroup: 'user.name',
      },
      type: ActionType.updateActiveGroup,
    });
    expect(dispatch).toHaveBeenCalledTimes(2);
  });

  it('On group change, sends telemetry', () => {
    const testGroup = {
      [groupingId]: {
        ...defaultGroup,
        options: defaultGroupingOptions,
        activeGroup: 'host.name',
      },
    };
    const { result } = renderHook((props) => useGetGroupSelector(props), {
      initialProps: {
        ...defaultArgs,
        groupingState: {
          groupById: testGroup,
        },
      },
    });
    act(() => result.current.props.onGroupChange(customField));
    expect(defaultArgs.tracker).toHaveBeenCalledTimes(1);
    expect(defaultArgs.tracker).toHaveBeenCalledWith(
      METRIC_TYPE.CLICK,
      `alerts_table_group_by_test-table_${customField}`
    );
  });

  it('On group change, executes callback', () => {
    const testGroup = {
      [groupingId]: {
        ...defaultGroup,
        options: defaultGroupingOptions,
        activeGroup: 'host.name',
      },
    };
    const { result } = renderHook((props) => useGetGroupSelector(props), {
      initialProps: {
        ...defaultArgs,
        groupingState: {
          groupById: testGroup,
        },
      },
    });
    act(() => result.current.props.onGroupChange(customField));
    expect(defaultArgs.onGroupChangeCallback).toHaveBeenCalledTimes(1);
    expect(defaultArgs.onGroupChangeCallback).toHaveBeenCalledWith({
      tableId: groupingId,
      groupByField: customField,
    });
  });

  it('On group change to custom field, updates options', () => {
    const testGroup = {
      [groupingId]: {
        ...defaultGroup,
        options: defaultGroupingOptions,
        activeGroup: 'host.name',
      },
    };
    const { result } = renderHook((props) => useGetGroupSelector(props), {
      initialProps: {
        ...defaultArgs,
        groupingState: {
          groupById: testGroup,
        },
      },
    });
    act(() => result.current.props.onGroupChange(customField));
    expect(dispatch).toHaveBeenCalledTimes(3);
    expect(dispatch).toHaveBeenNthCalledWith(3, {
      payload: {
        id: groupingId,
        newOptionList: [
          ...defaultGroupingOptions,
          {
            label: customField,
            key: customField,
          },
        ],
      },
      type: ActionType.updateGroupOptions,
    });
  });
});
