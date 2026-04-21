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
import { FilterSelectionHeader } from './filter_selection_header';

describe('FilterSelectionHeader', () => {
  it('displays "0 selected" when `activeCount` is 0.', () => {
    render(<FilterSelectionHeader activeCount={0} onClear={jest.fn()} />);
    expect(screen.getByText('0 selected')).toBeInTheDocument();
  });

  it('displays "3 selected" when `activeCount` is 3.', () => {
    render(<FilterSelectionHeader activeCount={3} onClear={jest.fn()} />);
    expect(screen.getByText('3 selected')).toBeInTheDocument();
  });

  it('displays "1 selected" when `activeCount` is 1.', () => {
    render(<FilterSelectionHeader activeCount={1} onClear={jest.fn()} />);
    expect(screen.getByText('1 selected')).toBeInTheDocument();
  });

  it('does not show the clear button when `activeCount` is 0.', () => {
    render(<FilterSelectionHeader activeCount={0} onClear={jest.fn()} />);
    expect(screen.queryByText('Clear filter')).not.toBeInTheDocument();
  });

  it('shows the clear button when `activeCount` > 0.', () => {
    render(<FilterSelectionHeader activeCount={2} onClear={jest.fn()} />);
    expect(screen.getByText('Clear filter')).toBeInTheDocument();
  });

  it('calls `onClear` when the clear button is clicked.', () => {
    const onClear = jest.fn();
    render(<FilterSelectionHeader activeCount={1} onClear={onClear} />);
    fireEvent.click(screen.getByText('Clear filter'));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('applies `data-test-subj` to the clear button.', () => {
    render(
      <FilterSelectionHeader activeCount={1} onClear={jest.fn()} data-test-subj="my-clear-btn" />
    );
    expect(screen.getByTestId('my-clear-btn')).toBeInTheDocument();
  });
});
