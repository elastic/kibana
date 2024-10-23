/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { WithServices } from './tests.helpers';
import { TableListViewTable, type TableListViewTableProps } from '../table_list_view_table';
import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';

const hits: UserContentCommonSchema[] = [
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
    updatedAt: '2020-01-01T00:00:00Z',
    attributes: {
      title: 'Item 2',
    },
    createdBy: 'u_1',
    references: [],
  },
  {
    id: 'item-3',
    type: 'dashboard',
    updatedAt: '2020-01-01T00:00:00Z',
    attributes: {
      title: 'Item 3',
    },
    createdBy: 'u_2',
    references: [],
  },
  {
    id: 'item-4',
    type: 'dashboard',
    updatedAt: '2020-01-01T00:00:00Z',
    attributes: {
      title: 'Item 4',
    },
    references: [],
    managed: true,
  },
];

describe('created_by column', () => {
  const requiredProps: TableListViewTableProps = {
    entityName: 'test',
    entityNamePlural: 'tests',
    listingLimit: 500,
    initialFilter: '',
    initialPageSize: 20,
    findItems: jest.fn().mockResolvedValue({ total: 0, hits }),
    getDetailViewLink: () => 'http://elastic.co',
    urlStateEnabled: false,
    onFetchSuccess: () => {},
    tableCaption: 'my caption',
    setPageDataTestSubject: () => {},
  };

  const mockUsers = [
    {
      uid: 'u_1',
      enabled: true,
      user: {
        username: 'user1',
      },
      data: {},
    },
    {
      uid: 'u_2',
      enabled: true,
      user: {
        username: 'user2',
      },
      data: {},
    },
  ];
  const mockBulkGetUserProfiles = jest.fn((uids) =>
    Promise.resolve(mockUsers.filter((user) => uids.includes(user.uid)))
  );
  const mockGetUserProfile = jest.fn((uid) =>
    Promise.resolve(mockUsers.find((user) => user.uid === uid)!)
  );

  const TableListViewWithServices = WithServices<TableListViewTableProps>(TableListViewTable, {
    bulkGetUserProfiles: mockBulkGetUserProfiles,
    getUserProfile: mockGetUserProfile,
  });
  const TableListView = (overrides: Partial<TableListViewTableProps>) => (
    <I18nProvider>
      <MemoryRouter>
        <TableListViewWithServices {...requiredProps} {...overrides} />
      </MemoryRouter>
    </I18nProvider>
  );

  test("shouldn't render created by column when createdBy is disabled", async () => {
    render(<TableListView {...requiredProps} />);

    // wait until first render
    expect(await screen.findByTestId('itemsInMemTable')).toBeVisible();

    expect(() => screen.getByTestId(/tableHeaderCell_createdBy/)).toThrow();
  });

  test("shouldn't render created by column when createdBy is missing from data", async () => {
    render(
      <TableListView
        {...requiredProps}
        createdByEnabled={true}
        findItems={async () => ({
          hits: hits.map((h) => ({ ...h, createdBy: undefined })),
          total: hits.length,
        })}
      />
    );

    // wait until first render
    expect(await screen.findByTestId('itemsInMemTable')).toBeVisible();

    expect(() => screen.getByTestId(/tableHeaderCell_createdBy/)).toThrow();
  });

  test('should render created by column when createdBy is in data', async () => {
    render(<TableListView {...requiredProps} createdByEnabled={true} />);

    // wait until first render
    expect(await screen.findByTestId('itemsInMemTable')).toBeVisible();

    expect(screen.getByTestId(/tableHeaderCell_createdBy/)).toBeVisible();

    expect(await screen.findByTestId(/userAvatarTip-user1/)).toBeVisible();
    expect(await screen.findByTestId(/userAvatarTip-user2/)).toBeVisible();
    expect(await screen.findByTestId(/managedAvatarTip/)).toBeVisible();
  });
});
