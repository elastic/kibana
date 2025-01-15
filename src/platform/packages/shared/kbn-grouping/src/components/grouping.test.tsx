/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fireEvent, render, within, screen } from '@testing-library/react';
import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { Grouping, GroupingProps } from './grouping';
import { createGroupFilter, getNullGroupFilter } from '../containers/query/helpers';
import { METRIC_TYPE } from '@kbn/analytics';
import { getTelemetryEvent } from '../telemetry/const';

import { mockGroupingProps, host1Name, host2Name } from './grouping.mock';
import { SetRequired } from 'type-fest';

const renderChildComponent = jest.fn();
const takeActionItems = jest.fn();
const mockTracker = jest.fn();

const testProps: SetRequired<GroupingProps<{}>, 'data'> = {
  ...mockGroupingProps,
  renderChildComponent,
  takeActionItems,
  tracker: mockTracker,
};

describe('Grouping', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Renders groups count when groupsCount > 0', () => {
    render(
      <I18nProvider>
        <Grouping {...testProps} />
      </I18nProvider>
    );
    expect(screen.getByTestId('unit-count').textContent).toBe('14 events');
    expect(screen.getByTestId('group-count').textContent).toBe('3 groups');
    expect(screen.getAllByTestId('grouping-accordion').length).toBe(3);
    expect(screen.queryByTestId('empty-results-panel')).not.toBeInTheDocument();
  });

  it('Does not render empty state while loading', () => {
    render(
      <I18nProvider>
        <Grouping {...testProps} isLoading />
      </I18nProvider>
    );
    expect(screen.queryByTestId('empty-results-panel')).not.toBeInTheDocument();
  });

  it('Does not render group counts when groupsCount = 0', () => {
    const data = {
      groupsCount: {
        value: 0,
      },
      groupByFields: {
        doc_count_error_upper_bound: 0,
        sum_other_doc_count: 0,
        buckets: [],
      },
      unitsCount: {
        value: 0,
      },
    };
    render(
      <I18nProvider>
        <Grouping {...testProps} data={data} />
      </I18nProvider>
    );
    expect(screen.queryByTestId('unit-count')).not.toBeInTheDocument();
    expect(screen.queryByTestId('group-count')).not.toBeInTheDocument();
    expect(screen.queryByTestId('grouping-accordion')).not.toBeInTheDocument();
    expect(screen.getByTestId('empty-results-panel')).toBeInTheDocument();
  });

  it('Opens one group at a time when each group is clicked', () => {
    render(
      <I18nProvider>
        <Grouping {...testProps} />
      </I18nProvider>
    );
    const group1 = within(screen.getAllByTestId('grouping-accordion')[0]).getAllByRole('button')[0];
    const group2 = within(screen.getAllByTestId('grouping-accordion')[1]).getAllByRole('button')[0];
    fireEvent.click(group1);
    expect(renderChildComponent).toHaveBeenNthCalledWith(
      1,
      createGroupFilter(testProps.selectedGroup, [host1Name])
    );
    fireEvent.click(group2);
    expect(renderChildComponent).toHaveBeenNthCalledWith(
      2,
      createGroupFilter(testProps.selectedGroup, [host2Name])
    );
  });

  it('Send Telemetry when each group is clicked', () => {
    render(
      <I18nProvider>
        <Grouping {...testProps} />
      </I18nProvider>
    );
    const group1 = within(screen.getAllByTestId('grouping-accordion')[0]).getAllByRole('button')[0];
    fireEvent.click(group1);
    expect(mockTracker).toHaveBeenNthCalledWith(
      1,
      METRIC_TYPE.CLICK,
      getTelemetryEvent.groupToggled({
        isOpen: true,
        groupingId: testProps.groupingId,
        groupNumber: 0,
      })
    );
    fireEvent.click(group1);
    expect(mockTracker).toHaveBeenNthCalledWith(
      2,
      METRIC_TYPE.CLICK,
      getTelemetryEvent.groupToggled({
        isOpen: false,
        groupingId: testProps.groupingId,
        groupNumber: 0,
      })
    );
  });

  it('Renders a null group and passes the correct filter to take actions and child component', () => {
    takeActionItems.mockReturnValue([<span />]);
    render(
      <I18nProvider>
        <Grouping {...testProps} />
      </I18nProvider>
    );
    expect(screen.getByTestId('null-group-icon')).toBeInTheDocument();

    let lastGroup = screen.getAllByTestId('grouping-accordion').at(-1);
    fireEvent.click(within(lastGroup!).getByTestId('take-action-button'));

    expect(takeActionItems).toHaveBeenCalledWith(getNullGroupFilter('host.name'), 2);

    lastGroup = screen.getAllByTestId('grouping-accordion').at(-1);
    fireEvent.click(within(lastGroup!).getByTestId('group-panel-toggle'));

    expect(renderChildComponent).toHaveBeenCalledWith(getNullGroupFilter('host.name'));
  });

  it('Renders groupPanelRenderer when provided', () => {
    const groupPanelRenderer = jest.fn();
    render(
      <I18nProvider>
        <Grouping {...testProps} groupPanelRenderer={groupPanelRenderer} />
      </I18nProvider>
    );

    expect(groupPanelRenderer).toHaveBeenNthCalledWith(
      1,
      'host.name',
      testProps.data.groupByFields!.buckets![0],
      undefined,
      false
    );

    expect(groupPanelRenderer).toHaveBeenNthCalledWith(
      2,
      'host.name',
      testProps.data.groupByFields!.buckets![1],
      undefined,
      false
    );

    expect(groupPanelRenderer).toHaveBeenNthCalledWith(
      3,
      'host.name',
      testProps.data.groupByFields!.buckets![2],
      'The selected group by field, host.name, is missing a value for this group of events.',
      false
    );
  });
  it('Renders groupPanelRenderer when provided with isLoading attribute', () => {
    const groupPanelRenderer = jest.fn();
    render(
      <I18nProvider>
        <Grouping {...testProps} isLoading groupPanelRenderer={groupPanelRenderer} />
      </I18nProvider>
    );

    expect(groupPanelRenderer).toHaveBeenNthCalledWith(
      1,
      'host.name',
      testProps.data.groupByFields!.buckets![0],
      undefined,
      true
    );
  });

  describe('groupsUnit', () => {
    it('renders default groupsUnit text correctly', () => {
      render(
        <I18nProvider>
          <Grouping {...testProps} />
        </I18nProvider>
      );
      expect(screen.getByTestId('group-count').textContent).toBe('3 groups');
    });
    it('calls custom groupsUnit callback correctly', () => {
      // Provide a custom groupsUnit function in testProps
      const customGroupsUnit = jest.fn(
        (n, parentSelectedGroup, hasNullGroup) => `${n} custom units`
      );
      const customProps = { ...testProps, groupsUnit: customGroupsUnit };

      render(
        <I18nProvider>
          <Grouping {...customProps} />
        </I18nProvider>
      );

      expect(customGroupsUnit).toHaveBeenCalledWith(3, testProps.selectedGroup, true);
      expect(screen.getByTestId('group-count').textContent).toBe('3 custom units');
    });
  });
});
