/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { TableWithoutPersist as Table } from './table';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { SourceFiltersTableFilter } from '../../types';

const items: SourceFiltersTableFilter[] = [{ value: 'tim*', clientId: '1' }];

const getIndexPatternMock = (fieldNames: string[] = []) =>
  ({
    getNonScriptedFields: () => fieldNames.map((name) => ({ name })),
  } as unknown as DataView);

type RenderTableProps = Partial<React.ComponentProps<typeof Table>>;

const baseProps: React.ComponentProps<typeof Table> = {
  indexPattern: getIndexPatternMock(),
  items,
  deleteFilter: jest.fn(),
  fieldWildcardMatcher: (filters: string[]) => {
    const [query = ''] = filters;
    const normalizedQuery = query.replace('*', '');
    return (field: string) => field.includes(normalizedQuery);
  },
  saveFilter: jest.fn(),
  isSaving: false,
  euiTablePersist: {
    pageSize: 10,
    onTableChange: jest.fn(),
    sorting: { sort: { direction: 'asc' as const, field: 'clientId' as const } },
  },
};

const renderTable = (customProps: RenderTableProps = {}) => {
  const props = { ...baseProps, ...customProps };
  renderWithI18n(<Table {...props} />);

  return {
    props,
  };
};

describe('Table', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders table headers and rows', () => {
    renderTable({ isSaving: true });

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByTestId('tableHeaderCell_value_0')).toHaveTextContent('Filter');
    expect(screen.getByTestId('tableHeaderCell_value_1')).toHaveTextContent('Matches');
    expect(screen.getByText('tim*')).toBeInTheDocument();
  });

  it('renders filter matches when found', () => {
    renderTable({
      indexPattern: getIndexPatternMock(['time', 'value']),
      fieldWildcardMatcher: () => () => true,
    });

    expect(screen.getByText('time, value')).toBeInTheDocument();
  });

  it('renders no matches message when there are no matches', () => {
    renderTable({
      indexPattern: getIndexPatternMock(['value']),
    });

    expect(
      screen.getByText("The source filter doesn't match any known fields.")
    ).toBeInTheDocument();
  });

  describe('editing', () => {
    it('shows input and save button after entering edit mode', async () => {
      const user = userEvent.setup();
      renderTable();

      await user.click(screen.getByTestId('edit_filter-tim*'));

      expect(screen.getByDisplayValue('tim*')).toBeInTheDocument();
      expect(screen.getByTestId('save_filter-tim*')).toBeInTheDocument();
    });

    it('updates matches dynamically as input value changes', async () => {
      const user = userEvent.setup();
      renderTable({
        indexPattern: getIndexPatternMock(['time', 'value']),
      });

      await user.click(screen.getByTestId('edit_filter-tim*'));
      await user.clear(screen.getByDisplayValue('tim*'));
      await user.type(screen.getByRole('textbox'), 'value*');

      expect(screen.getByText('value')).toBeInTheDocument();
      expect(screen.queryByText('time, value')).not.toBeInTheDocument();
    });

    it('saves edited filter when save icon is clicked and exits edit mode', async () => {
      const user = userEvent.setup();
      const saveFilter = jest.fn();
      renderTable({ saveFilter });

      await user.click(screen.getByTestId('edit_filter-tim*'));
      await user.clear(screen.getByDisplayValue('tim*'));
      await user.type(screen.getByRole('textbox'), 'ti*');
      await user.click(screen.getByTestId('save_filter-tim*'));

      expect(saveFilter).toHaveBeenCalledWith({ clientId: '1', value: 'ti*' });
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });
  });

  it('allows deletes', async () => {
    const user = userEvent.setup();
    const deleteFilter = jest.fn();
    renderTable({ deleteFilter });

    const row = screen.getByRole('row', { name: /tim\*/i });
    await user.click(within(row).getByLabelText('Delete'));
    expect(deleteFilter).toHaveBeenCalledWith({ clientId: '1', value: 'tim*' });
  });

  it('saves when in edit mode and Enter key is pressed', async () => {
    const user = userEvent.setup();
    const saveFilter = jest.fn();
    renderTable({ saveFilter });

    await user.click(screen.getByTestId('edit_filter-tim*'));
    const input = screen.getByDisplayValue('tim*');
    await user.clear(input);
    await user.type(input, 'ti*');
    await user.keyboard('{Enter}');

    expect(saveFilter).toHaveBeenCalledWith({ clientId: '1', value: 'ti*' });
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('cancels when in edit mode and Escape key is pressed', async () => {
    const user = userEvent.setup();
    const saveFilter = jest.fn();
    renderTable({ saveFilter });

    await user.click(screen.getByTestId('edit_filter-tim*'));
    const input = screen.getByDisplayValue('tim*');
    await user.clear(input);
    await user.type(input, 'ti*');
    await user.keyboard('{Escape}');

    expect(saveFilter).not.toHaveBeenCalled();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });
});
