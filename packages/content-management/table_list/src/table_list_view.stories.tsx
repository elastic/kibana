/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import Chance from 'chance';
import moment from 'moment';
import { action } from '@storybook/addon-actions';

import { Params, getStoryArgTypes, getStoryServices } from './mocks';

import { TableListView as Component, UserContentCommonSchema } from './table_list_view';
import { TableListViewProvider } from './services';

import mdx from '../README.mdx';

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

const createMockItems = (total: number): UserContentCommonSchema[] => {
  return [...Array(total)].map((_, i) => {
    const type = itemTypes[Math.floor(Math.random() * 4)];

    return {
      id: i.toString(),
      type,
      references: [],
      updatedAt: moment().subtract(i, 'day').format('YYYY-MM-DDTHH:mm:ss'),
      attributes: {
        title: chance.sentence({ words: 5 }),
        description: `Description of item ${i}`,
      },
    };
  });
};

const argTypes = getStoryArgTypes();
const itemTypes = ['foo', 'bar', 'baz', 'elastic'];
const mockItems: UserContentCommonSchema[] = createMockItems(500);

export const ConnectedComponent = (params: Params) => {
  const findItems = (searchQuery: string) => {
    const hits = mockItems
      .filter((_, i) => i < params.numberOfItemsToRender)
      .filter((item) => {
        return (
          item.attributes.title.includes(searchQuery) ||
          item.attributes.description?.includes(searchQuery)
        );
      });

    return Promise.resolve({
      total: hits.length,
      hits,
    });
  };

  return (
    <TableListViewProvider {...getStoryServices(params, action)}>
      <Component
        // Added key to force a refresh of the component state
        key={`${params.initialFilter}-${params.initialPageSize}`}
        findItems={findItems}
        getDetailViewLink={() => 'http://elastic.co'}
        createItem={
          params.canCreateItem
            ? () => {
                action('Create item')();
              }
            : undefined
        }
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
        customTableColumn={
          params.showCustomColumn
            ? {
                field: 'attributes.type',
                name: 'Type',
              }
            : undefined
        }
        {...params}
      />
    </TableListViewProvider>
  );
};

ConnectedComponent.argTypes = argTypes;
