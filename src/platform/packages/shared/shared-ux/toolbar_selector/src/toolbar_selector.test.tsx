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
import { render, fireEvent } from '@testing-library/react';
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

  it('renders with optional props: popoverTitle, popoverContentBelowSearch, hasArrow', () => {
    const { getByTestId, getAllByLabelText, getByText } = render(
      <ToolbarSelector
        data-test-subj="toolbarSelectorOptionalProps"
        buttonLabel="Optional"
        options={options}
        searchable={true}
        singleSelection={true}
        popoverTitle="My Popover Title"
        popoverContentBelowSearch={<span>Custom Section</span>}
        hasArrow={false}
      />
    );
    fireEvent.click(getByTestId('toolbarSelectorOptionalPropsButton'));
    expect(getByText('Custom Section')).toBeInTheDocument();
    expect(getAllByLabelText('My Popover Title')).toHaveLength(3);
  });
});
