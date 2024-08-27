/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { render, renderHook, act } from '@testing-library/react';

import { useGrouping } from './use_grouping';

const defaultGroupingOptions = [
  { label: 'Rule name', key: 'kibana.alert.rule.name' },
  { label: 'User name', key: 'user.name' },
  { label: 'Host name', key: 'host.name' },
  { label: 'Source IP', key: 'source.ip' },
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
  },
};

const groupingArgs = {
  data: {},
  isLoading: false,
  takeActionItems: jest.fn(),
  activePage: 0,
  itemsPerPage: 25,
  onGroupClose: () => {},
};

describe('useGrouping', () => {
  it('Renders child component without grouping table wrapper when no group is selected', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(() => useGrouping(defaultArgs));
      await waitForNextUpdate();
      await waitForNextUpdate();
      const { getByTestId, queryByTestId } = render(
        <IntlProvider locale="en">
          {result.current.getGrouping({
            ...groupingArgs,
            data: {
              groupsCount: {
                value: 9,
              },
              groupByFields: {
                buckets: [
                  {
                    key: ['critical hosts', 'description'],
                    key_as_string: 'critical hosts|description',
                    doc_count: 3,
                    unitsCount: {
                      value: 3,
                    },
                  },
                ],
              },
              unitsCount: {
                value: 18,
              },
            },
            renderChildComponent: () => <p data-test-subj="innerTable">{'hello'}</p>,
            selectedGroup: 'none',
          })}
        </IntlProvider>
      );

      expect(getByTestId('innerTable')).toBeInTheDocument();
      expect(queryByTestId('grouping-table')).not.toBeInTheDocument();
    });
  });
  it('Renders child component with grouping table wrapper when group is selected', async () => {
    await act(async () => {
      const getItem = jest.spyOn(window.localStorage.__proto__, 'getItem');
      getItem.mockReturnValue(
        JSON.stringify({
          'test-table': {
            itemsPerPageOptions: [10, 25, 50, 100],
            itemsPerPage: 25,
            activeGroup: 'kibana.alert.rule.name',
            options: defaultGroupingOptions,
          },
        })
      );

      const { result, waitForNextUpdate } = renderHook(() => useGrouping(defaultArgs));
      await waitForNextUpdate();
      await waitForNextUpdate();
      const { getByTestId } = render(
        <IntlProvider locale="en">
          {result.current.getGrouping({
            ...groupingArgs,
            data: {
              groupsCount: {
                value: 9,
              },
              groupByFields: {
                buckets: [
                  {
                    key: ['critical hosts', 'description'],
                    key_as_string: 'critical hosts|description',
                    doc_count: 3,
                    unitsCount: {
                      value: 3,
                    },
                  },
                ],
              },
              unitsCount: {
                value: 18,
              },
            },
            renderChildComponent: jest.fn(),
            selectedGroup: 'test',
          })}
        </IntlProvider>
      );

      expect(getByTestId('grouping-table')).toBeInTheDocument();
    });
  });
});
