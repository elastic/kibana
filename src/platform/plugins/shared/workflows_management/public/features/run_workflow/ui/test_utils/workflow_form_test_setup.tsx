/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

interface MockQuery {
  query: string;
  language: string;
}

interface MockDateRange {
  from: string;
  to: string;
}

interface MockSearchBarProps {
  onQueryChange?: (params: { query: MockQuery; dateRange: MockDateRange }) => void;
  onQuerySubmit?: (params: { query: MockQuery; dateRange: MockDateRange }) => void;
  query?: MockQuery;
  dateRangeFrom?: string;
  dateRangeTo?: string;
}

interface MockDataViewPickerProps {
  onChangeDataView?: (dataViewId: string) => void;
}

/**
 * Shared mock for SearchBar component used across workflow form tests
 */
export const createMockSearchBar = () => {
  const MockSearchBarComponent = ({
    onQueryChange,
    onQuerySubmit,
    query,
    dateRangeFrom = 'now-15m',
    dateRangeTo = 'now',
  }: MockSearchBarProps) => {
    const dateRange: MockDateRange = { from: dateRangeFrom, to: dateRangeTo };

    return (
      <div data-test-subj="search-bar">
        <input
          data-test-subj="query-input"
          value={query?.query || ''}
          onChange={(e) => {
            const target = e.target as HTMLInputElement;
            onQueryChange?.({
              query: { query: target.value, language: 'kuery' },
              dateRange,
            });
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const target = e.target as HTMLInputElement;
              onQuerySubmit?.({
                query: { query: target.value, language: 'kuery' },
                dateRange,
              });
            }
          }}
        />
      </div>
    );
  };
  MockSearchBarComponent.displayName = 'MockSearchBar';
  return MockSearchBarComponent;
};

/**
 * Mock SearchBar at module level for jest.mock
 */
export const MockSearchBar = createMockSearchBar();

/**
 * Mock DataViewPicker for index form tests
 */
export const MockDataViewPicker = ({ onChangeDataView }: MockDataViewPickerProps) => (
  <div data-test-subj="data-view-picker">
    <button type="button" onClick={() => onChangeDataView?.('test-data-view-id')}>
      {'Select Data View'}
    </button>
  </div>
);

/**
 * Creates mock Kibana services for event form tests
 */
export const createEventFormKibanaMocks = () => {
  const mockSpaces = {
    getActiveSpace: jest.fn().mockResolvedValue({ id: 'default' }),
  };

  const mockDataView = {
    id: 'test-data-view',
    title: '.alerts-*-default',
    timeFieldName: '@timestamp',
    refreshFields: jest.fn().mockResolvedValue(undefined),
    getFieldByName: jest.fn().mockReturnValue(null),
  };

  const mockSearchSource = {
    setField: jest.fn(),
    fetch$: jest.fn().mockReturnValue({
      pipe: jest.fn().mockReturnValue({
        toPromise: jest.fn().mockResolvedValue({
          rawResponse: {
            hits: {
              hits: [
                {
                  _id: '1',
                  _index: '.alerts-default',
                  _source: {
                    '@timestamp': '2024-01-01T00:00:00Z',
                    'kibana.alert.rule.name': 'Test Rule',
                    'kibana.alert.reason': 'test event created',
                    message: 'Test message',
                  },
                },
              ],
            },
          },
        }),
      }),
    }),
  };

  const mockData = {
    dataViews: {
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue(mockDataView),
      refreshFields: jest.fn().mockResolvedValue(undefined),
    },
    search: {
      searchSource: {
        create: jest.fn().mockResolvedValue(mockSearchSource),
      },
      search: jest.fn().mockReturnValue({
        pipe: jest.fn().mockReturnValue({
          toPromise: jest.fn().mockResolvedValue({
            rawResponse: {
              hits: {
                hits: [
                  {
                    _id: '1',
                    _index: '.alerts-default',
                    _source: {
                      '@timestamp': '2024-01-01T00:00:00Z',
                      'kibana.alert.rule.name': 'Test Rule',
                      'kibana.alert.reason': 'test event created',
                      message: 'Test message',
                    },
                  },
                ],
              },
            },
          }),
        }),
      }),
    },
    fieldFormats: {
      getDefaultInstance: jest.fn().mockReturnValue({
        convert: jest.fn((date) => date.toISOString()),
      }),
    },
  };

  return {
    mockSpaces,
    mockDataView,
    mockSearchSource,
    mockData,
  };
};

/**
 * Creates mock Kibana services for index form tests
 */
export const createIndexFormKibanaMocks = () => {
  const createMockDataView = () => ({
    id: 'test-data-view-id',
    title: 'logs-*',
    name: 'logs-*',
    getIndexPattern: jest.fn().mockReturnValue('logs-*'),
    refreshFields: jest.fn().mockResolvedValue(undefined),
    getFieldByName: jest.fn().mockReturnValue(null),
    fields: {
      getByName: jest.fn().mockReturnValue(null),
      getAll: jest.fn().mockReturnValue([]),
      length: 0,
      filter: jest.fn().mockReturnValue([]),
    },
  });

  const mockDataViews = {
    getIdsWithTitle: jest.fn().mockResolvedValue([{ id: 'test-data-view-id', title: 'logs-*' }]),
    get: jest.fn().mockResolvedValue(createMockDataView()),
    refreshFields: jest.fn().mockResolvedValue(undefined),
    clearInstanceCache: jest.fn(),
  };

  const mockData = {
    search: {
      search: jest.fn().mockReturnValue({
        pipe: jest.fn().mockReturnValue({
          subscribe: jest.fn(({ next, complete }) => {
            next({
              rawResponse: {
                hits: {
                  hits: [
                    {
                      _id: '1',
                      _index: 'logs-*',
                      _source: {
                        '@timestamp': '2024-01-01T00:00:00Z',
                        message: 'Test log message',
                      },
                    },
                  ],
                },
              },
            });
            complete();
            return { unsubscribe: jest.fn() };
          }),
        }),
      }),
    },
    fieldFormats: {
      getDefaultInstance: jest.fn().mockReturnValue({
        convert: jest.fn((value: unknown) => {
          if (value instanceof Date) {
            return value.toISOString();
          }
          return String(value ?? '');
        }),
      }),
    },
  };

  return {
    mockDataViews,
    mockData,
  };
};

/**
 * Creates common mock services structure
 */
export const createCommonMockServices = () => {
  const mockToasts = {
    addError: jest.fn(),
    addSuccess: jest.fn(),
    addWarning: jest.fn(),
    addInfo: jest.fn(),
    addDanger: jest.fn(),
  };

  return {
    notifications: {
      toasts: mockToasts,
    },
    http: {
      get: jest.fn(),
      post: jest.fn(),
    },
  };
};
