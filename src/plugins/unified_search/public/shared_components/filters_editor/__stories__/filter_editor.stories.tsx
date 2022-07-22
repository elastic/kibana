/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC } from 'react';
import { ComponentStory } from '@storybook/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { EuiForm } from '@elastic/eui';
import type { Filter } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/common';
import { action } from '@storybook/addon-actions';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { FiltersEditor, FiltersEditorProps } from '../filters_editor';

export default {
  title: 'Filters Editor',
  component: FiltersEditor,
  decorators: [(story: Function) => <EuiForm>{story()}</EuiForm>],
};

const Template: ComponentStory<FC<FiltersEditorProps>> = (args) => <FiltersEditor {...args} />;

export const Default = Template.bind({});

Template.decorators = [
  (Story) => (
    <IntlProvider locale="en">
      <KibanaContextProvider services={services}>
        <Story />
      </KibanaContextProvider>
    </IntlProvider>
  ),
];

const mockedDataView = {
  id: '1234',
  title: 'logstash-*',
  fields: [
    {
      name: 'response',
      type: 'number',
      esTypes: ['integer'],
      aggregatable: true,
      filterable: true,
      searchable: true,
    },
  ],
} as DataView;

const filters: Filter[] = [
  {
    meta: {
      index: '1234',
      type: 'phrase',
      key: 'category.keyword',
      params: {
        query: 'Filter 1',
      },
    },
  },
  {
    meta: {
      params: {
        conditionalType: 'or',
        filters: [
          {
            meta: {
              index: '1234',
              type: 'phrase',
              key: 'category.keyword',
              params: {
                query: 'Filter 2',
              },
            },
          },
          {
            meta: {
              params: {
                conditionalType: 'and',
                filters: [
                  {
                    meta: {
                      index: '1234',
                      type: 'phrase',
                      key: 'category.keyword',
                      params: {
                        query: 'Filter 2-1',
                      },
                    },
                  },
                  {
                    meta: {
                      index: '1234',
                      type: 'phrase',
                      key: 'category.keyword',
                      params: {
                        query: 'Filter 2-2',
                      },
                    },
                  },
                ],
              },
            },
          },
          {
            meta: {
              index: '1234',
              type: 'phrase',
              key: 'category.keyword',
              params: {
                query: 'Filter 3',
              },
            },
          },
        ],
      },
    },
  },
  {
    meta: {
      index: '1234',
      type: 'phrase',
      key: 'category.keyword',
      params: {
        query: 'Filter 4',
      },
    },
  },
] as Filter[];

const createMockWebStorage = () => ({
  clear: action('clear'),
  getItem: action('getItem'),
  key: action('key'),
  removeItem: action('removeItem'),
  setItem: action('setItem'),
  length: 0,
});

const createMockStorage = () => ({
  storage: createMockWebStorage(),
  set: action('set'),
  remove: action('remove'),
  clear: action('clear'),
  get: () => true,
});

const services = {
  uiSettings: {
    get: () => {},
  },
  savedObjects: action('savedObjects'),
  notifications: action('notifications'),
  http: {
    basePath: {
      prepend: () => 'http://test',
    },
  },
  docLinks: {
    links: {
      query: {
        kueryQuerySyntax: '',
      },
    },
  },
  storage: createMockStorage(),
  data: {
    query: {
      savedQueries: {
        findSavedQueries: () =>
          Promise.resolve({
            queries: [
              {
                id: 'testwewe',
                attributes: {
                  title: 'Saved query 1',
                  description: '',
                  query: {
                    query: 'category.keyword : "Men\'s Shoes" ',
                    language: 'kuery',
                  },
                  filters: [],
                },
              },
              {
                id: '0173d0d0-b19a-11ec-8323-837d6b231b82',
                attributes: {
                  title: 'test',
                  description: '',
                  query: {
                    query: '',
                    language: 'kuery',
                  },
                  filters: [
                    {
                      meta: {
                        index: '1234',
                        alias: null,
                        negate: false,
                        disabled: false,
                        type: 'phrase',
                        key: 'category.keyword',
                        params: {
                          query: "Men's Accessories",
                        },
                      },
                      query: {
                        match_phrase: {
                          'category.keyword': "Men's Accessories",
                        },
                      },
                      $state: {
                        store: 'appState',
                      },
                    },
                  ],
                },
              },
            ],
          }),
      },
    },
    autocomplete: {
      hasQuerySuggestions: () => Promise.resolve(false),
      getQuerySuggestions: () => [],
    },
    dataViews: {
      getIdsWithTitle: () => [
        { id: '1234', title: 'logstash-*' },
        { id: '1235', title: 'test-*' },
      ],
    },
  },
};

Default.args = {
  filters,
  dataView: mockedDataView,
  onChange: (filters) => {},
};
