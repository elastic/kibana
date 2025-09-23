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
import { render, fireEvent, waitFor } from '@testing-library/react';
import type { SelectableEntry } from './toolbar_selector';
import { ToolbarSelector } from './toolbar_selector';

const options: SelectableEntry[] = [
  { label: 'Option 1', value: '1' },
  { label: 'Option 2', value: '2' },
  { label: 'Option 3', value: '3' },
];

describe('ToolbarSelector', () => {
  it('renders button label', () => {
    const { getByText } = render(
      <ToolbarSelector
        data-test-subj="toolbarSelectorTest"
        buttonLabel="Choose"
        options={options}
        searchable={false}
        singleSelection={true}
      />
    );
    expect(getByText('Choose')).toBeInTheDocument();
  });

  it('opens popover and shows options', () => {
    const { getByTestId, getByText } = render(
      <ToolbarSelector
        data-test-subj="toolbarSelectorTest"
        buttonLabel="Select"
        options={options}
        searchable={false}
        singleSelection={true}
      />
    );
    fireEvent.click(getByTestId('toolbarSelectorTestButton'));
    expect(getByText('Option 1')).toBeInTheDocument();
    expect(getByText('Option 2')).toBeInTheDocument();
    expect(getByText('Option 3')).toBeInTheDocument();
  });

  it('calls onChange for single selection', () => {
    const onChange = jest.fn();
    const { getByTestId, getByText } = render(
      <ToolbarSelector
        data-test-subj="toolbarSelectorTest"
        buttonLabel="Select"
        options={options}
        searchable={false}
        singleSelection={true}
        onChange={onChange}
      />
    );
    fireEvent.click(getByTestId('toolbarSelectorTestButton'));
    fireEvent.click(getByText('Option 2'));
    expect(onChange).toHaveBeenCalledWith({ label: 'Option 2', value: '2', checked: 'on' });
  });

  it('calls onChange for multi selection', () => {
    const onChange = jest.fn();
    const multiOptions: SelectableEntry[] = [
      { label: 'A', value: 'a' },
      { label: 'B', value: 'b' },
    ];
    const { getByTestId, getByText } = render(
      <ToolbarSelector
        data-test-subj="toolbarSelectorMultiTest"
        buttonLabel="Multi"
        options={multiOptions}
        searchable={false}
        singleSelection={false}
        onChange={onChange}
      />
    );
    fireEvent.click(getByTestId('toolbarSelectorMultiTestButton'));
    fireEvent.click(getByText('A'));
    fireEvent.click(getByText('B'));

    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange).toHaveBeenNthCalledWith(1, [{ label: 'A', value: 'a', checked: 'on' }]);
    expect(onChange).toHaveBeenNthCalledWith(2, [{ label: 'B', value: 'b', checked: 'on' }]);
  });

  it('renders with disabled state', () => {
    const { getByTestId } = render(
      <ToolbarSelector
        data-test-subj="toolbarSelectorDisabled"
        buttonLabel="Disabled"
        options={options}
        searchable={false}
        singleSelection={true}
        disabled={true}
      />
    );
    expect(getByTestId('toolbarSelectorDisabledButton')).toBeDisabled();
  });

  it('renders with searchable enabled', () => {
    const { getByTestId } = render(
      <ToolbarSelector
        data-test-subj="toolbarSelectorSearch"
        buttonLabel="Search"
        options={options}
        searchable={true}
        singleSelection={true}
      />
    );
    fireEvent.click(getByTestId('toolbarSelectorSearchButton'));
    expect(getByTestId('toolbarSelectorSearchSelectorSearch')).toBeInTheDocument();
  });

  it('renders with searchable enabled and multi selection and preserves previously selected options', async () => {
    const onChange = jest.fn();

    // Start with pre-selected options to test preservation
    const optionsWithPreselected: SelectableEntry[] = [
      { label: 'A', value: 'a', checked: 'on' },
      { label: 'B', value: 'b', checked: 'on' },
      { label: 'C', value: 'c' },
    ];

    const { getByTestId, getByText, queryByText } = render(
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

    // Open the selector
    fireEvent.click(getByTestId('toolbarSelectorSearchBasicButton'));

    // Verify all options are initially visible
    expect(getByText('A')).toBeInTheDocument();
    expect(getByText('B')).toBeInTheDocument();
    expect(getByText('C')).toBeInTheDocument();

    // Search for "C" which should only show C
    const searchInput = getByTestId('toolbarSelectorSearchBasicSelectorSearch');
    fireEvent.change(searchInput, { target: { value: 'C' } });

    // Wait for debounced search
    await waitFor(
      () => {
        // C should be visible
        expect(getByText('C')).toBeInTheDocument();
        // A and B should be hidden
        expect(queryByText('A')).not.toBeInTheDocument();
        expect(queryByText('B')).not.toBeInTheDocument();
      },
      { timeout: 500 }
    );

    // Select C
    fireEvent.click(getByText('C'));

    // The onChange should preserve A and B (hidden but selected) + add C
    expect(onChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        { label: 'C', value: 'c', checked: 'on' },
        { label: 'A', value: 'a', checked: 'on' },
        { label: 'B', value: 'b', checked: 'on' },
      ])
    );
  });

  it('renders with optional props: popoverTitle, popoverContentBelowSearch, hasArrow', () => {
    const { getByTestId, getAllByLabelText, getByText } = render(
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
    fireEvent.click(getByTestId('toolbarSelectorOptionalPropsButton'));
    expect(getByText('Maximum selection limit reached')).toBeInTheDocument();
    expect(getAllByLabelText('My Popover Title')).toHaveLength(3);
  });
});
