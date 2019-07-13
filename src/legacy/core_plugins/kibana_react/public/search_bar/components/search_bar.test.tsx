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
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { SearchBar } from './search_bar';

import { coreMock } from 'src/core/public/mocks';

const setupMock = coreMock.createSetup();

jest.mock('../../../../data/public', () => {
  return {
    FilterBar: () => <div className="filterBar"></div>,
    QueryBar: () => <div className="queryBar"></div>,
  };
});

const noop = () => {
  return;
};

const createMockWebStorage = () => ({
  clear: jest.fn(),
  getItem: jest.fn(),
  key: jest.fn(),
  removeItem: jest.fn(),
  setItem: jest.fn(),
  length: 0,
});

const createMockStorage = () => ({
  store: createMockWebStorage(),
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
};

const kqlQuery = {
  query: 'response:200',
  language: 'kuery',
};

describe('SearchBar', () => {
  const SEARCH_BAR_ROOT = '.globalQueryBar';
  const FILTER_BAR = '.filterBar';
  const QUERY_BAR = '.queryBar';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Should render query bar when no options provided (in reality - timepicker)', () => {
    const component = mountWithIntl(
      <SearchBar.WrappedComponent
        uiSettings={setupMock.uiSettings}
        appName={'test'}
        indexPatterns={[mockIndexPattern]}
        intl={null as any}
      />
    );

    expect(component.find(SEARCH_BAR_ROOT).length).toBe(1);
    expect(component.find(FILTER_BAR).length).toBe(0);
    expect(component.find(QUERY_BAR).length).toBe(1);
  });

  it('Should render empty when timepicker disabled and no options provided', () => {
    const component = mountWithIntl(
      <SearchBar.WrappedComponent
        uiSettings={setupMock.uiSettings}
        appName={'test'}
        indexPatterns={[mockIndexPattern]}
        intl={null as any}
        showDatePicker={false}
      />
    );

    expect(component.find(SEARCH_BAR_ROOT).length).toBe(1);
    expect(component.find(FILTER_BAR).length).toBe(0);
    expect(component.find(QUERY_BAR).length).toBe(0);
  });

  it('Should render filter bar, when required fields are probided', () => {
    const component = mountWithIntl(
      <SearchBar.WrappedComponent
        uiSettings={setupMock.uiSettings}
        appName={'test'}
        indexPatterns={[mockIndexPattern]}
        intl={null as any}
        filters={[]}
        onFiltersUpdated={noop}
        showDatePicker={false}
      />
    );

    expect(component.find(SEARCH_BAR_ROOT).length).toBe(1);
    expect(component.find(FILTER_BAR).length).toBe(1);
    expect(component.find(QUERY_BAR).length).toBe(0);
  });

  it('Should NOT render filter bar, if disabled', () => {
    const component = mountWithIntl(
      <SearchBar.WrappedComponent
        uiSettings={setupMock.uiSettings}
        appName={'test'}
        indexPatterns={[mockIndexPattern]}
        intl={null as any}
        showFilterBar={false}
        filters={[]}
        onFiltersUpdated={noop}
        showDatePicker={false}
      />
    );

    expect(component.find(SEARCH_BAR_ROOT).length).toBe(1);
    expect(component.find(FILTER_BAR).length).toBe(0);
    expect(component.find(QUERY_BAR).length).toBe(0);
  });

  it('Should render query bar, when required fields are provided', () => {
    const component = mountWithIntl(
      <SearchBar.WrappedComponent
        uiSettings={setupMock.uiSettings}
        appName={'test'}
        indexPatterns={[mockIndexPattern]}
        intl={null as any}
        screenTitle={'test screen'}
        store={createMockStorage()}
        onQuerySubmit={noop}
        query={kqlQuery}
      />
    );

    expect(component.find(SEARCH_BAR_ROOT).length).toBe(1);
    expect(component.find(FILTER_BAR).length).toBe(0);
    expect(component.find(QUERY_BAR).length).toBe(1);
  });

  it('Should NOT render query bar, if disabled', () => {
    const component = mountWithIntl(
      <SearchBar.WrappedComponent
        uiSettings={setupMock.uiSettings}
        appName={'test'}
        indexPatterns={[mockIndexPattern]}
        intl={null as any}
        screenTitle={'test screen'}
        store={createMockStorage()}
        onQuerySubmit={noop}
        query={kqlQuery}
        showQueryBar={false}
      />
    );

    expect(component.find(SEARCH_BAR_ROOT).length).toBe(1);
    expect(component.find(FILTER_BAR).length).toBe(0);
    expect(component.find(QUERY_BAR).length).toBe(0);
  });

  it('Should render query bar and filter bar', () => {
    const component = mountWithIntl(
      <SearchBar.WrappedComponent
        uiSettings={setupMock.uiSettings}
        appName={'test'}
        indexPatterns={[mockIndexPattern]}
        intl={null as any}
        screenTitle={'test screen'}
        store={createMockStorage()}
        onQuerySubmit={noop}
        query={kqlQuery}
        filters={[]}
        onFiltersUpdated={noop}
      />
    );

    expect(component.find(SEARCH_BAR_ROOT).length).toBe(1);
    expect(component.find(FILTER_BAR).length).toBe(1);
    expect(component.find(QUERY_BAR).length).toBe(1);
  });
});
