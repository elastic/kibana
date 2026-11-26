/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';
import type { State } from '../table_list_view_table';
import { sortByRecentlyAccessed, TableSortSelect } from './table_sort_select';

describe('TableSortSelect', () => {
  const ControlledSortSelect = ({
    hasUpdatedAtMetadata = false,
  }: {
    hasUpdatedAtMetadata?: boolean;
  }) => {
    const [tableSort, setTableSort] = useState<State['tableSort']>({
      field: 'attributes.title',
      direction: 'asc',
    });
    return (
      <I18nProvider>
        <TableSortSelect
          tableSort={tableSort}
          hasUpdatedAtMetadata={hasUpdatedAtMetadata}
          hasRecentlyAccessedMetadata={false}
          onChange={(field, direction) => setTableSort({ field, direction })}
        />
      </I18nProvider>
    );
  };

  test('updates the available options when metadata becomes available after mount', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<ControlledSortSelect />);

    rerender(<ControlledSortSelect hasUpdatedAtMetadata />);
    await user.click(screen.getByTestId('tableSortSelectBtn'));

    expect(await screen.findByRole('option', { name: /Recent-Old/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Old-Recent/ })).toBeInTheDocument();
  });
});

describe('sortByRecentlyAccessed', () => {
  const items: UserContentCommonSchema[] = [
    {
      id: 'item-1',
      type: 'dashboard',
      updatedAt: '2020-01-01T00:00:00Z',
      attributes: {
        title: 'Item 1',
      },
      references: [],
    },
    {
      id: 'item-2',
      type: 'dashboard',
      updatedAt: '2020-01-02T00:00:00Z',
      attributes: {
        title: 'Item 2',
      },
      createdBy: 'u_1',
      references: [],
    },
    {
      id: 'item-3',
      type: 'dashboard',
      updatedAt: '2020-01-03T00:00:00Z',
      attributes: {
        title: 'Item 3',
      },
      createdBy: 'u_2',
      references: [],
    },
    {
      id: 'item-4',
      type: 'dashboard',
      updatedAt: '2020-01-04T00:00:00Z',
      attributes: {
        title: 'Item 4',
      },
      references: [],
      managed: true,
    },
  ];

  test('sort by last updated', () => {
    const sortedItems = sortByRecentlyAccessed(items, []);
    expect(sortedItems.map((item) => item.id)).toEqual(['item-4', 'item-3', 'item-2', 'item-1']);
  });

  test('pulls recently accessed to the top', () => {
    const sortedItems = sortByRecentlyAccessed(items, [{ id: 'item-1' }, { id: 'item-2' }]);
    expect(sortedItems.map((item) => item.id)).toEqual(['item-1', 'item-2', 'item-4', 'item-3']);
  });
});
