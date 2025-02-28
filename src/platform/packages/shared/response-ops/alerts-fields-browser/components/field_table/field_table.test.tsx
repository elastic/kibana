/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, RenderResult, screen, within } from '@testing-library/react';
import { mockBrowserFields } from '../../mock';

import { FieldTable, FieldTableProps } from './field_table';

const timestampFieldId = '@timestamp';

const columnIds = [timestampFieldId];

const mockOnToggleColumn = jest.fn();

const defaultProps: FieldTableProps = {
  selectedCategoryIds: [],
  columnIds: [],
  filteredBrowserFields: {},
  searchInput: '',
  filterSelectedEnabled: false,
  onFilterSelectedChange: jest.fn(),
  onHide: jest.fn(),
  onToggleColumn: mockOnToggleColumn,
};

const getComponent = (props: Partial<FieldTableProps> = {}) => (
  <FieldTable {...{ ...defaultProps, ...props }} />
);
const renderComponent = (props: Partial<FieldTableProps> = {}) => render(getComponent(props));

describe('FieldTable', () => {
  const timestampField = mockBrowserFields.base.fields![timestampFieldId];
  const defaultPageSize = 10;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render empty field table', () => {
    renderComponent();

    expect(screen.getByText('No items found')).toBeInTheDocument();
  });

  it('should render field table with fields of all categories', () => {
    renderComponent({ filteredBrowserFields: mockBrowserFields });
    const table = screen.getByRole('table');
    const rows = within(table).getAllByRole('row');
    // remove the table header
    const dataRows = rows.slice(1);

    expect(dataRows.length).toBe(defaultPageSize);
  });

  it('should render field table with fields of categories selected', () => {
    const selectedCategoryIds = ['client', 'event'];

    const fieldCount = selectedCategoryIds.reduce(
      (total, selectedCategoryId) =>
        total + Object.keys(mockBrowserFields[selectedCategoryId].fields ?? {}).length,
      0
    );

    renderComponent({
      selectedCategoryIds,
      filteredBrowserFields: mockBrowserFields,
    });

    const table = screen.getByRole('table');
    const rows = within(table).getAllByRole('row');
    // remove the table header
    const dataRows = rows.slice(1);

    expect(dataRows.length).toBe(fieldCount);
  });

  it('should render field table with custom columns', () => {
    const fieldTableColumns = [
      {
        field: 'name',
        name: 'Custom column',
        render: () => <div data-test-subj="customColumn" />,
      },
    ];

    renderComponent({
      getFieldTableColumns: () => fieldTableColumns,
      filteredBrowserFields: mockBrowserFields,
    });

    expect(screen.getAllByText('Custom column').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('customColumn').length).toEqual(defaultPageSize);
  });

  it('should render field table with unchecked field', () => {
    renderComponent({
      selectedCategoryIds: ['base'],
      filteredBrowserFields: { base: { fields: { [timestampFieldId]: timestampField } } },
    });

    const checkbox = screen.getByTestId(`field-${timestampFieldId}-checkbox`);
    expect(checkbox).not.toHaveAttribute('checked');
  });

  it('should render field table with checked field', () => {
    renderComponent({
      selectedCategoryIds: ['base'],
      columnIds,
      filteredBrowserFields: { base: { fields: { [timestampFieldId]: timestampField } } },
    });

    const checkbox = screen.getByTestId(`field-${timestampFieldId}-checkbox`);
    expect(checkbox).toHaveAttribute('checked');
  });

  describe('selection', () => {
    it('should call onToggleColumn callback when field unchecked', () => {
      renderComponent({
        selectedCategoryIds: ['base'],
        columnIds,
        filteredBrowserFields: { base: { fields: { [timestampFieldId]: timestampField } } },
      });

      screen.getByTestId(`field-${timestampFieldId}-checkbox`).click();

      expect(mockOnToggleColumn).toHaveBeenCalledTimes(1);
      expect(mockOnToggleColumn).toHaveBeenCalledWith(timestampFieldId);
    });

    it('should call onToggleColumn callback when field checked', () => {
      renderComponent({
        selectedCategoryIds: ['base'],
        filteredBrowserFields: { base: { fields: { [timestampFieldId]: timestampField } } },
      });

      screen.getByTestId(`field-${timestampFieldId}-checkbox`).click();

      expect(mockOnToggleColumn).toHaveBeenCalledTimes(1);
      expect(mockOnToggleColumn).toHaveBeenCalledWith(timestampFieldId);
    });
  });

  describe('pagination', () => {
    const isAtFirstPage = () =>
      screen.getByTestId('pagination-button-0').hasAttribute('aria-current');

    const changePage = (result: RenderResult) => {
      screen.getByTestId('pagination-button-1').click();
    };

    const paginationProps = {
      filteredBrowserFields: mockBrowserFields,
    };

    it('should paginate on page clicked', () => {
      const result = renderComponent(paginationProps);

      expect(isAtFirstPage()).toBeTruthy();

      changePage(result);

      expect(isAtFirstPage()).toBeFalsy();
    });

    it('should not reset on field checked', () => {
      const result = renderComponent(paginationProps);

      changePage(result);

      screen.getAllByRole('checkbox').at(0)?.click();
      expect(mockOnToggleColumn).toHaveBeenCalled(); // assert some field has been selected

      expect(isAtFirstPage()).toBeFalsy();
    });

    it('should reset on filter change', () => {
      const result = renderComponent({
        ...paginationProps,
        selectedCategoryIds: ['destination', 'event', 'client', 'agent', 'host'],
      });

      changePage(result);
      expect(isAtFirstPage()).toBeFalsy();

      result.rerender(
        getComponent({
          ...paginationProps,
          selectedCategoryIds: ['destination', 'event', 'client', 'agent'],
        })
      );

      expect(isAtFirstPage()).toBeTruthy();
    });
  });
});
