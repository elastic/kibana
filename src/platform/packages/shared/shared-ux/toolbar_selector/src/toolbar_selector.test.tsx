/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { SelectableEntry } from './toolbar_selector';
import { ToolbarSelector } from './toolbar_selector';

const options: SelectableEntry[] = [
  { label: 'Option 1', value: '1' },
  { label: 'Option 2', value: '2' },
  { label: 'Option 3', value: '3' },
];

describe('ToolbarSelector', () => {
  it('renders button label', () => {
    render(
      <ToolbarSelector
        data-test-subj="toolbarSelectorTest"
        buttonLabel="Choose"
        options={options}
        searchable={false}
        singleSelection={true}
      />
    );
    expect(screen.getByText('Choose')).toBeInTheDocument();
  });

  it('opens popover and shows options', async () => {
    const user = userEvent.setup();
    render(
      <ToolbarSelector
        data-test-subj="toolbarSelectorTest"
        buttonLabel="Select"
        options={options}
        searchable={false}
        singleSelection={true}
      />
    );
    await user.click(screen.getByTestId('toolbarSelectorTestButton'));
    expect(screen.getByText('Option 1')).toBeInTheDocument();
    expect(screen.getByText('Option 2')).toBeInTheDocument();
    expect(screen.getByText('Option 3')).toBeInTheDocument();
  });

  it('calls onChange for single selection', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(
      <ToolbarSelector
        data-test-subj="toolbarSelectorTest"
        buttonLabel="Select"
        options={options}
        searchable={false}
        singleSelection={true}
        onChange={onChange}
      />
    );
    await user.click(screen.getByTestId('toolbarSelectorTestButton'));
    fireEvent.click(screen.getByText('Option 2'));
    expect(onChange).toHaveBeenCalledWith({ label: 'Option 2', value: '2', checked: 'on' });
  });

  it('calls onChange for multi selection', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    const multiOptions: SelectableEntry[] = [
      { label: 'A', value: 'a' },
      { label: 'B', value: 'b' },
    ];
    render(
      <ToolbarSelector
        data-test-subj="toolbarSelectorMultiTest"
        buttonLabel="Multi"
        options={multiOptions}
        searchable={false}
        singleSelection={false}
        onChange={onChange}
      />
    );
    await user.click(screen.getByTestId('toolbarSelectorMultiTestButton'));
    fireEvent.click(screen.getByText('A'));
    fireEvent.click(screen.getByText('B'));

    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange).toHaveBeenNthCalledWith(1, [{ label: 'A', value: 'a', checked: 'on' }]);
    expect(onChange).toHaveBeenNthCalledWith(2, [{ label: 'B', value: 'b', checked: 'on' }]);
  });

  it('renders with disabled state', () => {
    render(
      <ToolbarSelector
        data-test-subj="toolbarSelectorDisabled"
        buttonLabel="Disabled"
        options={options}
        searchable={false}
        singleSelection={true}
        disabled={true}
      />
    );
    expect(screen.getByTestId('toolbarSelectorDisabledButton')).toBeDisabled();
  });

  it('renders with searchable enabled', async () => {
    const user = userEvent.setup();
    render(
      <ToolbarSelector
        data-test-subj="toolbarSelectorSearch"
        buttonLabel="Search"
        options={options}
        searchable={true}
        singleSelection={true}
      />
    );
    await user.click(screen.getByTestId('toolbarSelectorSearchButton'));
    expect(screen.getByTestId('toolbarSelectorSearchSelectorSearch')).toBeInTheDocument();
  });

  it('renders with searchable enabled and multi selection and preserves previously selected options', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();

    // Start with pre-selected options to test preservation
    const optionsWithPreselected: SelectableEntry[] = [
      { label: 'A', value: 'a', checked: 'on' },
      { label: 'B', value: 'b', checked: 'on' },
      { label: 'C', value: 'c' },
    ];

    render(
      <ToolbarSelector
        data-test-subj="toolbarSelectorSearchBasic"
        buttonLabel="Search Test"
        options={optionsWithPreselected}
        searchable={true}
        singleSelection={false}
        onChange={onChange}
        optionMatcher={({ option, normalizedSearchValue }) =>
          option.label.toLowerCase().includes(normalizedSearchValue.toLowerCase())
        }
      />
    );

    await user.click(screen.getByTestId('toolbarSelectorSearchBasicButton'));

    // Verify all options are initially visible
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();

    // Search for "C" which should only show C - use fireEvent for search input (EUI compatibility)
    const searchInput = screen.getByTestId('toolbarSelectorSearchBasicSelectorSearch');
    await user.type(searchInput, 'C');

    await waitFor(() => {
      expect(screen.getByText('C')).toBeInTheDocument();
      expect(screen.queryByText('A')).not.toBeInTheDocument();
      expect(screen.queryByText('B')).not.toBeInTheDocument();
    });

    // Select C using fireEvent for EUI selectable compatibility
    fireEvent.click(screen.getByText('C'));

    // The onChange should preserve A and B (hidden but selected) + add C
    expect(onChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        { label: 'C', value: 'c', checked: 'on' },
        { label: 'A', value: 'a', checked: 'on' },
        { label: 'B', value: 'b', checked: 'on' },
      ])
    );
  });

  it('renders with optional props: popoverTitle, popoverContentBelowSearch, hasArrow', async () => {
    const user = userEvent.setup();
    render(
      <ToolbarSelector
        data-test-subj="toolbarSelectorOptionalProps"
        buttonLabel="Optional"
        options={options}
        searchable={true}
        singleSelection={true}
        popoverTitle="My Popover Title"
        popoverContentBelowSearch={<span>Maximum selection limit reached</span>}
        hasArrow={false}
      />
    );
    await user.click(screen.getByTestId('toolbarSelectorOptionalPropsButton'));
    expect(screen.getByText('Maximum selection limit reached')).toBeInTheDocument();
    expect(screen.getAllByLabelText('My Popover Title')).toHaveLength(3);
  });
});
