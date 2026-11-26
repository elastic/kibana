/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';
import { I18nProvider } from '@kbn/i18n-react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { TableListViewTable, type TableListViewTableProps } from '../table_list_view_table';
import { WithServices } from './tests.helpers';

const hits: UserContentCommonSchema[] = [
  {
    id: 'item-1',
    type: 'dashboard',
    updatedAt: '2020-01-01T00:00:00Z',
    attributes: { title: 'a-foo' },
    references: [],
  },
  {
    id: 'item-2',
    type: 'dashboard',
    updatedAt: '2020-01-02T00:00:00Z',
    attributes: { title: 'z-foo' },
    references: [],
  },
];

describe('sort filter', () => {
  const requiredProps: TableListViewTableProps = {
    entityName: 'test',
    entityNamePlural: 'tests',
    initialFilter: '',
    initialPageSize: 20,
    findItems: jest.fn().mockResolvedValue({ total: hits.length, hits }),
    getDetailViewLink: () => 'http://elastic.co',
    urlStateEnabled: false,
    onFetchSuccess: () => {},
    tableCaption: 'my caption',
    setPageDataTestSubject: () => {},
  };

  const TableListViewWithServices = WithServices<TableListViewTableProps>(TableListViewTable);
  const TableListView = () => (
    <I18nProvider>
      <MemoryRouter>
        <TableListViewWithServices {...requiredProps} />
      </MemoryRouter>
    </I18nProvider>
  );

  test('keeps the sort button mounted and closes the popover after selecting an option with the keyboard', async () => {
    const user = userEvent.setup();
    render(<TableListView />);

    expect(await screen.findByTestId('table-is-ready')).toBeInTheDocument();

    const sortButton = screen.getByTestId('tableSortSelectBtn');
    expect(sortButton).toHaveTextContent('Recent-Old');

    await user.click(sortButton);
    expect(sortButton).toHaveAttribute('aria-expanded', 'true');

    const listbox = await screen.findByRole('listbox', { name: 'Sorting options' });
    act(() => listbox.focus());
    await user.keyboard('{ArrowDown}{Enter}');

    expect(screen.getByTestId('tableSortSelectBtn')).toBe(sortButton);
    expect(sortButton).toHaveAttribute('aria-expanded', 'false');
    expect(sortButton).toHaveTextContent('Old-Recent');
  });
});
