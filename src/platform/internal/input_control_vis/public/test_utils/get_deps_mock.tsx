/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { InputControlVisDependencies } from '../plugin';
import { getSearchSourceMock } from './get_search_service_mock';

const fields = [] as any;
fields.push({ name: 'myField' } as any);
fields.getByName = (name: any) => {
  return fields.find(({ name: n }: { name: string }) => n === name);
};
fields.getAll = () => [...fields];

export const getDepsMock = ({
  searchSource = {
    create: getSearchSourceMock(),
  },
} = {}): InputControlVisDependencies =>
  ({
    core: {
      getStartServices: jest.fn().mockReturnValue([
        null,
        {
          data: {
            search: {
              searchSource,
            },
            indexPatterns: {
              get: () => ({
                fields,
              }),
            },
          },
          unifiedSearch: {
            ui: {
              IndexPatternSelect: () => (<div />) as any,
            },
          },
        },
      ]),
    },
    getSettings: jest.fn().mockImplementation(() => {
      return Promise.resolve({
        autocompleteTimeout: 1000,
        autocompleteTerminateAfter: 100000,
      });
    }),
    data: {
      search: {
        searchSource: {
          create: getSearchSourceMock(),
        },
      },
      query: {
        filterManager: {
          fieldName: 'myField',
          getIndexPattern: () => ({
            fields,
          }),
          getAppFilters: jest.fn().mockImplementation(() => []),
          getGlobalFilters: jest.fn().mockImplementation(() => []),
        },
        timefilter: {
          timefilter: {},
        },
      },
    },
  } as any);
