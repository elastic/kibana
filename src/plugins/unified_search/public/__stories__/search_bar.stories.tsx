/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { action } from '@storybook/addon-actions';
import type { Query } from '@kbn/es-query';
import { storiesOf } from '@storybook/react';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { DataView, DataViewsContract } from '@kbn/data-views-plugin/public';
import { SearchBar, SearchBarProps } from '../search_bar';
import { setIndexPatterns } from '../services';

const mockIndexPatterns = [
  {
    id: '1234',
    title: 'logstash-*',
    fields: [
      {
        name: 'bytes',
        type: 'number',
        esTypes: ['integer'],
        aggregatable: true,
        filterable: true,
        searchable: true,
      },
    ],
    getName: () => 'logstash-*',
  },
  {
    id: '1235',
    title: 'test-*',
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
    getName: () => 'test-*',
  },
] as DataView[];

const mockTimeHistory = {
  get: () => {
    return [];
  },
  add: action('set'),
  get$: () => {
    return {
      pipe: () => {},
    };
  },
};

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
  autocomplete: {
    hasQuerySuggestions: () => Promise.resolve(false),
    getQuerySuggestions: () => [],
  },
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
    dataViewEditor: {
      userPermissions: {
        editDataView: action('editDataView'),
      },
    },
    dataViews: {
      getIdsWithTitle: () => [
        { id: '1234', title: 'logstash-*' },
        { id: '1235', title: 'test-*' },
      ],
    },
  },
  docLinks: {
    links: {
      query: {
        kueryQuerySyntax: '',
      },
    },
  },
  http: {
    basePath: {
      prepend: () => 'http://test',
    },
  },
  notifications: action('notifications'),
  savedObjects: action('savedObjects'),
  storage: createMockStorage(),
  uiSettings: {
    get: () => {},
  },
  usageCollection: {
    reportUiCounter: () => {},
  },
};

setIndexPatterns({
  get: () => Promise.resolve(mockIndexPatterns[0]),
} as unknown as DataViewsContract);

function wrapSearchBarInContext(testProps: SearchBarProps<Query>) {
  const defaultOptions = {
    appName: 'test',
    timeHistory: mockTimeHistory,
    intl: null as any,
    showFilterBar: true,
    showDatePicker: true,
    showAutoRefreshOnly: false,
    showSaveQuery: true,
    showQueryInput: true,
    indexPatterns: mockIndexPatterns,
    dateRangeFrom: 'now-15m',
    dateRangeTo: 'now',
    query: { query: '', language: 'kuery' },
    filters: [],
    onClearSavedQuery: action('onClearSavedQuery'),
    onFiltersUpdated: action('onFiltersUpdated'),
  } as unknown as SearchBarProps<Query>;

  return (
    <I18nProvider>
      <KibanaContextProvider services={services}>
        <SearchBar<Query> {...defaultOptions} {...testProps} />
      </KibanaContextProvider>
    </I18nProvider>
  );
}

