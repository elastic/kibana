/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React from 'react';
import { FieldList } from 'src/plugins/data/public';
import { InputControlVisDependencies } from '../../../plugin';

const fields: FieldList = [] as any;
fields.push({ name: 'myField' } as any);
fields.getByName = (name: any) => {
  return fields.find(({ name: n }) => n === name);
};

export const getDepsMock = (): InputControlVisDependencies =>
  ({
    core: {
      getStartServices: jest.fn().mockReturnValue([
        null,
        {
          data: {
            ui: {
              IndexPatternSelect: () => (<div />) as any,
            },
            indexPatterns: {
              get: () => ({
                fields,
              }),
            },
          },
        },
      ]),
      injectedMetadata: {
        getInjectedVar: jest.fn().mockImplementation(key => {
          switch (key) {
            case 'autocompleteTimeout':
              return 1000;
            case 'autocompleteTerminateAfter':
              return 100000;
            default:
              return '';
          }
        }),
      },
    },
    data: {
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
