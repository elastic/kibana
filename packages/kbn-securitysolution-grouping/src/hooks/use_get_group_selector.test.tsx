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
import { defaultGroup } from '@kbn/securitysolution-grouping/src';

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
};
describe('useGetGroupSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Does not initialize a group with no options', () => {
    renderHook(() => useGetGroupSelector({ ...defaultArgs, defaultGroupingOptions: [] }));
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('Initializes a group with options', () => {
    renderHook(() => useGetGroupSelector(defaultArgs));

    expect(dispatch).toHaveBeenCalledWith({
      payload: {
        id: groupingId,
        newOptionList: defaultGroupingOptions,
      },
      type: 'UPDATE_GROUP_OPTIONS',
    });
  });

  it('Initializes a group with custom selected group', () => {
    const customField = 'custom.field';
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
      type: 'UPDATE_GROUP_OPTIONS',
    });
  });

  it.only('On group change, sets new selectedOptions', async () => {
    const { result, rerender } = renderHook(() =>
      useGetGroupSelector({
        ...defaultArgs,
        groupingState: {
          groupById: { [groupingId]: { ...defaultGroup, activeGroup: 'host.name' } },
        },
      })
    );
    act(() => result.current.props.onGroupChange('user.name'));
    rerender({
      ...defaultArgs,
      groupingState: {
        groupById: { [groupingId]: { ...defaultGroup, activeGroup: 'user.name' } },
      },
    });
    console.log('result.current');
    // result.current
    // await waitForNextUpdate();
    // const container = render(result.current);
    //
    // fireEvent.click(container.getByTestId('group-selector-dropdown'));
    // container.debug();

    //
    // const groupingState = { [groupingId]: { ...defaultGroup, activeGroup: 'host.name' } };
    //
    // expect(dispatch).toHaveBeenCalledWith({
    //   payload: {
    //     id: groupingId,
    //     newOptionList: defaultGroupingOptions,
    //   },
    //   type: 'UPDATE_GROUP_OPTIONS',
    // });
  });
});
