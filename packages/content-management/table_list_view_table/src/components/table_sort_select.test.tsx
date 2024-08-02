/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { sortByRecentlyAccessed } from './table_sort_select';
import { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';

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
