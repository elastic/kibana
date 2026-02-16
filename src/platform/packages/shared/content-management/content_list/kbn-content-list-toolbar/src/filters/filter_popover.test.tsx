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
import { renderHook, act } from '@testing-library/react';
import { FilterPopover, useFilterPopover } from './filter_popover';

describe('useFilterPopover', () => {
  it('initializes with `isOpen` as false', () => {
    const { result } = renderHook(() => useFilterPopover());

    expect(result.current.isOpen).toBe(false);
  });

  it('toggles `isOpen` state', () => {
    const { result } = renderHook(() => useFilterPopover());

    act(() => {
      result.current.toggle();
    });
    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.toggle();
    });
    expect(result.current.isOpen).toBe(false);
  });

  it('closes the popover', () => {
    const { result } = renderHook(() => useFilterPopover());

    act(() => {
      result.current.toggle();
    });
    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.close();
    });
    expect(result.current.isOpen).toBe(false);
  });

  it('provides stable function references', () => {
    const { result, rerender } = renderHook(() => useFilterPopover());

    const firstToggle = result.current.toggle;
    const firstClose = result.current.close;
    rerender();

    expect(result.current.toggle).toBe(firstToggle);
    expect(result.current.close).toBe(firstClose);
  });
});

describe('FilterPopover', () => {
  const defaultProps = {
    title: 'Sort by',
    isOpen: false,
    onToggle: jest.fn(),
    onClose: jest.fn(),
    children: <div>Popover content</div>,
  };

  it('renders the filter button with the title as label', () => {
    render(<FilterPopover {...defaultProps} />);

    expect(screen.getByRole('button', { name: /sort by/i })).toBeInTheDocument();
  });

  it('renders a custom `buttonLabel` when provided', () => {
    render(<FilterPopover {...defaultProps} buttonLabel="A-Z" />);

    expect(screen.getByRole('button', { name: /a-z/i })).toBeInTheDocument();
  });

  it('renders the popover title when open', () => {
    render(<FilterPopover {...defaultProps} isOpen />);

    // Both the button label and popover title contain "Sort by".
    const matches = screen.getAllByText('Sort by');
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });

  it('renders children when open', () => {
    render(<FilterPopover {...defaultProps} isOpen />);

    expect(screen.getByText('Popover content')).toBeInTheDocument();
  });

  it('does not render children when closed', () => {
    render(<FilterPopover {...defaultProps} isOpen={false} />);

    expect(screen.queryByText('Popover content')).not.toBeInTheDocument();
  });

  it('calls `onToggle` when the button is clicked', () => {
    const onToggle = jest.fn();
    render(<FilterPopover {...defaultProps} onToggle={onToggle} />);

    fireEvent.click(screen.getByRole('button', { name: /sort by/i }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('applies the data-test-subj to the button', () => {
    render(<FilterPopover {...defaultProps} data-test-subj="my-filter-button" />);

    expect(screen.getByTestId('my-filter-button')).toBeInTheDocument();
  });

  it('shows active filter count when `activeCount` > 0', () => {
    render(<FilterPopover {...defaultProps} activeCount={3} />);

    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('does not show active filter badge when `activeCount` is 0', () => {
    render(<FilterPopover {...defaultProps} activeCount={0} />);

    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });
});
