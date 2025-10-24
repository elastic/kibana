/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { JSONDataView } from './json_data_view';

// Mock the child components
const mockJSONDataTable = jest.fn();
const mockJsonDataCode = jest.fn();

jest.mock('./json_data_table', () => ({
  JSONDataTable: (props: any) => {
    mockJSONDataTable(props);
    return <div data-test-subj="mocked-json-data-table">{'Table View'}</div>;
  },
}));

jest.mock('./json_data_code', () => ({
  JsonDataCode: (props: any) => {
    mockJsonDataCode(props);
    return <div data-test-subj="mocked-json-data-code">{'JSON View'}</div>;
  },
}));

// Mock useLocalStorage hook
const mockSetStoredSearchTerm = jest.fn();
const mockStoredSearchTerm = jest.fn();

jest.mock('react-use/lib/useLocalStorage', () => ({
  __esModule: true,
  default: jest.fn(() => [mockStoredSearchTerm(), mockSetStoredSearchTerm]),
}));

describe('JSONDataView', () => {
  const mockData = {
    name: 'test',
    value: 123,
    nested: {
      field: 'abc',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockStoredSearchTerm.mockReturnValue('');
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('rendering', () => {
    it('should render the component with default props', () => {
      render(<JSONDataView data={mockData} />);

      expect(screen.getByTestId('jsonDataTable')).toBeInTheDocument();
      expect(screen.getByTestId('mocked-json-data-table')).toBeInTheDocument();
    });

    it('should render with custom title and fieldPathActionsPrefix', () => {
      render(
        <JSONDataView data={mockData} title="Custom Title" fieldPathActionsPrefix="custom.prefix" />
      );

      expect(mockJSONDataTable).toHaveBeenCalledWith(
        expect.objectContaining({
          data: mockData,
          title: 'Custom Title',
          fieldPathActionsPrefix: 'custom.prefix',
        })
      );
    });

    it('should render in table view mode by default', () => {
      render(<JSONDataView data={mockData} />);

      expect(screen.getByTestId('mocked-json-data-table')).toBeInTheDocument();
      expect(screen.queryByTestId('mocked-json-data-code')).not.toBeInTheDocument();
    });
  });

  describe('view mode toggle', () => {
    it('should switch to JSON view when JSON button is clicked', () => {
      render(<JSONDataView data={mockData} />);

      // Initially in table view
      expect(screen.getByTestId('mocked-json-data-table')).toBeInTheDocument();

      // Find and click the JSON view button
      const jsonButton = screen.getByTestId('json');

      fireEvent.click(jsonButton);

      // Should now show JSON view
      expect(screen.queryByTestId('mocked-json-data-table')).not.toBeInTheDocument();
      expect(screen.getByTestId('mocked-json-data-code')).toBeInTheDocument();
    });

    it('should switch back to table view when table button is clicked', () => {
      render(<JSONDataView data={mockData} />);

      // Switch to JSON view
      const jsonButton = screen.getByTestId('json');
      fireEvent.click(jsonButton);

      // Switch back to table view
      const tableButton = screen.getByTestId('table');
      fireEvent.click(tableButton);

      // Should show table view again
      expect(screen.getByTestId('mocked-json-data-table')).toBeInTheDocument();
      expect(screen.queryByTestId('mocked-json-data-code')).not.toBeInTheDocument();
    });

    it('should pass data to JsonDataCode when in JSON view', () => {
      render(<JSONDataView data={mockData} />);

      // Switch to JSON view
      const jsonButton = screen.getByTestId('json');
      fireEvent.click(jsonButton);

      expect(mockJsonDataCode).toHaveBeenCalledWith({ json: mockData });
    });
  });

  describe('search functionality', () => {
    it('should display search field in table view', () => {
      render(<JSONDataView data={mockData} />);

      const searchInput = screen.getByPlaceholderText('Filter by field, value');
      expect(searchInput).toBeInTheDocument();
    });

    it('should not display search field in JSON view', () => {
      render(<JSONDataView data={mockData} />);

      // Switch to JSON view
      const jsonButton = screen.getByTestId('json');
      fireEvent.click(jsonButton);

      const searchInput = screen.queryByPlaceholderText('Filter by field, value');
      expect(searchInput).not.toBeInTheDocument();
    });

    it('should update search term when user types in search field', async () => {
      const user = userEvent.setup({ delay: null });
      render(<JSONDataView data={mockData} />);

      const searchInput = screen.getByPlaceholderText('Filter by field, value');
      await user.type(searchInput, 'test query');

      expect(searchInput).toHaveValue('test query');
    });

    it('should pass search term to JSONDataTable', async () => {
      const user = userEvent.setup({ delay: null });
      render(<JSONDataView data={mockData} />);

      const searchInput = screen.getByPlaceholderText('Filter by field, value');
      await user.type(searchInput, 'test');

      // The last call should have the search term
      const lastCall = mockJSONDataTable.mock.calls[mockJSONDataTable.mock.calls.length - 1][0];
      expect(lastCall.searchTerm).toBe('test');
    });

    it('should debounce storing search term in localStorage', async () => {
      const user = userEvent.setup({ delay: null });
      render(<JSONDataView data={mockData} />);

      const searchInput = screen.getByPlaceholderText('Filter by field, value');
      await user.type(searchInput, 'test');

      // Should not have called setStoredSearchTerm yet
      expect(mockSetStoredSearchTerm).not.toHaveBeenCalled();

      // Fast-forward time by 500ms (debounce delay)
      jest.advanceTimersByTime(500);

      // Now it should have been called
      await waitFor(() => {
        expect(mockSetStoredSearchTerm).toHaveBeenCalledWith('test');
      });
    });

    it('should load initial search term from localStorage', () => {
      mockStoredSearchTerm.mockReturnValue('stored search');
      render(<JSONDataView data={mockData} />);

      const searchInput = screen.getByPlaceholderText('Filter by field, value');
      expect(searchInput).toHaveValue('stored search');
    });

    it('should clear search term when clear button is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      render(<JSONDataView data={mockData} />);

      const searchInput = screen.getByPlaceholderText('Filter by field, value');
      await user.type(searchInput, 'test query');

      // Find and click the clear button (it's inside the search field)
      const clearButton = searchInput.parentElement?.querySelector(
        '[data-test-subj*="clearSearchButton"]'
      );
      if (clearButton) {
        await user.click(clearButton);
      }

      // Search should be cleared
      expect(searchInput).toHaveValue('');
    });
  });

  describe('data handling', () => {
    it('should handle empty data object', () => {
      render(<JSONDataView data={{}} />);

      expect(mockJSONDataTable).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {},
        })
      );
    });

    it('should handle complex nested data', () => {
      const complexData = {
        level1: {
          level2: {
            level3: {
              value: 'deep',
            },
          },
          array: [1, 2, 3],
        },
        date: '2024-01-01',
        boolean: true,
        null: null,
      };

      render(<JSONDataView data={complexData} />);

      expect(mockJSONDataTable).toHaveBeenCalledWith(
        expect.objectContaining({
          data: complexData,
        })
      );
    });
  });

  describe('props propagation', () => {
    it('should propagate all props to JSONDataTable in table view', () => {
      render(
        <JSONDataView data={mockData} title="Test Title" fieldPathActionsPrefix="test.prefix" />
      );

      expect(mockJSONDataTable).toHaveBeenCalledWith({
        data: mockData,
        title: 'Test Title',
        searchTerm: '',
        fieldPathActionsPrefix: 'test.prefix',
      });
    });

    it('should update JSONDataTable props when search term changes', async () => {
      const user = userEvent.setup({ delay: null });
      render(<JSONDataView data={mockData} />);

      // Clear previous calls
      mockJSONDataTable.mockClear();

      const searchInput = screen.getByPlaceholderText('Filter by field, value');
      await user.type(searchInput, 'new');

      // Should have been called multiple times (once per character)
      expect(mockJSONDataTable.mock.calls.length).toBeGreaterThan(0);
      const lastCall = mockJSONDataTable.mock.calls[mockJSONDataTable.mock.calls.length - 1][0];
      expect(lastCall.searchTerm).toBe('new');
    });
  });
});
