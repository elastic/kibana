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

import { timefilterServiceMock } from '../../../timefilter/timefilter_service.mock';
const timefilterSetupMock = timefilterServiceMock.createSetupContract();

timefilterSetupMock.history.get.mockImplementation(() => {
  return [];
});

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

function wrapQueryBarTopRowInContext(testProps: any) {
  const defaultOptions = {
    screenTitle: 'Another Screen',
    onSubmit: noop,
    onChange: noop,
    intl: null as any,
  };

  const services = {
    appName: 'discover',
    uiSettings: startMock.uiSettings,
    savedObjects: startMock.savedObjects,
    notifications: startMock.notifications,
    http: startMock.http,
    store: createMockStorage(),
  };

  return (
    <I18nProvider>
      <KibanaContextProvider services={services}>
        <QueryBarTopRow.WrappedComponent {...defaultOptions} {...testProps} />
      </KibanaContextProvider>
    </I18nProvider>
  );
}

describe('QueryBarTopRowTopRow', () => {
  const QUERY_INPUT_SELECTOR = 'QueryBarInputUI';
  const TIMEPICKER_SELECTOR = 'EuiSuperDatePicker';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Should render the given query', () => {
    const component = mount(
      wrapQueryBarTopRowInContext({
        query: kqlQuery,
        screenTitle: 'Another Screen',
        isDirty: false,
        indexPatterns: [mockIndexPattern],
        timeHistory: timefilterSetupMock.history,
      })
    );

    expect(component.find(QUERY_INPUT_SELECTOR).length).toBe(1);
    expect(component.find(TIMEPICKER_SELECTOR).length).toBe(1);
  });

  it('Should create a unique PersistedLog based on the appName and query language', () => {
    mount(
      wrapQueryBarTopRowInContext({
        query: kqlQuery,
        screenTitle: 'Another Screen',
        indexPatterns: [mockIndexPattern],
        timeHistory: timefilterSetupMock.history,
        disableAutoFocus: true,
        isDirty: false,
      })
    );

    expect(mockPersistedLogFactory.mock.calls[0][0]).toBe('typeahead:discover-kuery');
  });

  it('Should render only timepicker when no options provided', () => {
    const component = mount(
      wrapQueryBarTopRowInContext({
        isDirty: false,
        timeHistory: timefilterSetupMock.history,
      })
    );

    expect(component.find(QUERY_INPUT_SELECTOR).length).toBe(0);
    expect(component.find(TIMEPICKER_SELECTOR).length).toBe(1);
  });

  it('Should not show timepicker when asked', () => {
    const component = mount(
      wrapQueryBarTopRowInContext({
        showDatePicker: false,
        timeHistory: timefilterSetupMock.history,
        isDirty: false,
      })
    );

    expect(component.find(QUERY_INPUT_SELECTOR).length).toBe(0);
    expect(component.find(TIMEPICKER_SELECTOR).length).toBe(0);
  });

  it('Should render timepicker with options', () => {
    const component = mount(
      wrapQueryBarTopRowInContext({
        isDirty: false,
        screenTitle: 'Another Screen',
        showDatePicker: true,
        dateRangeFrom: 'now-7d',
        dateRangeTo: 'now',
        timeHistory: timefilterSetupMock.history,
      })
    );

    expect(component.find(QUERY_INPUT_SELECTOR).length).toBe(0);
    expect(component.find(TIMEPICKER_SELECTOR).length).toBe(1);
  });

  it('Should render only query input bar', () => {
    const component = mount(
      wrapQueryBarTopRowInContext({
        query: kqlQuery,
        indexPatterns: [mockIndexPattern],
        isDirty: false,
        screenTitle: 'Another Screen',
        showDatePicker: false,
        dateRangeFrom: 'now-7d',
        dateRangeTo: 'now',
        timeHistory: timefilterSetupMock.history,
      })
    );

    expect(component.find(QUERY_INPUT_SELECTOR).length).toBe(1);
    expect(component.find(TIMEPICKER_SELECTOR).length).toBe(0);
  });

  it('Should NOT render query input bar if disabled', () => {
    const component = mount(
      wrapQueryBarTopRowInContext({
        query: kqlQuery,
        isDirty: false,
        screenTitle: 'Another Screen',
        indexPatterns: [mockIndexPattern],
        showQueryInput: false,
        showDatePicker: false,
        timeHistory: timefilterSetupMock.history,
      })
    );

    expect(component.find(QUERY_INPUT_SELECTOR).length).toBe(0);
    expect(component.find(TIMEPICKER_SELECTOR).length).toBe(0);
  });

  it('Should NOT render query input bar if missing options', () => {
    const component = mount(
      wrapQueryBarTopRowInContext({
        isDirty: false,
        screenTitle: 'Another Screen',
        showDatePicker: false,
        timeHistory: timefilterSetupMock.history,
      })
    );

    expect(component.find(QUERY_INPUT_SELECTOR).length).toBe(0);
    expect(component.find(TIMEPICKER_SELECTOR).length).toBe(0);
  });
});
