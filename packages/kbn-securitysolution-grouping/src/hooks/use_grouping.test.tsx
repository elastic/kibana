/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { renderHook } from '@testing-library/react-hooks';

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
};

const groupingArgs = {
  from: '2020-07-07T08:20:18.966Z',
  globalFilters: [],
  hasIndexMaintenance: true,
  globalQuery: {
    query: 'query',
    language: 'language',
  },
  hasIndexWrite: true,
  isLoading: false,
  renderChildComponent: jest.fn(),
  runtimeMappings: {},
  signalIndexName: 'test',
  tableId: groupingId,
  takeActionItems: jest.fn(),
  to: '2020-07-08T08:20:18.966Z',
};

describe('useGrouping', () => {
  it('Returns the expected default results on initial mount', () => {
    const { result } = renderHook(() => useGrouping(defaultArgs));
    expect(result.current.selectedGroup).toEqual('none');
    expect(result.current.getGrouping(groupingArgs).props.selectedGroup).toEqual('none');
    expect(result.current.groupSelector.props.options).toEqual(defaultGroupingOptions);
    const { reset, ...withoutReset } = result.current.pagination;
    expect(withoutReset).toEqual({ pageIndex: 0, pageSize: 25 });
  });
});
