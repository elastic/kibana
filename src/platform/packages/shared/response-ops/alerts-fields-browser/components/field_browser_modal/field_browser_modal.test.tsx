/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockBrowserFields } from '../../mock';
import type { FieldBrowserModalProps } from './field_browser_modal';
import { FieldBrowserModal } from './field_browser_modal';

const mockOnHide = jest.fn();
const mockOnToggleColumn = jest.fn();
const mockOnResetColumns = jest.fn();

const testProps: FieldBrowserModalProps = {
  columnIds: [],
  filteredBrowserFields: mockBrowserFields,
  searchInput: '',
  appliedFilterInput: '',
  isSearching: false,
  setSelectedCategoryIds: jest.fn(),
  onHide: mockOnHide,
  onResetColumns: mockOnResetColumns,
  onSearchInputChange: jest.fn(),
  onToggleColumn: mockOnToggleColumn,
  restoreFocusTo: React.createRef<HTMLButtonElement>(),
  selectedCategoryIds: [],
  filterSelectedEnabled: false,
  onFilterSelectedChange: jest.fn(),
};

const renderComponent = (props: Partial<FieldBrowserModalProps> = {}) =>
  render(<FieldBrowserModal {...{ ...testProps, ...props }} />);

describe('FieldBrowserModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders the Close button', () => {
    renderComponent();
    expect(screen.getByTestId('close')).toHaveTextContent('Close');
  });

  test('invokes onHide when Close button clicked', async () => {
    const user = userEvent.setup();
    renderComponent();

    const closeButtons = screen.getAllByTestId('close');
    await user.click(closeButtons[closeButtons.length - 1]);
    expect(mockOnHide).toHaveBeenCalled();
  });

  test('renders the Reset Fields button', () => {
    renderComponent();
    expect(screen.getByTestId('reset-fields')).toHaveTextContent('Reset Fields');
  });

  test('invokes onResetColumns callback when Reset Fields button clicked', async () => {
    const user = userEvent.setup();
    renderComponent({ columnIds: ['test'] });
    await user.click(screen.getByTestId('reset-fields'));
    expect(mockOnResetColumns).toHaveBeenCalled();
  });

  test('invokes onHide when Reset Fields button clicked', async () => {
    const user = userEvent.setup();
    renderComponent();
    await user.click(screen.getByTestId('reset-fields'));
    expect(mockOnHide).toHaveBeenCalled();
  });

  test('renders the search input', () => {
    renderComponent();
    expect(screen.getByTestId('field-search')).toBeInTheDocument();
  });

  test('renders the categories selector', () => {
    renderComponent();
    expect(screen.getByTestId('categories-selector')).toBeInTheDocument();
  });

  test('renders the fields table', () => {
    renderComponent();
    expect(screen.getByTestId('field-table')).toBeInTheDocument();
  });

  test('focuses the search input on mount', () => {
    renderComponent();
    expect(screen.getByTestId('field-search')).toHaveFocus();
  });

  test('invokes onSearchInputChange when user changes the search input', () => {
    const onSearchInputChange = jest.fn();
    const inputText = 'event.category';
    renderComponent({ onSearchInputChange });
    const searchField = screen.getByTestId('field-search') as HTMLInputElement;
    fireEvent.change(searchField, { target: { value: inputText } });
    expect(onSearchInputChange).toHaveBeenCalledWith(inputText);
  });

  test('renders the CreateFieldButton when provided', () => {
    const MyTestComponent = () => <div data-test-subj="my-test-component">test</div>;
    renderComponent({ options: { createFieldButton: MyTestComponent } });
    expect(screen.getByTestId('my-test-component')).toBeInTheDocument();
  });
});
