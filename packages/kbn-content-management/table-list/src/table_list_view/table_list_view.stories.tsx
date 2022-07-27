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

import { TableListView as Component } from './table_list_view';
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

export const TableListView = (params: Params) => {
  return (
    <TableListViewProvider {...getStoryServices(params, action)}>
      <Component
        entityName="Dashboard"
        entityNamePlural="Dashboards"
        tableListTitle="Dashboards"
        listingLimit={20}
        initialFilter=""
        initialPageSize={20}
        rowHeader="title"
        tableCaption="Some caption for the table"
        findItems={() => {
          action('findItems');
          return Promise.resolve({
            total: 1,
            hits: [
              {
                id: '123',
                references: [],
                updatedAt: '2022-28-07T10:00:00',
                attributes: {
                  title: 'My first dashboard',
                  description: 'Some description',
                },
              },
            ],
          });
        }}
        getDetailViewLink={() => ''}
        {...params}
      />
    </TableListViewProvider>
  );
};

TableListView.argTypes = argTypes;
