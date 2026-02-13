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
import { ExecutionDataViewer } from './execution_data_viewer';

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

describe('ExecutionDataViewer', () => {
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
    it('should render in table view mode by default', () => {
      render(<ExecutionDataViewer data={mockData} />);

      expect(screen.getByTestId('workflowJsonDataViewer')).toBeInTheDocument();
      expect(screen.getByTestId('mocked-json-data-table')).toBeInTheDocument();
      expect(screen.queryByTestId('mocked-json-data-code')).not.toBeInTheDocument();
    });

    it('should pass props to JSONDataTable', () => {
      render(
        <ExecutionDataViewer
          data={mockData}
          title="Custom Title"
          fieldPathActionsPrefix="custom.prefix"
        />
      );

      expect(mockJSONDataTable).toHaveBeenCalledWith(
        expect.objectContaining({
          data: mockData,
          title: 'Custom Title',
          fieldPathActionsPrefix: 'custom.prefix',
          searchTerm: '',
        })
      );
    });
  });

  describe('view mode toggle', () => {
    it('should switch between table and JSON views', () => {
      render(<ExecutionDataViewer data={mockData} />);

      expect(screen.getByTestId('mocked-json-data-table')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('workflowViewMode_json'));
      expect(screen.queryByTestId('mocked-json-data-table')).not.toBeInTheDocument();
      expect(screen.getByTestId('mocked-json-data-code')).toBeInTheDocument();
      expect(mockJsonDataCode).toHaveBeenCalledWith({ json: mockData });

      fireEvent.click(screen.getByTestId('workflowViewMode_table'));
      expect(screen.getByTestId('mocked-json-data-table')).toBeInTheDocument();
      expect(screen.queryByTestId('mocked-json-data-code')).not.toBeInTheDocument();
    });
  });

  describe('search functionality', () => {
    it('should display search field only in table view', () => {
      render(<ExecutionDataViewer data={mockData} />);

      expect(screen.getByPlaceholderText('Filter by field, value')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('workflowViewMode_json'));
      expect(screen.queryByPlaceholderText('Filter by field, value')).not.toBeInTheDocument();
    });

    it('should update search term and pass it to JSONDataTable', async () => {
      const user = userEvent.setup({ delay: null });
      render(<ExecutionDataViewer data={mockData} />);

      const searchInput = screen.getByPlaceholderText('Filter by field, value');
      await user.type(searchInput, 'test');

      expect(searchInput).toHaveValue('test');
      const lastCall = mockJSONDataTable.mock.calls[mockJSONDataTable.mock.calls.length - 1][0];
      expect(lastCall.searchTerm).toBe('test');
    });

    it('should debounce storing search term in localStorage', async () => {
      const user = userEvent.setup({ delay: null });
      render(<ExecutionDataViewer data={mockData} />);

      const searchInput = screen.getByPlaceholderText('Filter by field, value');
      await user.type(searchInput, 'test');

      expect(mockSetStoredSearchTerm).not.toHaveBeenCalled();

      jest.advanceTimersByTime(500);

      await waitFor(() => {
        expect(mockSetStoredSearchTerm).toHaveBeenCalledWith('test');
      });
    });

    it('should load initial search term from localStorage', () => {
      mockStoredSearchTerm.mockReturnValue('stored search');
      render(<ExecutionDataViewer data={mockData} />);

      expect(screen.getByPlaceholderText('Filter by field, value')).toHaveValue('stored search');
    });

    it('should clear search term when clear button is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      render(<ExecutionDataViewer data={mockData} />);

      const searchInput = screen.getByPlaceholderText('Filter by field, value');
      await user.type(searchInput, 'test query');

      const clearButton = searchInput.parentElement?.querySelector(
        '[data-test-subj*="clearSearchButton"]'
      );
      if (clearButton) {
        await user.click(clearButton);
      }

      expect(searchInput).toHaveValue('');
    });
  });

  describe('data propagation', () => {
    it('should pass data directly to child components', () => {
      const testData = { key: 'value' };
      render(<ExecutionDataViewer data={testData} />);

      expect(mockJSONDataTable).toHaveBeenCalledWith(expect.objectContaining({ data: testData }));

      fireEvent.click(screen.getByTestId('workflowViewMode_json'));
      expect(mockJsonDataCode).toHaveBeenCalledWith({ json: testData });
    });
  });
});
