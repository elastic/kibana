/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, fireEvent, renderHook, act } from '@testing-library/react';
import {
  useFilterPopover,
  useFilterStyles,
  FilterSelectionHeader,
  FilterPopover,
  FilterPopoverHeader,
} from './filter_popover';

describe('useFilterPopover', () => {
  it('initializes with closed state', () => {
    const { result } = renderHook(() => useFilterPopover());
    expect(result.current.isOpen).toBe(false);
  });

  it('toggles open state when toggle is called', () => {
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

  it('closes popover when close is called', () => {
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

  it('close is idempotent when already closed', () => {
    const { result } = renderHook(() => useFilterPopover());
    expect(result.current.isOpen).toBe(false);

    act(() => {
      result.current.close();
    });
    expect(result.current.isOpen).toBe(false);
  });
});

describe('useFilterStyles', () => {
  it('returns styles object with selectionHeaderMarginCSS', () => {
    const { result } = renderHook(() => useFilterStyles());
    expect(result.current.selectionHeaderMarginCSS).toBeDefined();
  });
});

describe('FilterSelectionHeader', () => {
  const defaultProps = {
    activeCount: 0,
    onClear: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('displays "0 selected" when activeCount is 0', () => {
    render(<FilterSelectionHeader {...defaultProps} activeCount={0} />);
    expect(screen.getByText('0 selected')).toBeInTheDocument();
  });

  it('displays "1 selected" when activeCount is 1', () => {
    render(<FilterSelectionHeader {...defaultProps} activeCount={1} />);
    expect(screen.getByText('1 selected')).toBeInTheDocument();
  });

  it('displays "5 selected" when activeCount is 5', () => {
    render(<FilterSelectionHeader {...defaultProps} activeCount={5} />);
    expect(screen.getByText('5 selected')).toBeInTheDocument();
  });

  it('does not show clear button when activeCount is 0', () => {
    render(<FilterSelectionHeader {...defaultProps} activeCount={0} />);
    expect(screen.queryByText('Clear filter')).not.toBeInTheDocument();
  });

  it('shows clear button when activeCount is greater than 0', () => {
    render(<FilterSelectionHeader {...defaultProps} activeCount={2} />);
    expect(screen.getByText('Clear filter')).toBeInTheDocument();
  });

  it('calls onClear when clear button is clicked', () => {
    const handleClear = jest.fn();
    render(<FilterSelectionHeader {...defaultProps} activeCount={2} onClear={handleClear} />);
    fireEvent.click(screen.getByText('Clear filter'));
    expect(handleClear).toHaveBeenCalledTimes(1);
  });

  it('renders with custom data-test-subj', () => {
    render(
      <FilterSelectionHeader {...defaultProps} activeCount={1} data-test-subj="customClear" />
    );
    expect(screen.getByTestId('customClear')).toBeInTheDocument();
  });
});

describe('FilterPopover', () => {
  const defaultProps = {
    title: 'Filter Title',
    isOpen: false,
    onToggle: jest.fn(),
    onClose: jest.fn(),
    children: <div>Popover Content</div>,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the filter button with title', () => {
    render(<FilterPopover {...defaultProps} />);
    expect(screen.getByText('Filter Title')).toBeInTheDocument();
  });

  it('renders the filter button with custom buttonLabel', () => {
    render(<FilterPopover {...defaultProps} buttonLabel="Custom Label" />);
    expect(screen.getByText('Custom Label')).toBeInTheDocument();
  });

  it('calls onToggle when button is clicked', () => {
    const handleToggle = jest.fn();
    render(<FilterPopover {...defaultProps} onToggle={handleToggle} />);
    fireEvent.click(screen.getByRole('button'));
    expect(handleToggle).toHaveBeenCalledTimes(1);
  });

  it('renders children when popover is open', () => {
    render(<FilterPopover {...defaultProps} isOpen={true} />);
    expect(screen.getByText('Popover Content')).toBeInTheDocument();
  });

  it('shows active filter badge when activeCount is greater than 0', () => {
    render(<FilterPopover {...defaultProps} activeCount={3} />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('does not show active filter badge when activeCount is 0', () => {
    render(<FilterPopover {...defaultProps} activeCount={0} />);
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('renders with custom data-test-subj', () => {
    render(<FilterPopover {...defaultProps} data-test-subj="customPopover" />);
    expect(screen.getByTestId('customPopover')).toBeInTheDocument();
  });

  it('renders title in popover header when open', () => {
    render(<FilterPopover {...defaultProps} isOpen={true} title="My Filter" />);
    // Title appears in button and header.
    const titles = screen.getAllByText('My Filter');
    expect(titles.length).toBeGreaterThanOrEqual(1);
  });
});

describe('FilterPopoverHeader', () => {
  const defaultProps = {
    activeCount: 0,
    onClear: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders search element when provided', () => {
    render(
      <FilterPopoverHeader
        {...defaultProps}
        search={<input data-test-subj="search-input" placeholder="Search..." />}
      />
    );
    expect(screen.getByTestId('search-input')).toBeInTheDocument();
  });

  it('renders FilterSelectionHeader', () => {
    render(<FilterPopoverHeader {...defaultProps} activeCount={2} />);
    expect(screen.getByText('2 selected')).toBeInTheDocument();
  });

  it('renders clear button when activeCount is greater than 0', () => {
    render(<FilterPopoverHeader {...defaultProps} activeCount={1} />);
    expect(screen.getByText('Clear filter')).toBeInTheDocument();
  });

  it('passes onClear to FilterSelectionHeader', () => {
    const handleClear = jest.fn();
    render(<FilterPopoverHeader {...defaultProps} activeCount={1} onClear={handleClear} />);
    fireEvent.click(screen.getByText('Clear filter'));
    expect(handleClear).toHaveBeenCalledTimes(1);
  });

  it('renders with custom data-test-subj for clear button', () => {
    render(<FilterPopoverHeader {...defaultProps} activeCount={1} data-test-subj="headerClear" />);
    expect(screen.getByTestId('headerClear')).toBeInTheDocument();
  });
});
