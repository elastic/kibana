/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { FC } from 'react';
import { ComponentStory } from '@storybook/react';
import { I18nProvider } from '@kbn/i18n-react';
import { EuiForm } from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/common';
import { action } from '@storybook/addon-actions';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { Filter } from '@kbn/es-query';
import { getFiltersMock, getFiltersMockOrHide } from '../__mock__/filters';
import FiltersBuilder, { FiltersBuilderProps } from '../filters_builder';

export default {
  title: 'Filters Builder',
  component: FiltersBuilder,
  decorators: [(story: Function) => <EuiForm>{story()}</EuiForm>],
};

const Template: ComponentStory<FC<FiltersBuilderProps>> = (args) => <FiltersBuilder {...args} />;

export const Default = Template.bind({});

Default.decorators = [
  (Story) => (
    <I18nProvider>
      <KibanaContextProvider services={services}>
        <Story />
      </KibanaContextProvider>
    </I18nProvider>
  ),
];

const mockedDataView = {
  id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
  title: 'logstash-*',
  fields: [
    {
      name: 'category.keyword',
      type: 'string',
      esTypes: ['integer'],
      aggregatable: true,
      filterable: true,
      searchable: true,
    },
  ],
} as DataView;

const filters = getFiltersMock();

Default.args = {
  filters,
  dataView: mockedDataView,
  onChange: (f: Filter[]) => {},
  hideOr: false,
};

export const withoutOR = Template.bind({});
withoutOR.args = { ...Default.args, filters: getFiltersMockOrHide(), hideOr: true };

withoutOR.decorators = [
  (Story) => (
    <I18nProvider>
      <KibanaContextProvider services={services}>
        <Story />
      </KibanaContextProvider>
    </I18nProvider>
  ),
];

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
    get: () => true,
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
                        index: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
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
    dataViews: {
      getIdsWithTitle: () => [
        { id: '8a0b7cd0-b0c4-11ec-92b2-73d62e0d28a9', title: 'logstash-*' },
        { id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f', title: 'test-*' },
      ],
    },
  },
  unifiedSearch: {
    autocomplete: {
      hasQuerySuggestions: () => Promise.resolve(false),
      getQuerySuggestions: () => [],
      getValueSuggestions: () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve([]);
          }, 300);
        }),
    },
  },
};
