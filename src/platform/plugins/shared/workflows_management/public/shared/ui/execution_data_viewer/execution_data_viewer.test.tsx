/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { ExecutionDataViewer } from './execution_data_viewer';

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

const SEARCH_PLACEHOLDER = 'Search fields and values';

const setViewMode = (mode: 'table' | 'json') => {
  fireEvent.change(screen.getByTestId('workflowViewModeSelect'), { target: { value: mode } });
};

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

      setViewMode('json');
      expect(screen.queryByTestId('mocked-json-data-table')).not.toBeInTheDocument();
      expect(screen.getByTestId('mocked-json-data-code')).toBeInTheDocument();
      expect(mockJsonDataCode).toHaveBeenCalledWith({ json: mockData });

      setViewMode('table');
      expect(screen.getByTestId('mocked-json-data-table')).toBeInTheDocument();
      expect(screen.queryByTestId('mocked-json-data-code')).not.toBeInTheDocument();
    });
  });

  describe('search functionality', () => {
    it('should display search field only in table view', () => {
      render(<ExecutionDataViewer data={mockData} />);

      expect(screen.getByPlaceholderText(SEARCH_PLACEHOLDER)).toBeInTheDocument();

      setViewMode('json');
      expect(screen.queryByPlaceholderText(SEARCH_PLACEHOLDER)).not.toBeInTheDocument();
    });

    it('should update search term and pass it to JSONDataTable', async () => {
      const user = userEvent.setup();
      render(<ExecutionDataViewer data={mockData} />);

      const searchInput = screen.getByPlaceholderText(SEARCH_PLACEHOLDER);
      await user.type(searchInput, 'test');

      expect(searchInput).toHaveValue('test');
      const lastCall = mockJSONDataTable.mock.calls[mockJSONDataTable.mock.calls.length - 1][0];
      expect(lastCall.searchTerm).toBe('test');
    });

    it('should clear search term when clear button is clicked', async () => {
      const user = userEvent.setup();
      render(<ExecutionDataViewer data={mockData} />);

      const searchInput = screen.getByPlaceholderText(SEARCH_PLACEHOLDER);
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

      setViewMode('json');
      expect(mockJsonDataCode).toHaveBeenCalledWith({ json: testData });
    });
  });
});
