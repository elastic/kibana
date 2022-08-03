/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import Chance from 'chance';
import { action } from '@storybook/addon-actions';

import { Params, getStoryArgTypes, getStoryServices } from './mocks';

import { TableListView as Component, UserContentCommonSchema } from './table_list_view';
import { TableListViewProvider } from './services';

import mdx from '../../README.mdx';

const chance = new Chance();

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

let mockItems: UserContentCommonSchema[];

const createMockItems = (total: number) => {
  mockItems = [...Array(total)].map((_, i) => ({
    id: i.toString(),
    references: [],
    updatedAt: '2022-12-07T10:00:00',
    attributes: {
      title: chance.sentence({ words: 5 }),
      description: `Description of item ${i}`,
    },
  }));
};

createMockItems(500);

export const TableListView = (params: Params) => {
  return (
    <TableListViewProvider {...getStoryServices(params, action)}>
      <Component
        key={`${params.initialFilter}-${params.initialPageSize}`}
        findItems={(searchQuery) => {
          const hits = mockItems
            .filter((_, i) => i < params.numberOfItemsToRender)
            .filter((item) => item.attributes.title.includes(searchQuery));

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
