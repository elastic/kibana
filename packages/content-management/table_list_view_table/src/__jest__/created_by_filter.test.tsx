/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, within, waitForElementToBeRemoved } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { WithServices } from './tests.helpers';
import { TableListViewTable, type TableListViewTableProps } from '../table_list_view_table';
import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';
import userEvent from '@testing-library/user-event';

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
    managed: true,
    references: [],
  },
];

describe('created_by filter', () => {
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

  const mockBulkGetUserProfiles = jest.fn((uids) =>
    Promise.resolve(
      [
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
      ].filter((user) => uids.includes(user.uid))
    )
  );

  const TableListViewWithServices = WithServices<TableListViewTableProps>(TableListViewTable, {
    bulkGetUserProfiles: mockBulkGetUserProfiles,
  });
  const TableListView = (overrides: Partial<TableListViewTableProps>) => (
    <I18nProvider>
      <MemoryRouter>
        <TableListViewWithServices {...requiredProps} {...overrides} />
      </MemoryRouter>
    </I18nProvider>
  );

  test("shouldn't render created by filter when createdBy is disabled", async () => {
    render(<TableListView {...requiredProps} />);

    // wait until first render
    expect(await screen.findByTestId('itemsInMemTable')).toBeVisible();

    expect(() => screen.getByTestId('userFilterPopoverButton')).toThrow();
  });

  test('should be able to filter by creators', async () => {
    render(<TableListView {...requiredProps} createdByEnabled={true} />);

    // wait until first render
    expect(await screen.findByTestId('itemsInMemTable')).toBeVisible();

    // 5 items in the list
    expect(screen.getAllByTestId(/userContentListingTitleLink/)).toHaveLength(4);

    userEvent.click(screen.getByTestId('userFilterPopoverButton'));

    const userSelectablePopover = screen.getByTestId('userSelectableList');
    const popover = within(userSelectablePopover);
    expect(await popover.findAllByTestId(/userProfileSelectableOption/)).toHaveLength(3);

    userEvent.click(popover.getByTestId('userProfileSelectableOption-user1'));

    // 1 item in the list
    expect(screen.getAllByTestId(/userContentListingTitleLink/)).toHaveLength(1);

    userEvent.click(popover.getByTestId('userProfileSelectableOption-user2'));

    // 2 items in the list
    expect(screen.getAllByTestId(/userContentListingTitleLink/)).toHaveLength(2);
  });

  test('should be able to filter by "no creators"', async () => {
    render(<TableListView {...requiredProps} createdByEnabled={true} />);

    // wait until first render
    expect(await screen.findByTestId('itemsInMemTable')).toBeVisible();

    // 5 items in the list
    expect(screen.getAllByTestId(/userContentListingTitleLink/)).toHaveLength(4);

    userEvent.click(screen.getByTestId('userFilterPopoverButton'));

    const userSelectablePopover = screen.getByTestId('userSelectableList');
    const popover = within(userSelectablePopover);
    userEvent.click(await popover.findByTestId('userProfileSelectableOption-null'));

    // just 1 item in the list
    expect(screen.getAllByTestId(/userContentListingTitleLink/)).toHaveLength(1);
  });

  test('"no creators" options shouldn\'t appear if all objects have creators or managed', async () => {
    render(
      <TableListView
        {...requiredProps}
        createdByEnabled={true}
        findItems={async () => ({
          hits: [hits[1], hits[2], hits[3]],
          total: 3,
        })}
      />
    );

    // wait until first render
    expect(await screen.findByTestId('itemsInMemTable')).toBeVisible();
    // 3 items in the list
    expect(screen.getAllByTestId(/userContentListingTitleLink/)).toHaveLength(3);

    userEvent.click(screen.getByTestId('userFilterPopoverButton'));

    const userSelectablePopover = screen.getByTestId('userSelectableList');
    const popover = within(userSelectablePopover);
    expect(await popover.findAllByTestId(/userProfileSelectableOption/)).toHaveLength(2);
    expect(() => popover.getByTestId('userProfileSelectableOption-null')).toThrow();
  });

  test('empty message in case no objects have creators', async () => {
    render(
      <TableListView
        {...requiredProps}
        createdByEnabled={true}
        findItems={async () => ({
          hits: [hits[0]],
          total: 1,
        })}
      />
    );

    // wait until first render
    expect(await screen.findByTestId('itemsInMemTable')).toBeVisible();
    // 1 item in the list
    expect(screen.getAllByTestId(/userContentListingTitleLink/)).toHaveLength(1);

    userEvent.click(screen.getByTestId('userFilterPopoverButton'));

    const userSelectablePopover = screen.getByTestId('userSelectableList');
    const popover = within(userSelectablePopover);
    await waitForElementToBeRemoved(() => popover.getByRole('progressbar'));
    expect(popover.getAllByTestId('userFilterEmptyMessage')[1]).toBeVisible();
  });
});
