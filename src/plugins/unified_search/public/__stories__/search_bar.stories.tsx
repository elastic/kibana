/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { action } from '@storybook/addon-actions';
import { DataViewBase, Query } from '@kbn/es-query';
import { storiesOf } from '@storybook/react';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { DataView, DataViewsContract } from '@kbn/data-views-plugin/public';
import { buildExistsFilter } from '@kbn/es-query';
import { EuiButton, EuiComboBox } from '@elastic/eui';
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
  uiSettings: {
    get: () => {},
  },
  settings: { client: { get: () => {} } },
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
  dataViewEditor: {
    userPermissions: {
      editDataView: action('editDataView'),
    },
  },
};

const defaultCapabilities = {
  savedObjectsManagement: {
    edit: true,
  },
};

setIndexPatterns({
  get: () => Promise.resolve(mockIndexPatterns[0]),
} as unknown as DataViewsContract);

function wrapSearchBarInContext(
  testProps: Partial<SearchBarProps<Query>>,
  capabilities: typeof defaultCapabilities = defaultCapabilities
) {
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

  const kbnServices = {
    ...services,
    application: {
      capabilities,
    },
  };

  return (
    <I18nProvider>
      <KibanaContextProvider services={kbnServices}>
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
    })
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
    })
  )
  .add('with filterBar off', () =>
    wrapSearchBarInContext({
      showFilterBar: false,
    })
  )
  .add('with query input off', () =>
    wrapSearchBarInContext({
      showQueryInput: false,
    })
  )
  .add('with date picker off', () =>
    wrapSearchBarInContext({
      showDatePicker: false,
    })
  )
  .add('with disabled "Save query" menu', () =>
    wrapSearchBarInContext({
      showSaveQuery: false,
    })
  )
  .add('with hidden "Manage saved objects" link in "Load saved query" menu', () =>
    wrapSearchBarInContext(
      {},
      {
        savedObjectsManagement: {
          edit: false,
        },
      }
    )
  )
  .add('with the default date picker auto refresh interval on', () =>
    wrapSearchBarInContext({
      showDatePicker: true,
      onRefreshChange: action('onRefreshChange'),
    })
  )
  .add('with the default date picker auto refresh interval off', () =>
    wrapSearchBarInContext({
      showDatePicker: true,
      isAutoRefreshDisabled: true,
    })
  )
  .add('with only the date picker on', () =>
    wrapSearchBarInContext({
      showDatePicker: true,
      showFilterBar: false,
      showQueryInput: false,
    })
  )
  .add('with additional filters used for suggestions', () =>
    wrapSearchBarInContext({
      filtersForSuggestions: [
        buildExistsFilter({ type: 'keyword', name: 'geo.src' }, {
          id: undefined,
        } as unknown as DataViewBase),
      ],
    } as unknown as SearchBarProps)
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
  .add('with prepended controls', () =>
    wrapSearchBarInContext({
      prependFilterBar: (
        <EuiComboBox
          placeholder="Select option"
          options={[
            {
              label: 'Filter 1',
            },
          ]}
          fullWidth={false}
          isClearable={true}
        />
      ),
      showQueryInput: true,
    })
  )
  .add('without switch query language', () =>
    wrapSearchBarInContext({
      disableQueryLanguageSwitcher: true,
    })
  )
  .add('show only query bar without submit', () =>
    wrapSearchBarInContext({
      showDatePicker: false,
      showFilterBar: false,
      showAutoRefreshOnly: false,
      showQueryInput: true,
      showSubmitButton: false,
    })
  )
  .add('show only datepicker without submit', () =>
    wrapSearchBarInContext({
      showDatePicker: true,
      showFilterBar: false,
      showAutoRefreshOnly: false,
      showQueryInput: false,
      showSubmitButton: false,
    })
  )
  .add('show only query bar and timepicker without submit', () =>
    wrapSearchBarInContext({
      showDatePicker: true,
      showFilterBar: false,
      showAutoRefreshOnly: false,
      showQueryInput: true,
      showSubmitButton: false,
    })
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
  .add('with dataviewPicker with ES|QL', () =>
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
        textBasedLanguages: ['ESQL'],
      },
    } as SearchBarProps)
  )
  .add('with dataviewPicker with ES|QL and ES|QL query', () =>
    wrapSearchBarInContext({
      dataViewPickerComponentProps: {
        currentDataViewId: '1234',
        trigger: {
          'data-test-subj': 'dataView-switch-link',
          label: 'ES|QL',
          title: 'ESQL',
        },
        onChangeDataView: action('onChangeDataView'),
        onAddField: action('onAddField'),
        onDataViewCreated: action('onDataViewCreated'),
        textBasedLanguages: ['ESQL'],
      },
      query: { esql: 'from dataview | project field1, field2' },
    } as unknown as SearchBarProps<Query>)
  )
  .add('with dataviewPicker with ES|QL and large ES|QL query', () =>
    wrapSearchBarInContext({
      dataViewPickerComponentProps: {
        currentDataViewId: '1234',
        trigger: {
          'data-test-subj': 'dataView-switch-link',
          label: 'ES|QL',
          title: 'ESQL',
        },
        onChangeDataView: action('onChangeDataView'),
        onAddField: action('onAddField'),
        onDataViewCreated: action('onDataViewCreated'),
        textBasedLanguages: ['ESQL'],
      },
      query: {
        esql: 'from dataview | project field1, field2, field 3, field 4, field 5 | where field5 > 5 | stats var = avg(field3)',
      },
    } as unknown as SearchBarProps<Query>)
  )
  .add('with dataviewPicker with ES|QL and errors in ES|QL query', () =>
    wrapSearchBarInContext({
      dataViewPickerComponentProps: {
        currentDataViewId: '1234',
        trigger: {
          'data-test-subj': 'dataView-switch-link',
          label: 'ES|QL',
          title: 'ESQL',
        },
        onChangeDataView: action('onChangeDataView'),
        onAddField: action('onAddField'),
        onDataViewCreated: action('onDataViewCreated'),
        textBasedLanguages: ['ESQL'],
      },
      textBasedLanguageModeErrors: [
        new Error(
          '[esql] > Unexpected error from Elasticsearch: verification_exception - Found 1 problem line 1:16: Unknown column [field10]'
        ),
      ],
      query: { esql: 'from dataview | project field10' },
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
    })
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
    })
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
    })
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
    })
  )

  .add('with renderQueryInputAppend prop', () =>
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
      renderQueryInputAppend: () => <EuiButton onClick={() => {}}>Append</EuiButton>,
    })
  )
  .add('with additional query bar menu items', () =>
    wrapSearchBarInContext({
      showFilterBar: true,
      additionalQueryBarMenuItems: {
        items: [
          {
            name: 'Observability rule types',
            icon: 'logoObservability',
          },
          {
            name: 'Security rule types',
            icon: 'logoSecurity',
          },
          {
            name: 'Status',
            panel: 'status-panel',
          },
        ],
        panels: [
          {
            id: 'status-panel',
            title: 'Status',
            items: [
              {
                name: 'Active',
              },
              {
                name: 'Inactive',
              },
            ],
          },
        ],
      },
    })
  );
