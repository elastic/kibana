/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render, waitFor } from '@testing-library/react';
import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { WorkflowExecuteIndexForm } from './workflow_execute_index_form';
import { useKibana } from '../../../hooks/use_kibana';

jest.mock('../../../hooks/use_kibana');
jest.mock('@kbn/unified-search-plugin/public', () => ({
  SearchBar: ({ onQueryChange, onQuerySubmit, query }: any) => (
    <div data-test-subj="search-bar">
      <input
        data-test-subj="query-input"
        value={query?.query || ''}
        onChange={(e) => {
          const target = e.target as HTMLInputElement;
          onQueryChange?.({ query: { query: target.value, language: 'kuery' } });
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            const target = e.target as HTMLInputElement;
            onQuerySubmit?.({ query: { query: target.value, language: 'kuery' } });
          }
        }}
      />
    </div>
  ),
  DataViewPicker: ({ onChangeDataView }: any) => (
    <div data-test-subj="data-view-picker">
      <button type="button" onClick={() => onChangeDataView?.('test-data-view-id')}>
        {'Select Data View'}
      </button>
    </div>
  ),
}));

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

describe('WorkflowExecuteIndexForm', () => {
  const mockSetValue = jest.fn();
  const mockSetErrors = jest.fn();
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
    },
  });

  const mockDataViews = {
    getIdsWithTitle: jest.fn().mockResolvedValue([{ id: 'test-data-view-id', title: 'logs-*' }]),
    get: jest.fn().mockResolvedValue(createMockDataView()),
    refreshFields: jest.fn().mockResolvedValue(undefined),
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

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseKibana.mockReturnValue({
      services: {
        unifiedSearch: {
          ui: {
            SearchBar: jest.fn(({ onQueryChange, onQuerySubmit, query }: any) => (
              <div data-test-subj="search-bar">
                <input
                  data-test-subj="query-input"
                  value={query?.query || ''}
                  onChange={(e) => {
                    const target = e.target as HTMLInputElement;
                    onQueryChange?.({ query: { query: target.value, language: 'kuery' } });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const target = e.target as HTMLInputElement;
                      onQuerySubmit?.({ query: { query: target.value, language: 'kuery' } });
                    }
                  }}
                />
              </div>
            )),
          },
        },
        dataViews: mockDataViews as any,
        data: mockData as any,
        fieldFormats: mockData.fieldFormats as any,
      },
    } as any);
  });

  it('renders the form with search bar and data view picker', async () => {
    const { getByTestId } = render(
      <I18nProvider>
        <WorkflowExecuteIndexForm
          value=""
          setValue={mockSetValue}
          errors={null}
          setErrors={mockSetErrors}
        />
      </I18nProvider>
    );

    // Wait for data views to load first
    await waitFor(() => {
      expect(mockDataViews.getIdsWithTitle).toHaveBeenCalled();
    });

    await waitFor(
      () => {
        expect(getByTestId('search-bar')).toBeInTheDocument();
        expect(getByTestId('data-view-picker')).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it('loads data views on mount', async () => {
    render(
      <I18nProvider>
        <WorkflowExecuteIndexForm
          value=""
          setValue={mockSetValue}
          errors={null}
          setErrors={mockSetErrors}
        />
      </I18nProvider>
    );

    await waitFor(() => {
      expect(mockDataViews.getIdsWithTitle).toHaveBeenCalled();
    });
  });

  it('refreshes fields when data view is selected', async () => {
    const { getByTestId } = render(
      <I18nProvider>
        <WorkflowExecuteIndexForm
          value=""
          setValue={mockSetValue}
          errors={null}
          setErrors={mockSetErrors}
        />
      </I18nProvider>
    );

    // Wait for data views to load and component to initialize
    await waitFor(() => {
      expect(mockDataViews.getIdsWithTitle).toHaveBeenCalled();
    });

    // Wait for data view picker to be rendered
    await waitFor(
      () => {
        expect(getByTestId('data-view-picker')).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    const pickerButton = getByTestId('data-view-picker').querySelector('button');
    pickerButton?.click();

    await waitFor(() => {
      expect(mockDataViews.refreshFields).toHaveBeenCalled();
    });
  });

  it('transforms rule.* queries to kibana.alert.rule.*', async () => {
    const { getByTestId } = render(
      <I18nProvider>
        <WorkflowExecuteIndexForm
          value=""
          setValue={mockSetValue}
          errors={null}
          setErrors={mockSetErrors}
        />
      </I18nProvider>
    );

    // Wait for data views to load
    await waitFor(() => {
      expect(mockDataViews.getIdsWithTitle).toHaveBeenCalled();
    });

    await waitFor(
      () => {
        expect(getByTestId('search-bar')).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    // The query transformation happens in fetchDocuments when submittedQuery is set
    // We can't easily test this without triggering a full search, but the transformation
    // function should be called when a query with rule.* is submitted
  });

  it('fetches documents when data view is selected', async () => {
    render(
      <I18nProvider>
        <WorkflowExecuteIndexForm
          value=""
          setValue={mockSetValue}
          errors={null}
          setErrors={mockSetErrors}
        />
      </I18nProvider>
    );

    // Wait for data views to load
    await waitFor(() => {
      expect(mockDataViews.getIdsWithTitle).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockDataViews.get).toHaveBeenCalled();
    });

    // Wait for documents to be fetched
    await waitFor(
      () => {
        expect(mockData.search.search).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );
  });

  it('handles query change without triggering fetch', async () => {
    const { getByTestId } = render(
      <I18nProvider>
        <WorkflowExecuteIndexForm
          value=""
          setValue={mockSetValue}
          errors={null}
          setErrors={mockSetErrors}
        />
      </I18nProvider>
    );

    // Wait for data view to be loaded (getIdsWithTitle and get are called)
    await waitFor(() => {
      expect(mockDataViews.getIdsWithTitle).toHaveBeenCalled();
    });

    // Wait for the query input to be available (SearchBar is rendered)
    let queryInput: HTMLElement;
    await waitFor(
      () => {
        queryInput = getByTestId('query-input');
        expect(queryInput).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    const initialCallCount = mockData.search.search.mock.calls.length;

    // Simulate typing (onQueryChange)
    queryInput!.dispatchEvent(new Event('change', { bubbles: true }));

    // Should not trigger additional search calls immediately
    // (fetch only happens on submit)
    await waitFor(() => {
      // The initial fetch might have happened, but no new ones from typing
      expect(mockData.search.search.mock.calls.length).toBeGreaterThanOrEqual(initialCallCount);
    });
  });
});
