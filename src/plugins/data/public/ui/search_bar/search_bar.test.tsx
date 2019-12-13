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
import { SearchBar } from './search_bar';

import { KibanaContextProvider } from 'src/plugins/kibana_react/public';
import { I18nProvider } from '@kbn/i18n/react';

import { coreMock } from '../../../../../core/public/mocks';
const startMock = coreMock.createStart();

import { mount } from 'enzyme';
import { IIndexPattern } from '../..';

const mockTimeHistory = {
  get: () => {
    return [];
  },
};

jest.mock('../..', () => {
  return {
    FilterBar: () => <div className="filterBar" />,
  };
});

jest.mock('../query_string_input/query_bar_top_row', () => {
  return {
    QueryBarTopRow: () => <div className="queryBar" />,
  };
});

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
} as IIndexPattern;

const kqlQuery = {
  query: 'response:200',
  language: 'kuery',
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
        savedQueries: {},
      },
    },
  };

  return (
    <I18nProvider>
      <KibanaContextProvider services={services}>
        <SearchBar.WrappedComponent {...defaultOptions} {...testProps} />
      </KibanaContextProvider>
    </I18nProvider>
  );
}

describe('SearchBar', () => {
  const SEARCH_BAR_ROOT = '.globalQueryBar';
  const FILTER_BAR = '.filterBar';
  const QUERY_BAR = '.queryBar';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Should render query bar when no options provided (in reality - timepicker)', () => {
    const component = mount(
      wrapSearchBarInContext({
        indexPatterns: [mockIndexPattern],
      })
    );

    expect(component.find(SEARCH_BAR_ROOT).length).toBe(1);
    expect(component.find(FILTER_BAR).length).toBe(0);
    expect(component.find(QUERY_BAR).length).toBe(1);
  });

  it('Should render empty when timepicker is off and no options provided', () => {
    const component = mount(
      wrapSearchBarInContext({
        indexPatterns: [mockIndexPattern],
        showDatePicker: false,
      })
    );

    expect(component.find(SEARCH_BAR_ROOT).length).toBe(1);
    expect(component.find(FILTER_BAR).length).toBe(0);
    expect(component.find(QUERY_BAR).length).toBe(0);
  });

  it('Should render filter bar, when required fields are provided', () => {
    const component = mount(
      wrapSearchBarInContext({
        indexPatterns: [mockIndexPattern],
        showDatePicker: false,
        onFiltersUpdated: noop,
        filters: [],
      })
    );

    expect(component.find(SEARCH_BAR_ROOT).length).toBe(1);
    expect(component.find(FILTER_BAR).length).toBe(1);
    expect(component.find(QUERY_BAR).length).toBe(0);
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

    expect(component.find(SEARCH_BAR_ROOT).length).toBe(1);
    expect(component.find(FILTER_BAR).length).toBe(0);
    expect(component.find(QUERY_BAR).length).toBe(0);
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

    expect(component.find(SEARCH_BAR_ROOT).length).toBe(1);
    expect(component.find(FILTER_BAR).length).toBe(0);
    expect(component.find(QUERY_BAR).length).toBe(1);
  });

  it('Should NOT render query bar, if disabled', () => {
    const component = mount(
      wrapSearchBarInContext({
        indexPatterns: [mockIndexPattern],
        screenTitle: 'test screen',
        onQuerySubmit: noop,
        query: kqlQuery,
        showQueryBar: false,
      })
    );

    expect(component.find(SEARCH_BAR_ROOT).length).toBe(1);
    expect(component.find(FILTER_BAR).length).toBe(0);
    expect(component.find(QUERY_BAR).length).toBe(0);
  });

  it('Should render query bar and filter bar', () => {
    const component = mount(
      wrapSearchBarInContext({
        indexPatterns: [mockIndexPattern],
        screenTitle: 'test screen',
        onQuerySubmit: noop,
        query: kqlQuery,
        filters: [],
        onFiltersUpdated: noop,
      })
    );

    expect(component.find(SEARCH_BAR_ROOT).length).toBe(1);
    expect(component.find(FILTER_BAR).length).toBe(1);
    expect(component.find(QUERY_BAR).length).toBe(1);
  });
});
