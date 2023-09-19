/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { act, renderHook } from '@testing-library/react-hooks';

import { useGetGroupSelector, useGetGroupSelectorStateless } from './use_get_group_selector';
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
const onGroupChange = jest.fn();
const statelessArgs = {
  defaultGroupingOptions,
  groupingId,
  fields: [],
  onGroupChange,
  maxGroupingLevels: 3,
};
const defaultArgs = {
  ...statelessArgs,
  dispatch,
  groupingState: initialState,
  tracker: jest.fn(),
};
const customField = 'custom.field';

describe('Group Selector Hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
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
            groupById: { [groupingId]: { ...defaultGroup, activeGroups: [customField] } },
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

    it('Passes custom options to the onOptionsChange callback when it is provided', () => {
      const onOptionsChange = jest.fn();
      renderHook(() =>
        useGetGroupSelector({
          ...defaultArgs,
          groupingState: {
            groupById: { [groupingId]: { ...defaultGroup, activeGroups: [customField] } },
          },
          onOptionsChange,
        })
      );

      expect(onOptionsChange).toHaveBeenCalledWith([
        ...defaultGroupingOptions,
        {
          key: customField,
          label: customField,
        },
      ]);
    });

    it('On group change, removes selected group if already selected', () => {
      const testGroup = {
        [groupingId]: {
          ...defaultGroup,
          options: defaultGroupingOptions,
          activeGroups: ['host.name'],
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

      expect(dispatch).toHaveBeenCalledWith({
        payload: {
          id: groupingId,
          activeGroups: ['none'],
        },
        type: ActionType.updateActiveGroups,
      });
    });

    it('On group change to none, remove all previously selected groups', () => {
      const testGroup = {
        [groupingId]: {
          ...defaultGroup,
          options: defaultGroupingOptions,
          activeGroups: ['host.name', 'user.name'],
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
      act(() => result.current.props.onGroupChange('none'));

      expect(dispatch).toHaveBeenCalledWith({
        payload: {
          id: groupingId,
          activeGroups: ['none'],
        },
        type: ActionType.updateActiveGroups,
      });
    });

    it('On group change, resets active page, sets active group, and leaves options alone', () => {
      const testGroup = {
        [groupingId]: {
          ...defaultGroup,
          options: defaultGroupingOptions,
          activeGroups: ['host.name'],
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
          activeGroups: ['host.name', 'user.name'],
        },
        type: ActionType.updateActiveGroups,
      });
      expect(dispatch).toHaveBeenCalledTimes(1);
    });

    it('On group change, sends telemetry', () => {
      const testGroup = {
        [groupingId]: {
          ...defaultGroup,
          options: defaultGroupingOptions,
          activeGroups: ['host.name'],
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
          activeGroups: ['host.name'],
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
      expect(defaultArgs.onGroupChange).toHaveBeenCalledTimes(1);
      expect(defaultArgs.onGroupChange).toHaveBeenCalledWith({
        tableId: groupingId,
        groupByField: customField,
      });
    });

    it('On group change to custom field, updates options', () => {
      const testGroup = {
        [groupingId]: {
          ...defaultGroup,
          options: defaultGroupingOptions,
          activeGroups: ['host.name'],
        },
      };
      const { result, rerender } = renderHook((props) => useGetGroupSelector(props), {
        initialProps: {
          ...defaultArgs,
          groupingState: {
            groupById: testGroup,
          },
        },
      });
      act(() => result.current.props.onGroupChange(customField));
      expect(dispatch).toHaveBeenCalledTimes(1);
      rerender({
        ...defaultArgs,
        groupingState: {
          groupById: {
            [groupingId]: {
              ...defaultGroup,
              options: defaultGroupingOptions,
              activeGroups: ['host.name', customField],
            },
          },
        },
      });
      expect(dispatch).toHaveBeenCalledTimes(2);
      expect(dispatch).toHaveBeenNthCalledWith(2, {
        payload: {
          newOptionList: [...defaultGroupingOptions, { label: customField, key: customField }],
          id: 'test-table',
        },
        type: ActionType.updateGroupOptions,
      });
    });

    it('Supports multiple custom fields on initial load', () => {
      const testGroup = {
        [groupingId]: {
          ...defaultGroup,
          options: defaultGroupingOptions,
          activeGroups: ['host.name', customField, 'another.custom'],
        },
      };
      renderHook((props) => useGetGroupSelector(props), {
        initialProps: {
          ...defaultArgs,
          groupingState: {
            groupById: testGroup,
          },
        },
      });
      expect(dispatch).toHaveBeenCalledTimes(1);
      expect(dispatch).toHaveBeenCalledWith({
        payload: {
          newOptionList: [
            ...defaultGroupingOptions,
            { label: customField, key: customField },
            { label: 'another.custom', key: 'another.custom' },
          ],
          id: 'test-table',
        },
        type: ActionType.updateGroupOptions,
      });
    });
  });

  describe('useGetGroupSelectorStateless', () => {
    it('Initializes a group with options', () => {
      const { result } = renderHook(() => useGetGroupSelectorStateless(statelessArgs));
      expect(result.current.props.groupingId).toEqual(groupingId);
      expect(result.current.props.options.length).toEqual(4);
    });

    it('On group change, removes selected group if already selected', () => {
      const { result } = renderHook(() => useGetGroupSelectorStateless(statelessArgs));
      act(() => result.current.props.onGroupChange('host.name'));

      expect(onGroupChange).toHaveBeenCalledWith(['host.name']);
    });
  });
});
