/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, RenderResult } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
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
    const result = renderComponent();

    expect(result.getByText('No items found')).toBeInTheDocument();
  });

  it('should render field table with fields of all categories', () => {
    const result = renderComponent({ filteredBrowserFields: mockBrowserFields });

    expect(result.container.getElementsByClassName('euiTableRow').length).toBe(defaultPageSize);
  });

  it('should render field table with fields of categories selected', () => {
    const selectedCategoryIds = ['client', 'event'];

    const fieldCount = selectedCategoryIds.reduce(
      (total, selectedCategoryId) =>
        total + Object.keys(mockBrowserFields[selectedCategoryId].fields ?? {}).length,
      0
    );

    const result = renderComponent({
      selectedCategoryIds,
      filteredBrowserFields: mockBrowserFields,
    });

    expect(result.container.getElementsByClassName('euiTableRow').length).toBe(fieldCount);
  });

  it('should render field table with custom columns', () => {
    const fieldTableColumns = [
      {
        field: 'name',
        name: 'Custom column',
        render: () => <div data-test-subj="customColumn" />,
      },
    ];

    const result = renderComponent({
      getFieldTableColumns: () => fieldTableColumns,
      filteredBrowserFields: mockBrowserFields,
    });

    expect(result.getAllByText('Custom column').length).toBeGreaterThan(0);
    expect(result.getAllByTestId('customColumn').length).toEqual(defaultPageSize);
  });

  it('should render field table with unchecked field', () => {
    const result = renderComponent({
      selectedCategoryIds: ['base'],
      filteredBrowserFields: { base: { fields: { [timestampFieldId]: timestampField } } },
    });

    const checkbox = result.getByTestId(`field-${timestampFieldId}-checkbox`);
    expect(checkbox).not.toHaveAttribute('checked');
  });

  it('should render field table with checked field', () => {
    const result = renderComponent({
      selectedCategoryIds: ['base'],
      columnIds,
      filteredBrowserFields: { base: { fields: { [timestampFieldId]: timestampField } } },
    });

    const checkbox = result.getByTestId(`field-${timestampFieldId}-checkbox`);
    expect(checkbox).toHaveAttribute('checked');
  });

  describe('selection', () => {
    it('should call onToggleColumn callback when field unchecked', () => {
      const result = renderComponent({
        selectedCategoryIds: ['base'],
        columnIds,
        filteredBrowserFields: { base: { fields: { [timestampFieldId]: timestampField } } },
      });

      result.getByTestId(`field-${timestampFieldId}-checkbox`).click();

      expect(mockOnToggleColumn).toHaveBeenCalledTimes(1);
      expect(mockOnToggleColumn).toHaveBeenCalledWith(timestampFieldId);
    });

    it('should call onToggleColumn callback when field checked', () => {
      const result = renderComponent({
        selectedCategoryIds: ['base'],
        filteredBrowserFields: { base: { fields: { [timestampFieldId]: timestampField } } },
      });

      result.getByTestId(`field-${timestampFieldId}-checkbox`).click();

      expect(mockOnToggleColumn).toHaveBeenCalledTimes(1);
      expect(mockOnToggleColumn).toHaveBeenCalledWith(timestampFieldId);
    });
  });

  describe('pagination', () => {
    const isAtFirstPage = (result: RenderResult) =>
      result.getByTestId('pagination-button-0').hasAttribute('aria-current');

    const changePage = async (result: RenderResult) => {
      await userEvent.click(result.getByTestId('pagination-button-1'));
    };

    const paginationProps = {
      filteredBrowserFields: mockBrowserFields,
    };

    it('should paginate on page clicked', async () => {
      const result = renderComponent(paginationProps);

      expect(isAtFirstPage(result)).toBeTruthy();

      await changePage(result);

      expect(isAtFirstPage(result)).toBeFalsy();
    });

    it('should not reset on field checked', async () => {
      const result = renderComponent(paginationProps);

      await changePage(result);

      await userEvent.click(result.getAllByRole('checkbox').at(0)!);
      expect(mockOnToggleColumn).toHaveBeenCalled(); // assert some field has been selected

      expect(isAtFirstPage(result)).toBeFalsy();
    });

    it('should reset on filter change', async () => {
      const result = renderComponent({
        ...paginationProps,
        selectedCategoryIds: ['destination', 'event', 'client', 'agent', 'host'],
      });

      await changePage(result);
      expect(isAtFirstPage(result)).toBeFalsy();

      result.rerender(
        getComponent({
          ...paginationProps,
          selectedCategoryIds: ['destination', 'event', 'client', 'agent'],
        })
      );

      expect(isAtFirstPage(result)).toBeTruthy();
    });
  });
});
