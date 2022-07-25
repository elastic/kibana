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
import type { DataView } from '@kbn/data-views-plugin/common';
import { action } from '@storybook/addon-actions';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { Filter } from '@kbn/es-query';
import { getFiltersMock } from '../__mock__/filters';
import { FiltersEditor, FiltersEditorProps } from '../filters_editor';

export default {
  title: 'Filters Editor',
  component: FiltersEditor,
  decorators: [(story: Function) => <EuiForm>{story()}</EuiForm>],
};

const Template: ComponentStory<FC<FiltersEditorProps>> = (args) => <FiltersEditor {...args} />;

export const Default = Template.bind({});

Default.decorators = [
  (Story) => (
    <IntlProvider locale="en">
      <KibanaContextProvider services={services}>
        <Story />
      </KibanaContextProvider>
    </IntlProvider>
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
    autocomplete: {
      hasQuerySuggestions: () => Promise.resolve(false),
      getQuerySuggestions: () => [],
    },
    dataViews: {
      getIdsWithTitle: () => [
        { id: '8a0b7cd0-b0c4-11ec-92b2-73d62e0d28a9', title: 'logstash-*' },
        { id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f', title: 'test-*' },
      ],
    },
  },
};

Default.args = {
  filters,
  dataView: mockedDataView,
  onChange: (f: Filter[]) => {},
};
