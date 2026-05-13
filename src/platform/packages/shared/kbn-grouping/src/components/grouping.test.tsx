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
import type { GroupingProps } from './grouping';
import { Grouping } from './grouping';
import { createGroupFilter, getNullGroupFilter } from '../containers/query/helpers';
import { METRIC_TYPE } from '@kbn/analytics';
import { getTelemetryEvent } from '../telemetry/const';

import { mockGroupingProps, host1Name, host2Name } from './grouping.mock';
import type { SetRequired } from 'type-fest';
import { EuiContextMenu } from '@elastic/eui';

const renderChildComponent = jest.fn();
const takeActionItems = jest.fn(mockGroupingProps.takeActionItems);
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
      createGroupFilter(testProps.selectedGroup, [host1Name]),
      testProps.selectedGroup,
      expect.objectContaining({ key: [host1Name], selectedGroup: testProps.selectedGroup })
    );
    fireEvent.click(group2);
    expect(renderChildComponent).toHaveBeenNthCalledWith(
      2,
      createGroupFilter(testProps.selectedGroup, [host2Name]),
      testProps.selectedGroup,
      expect.objectContaining({ key: [host2Name], selectedGroup: testProps.selectedGroup })
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
    takeActionItems.mockReturnValue(
      <EuiContextMenu
        initialPanelId={0}
        panels={[
          {
            id: 0,
            items: [{ key: '1', name: '1' }],
          },
        ]}
      />
    );
    render(
      <I18nProvider>
        <Grouping {...testProps} />
      </I18nProvider>
    );
    expect(screen.getByTestId('null-group-icon')).toBeInTheDocument();

    const lastGroup = screen.getAllByTestId('grouping-accordion').at(-1);
    fireEvent.click(within(lastGroup!).getByTestId('take-action-button'));

    expect((takeActionItems.mock.lastCall as any[])?.[0]).toEqual(getNullGroupFilter('host.name'));
    expect((takeActionItems.mock.lastCall as any[])?.[1]).toEqual(2);
    expect((takeActionItems.mock.lastCall as any[])?.[2]).toMatchInlineSnapshot(`
      Object {
        "alertsCount": Object {
          "value": 11,
        },
        "doc_count": 11,
        "hostTags": Object {
          "buckets": Array [],
          "doc_count_error_upper_bound": 0,
          "sum_other_doc_count": 0,
        },
        "hostsCountAggregation": Object {
          "value": 11,
        },
        "isNullGroup": true,
        "key": Array [
          "-",
        ],
        "key_as_string": "-",
        "selectedGroup": "host.name",
        "severitiesSubAggregation": Object {
          "buckets": Array [
            Object {
              "doc_count": 11,
              "key": "low",
            },
          ],
          "doc_count_error_upper_bound": 0,
          "sum_other_doc_count": 0,
        },
        "usersCountAggregation": Object {
          "value": 11,
        },
      }
    `);

    fireEvent.click(within(lastGroup!).getByTestId('group-panel-toggle'));

    expect(renderChildComponent).toHaveBeenCalledWith(
      getNullGroupFilter('host.name'),
      testProps.selectedGroup,
      expect.objectContaining({
        key: ['-'],
        selectedGroup: testProps.selectedGroup,
        isNullGroup: true,
      })
    );
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

    it('calls custom groupsUnit callback with hasNullGroup = false and null group in current page', () => {
      const customGroupsUnit = jest.fn(
        (n, parentSelectedGroup, hasNullGroup) => `${n} custom units`
      );

      const customProps = {
        ...testProps,
        groupsUnit: customGroupsUnit,
        data: {
          ...testProps.data,
          nullGroupItems: {
            ...testProps.data.nullGroupItems,
            doc_count: 0,
          },
        },
      };

      render(
        <I18nProvider>
          <Grouping {...customProps} />
        </I18nProvider>
      );

      expect(customGroupsUnit).toHaveBeenCalledWith(3, testProps.selectedGroup, true);
      expect(screen.getByTestId('group-count').textContent).toBe('3 custom units');
    });
  });

  it('calls custom groupsUnit callback with hasNullGroup = true and no null group in current page', () => {
    const customGroupsUnit = jest.fn((n, parentSelectedGroup, hasNullGroup) => `${n} custom units`);

    const customProps = {
      ...testProps,
      groupsUnit: customGroupsUnit,
      data: {
        ...testProps.data,
        groupByFields: {
          ...testProps.data.groupByFields,
          buckets: testProps?.data?.groupByFields?.buckets?.map(
            (bucket, index) => (index === 2 ? { ...bucket, isNullGroup: undefined } : bucket) as any
          ),
        },
      },
    };

    render(
      <I18nProvider>
        <Grouping {...customProps} />
      </I18nProvider>
    );

    expect(customGroupsUnit).toHaveBeenCalledWith(3, testProps.selectedGroup, true);
    expect(screen.getByTestId('group-count').textContent).toBe('3 custom units');
  });

  describe('additionalToolbarControls', () => {
    it('renders additional toolbar controls when provided', () => {
      const control1 = <button data-test-subj="custom-control-1">Control 1</button>;
      const control2 = <button data-test-subj="custom-control-2">Control 2</button>;

      const propsWithControls = {
        ...testProps,
        additionalToolbarControls: [control1, control2],
      };

      render(
        <I18nProvider>
          <Grouping {...propsWithControls} />
        </I18nProvider>
      );

      expect(screen.getByTestId('custom-control-1')).toBeInTheDocument();
      expect(screen.getByTestId('custom-control-2')).toBeInTheDocument();
    });

    it('renders additional controls with group selector', () => {
      const customControl = <button data-test-subj="inspect-button">Inspect</button>;
      const groupSelector = <div data-test-subj="group-selector">Group Selector</div>;

      const propsWithControls = {
        ...testProps,
        additionalToolbarControls: [customControl],
        groupSelector,
      };

      render(
        <I18nProvider>
          <Grouping {...propsWithControls} />
        </I18nProvider>
      );

      expect(screen.getByTestId('inspect-button')).toBeInTheDocument();
      expect(screen.getByTestId('group-selector')).toBeInTheDocument();
    });

    it('renders multiple additional toolbar controls in the correct order', () => {
      const control1 = <div data-test-subj="control-1">First Control</div>;
      const control2 = <div data-test-subj="control-2">Second Control</div>;
      const control3 = <div data-test-subj="control-3">Third Control</div>;

      const propsWithControls = {
        ...testProps,
        additionalToolbarControls: [control1, control2, control3],
      };

      render(
        <I18nProvider>
          <Grouping {...propsWithControls} />
        </I18nProvider>
      );

      const controls = screen.getAllByTestId(/control-/);
      expect(controls).toHaveLength(3);
      expect(controls[0]).toHaveAttribute('data-test-subj', 'control-1');
      expect(controls[1]).toHaveAttribute('data-test-subj', 'control-2');
      expect(controls[2]).toHaveAttribute('data-test-subj', 'control-3');
    });

    it('does not render additional toolbar controls at nested grouping levels', () => {
      const customControl = <button data-test-subj="inspect-button">Inspect</button>;

      const propsWithControls = {
        ...testProps,
        additionalToolbarControls: [customControl],
        groupingLevel: 1,
      };

      render(
        <I18nProvider>
          <Grouping {...propsWithControls} />
        </I18nProvider>
      );

      // At grouping level > 0, the entire toolbar should not be rendered
      expect(screen.queryByTestId('grouping-table')).not.toBeInTheDocument();
      expect(screen.queryByTestId('inspect-button')).not.toBeInTheDocument();
    });

    it('handles empty additionalToolbarControls array', () => {
      const propsWithControls = {
        ...testProps,
        additionalToolbarControls: [],
      };

      render(
        <I18nProvider>
          <Grouping {...propsWithControls} />
        </I18nProvider>
      );

      // Should render normally without errors
      expect(screen.getByTestId('grouping-table')).toBeInTheDocument();
      expect(screen.getByTestId('unit-count')).toBeInTheDocument();
    });
  });

  describe('emptyGroupingComponent', () => {
    const emptyData = {
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

    it('renders default EmptyGroupingComponent when emptyGroupingComponent is not provided', () => {
      render(
        <I18nProvider>
          <Grouping {...testProps} data={emptyData} />
        </I18nProvider>
      );

      expect(screen.getByTestId('empty-results-panel')).toBeInTheDocument();
    });

    it('renders custom emptyGroupingComponent when provided', () => {
      const CustomEmptyComponent = () => (
        <div data-test-subj="custom-empty-component">Custom Empty State</div>
      );

      const propsWithCustomEmpty = {
        ...testProps,
        data: emptyData,
        emptyGroupingComponent: <CustomEmptyComponent />,
      };

      render(
        <I18nProvider>
          <Grouping {...propsWithCustomEmpty} />
        </I18nProvider>
      );

      expect(screen.getByTestId('custom-empty-component')).toBeInTheDocument();
      expect(screen.getByText('Custom Empty State')).toBeInTheDocument();
      expect(screen.queryByTestId('empty-results-panel')).not.toBeInTheDocument();
    });

    it('does not render emptyGroupingComponent when groupsCount > 0', () => {
      const CustomEmptyComponent = () => (
        <div data-test-subj="custom-empty-component">Custom Empty State</div>
      );

      const propsWithCustomEmpty = {
        ...testProps,
        emptyGroupingComponent: <CustomEmptyComponent />,
      };

      render(
        <I18nProvider>
          <Grouping {...propsWithCustomEmpty} />
        </I18nProvider>
      );

      expect(screen.queryByTestId('custom-empty-component')).not.toBeInTheDocument();
      expect(screen.queryByTestId('empty-results-panel')).not.toBeInTheDocument();
      expect(screen.getAllByTestId('grouping-accordion').length).toBe(3);
    });

    it('does not render emptyGroupingComponent while loading', () => {
      const CustomEmptyComponent = () => (
        <div data-test-subj="custom-empty-component">Custom Empty State</div>
      );

      const propsWithCustomEmpty = {
        ...testProps,
        data: emptyData,
        emptyGroupingComponent: <CustomEmptyComponent />,
        isLoading: true,
      };

      render(
        <I18nProvider>
          <Grouping {...propsWithCustomEmpty} />
        </I18nProvider>
      );

      expect(screen.queryByTestId('custom-empty-component')).not.toBeInTheDocument();
      expect(screen.queryByTestId('empty-results-panel')).not.toBeInTheDocument();
      expect(screen.getByTestId('is-loading-grouping-table')).toBeInTheDocument();
    });
  });
});