storiesOf('SearchBar', module)
  .add('default', () => wrapSearchBarInContext({ showQueryInput: true } as SearchBarProps))
  .add('with dataviewPicker', () =>
    wrapSearchBarInContext({
      dataViewPickerComponentProps: {
        currentDataViewId: '1234',
        trigger: {
          'data-test-subj': 'dataView-switch-link',
          label: 'logstash-*',
          title: 'logstash-*',
        },
        onChangeDataView: action('onChangeDataView'),
      },
    } as SearchBarProps)
  )
  .add('with dataviewPicker enhanced', () =>
    wrapSearchBarInContext({
      dataViewPickerComponentProps: {
        currentDataViewId: '1234',
        trigger: {
          'data-test-subj': 'dataView-switch-link',
          label: 'logstash-*',
          title: 'logstash-*',
        },
        onChangeDataView: action('onChangeDataView'),
        onAddField: action('onAddField'),
        onDataViewCreated: action('onDataViewCreated'),
      },
    } as SearchBarProps)
  )
  .add('with filterBar off', () =>
    wrapSearchBarInContext({
      showFilterBar: false,
    } as SearchBarProps)
  )
  .add('with query input off', () =>
    wrapSearchBarInContext({
      showQueryInput: false,
    } as SearchBarProps)
  )
  .add('with date picker off', () =>
    wrapSearchBarInContext({
      showDatePicker: false,
    } as SearchBarProps)
  )
  .add('with date picker off', () =>
    wrapSearchBarInContext({
      showDatePicker: false,
    } as SearchBarProps)
  )
  .add('with only the date picker on', () =>
    wrapSearchBarInContext({
      showDatePicker: true,
      showFilterBar: false,
      showQueryInput: false,
    } as SearchBarProps)
  )
  .add('with only the filter bar on', () =>
    wrapSearchBarInContext({
      showDatePicker: false,
      showFilterBar: true,
      showQueryInput: false,
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
    } as unknown as SearchBarProps)
  )
  .add('with only the query bar on', () =>
    wrapSearchBarInContext({
      showDatePicker: false,
      showFilterBar: false,
      showQueryInput: true,
      query: { query: 'Test: miaou', language: 'kuery' },
    } as unknown as SearchBarProps)
  )
  .add('with query menu off', () =>
    wrapSearchBarInContext({
      showDatePicker: false,
      showFilterBar: false,
      showQueryInput: true,
      showQueryMenu: false,
      query: { query: 'Test: miaou', language: 'kuery' },
    } as unknown as SearchBarProps)
  )
  .add('with only the filter bar and the date picker on', () =>
    wrapSearchBarInContext({
      showDatePicker: true,
      showFilterBar: true,
      showQueryInput: false,
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
    } as unknown as SearchBarProps)
  )
  .add('with loaded saved query without changes', () =>
    wrapSearchBarInContext({
      savedQuery: {
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
    } as unknown as SearchBarProps)
  )
  .add('with loaded saved query with changes', () =>
    wrapSearchBarInContext({
      savedQuery: {
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
    } as unknown as SearchBarProps)
  )
  .add('show only query bar without submit', () =>
    wrapSearchBarInContext({
      showDatePicker: false,
      showFilterBar: false,
      showAutoRefreshOnly: false,
      showQueryInput: true,
      showSubmitButton: false,
    } as SearchBarProps)
  )
  .add('show only datepicker without submit', () =>
    wrapSearchBarInContext({
      showDatePicker: true,
      showFilterBar: false,
      showAutoRefreshOnly: false,
      showQueryInput: false,
      showSubmitButton: false,
    } as SearchBarProps)
  )
  .add('show only query bar and timepicker without submit', () =>
    wrapSearchBarInContext({
      showDatePicker: true,
      showFilterBar: false,
      showAutoRefreshOnly: false,
      showQueryInput: true,
      showSubmitButton: false,
    } as SearchBarProps)
  )
  .add('with filter bar on but pinning option is hidden from menus', () =>
    wrapSearchBarInContext({
      showDatePicker: false,
      showFilterBar: true,
      showQueryInput: true,
      hiddenFilterPanelOptions: ['pinFilter'],
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
    } as unknown as SearchBarProps)
  )
  .add('with dataviewPicker with SQL', () =>
    wrapSearchBarInContext({
      dataViewPickerComponentProps: {
        currentDataViewId: '1234',
        trigger: {
          'data-test-subj': 'dataView-switch-link',
          label: 'logstash-*',
          title: 'logstash-*',
        },
        onChangeDataView: action('onChangeDataView'),
        onAddField: action('onAddField'),
        onDataViewCreated: action('onDataViewCreated'),
        textBasedLanguages: ['SQL'],
      },
    } as SearchBarProps)
  )
  .add('with dataviewPicker with SQL and sql query', () =>
    wrapSearchBarInContext({
      dataViewPickerComponentProps: {
        currentDataViewId: '1234',
        trigger: {
          'data-test-subj': 'dataView-switch-link',
          label: 'SQL',
          title: 'SQL',
        },
        onChangeDataView: action('onChangeDataView'),
        onAddField: action('onAddField'),
        onDataViewCreated: action('onDataViewCreated'),
        textBasedLanguages: ['SQL'],
      },
      query: { sql: 'SELECT field1, field2 FROM DATAVIEW' },
    } as unknown as SearchBarProps<Query>)
  )
  .add('with dataviewPicker with SQL and large sql query', () =>
    wrapSearchBarInContext({
      dataViewPickerComponentProps: {
        currentDataViewId: '1234',
        trigger: {
          'data-test-subj': 'dataView-switch-link',
          label: 'SQL',
          title: 'SQL',
        },
        onChangeDataView: action('onChangeDataView'),
        onAddField: action('onAddField'),
        onDataViewCreated: action('onDataViewCreated'),
        textBasedLanguages: ['SQL'],
      },
      query: {
        sql: 'SELECT field1, field2, field 3, field 4, field 5 FROM DATAVIEW WHERE field5 IS NOT NULL AND field4 IS NULL',
      },
    } as unknown as SearchBarProps<Query>)
  )
  .add('with dataviewPicker with SQL and errors in sql query', () =>
    wrapSearchBarInContext({
      dataViewPickerComponentProps: {
        currentDataViewId: '1234',
        trigger: {
          'data-test-subj': 'dataView-switch-link',
          label: 'SQL',
          title: 'SQL',
        },
        onChangeDataView: action('onChangeDataView'),
        onAddField: action('onAddField'),
        onDataViewCreated: action('onDataViewCreated'),
        textBasedLanguages: ['SQL'],
      },
      textBasedLanguageModeErrors: [
        new Error(
          '[essql] > Unexpected error from Elasticsearch: verification_exception - Found 1 problem line 1:16: Unknown column [field10]'
        ),
      ],
      query: { sql: 'SELECT field1, field10 FROM DATAVIEW' },
    } as unknown as SearchBarProps<Query>)
  )
  .add('in disabled state', () =>
    wrapSearchBarInContext({
      dataViewPickerComponentProps: {
        currentDataViewId: '1234',
        trigger: {
          'data-test-subj': 'dataView-switch-link',
          label: 'logstash-*',
          title: 'logstash-*',
        },
        onChangeDataView: action('onChangeDataView'),
      },
      isDisabled: true,
    } as SearchBarProps)
  )
  .add('no submit button', () =>
    wrapSearchBarInContext({
      dataViewPickerComponentProps: {
        currentDataViewId: '1234',
        trigger: {
          'data-test-subj': 'dataView-switch-link',
          label: 'logstash-*',
          title: 'logstash-*',
        },
        onChangeDataView: action('onChangeDataView'),
      },
      showSubmitButton: false,
    } as SearchBarProps)
  )
  .add('submit button always as icon', () =>
    wrapSearchBarInContext({
      dataViewPickerComponentProps: {
        currentDataViewId: '1234',
        trigger: {
          'data-test-subj': 'dataView-switch-link',
          label: 'logstash-*',
          title: 'logstash-*',
        },
        onChangeDataView: action('onChangeDataView'),
      },
      submitButtonStyle: 'iconOnly',
    } as SearchBarProps)
  )
  .add('submit button always as a full button', () =>
    wrapSearchBarInContext({
      dataViewPickerComponentProps: {
        currentDataViewId: '1234',
        trigger: {
          'data-test-subj': 'dataView-switch-link',
          label: 'logstash-*',
          title: 'logstash-*',
        },
        onChangeDataView: action('onChangeDataView'),
      },
      submitButtonStyle: 'full',
    } as SearchBarProps)
  );
