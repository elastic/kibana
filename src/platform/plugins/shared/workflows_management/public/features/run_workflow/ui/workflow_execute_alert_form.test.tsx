/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiProvider } from '@elastic/eui';
import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';
import { fetchAlertsIndexNames } from '@kbn/alerts-ui-shared/src/common/apis/fetch_alerts_index_names';
import { AlertsQueryContext } from '@kbn/alerts-ui-shared/src/common/contexts/alerts_query_context';
import { testQueryClientConfig } from '@kbn/alerts-ui-shared/src/common/test_utils/test_query_client_config';
import { themeServiceMock } from '@kbn/core/public/mocks';
import { fieldFormatsMock } from '@kbn/field-formats-plugin/common/mocks';
import { I18nProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import {
  createCommonMockServices,
  createEventFormKibanaMocks,
  MockSearchBar,
} from './test_utils/workflow_form_test_setup';
import { WorkflowExecuteAlertForm } from './workflow_execute_alert_form';
import { useKibana } from '../../../hooks/use_kibana';

const mockFetchAlertsIndexNames = fetchAlertsIndexNames as jest.MockedFunction<
  typeof fetchAlertsIndexNames
>;

jest.mock('../../../hooks/use_kibana');
jest.mock('@kbn/unified-search-plugin/public', () => ({
  SearchBar: MockSearchBar,
}));
jest.mock('@kbn/alerts-ui-shared/src/common/apis/fetch_alerts_index_names', () => ({
  fetchAlertsIndexNames: jest.fn(),
}));

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;
const mockTheme = themeServiceMock.createSetupContract({ darkMode: false, name: 'borealis' });
const mockUiSettings = {
  get: jest.fn(),
  isDefault: jest.fn(() => true),
};
const mockStorage = {
  get: jest.fn(),
  set: jest.fn(),
  clear: jest.fn(),
  remove: jest.fn(),
};

const queryClient = new QueryClient(testQueryClientConfig);

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <EuiProvider>
    <QueryClientProvider client={queryClient}>
      <QueryClientProvider client={queryClient} context={AlertsQueryContext}>
        <I18nProvider>{children}</I18nProvider>
      </QueryClientProvider>
    </QueryClientProvider>
  </EuiProvider>
);

describe('WorkflowExecuteAlertForm', () => {
  const mockSetValue = jest.fn();
  const mockSetErrors = jest.fn();
  const { mockSearchSource, mockData } = createEventFormKibanaMocks();

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchAlertsIndexNames.mockResolvedValue(['.alerts-security.alerts-default']);
    mockUseKibana.mockReturnValue({
      services: {
        unifiedSearch: {
          ui: {
            SearchBar: MockSearchBar,
          },
        },
        data: mockData as any,
        dataViews: mockData.dataViews as any,
        fieldFormats: fieldFormatsMock,
        theme: mockTheme,
        uiSettings: mockUiSettings,
        storage: mockStorage,
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
        <WorkflowExecuteAlertForm
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

  it('does not create data view when alert indices API is unavailable', async () => {
    mockFetchAlertsIndexNames.mockRejectedValue(new Error('alerting unavailable'));

    render(
      <TestWrapper>
        <WorkflowExecuteAlertForm
          value=""
          setValue={mockSetValue}
          errors={null}
          setErrors={mockSetErrors}
        />
      </TestWrapper>
    );

    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(mockData.dataViews.create).not.toHaveBeenCalled();
  });

  it('does not call RAC index API when racQueriesEnabled is false', async () => {
    render(
      <TestWrapper>
        <WorkflowExecuteAlertForm
          value=""
          setValue={mockSetValue}
          errors={null}
          setErrors={mockSetErrors}
          racQueriesEnabled={false}
        />
      </TestWrapper>
    );

    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(mockFetchAlertsIndexNames).not.toHaveBeenCalled();
  });

  it('creates data view from alert indices returned by RAC API', async () => {
    mockFetchAlertsIndexNames.mockResolvedValue([
      '.alerts-observability.logs.alerts-default',
      '.alerts-security.alerts-default',
    ]);

    render(
      <TestWrapper>
        <WorkflowExecuteAlertForm
          value=""
          setValue={mockSetValue}
          errors={null}
          setErrors={mockSetErrors}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(mockData.dataViews.create).toHaveBeenCalledWith({
        title: '.alerts-observability.logs.alerts-default,.alerts-security.alerts-default',
        timeFieldName: '@timestamp',
      });
    });
  });

  it('fetches and displays alerts in unified data table', async () => {
    const { getByText, findByTestId } = render(
      <TestWrapper>
        <WorkflowExecuteAlertForm
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

    await findByTestId('workflowAlertsTable');

    await waitFor(() => {
      expect(getByText('Test Rule')).toBeInTheDocument();
    });
  });

  it('displays timestamp, rule, and message columns only', async () => {
    const { findByTestId, getByText } = render(
      <TestWrapper>
        <WorkflowExecuteAlertForm
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

    await findByTestId('workflowAlertsTable');

    await waitFor(() => {
      expect(getByText('Rule')).toBeInTheDocument();
      expect(getByText('Message')).toBeInTheDocument();
      expect(getByText('Test Rule')).toBeInTheDocument();
      expect(getByText('Test message')).toBeInTheDocument();
    });
  });

  it('handles query change without triggering fetch', async () => {
    const { getByTestId } = render(
      <TestWrapper>
        <WorkflowExecuteAlertForm
          value=""
          setValue={mockSetValue}
          errors={null}
          setErrors={mockSetErrors}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(mockData.dataViews.create).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(getByTestId('search-bar')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(mockSearchSource.fetch$).toHaveBeenCalled();
    });

    const initialFetchCount = mockSearchSource.fetch$.mock.calls.length;
    const queryInput = getByTestId('query-input') as HTMLInputElement;

    fireEvent.change(queryInput, { target: { value: 'test query' } });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mockSearchSource.fetch$.mock.calls.length).toBe(initialFetchCount);
  });

  it('calls setValue when an alert row is selected', async () => {
    const { findByTestId } = render(
      <TestWrapper>
        <WorkflowExecuteAlertForm
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

    await findByTestId('workflowAlertsTable');

    const selectButton = await findByTestId('dscGridSelectDoc-.alerts-default::1::');
    fireEvent.click(selectButton);

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
