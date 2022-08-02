/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import SearchBar from './search_bar';

import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { I18nProvider } from '@kbn/i18n-react';

import { coreMock } from '@kbn/core/public/mocks';
const startMock = coreMock.createStart();

import { mount } from 'enzyme';
import { DataView } from '@kbn/data-views-plugin/public';
import { EuiThemeProvider } from '@elastic/eui';

const mockTimeHistory = {
  get: () => {
    return [];
  },
  add: jest.fn(),
  get$: () => {
    return {
      pipe: () => {},
    };
  },
};

const noop = jest.fn();

const createMockWebStorage = () => ({
  clear: jest.fn(),
  getItem: jest.fn(),
  key: jest.fn(),
  removeItem: jest.fn(),
  setItem: jest.fn(),
  length: 0,
});

const createMockStorage = () => ({
  storage: createMockWebStorage(),
  get: jest.fn(),
  set: jest.fn(),
  remove: jest.fn(),
  clear: jest.fn(),
});

const mockIndexPattern = {
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

const kqlQuery = {
  query: 'response:200',
  language: 'kuery',
};

const sqlQuery = {
  sql: 'SELECT * from test',
};

function wrapSearchBarInContext(testProps: any) {
  const defaultOptions = {
    appName: 'test',
    timeHistory: mockTimeHistory,
    intl: null as any,
  };

  const services = {
    uiSettings: startMock.uiSettings,
    savedObjects: startMock.savedObjects,
    notifications: startMock.notifications,
    http: startMock.http,
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
              ],
            }),
        },
      },
    },
  };

  return (
    <EuiThemeProvider>
      <I18nProvider>
        <KibanaContextProvider services={services}>
          <SearchBar.WrappedComponent {...defaultOptions} {...testProps} />
        </KibanaContextProvider>
      </I18nProvider>
    </EuiThemeProvider>
  );
}

describe('SearchBar', () => {
  const SEARCH_BAR_ROOT = '.uniSearchBar';
  const FILTER_BAR = '[data-test-subj="unifiedFilterBar"]';
  const QUERY_BAR = '.kbnQueryBar';
  const QUERY_INPUT = '[data-test-subj="unifiedQueryInput"]';
  const EDITOR = '[data-test-subj="unifiedTextLangEditor"]';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Should render query bar when no options provided (in reality - timepicker)', () => {
    const component = mount(
      wrapSearchBarInContext({
        indexPatterns: [mockIndexPattern],
      })
    );

    expect(component.find(SEARCH_BAR_ROOT)).toBeTruthy();
    expect(component.find(FILTER_BAR).length).toBeFalsy();
    expect(component.find(QUERY_BAR).length).toBeTruthy();
  });

  it('Should render filter bar, when required fields are provided', () => {
    const component = mount(
      wrapSearchBarInContext({
        indexPatterns: [mockIndexPattern],
        showDatePicker: false,
        showQueryInput: true,
        showFilterBar: true,
        onFiltersUpdated: noop,
        filters: [],
      })
    );

    expect(component.find(SEARCH_BAR_ROOT)).toBeTruthy();
    expect(component.find(FILTER_BAR).length).toBeTruthy();
    expect(component.find(QUERY_BAR).length).toBeTruthy();
  });

  it('Should NOT render filter bar, if disabled', () => {
    const component = mount(
      wrapSearchBarInContext({
        indexPatterns: [mockIndexPattern],
        showFilterBar: false,
        filters: [],
        onFiltersUpdated: noop,
        showDatePicker: false,
      })
    );

    expect(component.find(SEARCH_BAR_ROOT)).toBeTruthy();
    expect(component.find(FILTER_BAR).length).toBeFalsy();
    expect(component.find(QUERY_BAR).length).toBeTruthy();
  });

  it('Should render query bar, when required fields are provided', () => {
    const component = mount(
      wrapSearchBarInContext({
        indexPatterns: [mockIndexPattern],
        screenTitle: 'test screen',
        onQuerySubmit: noop,
        query: kqlQuery,
      })
    );

    expect(component.find(SEARCH_BAR_ROOT)).toBeTruthy();
    expect(component.find(FILTER_BAR).length).toBeFalsy();
    expect(component.find(QUERY_BAR).length).toBeTruthy();
  });

  it('Should NOT render the input query input, if disabled', () => {
    const component = mount(
      wrapSearchBarInContext({
        indexPatterns: [mockIndexPattern],
        screenTitle: 'test screen',
        onQuerySubmit: noop,
        query: kqlQuery,
        showQueryBar: false,
        showQueryInput: false,
      })
    );

    expect(component.find(SEARCH_BAR_ROOT)).toBeTruthy();
    expect(component.find(FILTER_BAR).length).toBeFalsy();
    expect(component.find(QUERY_INPUT).length).toBeFalsy();
  });

  it('Should render query bar and filter bar', () => {
    const component = mount(
      wrapSearchBarInContext({
        indexPatterns: [mockIndexPattern],
        screenTitle: 'test screen',
        showQueryInput: true,
        onQuerySubmit: noop,
        query: kqlQuery,
        filters: [],
        onFiltersUpdated: noop,
      })
    );

    expect(component.find(SEARCH_BAR_ROOT)).toBeTruthy();
    expect(component.find(FILTER_BAR).length).toBeTruthy();
    expect(component.find(QUERY_BAR).length).toBeTruthy();
    expect(component.find(QUERY_INPUT).length).toBeTruthy();
  });

  it('Should NOT render the input query input, for sql query', () => {
    const component = mount(
      wrapSearchBarInContext({
        indexPatterns: [mockIndexPattern],
        screenTitle: 'test screen',
        onQuerySubmit: noop,
        query: sqlQuery,
      })
    );
    expect(component.find(QUERY_INPUT).length).toBeFalsy();
    expect(component.find(EDITOR).length).toBeTruthy();
  });
});
