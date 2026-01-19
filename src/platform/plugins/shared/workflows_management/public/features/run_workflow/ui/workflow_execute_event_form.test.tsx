/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';
import { AlertsQueryContext } from '@kbn/alerts-ui-shared/src/common/contexts/alerts_query_context';
import { testQueryClientConfig } from '@kbn/alerts-ui-shared/src/common/test_utils/test_query_client_config';
import { I18nProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import {
  createCommonMockServices,
  createEventFormKibanaMocks,
  MockSearchBar,
} from './test_utils/workflow_form_test_setup';
import { WorkflowExecuteEventForm } from './workflow_execute_event_form';
import { useKibana } from '../../../hooks/use_kibana';

jest.mock('../../../hooks/use_kibana');
jest.mock('@kbn/unified-search-plugin/public', () => ({
  SearchBar: MockSearchBar,
}));
jest.mock('@kbn/alerts-ui-shared/src/common/hooks', () => ({
  useAlertsDataView: jest.fn(() => ({
    isLoading: false,
    dataView: {
      id: 'test-data-view',
      title: '.alerts-*-default',
      timeFieldName: '@timestamp',
      fields: [],
    },
  })),
  useFetchUnifiedAlertsFields: jest.fn(() => ({
    isLoading: false,
    data: { fields: [] },
  })),
}));

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

const queryClient = new QueryClient(testQueryClientConfig);

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient} context={AlertsQueryContext}>
    <I18nProvider>{children}</I18nProvider>
  </QueryClientProvider>
);

describe('WorkflowExecuteEventForm', () => {
  const mockSetValue = jest.fn();
  const mockSetErrors = jest.fn();
  const { mockSpaces, mockSearchSource, mockData } = createEventFormKibanaMocks();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseKibana.mockReturnValue({
      services: {
        unifiedSearch: {
          ui: {
            SearchBar: MockSearchBar,
          },
        },
        spaces: mockSpaces as any,
        data: mockData as any,
        fieldFormats: mockData.fieldFormats as any,
        ...createCommonMockServices(),
      },
    } as any);
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('renders the form with search bar', async () => {
    const { getByTestId } = render(
      <TestWrapper>
        <WorkflowExecuteEventForm
          value=""
          setValue={mockSetValue}
          errors={null}
          setErrors={mockSetErrors}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(getByTestId('search-bar')).toBeInTheDocument();
    });
  });

  it('creates data view for alerts index pattern', async () => {
    render(
      <TestWrapper>
        <WorkflowExecuteEventForm
          value=""
          setValue={mockSetValue}
          errors={null}
          setErrors={mockSetErrors}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(mockData.dataViews.create).toHaveBeenCalledWith({
        title: '.alerts-*-default',
        timeFieldName: '@timestamp',
      });
    });
  });

  it('fetches and displays alerts in table', async () => {
    const { getByText } = render(
      <TestWrapper>
        <WorkflowExecuteEventForm
          value=""
          setValue={mockSetValue}
          errors={null}
          setErrors={mockSetErrors}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(mockSearchSource.fetch$).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(getByText('Test Rule')).toBeInTheDocument();
    });
  });

  it('displays message column in table', async () => {
    const { getByRole } = render(
      <TestWrapper>
        <WorkflowExecuteEventForm
          value=""
          setValue={mockSetValue}
          errors={null}
          setErrors={mockSetErrors}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(getByRole('columnheader', { name: 'Message' })).toBeInTheDocument();
    });
  });

  it('handles query change without triggering fetch', async () => {
    const { getByTestId } = render(
      <TestWrapper>
        <WorkflowExecuteEventForm
          value=""
          setValue={mockSetValue}
          errors={null}
          setErrors={mockSetErrors}
        />
      </TestWrapper>
    );

    // Wait for initial data view creation and fetch
    await waitFor(() => {
      expect(mockData.dataViews.create).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(getByTestId('search-bar')).toBeInTheDocument();
    });

    // Wait for initial fetch to complete
    await waitFor(() => {
      expect(mockSearchSource.fetch$).toHaveBeenCalled();
    });

    const initialFetchCount = mockSearchSource.fetch$.mock.calls.length;
    const queryInput = getByTestId('query-input') as HTMLInputElement;

    // Simulate typing (onQueryChange) - this should NOT trigger a fetch
    fireEvent.change(queryInput, { target: { value: 'test query' } });

    // Wait a bit to ensure no additional fetch was triggered
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Should not trigger additional fetch calls (only submitting should)
    expect(mockSearchSource.fetch$.mock.calls.length).toBe(initialFetchCount);
  });

  it('calls setValue when alerts are selected', async () => {
    const { getByRole, getByTestId } = render(
      <TestWrapper>
        <WorkflowExecuteEventForm
          value=""
          setValue={mockSetValue}
          errors={null}
          setErrors={mockSetErrors}
        />
      </TestWrapper>
    );

    // Wait for alerts to load
    await waitFor(() => {
      expect(mockSearchSource.fetch$).toHaveBeenCalled();
    });

    // Wait for table to render with data
    await waitFor(() => {
      expect(getByRole('table')).toBeInTheDocument();
    });

    // Find and click the checkbox for the first row
    const checkbox = getByTestId('checkboxSelectRow-1');
    fireEvent.click(checkbox);

    // Verify setValue was called with the selected alert data
    await waitFor(() => {
      expect(mockSetValue).toHaveBeenCalled();
    });

    const lastCall = mockSetValue.mock.calls[mockSetValue.mock.calls.length - 1][0];
    const parsedValue = JSON.parse(lastCall);

    expect(parsedValue.event).toBeDefined();
    expect(parsedValue.event.alertIds).toHaveLength(1);
    expect(parsedValue.event.alertIds[0]._id).toBe('1');
    expect(parsedValue.event.triggerType).toBe('alert');
  });
});
