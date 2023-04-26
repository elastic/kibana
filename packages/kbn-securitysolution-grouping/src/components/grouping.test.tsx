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
import { createGroupFilter } from './accordion_panel/helpers';
import { METRIC_TYPE } from '@kbn/analytics';
import { getTelemetryEvent } from '../telemetry/const';

const renderChildComponent = jest.fn();
const takeActionItems = jest.fn();
const mockTracker = jest.fn();
const rule1Name = 'Rule 1 name';
const rule1Desc = 'Rule 1 description';
const rule2Name = 'Rule 2 name';
const rule2Desc = 'Rule 2 description';

const testProps = {
  data: {
    groupsCount: {
      value: 2,
    },
    groupByFields: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [
        {
          key: [rule1Name, rule1Desc],
          key_as_string: `${rule1Name}|${rule1Desc}`,
          doc_count: 1,
          hostsCountAggregation: {
            value: 1,
          },
          ruleTags: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
          alertsCount: {
            value: 1,
          },
          severitiesSubAggregation: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'low',
                doc_count: 1,
              },
            ],
          },
          countSeveritySubAggregation: {
            value: 1,
          },
          usersCountAggregation: {
            value: 1,
          },
        },
        {
          key: [rule2Name, rule2Desc],
          key_as_string: `${rule2Name}|${rule2Desc}`,
          doc_count: 1,
          hostsCountAggregation: {
            value: 1,
          },
          ruleTags: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
          unitsCount: {
            value: 1,
          },
          severitiesSubAggregation: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'low',
                doc_count: 1,
              },
            ],
          },
          countSeveritySubAggregation: {
            value: 1,
          },
          usersCountAggregation: {
            value: 1,
          },
        },
      ],
    },
    unitsCount: {
      value: 2,
    },
  },
  groupingId: 'test-grouping-id',
  isLoading: false,
  pagination: {
    pageIndex: 0,
    pageSize: 25,
    onChangeItemsPerPage: jest.fn(),
    onChangePage: jest.fn(),
    itemsPerPageOptions: [10, 25, 50, 100],
  },
  renderChildComponent,
  selectedGroup: 'kibana.alert.rule.name',
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
    expect(getByTestId('unit-count').textContent).toBe('2 events');
    expect(getByTestId('group-count').textContent).toBe('2 groups');
    expect(getAllByTestId('grouping-accordion').length).toBe(2);
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
      createGroupFilter(testProps.selectedGroup, rule1Name)
    );
    fireEvent.click(group2);
    expect(renderChildComponent).toHaveBeenNthCalledWith(
      2,
      createGroupFilter(testProps.selectedGroup, rule2Name)
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
});
