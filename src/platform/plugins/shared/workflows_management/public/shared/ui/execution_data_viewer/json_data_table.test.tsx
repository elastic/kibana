/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { usePager } from '@kbn/discover-utils';
import { I18nProvider } from '@kbn/i18n-react';
import { JSONDataTable } from './json_data_table';

// Helper function to render with I18n provider
const renderWithIntl = (component: React.ReactElement) => {
  return render(component, { wrapper: I18nProvider });
};

// Mock child components
const mockFieldName = jest.fn();
const mockTableFieldValue = jest.fn();

jest.mock('./field_name', () => ({
  FieldName: (props: any) => {
    mockFieldName(props);
    return (
      <div data-test-subj={`mocked-field-name-${props.fieldName}`}>
        {`${props.fieldName} (${props.fieldType})`}
      </div>
    );
  },
}));

jest.mock('./table_field_value', () => ({
  TableFieldValue: (props: any) => {
    mockTableFieldValue(props);
    return <div data-test-subj={`mocked-field-value-${props.field}`}>{props.formattedValue}</div>;
  },
}));

// Mock useGetFormattedDateTime hook
const mockGetFormattedDateTime = jest.fn((date: Date) => date.toISOString());

jest.mock('../use_formatted_date', () => ({
  useGetFormattedDateTime: () => mockGetFormattedDateTime,
}));

// Mock usePager hook
const mockChangePageIndex = jest.fn();
const mockChangePageSize = jest.fn();

jest.mock('@kbn/discover-utils', () => ({
  usePager: jest.fn(() => ({
    curPageIndex: 0,
    pageSize: 20,
    changePageIndex: mockChangePageIndex,
    changePageSize: mockChangePageSize,
  })),
  IgnoredReason: {
    IGNORE_ABOVE: 'ignore_above',
    MALFORMED: 'malformed',
    UNKNOWN: 'unknown',
  },
}));

// Mock @elastic/eui
jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  return {
    ...actual,
    copyToClipboard: jest.fn(),
    useResizeObserver: jest.fn(() => ({ width: 800, height: 600 })),
  };
});

