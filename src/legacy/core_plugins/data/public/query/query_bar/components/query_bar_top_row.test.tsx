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

import { mockPersistedLogFactory } from './query_bar_input.test.mocks';

import React from 'react';
import { mount } from 'enzyme';
import './query_bar_top_row.test.mocks';
import { QueryBarTopRow } from './query_bar_top_row';
import { IndexPattern } from '../../../index';

import { coreMock } from '../../../../../../../core/public/mocks';
import { KibanaContextProvider } from 'src/plugins/kibana_react/public';
import { I18nProvider } from '@kbn/i18n/react';
const startMock = coreMock.createStart();

startMock.uiSettings.get.mockImplementation((key: string) => {
  switch (key) {
    case 'timepicker:quickRanges':
      return [
        {
          from: 'now/d',
          to: 'now/d',
          display: 'Today',
        },
      ];
    case 'dateFormat':
      return 'YY';
    case 'history:limit':
      return 10;
    default:
      throw new Error(`Unexpected config key: ${key}`);
  }
});

const noop = () => {
  return;
};

const kqlQuery = {
  query: 'response:200',
  language: 'kuery',
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
} as IndexPattern;

describe('QueryBarTopRowTopRow', () => {
  const QUERY_INPUT_SELECTOR = 'InjectIntl(QueryBarInputUI)';
  const TIMEPICKER_SELECTOR = 'EuiSuperDatePicker';
  const services = {
    uiSettings: startMock.uiSettings,
    savedObjects: startMock.savedObjects,
    notifications: startMock.notifications,
    http: startMock.http,
  };
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Should render the given query', () => {
    const component = mount(
      <I18nProvider>
        <KibanaContextProvider services={services}>
          <QueryBarTopRow.WrappedComponent
            query={kqlQuery}
            onSubmit={noop}
            appName={'discover'}
            screenTitle={'Another Screen'}
            indexPatterns={[mockIndexPattern]}
            store={createMockStorage()}
            intl={null as any}
            onChange={noop}
            isDirty={false}
          />
        </KibanaContextProvider>
      </I18nProvider>
    );

    expect(component.find(QUERY_INPUT_SELECTOR).length).toBe(1);
    expect(component.find(TIMEPICKER_SELECTOR).length).toBe(1);
  });

  it('Should create a unique PersistedLog based on the appName and query language', () => {
    mount(
      <I18nProvider>
        <KibanaContextProvider services={services}>
          <QueryBarTopRow.WrappedComponent
            query={kqlQuery}
            onSubmit={noop}
            appName={'discover'}
            screenTitle={'Another Screen'}
            indexPatterns={[mockIndexPattern]}
            store={createMockStorage()}
            disableAutoFocus={true}
            intl={null as any}
            onChange={noop}
            isDirty={false}
          />
        </KibanaContextProvider>
      </I18nProvider>
    );

    expect(mockPersistedLogFactory.mock.calls[0][0]).toBe('typeahead:discover-kuery');
  });

  it('Should render only timepicker when no options provided', () => {
    const component = mount(
      <I18nProvider>
        <KibanaContextProvider services={services}>
          <QueryBarTopRow.WrappedComponent
            onSubmit={noop}
            onChange={noop}
            isDirty={false}
            appName={'discover'}
            store={createMockStorage()}
            intl={null as any}
          />
        </KibanaContextProvider>
      </I18nProvider>
    );

    expect(component.find(QUERY_INPUT_SELECTOR).length).toBe(0);
    expect(component.find(TIMEPICKER_SELECTOR).length).toBe(1);
  });

  it('Should not show timepicker when asked', () => {
    const component = mount(
      <I18nProvider>
        <KibanaContextProvider services={services}>
          <QueryBarTopRow.WrappedComponent
            onSubmit={noop}
            onChange={noop}
            isDirty={false}
            appName={'discover'}
            store={createMockStorage()}
            intl={null as any}
            showDatePicker={false}
          />
        </KibanaContextProvider>
      </I18nProvider>
    );

    expect(component.find(QUERY_INPUT_SELECTOR).length).toBe(0);
    expect(component.find(TIMEPICKER_SELECTOR).length).toBe(0);
  });

  it('Should render timepicker with options', () => {
    const component = mount(
      <I18nProvider>
        <KibanaContextProvider services={services}>
          <QueryBarTopRow.WrappedComponent
            onSubmit={noop}
            onChange={noop}
            isDirty={false}
            appName={'discover'}
            screenTitle={'Another Screen'}
            store={createMockStorage()}
            intl={null as any}
            showDatePicker={true}
            dateRangeFrom={'now-7d'}
            dateRangeTo={'now'}
          />
        </KibanaContextProvider>
      </I18nProvider>
    );

    expect(component.find(QUERY_INPUT_SELECTOR).length).toBe(0);
    expect(component.find(TIMEPICKER_SELECTOR).length).toBe(1);
  });

  it('Should render only query input bar', () => {
    const component = mount(
      <I18nProvider>
        <KibanaContextProvider services={services}>
          <QueryBarTopRow.WrappedComponent
            query={kqlQuery}
            onSubmit={noop}
            onChange={noop}
            isDirty={false}
            appName={'discover'}
            screenTitle={'Another Screen'}
            indexPatterns={[mockIndexPattern]}
            store={createMockStorage()}
            intl={null as any}
            showDatePicker={false}
          />
        </KibanaContextProvider>
      </I18nProvider>
    );

    expect(component.find(QUERY_INPUT_SELECTOR).length).toBe(1);
    expect(component.find(TIMEPICKER_SELECTOR).length).toBe(0);
  });

  it('Should NOT render query input bar if disabled', () => {
    const component = mount(
      <I18nProvider>
        <KibanaContextProvider services={services}>
          <QueryBarTopRow.WrappedComponent
            query={kqlQuery}
            onSubmit={noop}
            onChange={noop}
            isDirty={false}
            appName={'discover'}
            screenTitle={'Another Screen'}
            indexPatterns={[mockIndexPattern]}
            store={createMockStorage()}
            intl={null as any}
            showQueryInput={false}
            showDatePicker={false}
          />
        </KibanaContextProvider>
      </I18nProvider>
    );

    expect(component.find(QUERY_INPUT_SELECTOR).length).toBe(0);
    expect(component.find(TIMEPICKER_SELECTOR).length).toBe(0);
  });

  it('Should NOT render query input bar if missing options', () => {
    const component = mount(
      <I18nProvider>
        <KibanaContextProvider services={services}>
          <QueryBarTopRow.WrappedComponent
            onSubmit={noop}
            onChange={noop}
            isDirty={false}
            appName={'discover'}
            screenTitle={'Another Screen'}
            store={createMockStorage()}
            intl={null as any}
            showDatePicker={false}
          />
        </KibanaContextProvider>
      </I18nProvider>
    );

    expect(component.find(QUERY_INPUT_SELECTOR).length).toBe(0);
    expect(component.find(TIMEPICKER_SELECTOR).length).toBe(0);
  });
});
