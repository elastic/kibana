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

import { mockPersistedLogFactory } from './query_string_input.test.mocks';

import React from 'react';
import { mount } from 'enzyme';
import { QueryBarTopRow } from './query_bar_top_row';

import { coreMock } from '../../../../../core/public/mocks';
import { dataPluginMock } from '../../mocks';
import { KibanaContextProvider } from 'src/plugins/kibana_react/public';
import { I18nProvider } from '@kbn/i18n/react';
import { stubIndexPatternWithFields } from '../../stubs';
import { UI_SETTINGS } from '../../../common';
const startMock = coreMock.createStart();

const mockTimeHistory = {
  get: () => {
    return [];
  },
};

startMock.uiSettings.get.mockImplementation((key: string) => {
  switch (key) {
    case UI_SETTINGS.TIMEPICKER_QUICK_RANGES:
      return [
        {
          from: 'now/d',
          to: 'now/d',
          display: 'Today',
        },
      ];
    case 'dateFormat':
      return 'MMM D, YYYY @ HH:mm:ss.SSS';
    case UI_SETTINGS.HISTORY_LIMIT:
      return 10;
    case 'timepicker:timeDefaults':
      return {
        from: 'now-15m',
        to: 'now',
      };
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
  storage: createMockWebStorage(),
  get: jest.fn(),
  set: jest.fn(),
  remove: jest.fn(),
  clear: jest.fn(),
});

function wrapQueryBarTopRowInContext(testProps: any) {
  const defaultOptions = {
    screenTitle: 'Another Screen',
    onSubmit: noop,
    onChange: noop,
    intl: null as any,
  };

  const services = {
    ...startMock,
    data: dataPluginMock.createStartContract(),
    appName: 'discover',
    storage: createMockStorage(),
  };

  return (
    <I18nProvider>
      <KibanaContextProvider services={services}>
        <QueryBarTopRow {...defaultOptions} {...testProps} />
      </KibanaContextProvider>
    </I18nProvider>
  );
}

describe('QueryBarTopRowTopRow', () => {
  const QUERY_INPUT_SELECTOR = 'QueryStringInputUI';
  const TIMEPICKER_SELECTOR = 'EuiSuperDatePicker';
  const TIMEPICKER_DURATION = '[data-shared-timefilter-duration]';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Should render query and time picker', () => {
    const component = mount(
      wrapQueryBarTopRowInContext({
        query: kqlQuery,
        screenTitle: 'Another Screen',
        isDirty: false,
        indexPatterns: [stubIndexPatternWithFields],
        timeHistory: mockTimeHistory,
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
        indexPatterns: [stubIndexPatternWithFields],
        timeHistory: mockTimeHistory,
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
        timeHistory: mockTimeHistory,
      })
    );

    expect(component.find(QUERY_INPUT_SELECTOR).length).toBe(0);
    expect(component.find(TIMEPICKER_SELECTOR).length).toBe(1);
  });

  it('Should not show timepicker when asked', () => {
    const component = mount(
      wrapQueryBarTopRowInContext({
        showDatePicker: false,
        timeHistory: mockTimeHistory,
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
        timeHistory: mockTimeHistory,
      })
    );

    expect(component.find(QUERY_INPUT_SELECTOR).length).toBe(0);
    expect(component.find(TIMEPICKER_SELECTOR).length).toBe(1);
  });

  it('Should render the timefilter duration container for sharing', () => {
    const component = mount(
      wrapQueryBarTopRowInContext({
        isDirty: false,
        screenTitle: 'Another Screen',
        showDatePicker: true,
        dateRangeFrom: 'now-7d',
        dateRangeTo: 'now',
        timeHistory: mockTimeHistory,
      })
    );

    // match the data attribute rendered in the in the ReactHTML object
    expect(component.find(TIMEPICKER_DURATION)).toMatchObject(
      /<div\b.*\bdata-shared-timefilter-duration\b/
    );
  });

  it('Should render only query input bar', () => {
    const component = mount(
      wrapQueryBarTopRowInContext({
        query: kqlQuery,
        indexPatterns: [stubIndexPatternWithFields],
        isDirty: false,
        screenTitle: 'Another Screen',
        showDatePicker: false,
        dateRangeFrom: 'now-7d',
        dateRangeTo: 'now',
        timeHistory: mockTimeHistory,
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
        indexPatterns: [stubIndexPatternWithFields],
        showQueryInput: false,
        showDatePicker: false,
        timeHistory: mockTimeHistory,
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
        timeHistory: mockTimeHistory,
      })
    );

    expect(component.find(QUERY_INPUT_SELECTOR).length).toBe(0);
    expect(component.find(TIMEPICKER_SELECTOR).length).toBe(0);
  });
});
