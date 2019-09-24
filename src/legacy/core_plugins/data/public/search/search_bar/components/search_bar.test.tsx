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
import { IndexPattern } from '../../../index_patterns';

import { coreMock } from '../../../../../../../../src/core/public/mocks';
const startMock = coreMock.createStart();

import { timefilterServiceMock } from '../../../timefilter/timefilter_service.mock';
const timefilterSetupMock = timefilterServiceMock.createSetupContract();

jest.mock('../../../../../data/public', () => {
  return {
    FilterBar: () => <div className="filterBar"></div>,
    QueryBarInput: () => <div className="queryBar"></div>,
  };
});

jest.mock('../../../query/query_bar', () => {
  return {
    QueryBarTopRow: () => <div className="queryBar"></div>,
  };
});

jest.mock('ui/notify', () => ({
  toastNotifications: {
    addSuccess: () => {},
    addDanger: () => {},
  },
}));

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
} as IndexPattern;

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
        savedObjectsClient={startMock.savedObjects.client}
        uiSettings={startMock.uiSettings}
        timeHistory={timefilterSetupMock.history}
        toasts={startMock.notifications.toasts}
        appName={'test'}
        indexPatterns={[mockIndexPattern]}
        intl={null as any}
        http={startMock.http}
      />
    );

    expect(component.find(SEARCH_BAR_ROOT).length).toBe(1);
    expect(component.find(FILTER_BAR).length).toBe(0);
    expect(component.find(QUERY_BAR).length).toBe(1);
  });

  it('Should render empty when timepicker is off and no options provided', () => {
    const component = mountWithIntl(
      <SearchBar.WrappedComponent
        savedObjectsClient={startMock.savedObjects.client}
        uiSettings={startMock.uiSettings}
        timeHistory={timefilterSetupMock.history}
        toasts={startMock.notifications.toasts}
        appName={'test'}
        indexPatterns={[mockIndexPattern]}
        intl={null as any}
        http={startMock.http}
        showDatePicker={false}
      />
    );

    expect(component.find(SEARCH_BAR_ROOT).length).toBe(1);
    expect(component.find(FILTER_BAR).length).toBe(0);
    expect(component.find(QUERY_BAR).length).toBe(0);
  });

  it('Should render filter bar, when required fields are provided', () => {
    const component = mountWithIntl(
      <SearchBar.WrappedComponent
        savedObjectsClient={startMock.savedObjects.client}
        uiSettings={startMock.uiSettings}
        timeHistory={timefilterSetupMock.history}
        toasts={startMock.notifications.toasts}
        appName={'test'}
        indexPatterns={[mockIndexPattern]}
        intl={null as any}
        http={startMock.http}
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
        savedObjectsClient={startMock.savedObjects.client}
        uiSettings={startMock.uiSettings}
        timeHistory={timefilterSetupMock.history}
        toasts={startMock.notifications.toasts}
        appName={'test'}
        indexPatterns={[mockIndexPattern]}
        intl={null as any}
        http={startMock.http}
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
        savedObjectsClient={startMock.savedObjects.client}
        uiSettings={startMock.uiSettings}
        timeHistory={timefilterSetupMock.history}
        toasts={startMock.notifications.toasts}
        appName={'test'}
        indexPatterns={[mockIndexPattern]}
        intl={null as any}
        http={startMock.http}
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
        uiSettings={startMock.uiSettings}
        savedObjectsClient={startMock.savedObjects.client}
        timeHistory={timefilterSetupMock.history}
        toasts={startMock.notifications.toasts}
        appName={'test'}
        indexPatterns={[mockIndexPattern]}
        intl={null as any}
        http={startMock.http}
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
        timeHistory={timefilterSetupMock.history}
        uiSettings={startMock.uiSettings}
        savedObjectsClient={startMock.savedObjects.client}
        toasts={startMock.notifications.toasts}
        appName={'test'}
        indexPatterns={[mockIndexPattern]}
        intl={null as any}
        http={startMock.http}
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
