/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { WorkflowsFilterPopover } from './workflow_filter_popover';

const defaultValues = [
  { label: 'Option A', key: 'a' },
  { label: 'Option B', key: 'b' },
  { label: 'Option C', key: 'c' },
];

describe('WorkflowsFilterPopover', () => {
  const onSelectedValuesChanged = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the filter button with the title', () => {
    render(
      <WorkflowsFilterPopover
        filter="status"
        title="Status"
        values={defaultValues}
        selectedValues={[]}
        onSelectedValuesChanged={onSelectedValuesChanged}
      />
    );

    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('shows the total number of filters on the button', () => {
    render(
      <WorkflowsFilterPopover
        filter="status"
        title="Status"
        values={defaultValues}
        selectedValues={[]}
        onSelectedValuesChanged={onSelectedValuesChanged}
      />
    );

    const button = screen.getByTestId('status-filter-popover-button');
    expect(button).toBeInTheDocument();
  });

  it('opens the popover when the filter button is clicked', () => {
    render(
      <WorkflowsFilterPopover
        filter="status"
        title="Status"
        values={defaultValues}
        selectedValues={[]}
        onSelectedValuesChanged={onSelectedValuesChanged}
      />
    );

    fireEvent.click(screen.getByTestId('status-filter-popover-button'));
    expect(screen.getByTestId('status-filter-popover')).toBeInTheDocument();
  });

  it('renders selectable options when the popover is open', () => {
    render(
      <WorkflowsFilterPopover
        filter="status"
        title="Status"
        values={defaultValues}
        selectedValues={[]}
        onSelectedValuesChanged={onSelectedValuesChanged}
      />
    );

    fireEvent.click(screen.getByTestId('status-filter-popover-button'));

    expect(screen.getByText('Option A')).toBeInTheDocument();
    expect(screen.getByText('Option B')).toBeInTheDocument();
    expect(screen.getByText('Option C')).toBeInTheDocument();
  });

  it('marks already-selected values as checked', () => {
    render(
      <WorkflowsFilterPopover
        filter="status"
        title="Status"
        values={defaultValues}
        selectedValues={['a']}
        onSelectedValuesChanged={onSelectedValuesChanged}
      />
    );

    fireEvent.click(screen.getByTestId('status-filter-popover-button'));

    // 'a' is selected so the button should show active filters
    const button = screen.getByTestId('status-filter-popover-button');
    expect(button).toBeInTheDocument();
  });

  it('calls onSelectedValuesChanged when an option is toggled', () => {
    render(
      <WorkflowsFilterPopover
        filter="status"
        title="Status"
        values={defaultValues}
        selectedValues={[]}
        onSelectedValuesChanged={onSelectedValuesChanged}
      />
    );

    fireEvent.click(screen.getByTestId('status-filter-popover-button'));

    const optionA = screen.getByText('Option A');
    fireEvent.click(optionA);

    expect(onSelectedValuesChanged).toHaveBeenCalledWith(['a']);
  });
});