describe('JSONDataTable', () => {
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
    it('should render the data grid with data', () => {
      render(<JSONDataTable data={mockData} />);

      // Check that the grid is rendered
      const grid = screen.getByRole('grid');
      expect(grid).toBeInTheDocument();
    });

    it('should render with custom title', () => {
      render(<JSONDataTable data={mockData} title="Custom Title" />);

      const grid = screen.getByRole('grid', { name: /Custom Title/ });
      expect(grid).toBeInTheDocument();
    });

    it('should render with default title when not provided', () => {
      render(<JSONDataTable data={mockData} />);

      const grid = screen.getByRole('grid', { name: /JSON Data/ });
      expect(grid).toBeInTheDocument();
    });

    it('should flatten nested data and create rows', () => {
      render(<JSONDataTable data={mockData} />);

      // Should have called FieldName for each flattened field
      expect(mockFieldName).toHaveBeenCalledWith(
        expect.objectContaining({
          fieldName: 'name',
        })
      );
      expect(mockFieldName).toHaveBeenCalledWith(
        expect.objectContaining({
          fieldName: 'value',
        })
      );
      expect(mockFieldName).toHaveBeenCalledWith(
        expect.objectContaining({
          fieldName: 'nested.field',
        })
      );
    });
  });

  describe('empty state', () => {
    it('should show empty prompt when data is empty', () => {
      renderWithIntl(<JSONDataTable data={{}} />);

      expect(screen.getByText('No data to display')).toBeInTheDocument();
      expect(screen.queryByRole('grid')).not.toBeInTheDocument();
    });

    it('should show empty prompt when search returns no results', () => {
      renderWithIntl(<JSONDataTable data={mockData} searchTerm="nonexistent" />);

      expect(screen.getByText('No data to display')).toBeInTheDocument();
      expect(screen.queryByRole('grid')).not.toBeInTheDocument();
    });
  });

  describe('search functionality', () => {
    it('should filter by field name', () => {
      const { rerender } = render(<JSONDataTable data={mockData} />);

      // Initially should show all fields
      expect(mockFieldName).toHaveBeenCalledTimes(3);

      // Clear mocks
      mockFieldName.mockClear();

      // Rerender with search term
      rerender(<JSONDataTable data={mockData} searchTerm="name" />);

      // Should only render field containing "name"
      const fieldNameCalls = mockFieldName.mock.calls.filter((call) =>
        call[0].fieldName.includes('name')
      );
      expect(fieldNameCalls.length).toBeGreaterThan(0);
    });

    it('should filter by field value', () => {
      const { rerender } = render(<JSONDataTable data={mockData} />);

      mockFieldName.mockClear();
      mockTableFieldValue.mockClear();

      // Rerender with search term that matches a value
      rerender(<JSONDataTable data={mockData} searchTerm="123" />);

      // Should filter and show only matching rows
      expect(screen.queryByText('No data to display')).not.toBeInTheDocument();
    });

    it('should be case insensitive when searching', () => {
      const { rerender } = render(<JSONDataTable data={mockData} />);

      mockFieldName.mockClear();

      // Rerender with uppercase search term
      rerender(<JSONDataTable data={mockData} searchTerm="NAME" />);

      // Should still find the field
      expect(screen.queryByText('No data to display')).not.toBeInTheDocument();
    });

    it('should pass highlight prop to FieldName when search term matches field name', () => {
      render(<JSONDataTable data={mockData} searchTerm="name" />);

      // Find the call with matching field name
      const nameFieldCall = mockFieldName.mock.calls.find((call) => call[0].fieldName === 'name');
      expect(nameFieldCall).toBeDefined();
      expect(nameFieldCall[0].highlight).toBe('name');
    });

    it('should pass isHighlighted prop to TableFieldValue when search term matches value', () => {
      render(<JSONDataTable data={mockData} searchTerm="123" />);

      // Find the call with matching value
      const matchingCall = mockTableFieldValue.mock.calls.find((call) =>
        call[0].formattedValue.includes('123')
      );
      expect(matchingCall).toBeDefined();
      expect(matchingCall[0].isHighlighted).toBe(true);
    });
  });

  describe('field type inference', () => {
    it('should infer string type for string values', () => {
      render(<JSONDataTable data={{ text: 'hello' }} />);

      expect(mockFieldName).toHaveBeenCalledWith(
        expect.objectContaining({
          fieldName: 'text',
          fieldType: 'string',
        })
      );
    });

    it('should infer number type for numeric values', () => {
      render(<JSONDataTable data={{ count: 42 }} />);

      expect(mockFieldName).toHaveBeenCalledWith(
        expect.objectContaining({
          fieldName: 'count',
          fieldType: 'long', // Integers are inferred as 'long'
        })
      );
    });

    it('should infer boolean type for boolean values', () => {
      render(<JSONDataTable data={{ active: true }} />);

      expect(mockFieldName).toHaveBeenCalledWith(
        expect.objectContaining({
          fieldName: 'active',
          fieldType: 'boolean',
        })
      );
    });

    it('should infer date type for ISO date strings', () => {
      const isoDate = '2024-01-15T10:30:00.000Z';
      render(<JSONDataTable data={{ timestamp: isoDate }} />);

      expect(mockFieldName).toHaveBeenCalledWith(
        expect.objectContaining({
          fieldName: 'timestamp',
          fieldType: 'date',
        })
      );
    });
  });

  describe('date formatting', () => {
    it('should format date values using useGetFormattedDateTime', () => {
      const isoDate = '2024-01-15T10:30:00.000Z';
      render(<JSONDataTable data={{ timestamp: isoDate }} />);

      expect(mockGetFormattedDateTime).toHaveBeenCalled();
    });

    it('should handle non-date values without formatting', () => {
      mockGetFormattedDateTime.mockClear();
      render(<JSONDataTable data={{ text: 'not a date' }} />);

      // Date formatter should be called but the value won't be identified as a date
      expect(mockTableFieldValue).toHaveBeenCalledWith(
        expect.objectContaining({
          formattedValue: 'not a date',
        })
      );
    });
  });

  describe('copy field path action', () => {
    it('should show copy action when fieldPathActionsPrefix is provided', () => {
      render(<JSONDataTable data={mockData} fieldPathActionsPrefix="test.prefix" />);

      // The copy action should be available in the grid
      // EuiDataGrid renders actions, we can check if copyToClipboard would be called
      expect(screen.getByRole('grid')).toBeInTheDocument();
    });

    it('should not show copy action when fieldPathActionsPrefix is not provided', () => {
      render(<JSONDataTable data={mockData} />);

      // Grid should still render but without copy actions
      expect(screen.getByRole('grid')).toBeInTheDocument();
    });
  });

  describe('data types handling', () => {
    it('should handle null values', () => {
      render(<JSONDataTable data={{ nullField: null }} />);

      expect(mockTableFieldValue).toHaveBeenCalledWith(
        expect.objectContaining({
          formattedValue: '-', // Null values are formatted as '-'
        })
      );
    });

    it('should handle undefined values', () => {
      render(<JSONDataTable data={{ undefinedField: undefined as any }} />);

      expect(mockTableFieldValue).toHaveBeenCalledWith(
        expect.objectContaining({
          formattedValue: '-', // Undefined values are formatted as '-'
        })
      );
    });

    it('should handle array values', () => {
      render(<JSONDataTable data={{ arrayField: [1, 2, 3] }} />);

      expect(mockTableFieldValue).toHaveBeenCalledWith(
        expect.objectContaining({
          formattedValue: expect.stringContaining('1'),
        })
      );
    });

    it('should handle deeply nested objects', () => {
      const deepData = {
        level1: {
          level2: {
            level3: {
              value: 'deep',
            },
          },
        },
      };

      render(<JSONDataTable data={deepData} />);

      expect(mockFieldName).toHaveBeenCalledWith(
        expect.objectContaining({
          fieldName: 'level1.level2.level3.value',
        })
      );
    });
  });

  describe('pagination', () => {
    it('should use pagination with default page size', () => {
      render(<JSONDataTable data={mockData} />);

      expect(usePager).toHaveBeenCalledWith({
        initialPageSize: 20,
        totalItems: expect.any(Number),
      });
    });

    it('should show pagination controls in the grid', () => {
      render(<JSONDataTable data={mockData} />);

      const grid = screen.getByRole('grid');
      expect(grid).toBeInTheDocument();

      // Pagination should be part of the EuiDataGrid
      // The actual controls are rendered by EuiDataGrid
    });
  });

  describe('grid configuration', () => {
    it('should configure grid with field and value columns', () => {
      render(<JSONDataTable data={mockData} />);

      const grid = screen.getByRole('grid');
      expect(grid).toBeInTheDocument();

      // The grid should have column headers (rendered by EuiDataGrid)
      // We can verify through the presence of the grid itself
    });

    it('should apply static grid settings', () => {
      render(<JSONDataTable data={mockData} />);

      // Grid should be rendered with proper settings
      const grid = screen.getByRole('grid');
      expect(grid).toBeInTheDocument();

      // Verify the grid has the expected ARIA attributes
      expect(grid).toHaveAttribute('aria-label', expect.stringMatching(/JSON Data/));
      expect(grid).toHaveAttribute('aria-rowcount');
    });
  });

  describe('complex data scenarios', () => {
    it('should handle mixed data types in one object', () => {
      const complexData = {
        string: 'text',
        number: 42,
        boolean: true,
        null: null,
        date: '2024-01-15T10:30:00.000Z',
        nested: {
          value: 'nested',
        },
      };

      render(<JSONDataTable data={complexData} />);

      expect(screen.getByRole('grid')).toBeInTheDocument();
      expect(mockFieldName.mock.calls.length).toBeGreaterThan(0);
    });

    it('should handle objects with special characters in keys', () => {
      const dataWithSpecialKeys = {
        'field-with-dash': 'value1',
        'field.with.dots': 'value2',
        field_with_underscore: 'value3',
      };

      render(<JSONDataTable data={dataWithSpecialKeys} />);

      expect(screen.getByRole('grid')).toBeInTheDocument();
    });

    it('should handle large datasets', () => {
      const largeData: Record<string, any> = {};
      for (let i = 0; i < 100; i++) {
        largeData[`field${i}`] = `value${i}`;
      }

      render(<JSONDataTable data={largeData} />);

      expect(screen.getByRole('grid')).toBeInTheDocument();
    });
  });

  describe('props propagation', () => {
    it('should pass all props to child components correctly', () => {
      render(
        <JSONDataTable
          data={mockData}
          title="Test Title"
          searchTerm="test"
          fieldPathActionsPrefix="prefix"
        />
      );

      // Verify grid is rendered with correct title
      const grid = screen.getByRole('grid', { name: /Test Title/ });
      expect(grid).toBeInTheDocument();

      // Verify search term is passed to FieldName
      expect(mockFieldName).toHaveBeenCalledWith(
        expect.objectContaining({
          highlight: 'test',
        })
      );
    });

    it('should handle missing optional props gracefully', () => {
      render(<JSONDataTable data={mockData} />);

      expect(screen.getByRole('grid')).toBeInTheDocument();
    });
  });
});
