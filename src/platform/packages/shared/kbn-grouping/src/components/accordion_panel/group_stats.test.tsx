/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { GroupStats } from './group_stats';
import { EuiContextMenu } from '@elastic/eui';

const onTakeActionsOpen = jest.fn();
const testProps = {
  bucketKey: '9nk5mo2fby',
  groupFilter: [],
  groupNumber: 0,
  onTakeActionsOpen,
  stats: [
    {
      title: 'Severity',
      component: <p data-test-subj="customMetricStat" />,
    },
    { title: "IP's:", badge: { value: 1 } },
    { title: 'Rules:', badge: { value: 2 } },
    { title: 'Alerts:', badge: { value: 2, width: 50, color: '#a83632' } },
  ],
  getActionItems: () => (
    <EuiContextMenu
      initialPanelId={0}
      panels={[
        {
          id: 0,
          items: [
            { key: '1', 'data-test-subj': 'takeActionItem-1', name: '1' },
            { key: '2', 'data-test-subj': 'takeActionItem-2', name: '2' },
          ],
        },
      ]}
    />
  ),
};
describe('Group stats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders each stat item', () => {
    const { getByTestId, queryByTestId } = render(<GroupStats {...testProps} />);
    expect(getByTestId('group-stats')).toBeInTheDocument();
    testProps.stats.forEach(({ title: stat, component }) => {
      if (component != null) {
        expect(getByTestId(`customMetric-${stat}`)).toBeInTheDocument();
        expect(queryByTestId(`metric-${stat}`)).not.toBeInTheDocument();
      } else {
        expect(getByTestId(`metric-${stat}`)).toBeInTheDocument();
        expect(queryByTestId(`customMetric-${stat}`)).not.toBeInTheDocument();
      }
    });
  });

  it('when onTakeActionsOpen is defined, call onTakeActionsOpen on popover click', () => {
    const { getByTestId, queryByTestId } = render(<GroupStats {...testProps} />);
    fireEvent.click(getByTestId('take-action-button'));
    expect(onTakeActionsOpen).toHaveBeenCalled();
    ['takeActionItem-1', 'takeActionItem-2'].forEach((actionItem) => {
      expect(queryByTestId(actionItem)).not.toBeInTheDocument();
    });
  });

  it('when onTakeActionsOpen is undefined, render take actions dropdown on popover click', () => {
    const { getByTestId } = render(<GroupStats {...testProps} onTakeActionsOpen={undefined} />);
    fireEvent.click(getByTestId('take-action-button'));
    ['takeActionItem-1', 'takeActionItem-2'].forEach((actionItem) => {
      expect(getByTestId(actionItem)).toBeInTheDocument();
    });
  });

  it('shows the Take Actions menu when action items are provided', () => {
    const { queryByTestId } = render(
      <GroupStats
        {...testProps}
        getActionItems={() => (
          <EuiContextMenu
            initialPanelId={0}
            panels={[
              {
                id: 0,
                items: [{ name: 'test' }],
              },
            ]}
          />
        )}
      />
    );
    expect(queryByTestId('take-action-button')).toBeInTheDocument();
  });

  it('hides the Take Actions menu when no action item is provided', () => {
    const { queryByTestId } = render(<GroupStats {...testProps} getActionItems={undefined} />);
    expect(queryByTestId('take-action-button')).not.toBeInTheDocument();
  });
});

describe('Additional action buttons', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders additional action buttons when provided', () => {
    const additionalButtons = [
      <button key="button1" data-test-subj="additional-button-1">
        Button 1
      </button>,
      <button key="button2" data-test-subj="additional-button-2">
        Button 2
      </button>,
    ];
    const { getByTestId } = render(
      <GroupStats {...testProps} additionalActionButtons={additionalButtons} />
    );
    expect(getByTestId('additional-button-1')).toBeInTheDocument();
    expect(getByTestId('additional-button-2')).toBeInTheDocument();
  });

  it('renders additional buttons in correct order', () => {
    const additionalButtons = [
      <button key="button1" data-test-subj="additional-button-1">
        Button 1
      </button>,
    ];
    const { getByTestId } = render(
      <GroupStats {...testProps} additionalActionButtons={additionalButtons} />
    );

    const groupStats = getByTestId('group-stats');
    const children = Array.from(groupStats.children);

    // Find indices of key elements
    const statsIndex = children.findIndex((child) =>
      child.querySelector('[data-test-subj="metric-Alerts:"]')
    );
    const additionalButtonIndex = children.findIndex((child) =>
      child.querySelector('[data-test-subj="additional-button-1"]')
    );
    const takeActionIndex = children.findIndex((child) =>
      child.querySelector('[data-test-subj="take-action-button"]')
    );

    // Verify order: stats < additional buttons < take actions
    expect(statsIndex).toBeGreaterThanOrEqual(0);
    expect(additionalButtonIndex).toBeGreaterThan(statsIndex);
    expect(takeActionIndex).toBeGreaterThan(additionalButtonIndex);
  });

  it('renders separators correctly between stats, additional buttons, and take actions', () => {
    const additionalButtons = [
      <button key="button1" data-test-subj="additional-button-1">
        Button 1
      </button>,
    ];
    const { container } = render(
      <GroupStats {...testProps} additionalActionButtons={additionalButtons} />
    );

    // Find all separators (elements with role="separator")
    const separators = container.querySelectorAll('[role="separator"]');

    // With 4 stats + 1 additional button + 1 take action = 6 items, we should have 5 separators
    expect(separators.length).toBe(5);
  });

  it('handles empty array', () => {
    const { container } = render(<GroupStats {...testProps} additionalActionButtons={[]} />);

    // Check that there are no elements with data-test-subj prefix 'additional-action-button-'
    const additionalButtonElements = container.querySelectorAll(
      '[data-test-subj^="additional-action-button-"]'
    );
    expect(additionalButtonElements.length).toBe(0);

    // Verify existing functionality still works
    expect(container.querySelector('[data-test-subj="take-action-button"]')).toBeInTheDocument();
  });
});
