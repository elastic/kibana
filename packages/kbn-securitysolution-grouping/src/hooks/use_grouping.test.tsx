/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { act, renderHook } from '@testing-library/react-hooks';

import { useGrouping } from './use_grouping';

const defaultGroupingOptions = [
  { label: 'ruleName', key: 'kibana.alert.rule.name' },
  { label: 'userName', key: 'user.name' },
  { label: 'hostName', key: 'host.name' },
  { label: 'sourceIP', key: 'source.ip' },
];
const groupingId = 'test-table';

const defaultArgs = {
  defaultGroupingOptions,
  fields: [],
  groupingId,
  tracker: jest.fn(),
  componentProps: {
    groupPanelRenderer: jest.fn(),
    groupStatsRenderer: jest.fn(),
    inspectButton: <></>,
    onGroupToggle: jest.fn(),
    renderChildComponent: () => <p data-test-subj="innerTable">{'hello'}</p>,
  },
};

const groupingArgs = {
  data: {},
  isLoading: false,
  takeActionItems: jest.fn(),
};

describe('useGrouping', () => {
  it('Returns the expected default results on initial mount', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(() => useGrouping(defaultArgs));
      await waitForNextUpdate();
      expect(result.current.selectedGroup).toEqual('none');
      const grouping = result.current.getGrouping(groupingArgs);
      await waitForNextUpdate();
      expect(grouping.props['data-test-subj']).toEqual('innerTable');
      const { reset, ...withoutReset } = result.current.pagination;
      expect(withoutReset).toEqual({ pageIndex: 0, pageSize: 25 });
    });
  });
});
