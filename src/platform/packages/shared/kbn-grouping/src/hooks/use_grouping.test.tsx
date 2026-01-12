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
import { render, waitFor, renderHook } from '@testing-library/react';

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
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Renders child component without grouping table wrapper when no group is selected', async () => {
    const { result } = renderHook(() => useGrouping(defaultArgs));
    await waitFor(() => new Promise((resolve) => resolve(null)));
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
  it('Renders child component with grouping table wrapper when group is selected', async () => {
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

    const { result } = renderHook(() => useGrouping(defaultArgs));
    await waitFor(() => new Promise((resolve) => resolve(null)));
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

  it('Passes settings to group selector', () => {
    const settings = {
      hideNoneOption: true,
      hideCustomFieldOption: true,
      popoverButtonLabel: 'Custom Label',
      hideOptionsTitle: true,
    };
    const { result } = renderHook(() =>
      useGrouping({
        ...defaultArgs,
        settings,
      })
    );
    expect(result.current.groupSelector.props.settings).toEqual(settings);
  });

  describe('additionalToolbarControls', () => {
    it('passes additionalToolbarControls to grouping component when provided', async () => {
      const customControl1 = <button data-test-subj="custom-control-1">Control 1</button>;
      const customControl2 = <button data-test-subj="custom-control-2">Control 2</button>;

      const argsWithControls = {
        ...defaultArgs,
        componentProps: {
          ...defaultArgs.componentProps,
        },
      };

      const { result } = renderHook(() => useGrouping(argsWithControls));
      await waitFor(() => new Promise((resolve) => resolve(null)));

      const { getByTestId } = render(
        <IntlProvider locale="en">
          {result.current.getGrouping({
            ...groupingArgs,
            additionalToolbarControls: [customControl1, customControl2],
            data: {
              groupsCount: {
                value: 3,
              },
              groupByFields: {
                buckets: [
                  {
                    key: ['test-key'],
                    key_as_string: 'test-key',
                    doc_count: 2,
                    unitsCount: {
                      value: 2,
                    },
                  },
                ],
              },
              unitsCount: {
                value: 5,
              },
            },
            renderChildComponent: jest.fn(),
            selectedGroup: 'test',
          })}
        </IntlProvider>
      );

      expect(getByTestId('grouping-table')).toBeInTheDocument();
      expect(getByTestId('custom-control-1')).toBeInTheDocument();
      expect(getByTestId('custom-control-2')).toBeInTheDocument();
    });

    it('handles empty additionalToolbarControls array', async () => {
      const { result } = renderHook(() => useGrouping(defaultArgs));
      await waitFor(() => new Promise((resolve) => resolve(null)));

      const { getByTestId, container } = render(
        <IntlProvider locale="en">
          {result.current.getGrouping({
            ...groupingArgs,
            additionalToolbarControls: [],
            data: {
              groupsCount: {
                value: 1,
              },
              groupByFields: {
                buckets: [
                  {
                    key: ['test-key'],
                    key_as_string: 'test-key',
                    doc_count: 1,
                    unitsCount: {
                      value: 1,
                    },
                  },
                ],
              },
              unitsCount: {
                value: 2,
              },
            },
            renderChildComponent: jest.fn(),
            selectedGroup: 'test',
          })}
        </IntlProvider>
      );

      expect(getByTestId('grouping-table')).toBeInTheDocument();
      const additionalControls = container.querySelectorAll(
        '[data-test-subj^="additional-control-"]'
      );
      expect(additionalControls).toHaveLength(0);
    });

    it('renders multiple additionalToolbarControls in correct order', async () => {
      const control1 = <div data-test-subj="control-order-1">First</div>;
      const control2 = <div data-test-subj="control-order-2">Second</div>;
      const control3 = <div data-test-subj="control-order-3">Third</div>;

      const { result } = renderHook(() => useGrouping(defaultArgs));
      await waitFor(() => new Promise((resolve) => resolve(null)));

      const { getAllByTestId } = render(
        <IntlProvider locale="en">
          {result.current.getGrouping({
            ...groupingArgs,
            additionalToolbarControls: [control1, control2, control3],
            data: {
              groupsCount: {
                value: 1,
              },
              groupByFields: {
                buckets: [
                  {
                    key: ['test-key'],
                    key_as_string: 'test-key',
                    doc_count: 1,
                    unitsCount: {
                      value: 1,
                    },
                  },
                ],
              },
              unitsCount: {
                value: 1,
              },
            },
            renderChildComponent: jest.fn(),
            selectedGroup: 'test',
          })}
        </IntlProvider>
      );

      const controls = getAllByTestId(/control-order-/);
      expect(controls).toHaveLength(3);
      expect(controls[0]).toHaveAttribute('data-test-subj', 'control-order-1');
      expect(controls[1]).toHaveAttribute('data-test-subj', 'control-order-2');
      expect(controls[2]).toHaveAttribute('data-test-subj', 'control-order-3');
    });
  });
});
