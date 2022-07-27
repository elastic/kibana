/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { action } from '@storybook/addon-actions';

import { Params, getStoryArgTypes, getStoryServices } from './mocks';

import { TableListView as Component, UserContentCommonSchema } from './table_list_view';
import { TableListViewProvider } from './services';

import mdx from '../../README.mdx';

export default {
  title: 'Table list view',
  description: 'A table list to display user content saved objects',
  parameters: {
    docs: {
      page: mdx,
    },
  },
};

const argTypes = getStoryArgTypes();

const mockItems: UserContentCommonSchema[] = [
  {
    id: '123',
    references: [],
    updatedAt: '2022-28-07T10:00:00',
    attributes: {
      title: 'Dashboard title 1',
      description: 'Description of dashboard 1',
    },
  },
  {
    id: '456',
    references: [],
    updatedAt: '2022-20-07T10:00:00',
    attributes: {
      title: 'Dashboard title 2',
      description: 'Description of dashboard 2',
    },
  },
  {
    id: '789',
    references: [],
    updatedAt: '2022-12-07T10:00:00',
    attributes: {
      title: 'Dashboard title 3',
      description: 'Description of dashboard 3',
    },
  },
];

const getMockItems = (total: number) =>
  new Array(total).fill(' ').map((_, i) => ({
    id: i,
    references: [],
    updatedAt: '2022-12-07T10:00:00',
    attributes: {
      title: `Item title ${i}`,
      description: `Description of item ${i}`,
    },
  }));

export const TableListView = (params: Params) => {
  return (
    <TableListViewProvider {...getStoryServices(params, action)}>
      <Component
        key={`${params.initialFilter}-${params.initialPageSize}`}
        findItems={() => {
          const hits = getMockItems(params.numberOfItemsToRender);

          return Promise.resolve({
            total: hits.length,
            hits,
          });
        }}
        getDetailViewLink={() => 'http://elastic.co'}
        editItem={
          params.canEditItem
            ? ({ attributes: { title } }) => {
                action('Edit item')(title);
              }
            : undefined
        }
        deleteItems={
          params.canDeleteItem
            ? async (items) => {
                action('Delete item(s)')(
                  items.map(({ attributes: { title } }) => title).join(', ')
                );
              }
            : undefined
        }
        {...params}
      />
    </TableListViewProvider>
  );
};

TableListView.argTypes = argTypes;
