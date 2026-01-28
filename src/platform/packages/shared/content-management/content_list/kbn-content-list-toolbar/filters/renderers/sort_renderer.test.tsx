/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SortRenderer } from './sort_renderer';

// Mock the provider hooks.
const mockSetSort = jest.fn();

jest.mock('@kbn/content-list-provider', () => ({
  useContentListConfig: jest.fn(() => ({
    sorting: undefined,
    recentlyAccessed: undefined,
  })),
  useContentListSort: jest.fn(() => ({
    field: 'updatedAt',
    direction: 'desc',
    setSort: mockSetSort,
  })),
}));

const { useContentListConfig, useContentListSort } = jest.requireMock('@kbn/content-list-provider');

describe('SortRenderer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useContentListConfig.mockReturnValue({
      sorting: undefined,
      recentlyAccessed: undefined,
    });
    useContentListSort.mockReturnValue({
      field: 'updatedAt',
      direction: 'desc',
      setSort: mockSetSort,
    });
  });

  describe('rendering', () => {
    it('renders with default data-test-subj', () => {
      render(<SortRenderer />);
      expect(screen.getByTestId('contentListSortRenderer')).toBeInTheDocument();
    });

    it('renders with custom data-test-subj', () => {
      render(<SortRenderer data-test-subj="customSort" />);
      expect(screen.getByTestId('customSort')).toBeInTheDocument();
    });

    it('renders as a button', () => {
      render(<SortRenderer />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('default sort options', () => {
    it('opens popover when button is clicked', async () => {
      render(<SortRenderer />);
      fireEvent.click(screen.getByRole('button'));
      await waitFor(() => {
        expect(screen.getByText('Name A-Z')).toBeInTheDocument();
        expect(screen.getByText('Name Z-A')).toBeInTheDocument();
      });
    });

    it('shows date-related sort options', async () => {
      render(<SortRenderer />);
      fireEvent.click(screen.getByRole('button'));
      await waitFor(() => {
        expect(screen.getByText('Least recently updated')).toBeInTheDocument();
      });
    });
  });

  describe('custom sort options from config', () => {
    it('uses custom fields from config.sorting.fields', () => {
      useContentListConfig.mockReturnValue({
        sorting: {
          fields: [
            { field: 'name', name: 'Name' },
            { field: 'createdAt', name: 'Created date' },
          ],
        },
        recentlyAccessed: undefined,
      });
      useContentListSort.mockReturnValue({
        field: 'name',
        direction: 'asc',
        setSort: mockSetSort,
      });

      render(<SortRenderer />);
      // The button should be rendered with sort config.
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('uses custom options from config.sorting.options', () => {
      useContentListConfig.mockReturnValue({
        sorting: {
          options: [
            { label: 'Custom Option 1', field: 'custom1', direction: 'asc' },
            { label: 'Custom Option 2', field: 'custom2', direction: 'desc' },
          ],
        },
        recentlyAccessed: undefined,
      });
      useContentListSort.mockReturnValue({
        field: 'custom1',
        direction: 'asc',
        setSort: mockSetSort,
      });

      render(<SortRenderer />);
      // The button should be rendered with custom options.
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('recently accessed option', () => {
    it('shows recently viewed option when recentlyAccessed service has items', async () => {
      useContentListConfig.mockReturnValue({
        sorting: undefined,
        recentlyAccessed: {
          service: {
            get: jest.fn(() => [{ id: '1' }, { id: '2' }]),
          },
        },
      });

      render(<SortRenderer />);
      fireEvent.click(screen.getByRole('button'));
      await waitFor(() => {
        expect(screen.getByText('Recently viewed')).toBeInTheDocument();
      });
    });

    it('hides recently viewed option when recentlyAccessed service returns empty array', async () => {
      useContentListConfig.mockReturnValue({
        sorting: undefined,
        recentlyAccessed: {
          service: {
            get: jest.fn(() => []),
          },
        },
      });

      render(<SortRenderer />);
      fireEvent.click(screen.getByRole('button'));
      await waitFor(() => {
        expect(screen.queryByText('Recently viewed')).not.toBeInTheDocument();
      });
    });

    it('hides recently viewed option when recentlyAccessed service throws', async () => {
      useContentListConfig.mockReturnValue({
        sorting: undefined,
        recentlyAccessed: {
          service: {
            get: jest.fn(() => {
              throw new Error('Service error');
            }),
          },
        },
      });

      render(<SortRenderer />);
      fireEvent.click(screen.getByRole('button'));
      await waitFor(() => {
        expect(screen.queryByText('Recently viewed')).not.toBeInTheDocument();
      });
    });
  });

  describe('sort selection', () => {
    it('calls setSort when an option is selected', async () => {
      render(<SortRenderer />);
      fireEvent.click(screen.getByRole('button'));
      await waitFor(() => {
        fireEvent.click(screen.getByText('Name A-Z'));
      });
      expect(mockSetSort).toHaveBeenCalledWith('title', 'asc');
    });
  });
});
