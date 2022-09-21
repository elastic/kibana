/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { mockPersistedLogFactory } from './query_string_input.test.mocks';

import React from 'react';
import { mount, shallow } from 'enzyme';
import { render } from '@testing-library/react';
import { EMPTY } from 'rxjs';

import QueryBarTopRow from './query_bar_top_row';
import { coreMock } from '@kbn/core/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { I18nProvider } from '@kbn/i18n-react';
import { stubIndexPattern } from '@kbn/data-plugin/public/stubs';
import { UI_SETTINGS } from '@kbn/data-plugin/common';
import { unifiedSearchPluginMock } from '../mocks';

const startMock = coreMock.createStart();

const mockTimeHistory = {
  get: () => {
    return [];
  },
  get$: () => EMPTY,
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
    case UI_SETTINGS.TIMEPICKER_TIME_DEFAULTS:
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

const sqlQuery = {
  sql: 'SELECT * FROM test',
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
    unifiedSearch: unifiedSearchPluginMock.createStartContract(),
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
  const TIMEPICKER_SELECTOR = 'Memo(EuiSuperDatePicker)';
  const REFRESH_BUTTON_SELECTOR = 'EuiSuperUpdateButton';
  const TIMEPICKER_DURATION = '[data-shared-timefilter-duration]';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Should render query and time picker', () => {
    const { getByText, getByTestId } = render(
      wrapQueryBarTopRowInContext({
        query: kqlQuery,
        screenTitle: 'Another Screen',
        isDirty: false,
        indexPatterns: [stubIndexPattern],
        timeHistory: mockTimeHistory,
      })
    );

    expect(getByText(kqlQuery.query)).toBeInTheDocument();
    expect(getByTestId('superDatePickerShowDatesButton')).toBeInTheDocument();
  });

  it('Should create a unique PersistedLog based on the appName and query language', () => {
    mount(
      wrapQueryBarTopRowInContext({
        query: kqlQuery,
        screenTitle: 'Another Screen',
        indexPatterns: [stubIndexPattern],
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

  it('Should render timepicker without the submit button if showSubmitButton is false', () => {
    const component = mount(
      wrapQueryBarTopRowInContext({
        isDirty: false,
        screenTitle: 'Another Screen',
        showDatePicker: true,
        showSubmitButton: false,
        dateRangeFrom: 'now-7d',
        dateRangeTo: 'now',
        timeHistory: mockTimeHistory,
      })
    );

    expect(component.find(REFRESH_BUTTON_SELECTOR).length).toBe(0);
    expect(component.find(TIMEPICKER_SELECTOR).length).toBe(1);
  });

  it('Should render update button as icon button', () => {
    const component = mount(
      wrapQueryBarTopRowInContext({
        isDirty: false,
        screenTitle: 'Another Screen',
        showDatePicker: true,
        showSubmitButton: true,
        submitButtonStyle: 'iconOnly',
        dateRangeFrom: 'now-7d',
        dateRangeTo: 'now',
        timeHistory: mockTimeHistory,
      })
    );

    expect(component.find(REFRESH_BUTTON_SELECTOR).prop('iconOnly')).toBe(true);
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
        indexPatterns: [stubIndexPattern],
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
        indexPatterns: [stubIndexPattern],
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

  it('Should NOT render query input bar if on text based languages mode', () => {
    const component = shallow(
      wrapQueryBarTopRowInContext({
        query: sqlQuery,
        isDirty: false,
        screenTitle: 'SQL Screen',
        timeHistory: mockTimeHistory,
        indexPatterns: [stubIndexPattern],
        showDatePicker: false,
        dateRangeFrom: 'now-7d',
        dateRangeTo: 'now',
      })
    );

    expect(component.find(QUERY_INPUT_SELECTOR).length).toBe(0);
  });
});
