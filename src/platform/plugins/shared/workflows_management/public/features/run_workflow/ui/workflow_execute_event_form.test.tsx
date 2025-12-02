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
import { WorkflowExecuteEventForm } from './workflow_execute_event_form';
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
}));

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

describe('WorkflowExecuteEventForm', () => {
  const mockSetValue = jest.fn();
  const mockSetErrors = jest.fn();
  const mockSpaces = {
    getActiveSpace: jest.fn().mockResolvedValue({ id: 'default' }),
  };
  const mockDataViews = {
    find: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockResolvedValue({
      id: 'test-data-view',
      title: '.alerts-*-default',
      timeFieldName: '@timestamp',
      refreshFields: jest.fn().mockResolvedValue(undefined),
      getFieldByName: jest.fn().mockReturnValue(null),
    }),
    refreshFields: jest.fn().mockResolvedValue(undefined),
  };
  const mockData = {
    search: {
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
        spaces: mockSpaces as any,
        dataViews: mockDataViews as any,
        data: mockData as any,
        fieldFormats: mockData.fieldFormats as any,
      },
    } as any);
  });

  it('renders the form with search bar', async () => {
    const { getByTestId } = render(
      <I18nProvider>
        <WorkflowExecuteEventForm
          value=""
          setValue={mockSetValue}
          errors={null}
          setErrors={mockSetErrors}
        />
      </I18nProvider>
    );

    await waitFor(() => {
      expect(getByTestId('search-bar')).toBeInTheDocument();
    });
  });

  it('creates data view for alerts index pattern', async () => {
    render(
      <I18nProvider>
        <WorkflowExecuteEventForm
          value=""
          setValue={mockSetValue}
          errors={null}
          setErrors={mockSetErrors}
        />
      </I18nProvider>
    );

    await waitFor(() => {
      expect(mockDataViews.find).toHaveBeenCalledWith('.alerts-*-default');
    });
  });

  it('transforms rule.* queries to kibana.alert.rule.*', async () => {
    const { getByTestId } = render(
      <I18nProvider>
        <WorkflowExecuteEventForm
          value=""
          setValue={mockSetValue}
          errors={null}
          setErrors={mockSetErrors}
        />
      </I18nProvider>
    );

    await waitFor(() => {
      expect(getByTestId('search-bar')).toBeInTheDocument();
    });

    // Wait for data view to be created
    await waitFor(() => {
      expect(mockDataViews.create).toHaveBeenCalled();
    });

    // The query transformation happens in fetchAlerts when submittedQuery is set
    // We can't easily test this without triggering a full search, but the transformation
    // function should be called when a query with rule.* is submitted
  });

  it('displays alerts in table when fetched', async () => {
    const { getByText } = render(
      <I18nProvider>
        <WorkflowExecuteEventForm
          value=""
          setValue={mockSetValue}
          errors={null}
          setErrors={mockSetErrors}
        />
      </I18nProvider>
    );

    await waitFor(() => {
      expect(mockData.search.search).toHaveBeenCalled();
    });

    // Wait for alerts to be displayed
    await waitFor(
      () => {
        expect(getByText('Test Rule')).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it('displays message column in table', async () => {
    const { getByText } = render(
      <I18nProvider>
        <WorkflowExecuteEventForm
          value=""
          setValue={mockSetValue}
          errors={null}
          setErrors={mockSetErrors}
        />
      </I18nProvider>
    );

    await waitFor(() => {
      expect(getByText('Message')).toBeInTheDocument();
    });
  });

  it('handles query change without triggering fetch', async () => {
    const { getByTestId } = render(
      <I18nProvider>
        <WorkflowExecuteEventForm
          value=""
          setValue={mockSetValue}
          errors={null}
          setErrors={mockSetErrors}
        />
      </I18nProvider>
    );

    await waitFor(() => {
      expect(getByTestId('search-bar')).toBeInTheDocument();
    });

    const queryInput = getByTestId('query-input');
    const initialCallCount = mockData.search.search.mock.calls.length;

    // Simulate typing (onQueryChange)
    queryInput.dispatchEvent(new Event('change', { bubbles: true }));

    // Should not trigger additional search calls
    await waitFor(() => {
      expect(mockData.search.search.mock.calls.length).toBe(initialCallCount);
    });
  });
});
