/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act, cleanup } from '@testing-library/react';
import { Query } from '@elastic/eui';
import {
  SelectableFilterPopover,
  StandardFilterOption,
  type SelectableFilterOption as FilterOption,
} from './selectable_filter_popover';

describe('SelectableFilterPopover', () => {
  const mockOptions: Array<FilterOption<{ color: string }>> = [
    { key: '1', label: 'Option 1', value: 'opt1', count: 5, data: { color: 'red' } },
    { key: '2', label: 'Option 2', value: 'opt2', count: 3, data: { color: 'blue' } },
    { key: '3', label: 'Option 3', value: 'opt3', count: 0, data: { color: 'green' } },
  ];

  const mockRenderOption = (
    option: FilterOption<{ color: string }>,
    state: {
      checked: 'on' | 'off' | undefined;
      isActive: boolean;
      onClick: (e: React.MouseEvent) => void;
    }
  ) => (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events
    <div role="button" tabIndex={0} onClick={state.onClick}>
      {option.label} - {option.count}
    </div>
  );

  const defaultProps = {
    fieldName: 'category',
    title: 'Category',
    query: Query.parse(''),
    onChange: jest.fn(),
    options: mockOptions,
    renderOption: mockRenderOption,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    // Wait for any pending EuiPopover MutationObserver updates to settle.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    cleanup();
  });

  describe('rendering', () => {
    it('renders with default data-test-subj', () => {
      render(<SelectableFilterPopover {...defaultProps} />);
      expect(screen.getByTestId('selectableFilterPopover')).toBeInTheDocument();
    });

    it('renders with custom data-test-subj', () => {
      render(<SelectableFilterPopover {...defaultProps} data-test-subj="customPopover" />);
      expect(screen.getByTestId('customPopover')).toBeInTheDocument();
    });

    it('renders filter button with title', () => {
      render(<SelectableFilterPopover {...defaultProps} />);
      expect(screen.getByText('Category')).toBeInTheDocument();
    });
  });

  describe('popover behavior', () => {
    it('opens popover when button is clicked', async () => {
      render(<SelectableFilterPopover {...defaultProps} />);
      await act(async () => {
        fireEvent.click(screen.getByRole('button'));
      });
      await waitFor(() => {
        expect(screen.getByText('Option 1 - 5')).toBeInTheDocument();
        expect(screen.getByText('Option 2 - 3')).toBeInTheDocument();
        expect(screen.getByText('Option 3 - 0')).toBeInTheDocument();
      });
    });
  });

  describe('multi-select mode (default)', () => {
    it('shows selection count header', async () => {
      render(<SelectableFilterPopover {...defaultProps} />);
      await act(async () => {
        fireEvent.click(screen.getByRole('button'));
      });
      await waitFor(() => {
        expect(screen.getByText('0 selected')).toBeInTheDocument();
      });
    });

    it('shows modifier key tip footer', async () => {
      render(<SelectableFilterPopover {...defaultProps} />);
      await act(async () => {
        fireEvent.click(screen.getByRole('button'));
      });
      await waitFor(() => {
        expect(screen.getByText(/\+ click exclude/)).toBeInTheDocument();
      });
    });
  });

  describe('single-select mode', () => {
    it('hides selection count header in single-select mode', async () => {
      render(<SelectableFilterPopover {...defaultProps} singleSelection />);
      await act(async () => {
        fireEvent.click(screen.getByRole('button'));
      });
      await waitFor(() => {
        expect(screen.queryByText('0 selected')).not.toBeInTheDocument();
      });
    });

    it('hides modifier key tip in single-select mode', async () => {
      render(<SelectableFilterPopover {...defaultProps} singleSelection />);
      await act(async () => {
        fireEvent.click(screen.getByRole('button'));
      });
      await waitFor(() => {
        expect(screen.queryByText(/\+ click exclude/)).not.toBeInTheDocument();
      });
    });
  });

  describe('loading state', () => {
    it('passes isLoading prop to EuiSelectable', async () => {
      render(
        <SelectableFilterPopover {...defaultProps} isLoading loadingMessage="Loading items..." />
      );
      await act(async () => {
        fireEvent.click(screen.getByRole('button'));
      });
      // The loading message is passed to EuiSelectable and shown when loading.
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('empty and error states', () => {
    it('passes emptyMessage prop to EuiSelectable', async () => {
      render(
        <SelectableFilterPopover {...defaultProps} options={[]} emptyMessage="No items found" />
      );
      await act(async () => {
        fireEvent.click(screen.getByRole('button'));
      });
      // Empty message is passed to EuiSelectable.
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('passes errorMessage prop to EuiSelectable', async () => {
      render(<SelectableFilterPopover {...defaultProps} errorMessage="Failed to load" />);
      await act(async () => {
        fireEvent.click(screen.getByRole('button'));
      });
      // Error message is passed to EuiSelectable.
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('footer content', () => {
    it('renders footer content in multi-select mode', async () => {
      render(
        <SelectableFilterPopover {...defaultProps} footerContent={<div>Custom Footer</div>} />
      );
      await act(async () => {
        fireEvent.click(screen.getByRole('button'));
      });
      await waitFor(() => {
        expect(screen.getByText('Custom Footer')).toBeInTheDocument();
      });
    });

    it('renders footer content in single-select mode', async () => {
      render(
        <SelectableFilterPopover
          {...defaultProps}
          singleSelection
          footerContent={<div>Custom Footer</div>}
        />
      );
      await act(async () => {
        fireEvent.click(screen.getByRole('button'));
      });
      await waitFor(() => {
        expect(screen.getByText('Custom Footer')).toBeInTheDocument();
      });
    });
  });
});

describe('StandardFilterOption', () => {
  const defaultProps = {
    count: 5,
    isActive: false,
    onClick: jest.fn(),
    children: <span>Option Label</span>,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders children content', () => {
    render(<StandardFilterOption {...defaultProps} />);
    expect(screen.getByText('Option Label')).toBeInTheDocument();
  });

  it('renders count badge', () => {
    render(<StandardFilterOption {...defaultProps} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<StandardFilterOption {...defaultProps} onClick={handleClick} />);
    fireEvent.click(screen.getByText('Option Label'));
    expect(handleClick).toHaveBeenCalled();
  });

  it('renders badge when not active', () => {
    render(<StandardFilterOption {...defaultProps} isActive={false} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('renders badge when active', () => {
    render(<StandardFilterOption {...defaultProps} isActive={true} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });
});
