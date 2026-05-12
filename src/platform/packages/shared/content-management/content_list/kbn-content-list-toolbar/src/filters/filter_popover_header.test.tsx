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
import { FilterPopoverHeader } from './filter_popover_header';

describe('FilterPopoverHeader', () => {
  it('renders a search element when provided.', () => {
    render(
      <FilterPopoverHeader
        search={<input data-test-subj="search-input" />}
        activeCount={0}
        onClear={jest.fn()}
      />
    );
    expect(screen.getByTestId('search-input')).toBeInTheDocument();
  });

  it('renders without a search element when not provided.', () => {
    const { container } = render(<FilterPopoverHeader activeCount={0} onClear={jest.fn()} />);
    expect(container.querySelector('input')).not.toBeInTheDocument();
  });

  it('displays the active selection count.', () => {
    render(<FilterPopoverHeader activeCount={5} onClear={jest.fn()} />);
    expect(screen.getByText('5 selected')).toBeInTheDocument();
  });

  it('shows the clear button when there are active selections.', () => {
    render(<FilterPopoverHeader activeCount={2} onClear={jest.fn()} />);
    expect(screen.getByText('Clear filter')).toBeInTheDocument();
  });

  it('calls `onClear` when the clear button is clicked.', () => {
    const onClear = jest.fn();
    render(<FilterPopoverHeader activeCount={1} onClear={onClear} />);
    fireEvent.click(screen.getByText('Clear filter'));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('hides the clear button when `activeCount` is 0.', () => {
    render(<FilterPopoverHeader activeCount={0} onClear={jest.fn()} />);
    expect(screen.queryByText('Clear filter')).not.toBeInTheDocument();
  });

  it('passes `data-test-subj` to the clear button.', () => {
    render(<FilterPopoverHeader activeCount={1} onClear={jest.fn()} data-test-subj="my-clear" />);
    expect(screen.getByTestId('my-clear')).toBeInTheDocument();
  });
});
