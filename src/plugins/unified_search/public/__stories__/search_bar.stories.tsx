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
        name: 'response',
        type: 'number',
        esTypes: ['integer'],
        aggregatable: true,
        filterable: true,
        searchable: true,
      },
    ],
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

setIndexPatterns({
  get: () => Promise.resolve(mockIndexPatterns[0]),
} as unknown as DataViewsContract);

function wrapSearchBarInContext(testProps: SearchBarProps<Query>) {
  const defaultOptions = {
    appName: 'test',
    timeHistory: mockTimeHistory,
    intl: null as any,
    showQueryBar: true,
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

export default {
  title: 'SearchBar',
};

export const Default = () => wrapSearchBarInContext({ showQueryInput: true } as SearchBarProps);

Default.story = {
  name: 'default',
};

export const WithDataviewPicker = () =>
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
  } as SearchBarProps);

WithDataviewPicker.story = {
  name: 'with dataviewPicker',
};

export const WithDataviewPickerEnhanced = () =>
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
  } as SearchBarProps);

WithDataviewPickerEnhanced.story = {
  name: 'with dataviewPicker enhanced',
};

export const WithFilterBarOff = () =>
  wrapSearchBarInContext({
    showFilterBar: false,
  } as SearchBarProps);

WithFilterBarOff.story = {
  name: 'with filterBar off',
};

export const WithQueryInputOff = () =>
  wrapSearchBarInContext({
    showQueryInput: false,
  } as SearchBarProps);

WithQueryInputOff.story = {
  name: 'with query input off',
};

export const WithDatePickerOff = () =>
  wrapSearchBarInContext({
    showDatePicker: false,
  } as SearchBarProps);

WithDatePickerOff.story = {
  name: 'with date picker off',
};

export const _WithDatePickerOff = () =>
  wrapSearchBarInContext({
    showDatePicker: false,
  } as SearchBarProps);

_WithDatePickerOff.story = {
  name: 'with date picker off',
};

export const WithOnlyTheDatePickerOn = () =>
  wrapSearchBarInContext({
    showDatePicker: true,
    showFilterBar: false,
    showQueryInput: false,
  } as SearchBarProps);

WithOnlyTheDatePickerOn.story = {
  name: 'with only the date picker on',
};

export const WithOnlyTheFilterBarOn = () =>
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
  } as unknown as SearchBarProps);

WithOnlyTheFilterBarOn.story = {
  name: 'with only the filter bar on',
};

export const WithOnlyTheQueryBarOn = () =>
  wrapSearchBarInContext({
    showDatePicker: false,
    showFilterBar: false,
    showQueryInput: true,
    query: { query: 'Test: miaou', language: 'kuery' },
  } as unknown as SearchBarProps);

WithOnlyTheQueryBarOn.story = {
  name: 'with only the query bar on',
};

export const WithOnlyTheFilterBarAndTheDatePickerOn = () =>
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
  } as unknown as SearchBarProps);

WithOnlyTheFilterBarAndTheDatePickerOn.story = {
  name: 'with only the filter bar and the date picker on',
};

export const WithLoadedSavedQueryWithoutChanges = () =>
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
  } as unknown as SearchBarProps);

WithLoadedSavedQueryWithoutChanges.story = {
  name: 'with loaded saved query without changes',
};

export const WithLoadedSavedQueryWithChanges = () =>
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
  } as unknown as SearchBarProps);

WithLoadedSavedQueryWithChanges.story = {
  name: 'with loaded saved query with changes',
};

export const ShowOnlyQueryBarWithoutSubmit = () =>
  wrapSearchBarInContext({
    showDatePicker: false,
    showFilterBar: false,
    showAutoRefreshOnly: false,
    showQueryInput: true,
    showSubmitButton: false,
  } as SearchBarProps);

ShowOnlyQueryBarWithoutSubmit.story = {
  name: 'show only query bar without submit',
};

export const ShowOnlyDatepickerWithoutSubmit = () =>
  wrapSearchBarInContext({
    showDatePicker: true,
    showFilterBar: false,
    showAutoRefreshOnly: false,
    showQueryInput: false,
    showSubmitButton: false,
  } as SearchBarProps);

ShowOnlyDatepickerWithoutSubmit.story = {
  name: 'show only datepicker without submit',
};

export const ShowOnlyQueryBarAndTimepickerWithoutSubmit = () =>
  wrapSearchBarInContext({
    showDatePicker: true,
    showFilterBar: false,
    showAutoRefreshOnly: false,
    showQueryInput: true,
    showSubmitButton: false,
  } as SearchBarProps);

ShowOnlyQueryBarAndTimepickerWithoutSubmit.story = {
  name: 'show only query bar and timepicker without submit',
};

export const WithFilterBarOnButPinningOptionIsHiddenFromMenus = () =>
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
  } as unknown as SearchBarProps);

WithFilterBarOnButPinningOptionIsHiddenFromMenus.story = {
  name: 'with filter bar on but pinning option is hidden from menus',
};

export const WithDataviewPickerWithSql = () =>
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
  } as SearchBarProps);

WithDataviewPickerWithSql.story = {
  name: 'with dataviewPicker with SQL',
};

export const WithDataviewPickerWithSqlAndSqlQuery = () =>
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
  } as unknown as SearchBarProps<Query>);

WithDataviewPickerWithSqlAndSqlQuery.story = {
  name: 'with dataviewPicker with SQL and sql query',
};

export const WithDataviewPickerWithSqlAndLargeSqlQuery = () =>
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
  } as unknown as SearchBarProps<Query>);

WithDataviewPickerWithSqlAndLargeSqlQuery.story = {
  name: 'with dataviewPicker with SQL and large sql query',
};

export const WithDataviewPickerWithSqlAndErrorsInSqlQuery = () =>
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
  } as unknown as SearchBarProps<Query>);

WithDataviewPickerWithSqlAndErrorsInSqlQuery.story = {
  name: 'with dataviewPicker with SQL and errors in sql query',
};
