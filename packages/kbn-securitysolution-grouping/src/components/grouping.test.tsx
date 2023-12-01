/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { fireEvent, render, within } from '@testing-library/react';
import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { Grouping } from './grouping';
import { createGroupFilter, getNullGroupFilter } from '../containers/query/helpers';
import { METRIC_TYPE } from '@kbn/analytics';
import { getTelemetryEvent } from '../telemetry/const';

import { mockGroupingProps, host1Name, host2Name } from './grouping.mock';

const renderChildComponent = jest.fn();
const takeActionItems = jest.fn();
const mockTracker = jest.fn();

const testProps = {
  ...mockGroupingProps,
  renderChildComponent,
  takeActionItems,
  tracker: mockTracker,
};

describe('grouping container', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('Renders groups count when groupsCount > 0', () => {
    const { getByTestId, getAllByTestId, queryByTestId } = render(
      <I18nProvider>
        <Grouping {...testProps} />
      </I18nProvider>
    );
    expect(getByTestId('unit-count').textContent).toBe('14 events');
    expect(getByTestId('group-count').textContent).toBe('3 groups');
    expect(getAllByTestId('grouping-accordion').length).toBe(3);
    expect(queryByTestId('empty-results-panel')).not.toBeInTheDocument();
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
    const { getByTestId, queryByTestId } = render(
      <I18nProvider>
        <Grouping {...testProps} data={data} />
      </I18nProvider>
    );
    expect(queryByTestId('unit-count')).not.toBeInTheDocument();
    expect(queryByTestId('group-count')).not.toBeInTheDocument();
    expect(queryByTestId('grouping-accordion')).not.toBeInTheDocument();
    expect(getByTestId('empty-results-panel')).toBeInTheDocument();
  });

  it('Opens one group at a time when each group is clicked', () => {
    const { getAllByTestId } = render(
      <I18nProvider>
        <Grouping {...testProps} />
      </I18nProvider>
    );
    const group1 = within(getAllByTestId('grouping-accordion')[0]).getAllByRole('button')[0];
    const group2 = within(getAllByTestId('grouping-accordion')[1]).getAllByRole('button')[0];
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
    const { getAllByTestId } = render(
      <I18nProvider>
        <Grouping {...testProps} />
      </I18nProvider>
    );
    const group1 = within(getAllByTestId('grouping-accordion')[0]).getAllByRole('button')[0];
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
    takeActionItems.mockReturnValue([]);
    const { getAllByTestId, getByTestId } = render(
      <I18nProvider>
        <Grouping {...testProps} />
      </I18nProvider>
    );
    expect(getByTestId('null-group-icon')).toBeInTheDocument();

    let lastGroup = getAllByTestId('grouping-accordion').at(-1);
    fireEvent.click(within(lastGroup!).getByTestId('take-action-button'));

    expect(takeActionItems).toHaveBeenCalledWith(getNullGroupFilter('host.name'), 2);

    lastGroup = getAllByTestId('grouping-accordion').at(-1);
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
      testProps.data.groupByFields.buckets[0],
      undefined,
      false
    );

    expect(groupPanelRenderer).toHaveBeenNthCalledWith(
      2,
      'host.name',
      testProps.data.groupByFields.buckets[1],
      undefined,
      false
    );

    expect(groupPanelRenderer).toHaveBeenNthCalledWith(
      3,
      'host.name',
      testProps.data.groupByFields.buckets[2],
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
      testProps.data.groupByFields.buckets[0],
      undefined,
      true
    );
  });
});
