/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiProvider } from '@elastic/eui';
import { render } from '@testing-library/react';
import React from 'react';
import { themeServiceMock } from '@kbn/core/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { fieldFormatsMock } from '@kbn/field-formats-plugin/common/mocks';
import { I18nProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useQueryTriggerEvents } from '@kbn/workflows-ui';
import { testQueryClientConfig } from '@kbn/workflows-ui/src/test_utils';
import { MockSearchBar } from './test_utils/workflow_form_test_setup';
import {
  buildTriggerEventReplayInputs,
  WorkflowExecuteEventForm,
} from './workflow_execute_event_form';
import { useKibana } from '../../../hooks/use_kibana';

const mockTheme = themeServiceMock.createSetupContract({ darkMode: false, name: 'borealis' });
const mockData = dataPluginMock.createStartContract();
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

jest.mock('../../../hooks/use_kibana');
jest.mock('../../workflow_list/ui/use_event_driven_execution_status', () => ({
  useEventDrivenExecutionStatus: () => ({
    eventDrivenExecutionEnabled: true,
    isLoading: false,
    error: false,
  }),
}));

jest.mock('@kbn/workflows-ui', () => {
  const actual = jest.requireActual('@kbn/workflows-ui');
  return {
    ...actual,
    useQueryTriggerEvents: jest.fn(),
  };
});

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;
const mockUseQueryTriggerEvents = useQueryTriggerEvents as jest.MockedFunction<
  typeof useQueryTriggerEvents
>;
const queryClient = new QueryClient(testQueryClientConfig);

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <EuiProvider>
    <QueryClientProvider client={queryClient}>
      <I18nProvider>{children}</I18nProvider>
    </QueryClientProvider>
  </EuiProvider>
);

const baseDefinition = {
  version: '1',
  name: 'wf',
  enabled: true,
  triggers: [{ type: 'custom.trigger' }],
  steps: [],
};

describe('buildTriggerEventReplayInputs', () => {
  beforeEach(() => {
    jest.useFakeTimers({ legacyFakeTimers: false });
    jest.setSystemTime(new Date('2025-06-15T10:00:00.000Z'));
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('merges payload with timestamp, spaceId, and default chain fields', () => {
    expect(
      buildTriggerEventReplayInputs(
        {
          '@timestamp': '2025-01-01T12:00:00.000Z',
          eventId: 'e1',
          triggerId: 'custom.trigger',
          spaceId: 'logged-space',
          payload: { foo: 'bar', nested: { n: 1 } },
        },
        'default'
      )
    ).toEqual({
      event: {
        foo: 'bar',
        nested: { n: 1 },
        timestamp: '2025-06-15T10:00:00.000Z',
        spaceId: 'default',
        eventChainDepth: 0,
        eventChainVisitedWorkflowIds: [],
      },
    });
  });

  it('treats non-object payload as empty', () => {
    expect(
      buildTriggerEventReplayInputs(
        {
          '@timestamp': '2025-01-01T12:00:00.000Z',
          spaceId: 'logged-space',
          payload: null,
        },
        'acme'
      )
    ).toEqual({
      event: {
        timestamp: '2025-06-15T10:00:00.000Z',
        spaceId: 'acme',
        eventChainDepth: 0,
        eventChainVisitedWorkflowIds: [],
      },
    });
  });
});

describe('WorkflowExecuteEventForm', () => {
  const mockSetValue = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
    (mockData.query.timefilter.timefilter.getTimeDefaults as jest.Mock).mockReturnValue({
      from: 'now-15m',
      to: 'now',
    });
    mockUseQueryTriggerEvents.mockReturnValue({
      data: {
        hits: [
          {
            id: 'doc-1',
            source: {
              '@timestamp': '2025-01-01T12:00:00.000Z',
              eventId: 'e1',
              triggerId: 'custom.trigger',
              spaceId: 'default',
              subscriptions: [],
              payload: { foo: 'bar' },
            },
          },
        ],
        total: 1,
        page: 1,
        size: 50,
      },
      isLoading: false,
      isError: false,
      error: undefined,
      isSuccess: true,
      status: 'success',
    } as unknown as ReturnType<typeof useQueryTriggerEvents>);
    mockUseKibana.mockReturnValue({
      services: {
        unifiedSearch: {
          ui: {
            SearchBar: MockSearchBar,
          },
        },
        dataViews: {
          create: jest.fn().mockResolvedValue({
            id: 'dv-workflows-events',
            title: '.workflows-events',
            timeFieldName: '@timestamp',
            getFieldByName: jest.fn(() => ({ name: 'triggerId' })),
            fields: {
              replaceAll: jest.fn(),
              getByName: jest.fn(() => null),
              getAll: jest.fn().mockReturnValue([]),
              create: jest.fn(),
              add: jest.fn(),
              remove: jest.fn(),
              update: jest.fn(),
              filter: jest.fn().mockReturnValue([]),
            },
          }),
          refreshFields: jest.fn().mockResolvedValue(undefined),
        },
        notifications: {
          toasts: {
            addWarning: jest.fn(),
            addError: jest.fn(),
          },
        },
        http: {},
        theme: mockTheme,
        fieldFormats: fieldFormatsMock,
        uiSettings: mockUiSettings,
        storage: mockStorage,
        data: mockData,
      },
    } as unknown as ReturnType<typeof useKibana>);
  });

  it('renders trigger events table', async () => {
    const { getByTestId, findByTestId } = render(
      <TestWrapper>
        <WorkflowExecuteEventForm
          definition={baseDefinition as any}
          value=""
          setValue={mockSetValue}
          errors={null}
        />
      </TestWrapper>
    );

    await findByTestId('workflowTriggerEventsTable');
    expect(getByTestId('workflowTriggerEventsTable')).toBeInTheDocument();
    expect(mockUseQueryTriggerEvents).toHaveBeenCalledWith(
      expect.objectContaining({
        triggerIds: ['custom.trigger'],
        page: 1,
        size: 50,
        from: 'now-15m',
        to: 'now',
      }),
      expect.objectContaining({ enabled: true })
    );
  });

  it('shows a privilege message when trigger event search returns 403', async () => {
    mockUseQueryTriggerEvents.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: { response: { status: 403 } },
      isSuccess: false,
      status: 'error',
    } as unknown as ReturnType<typeof useQueryTriggerEvents>);

    const { findByText } = render(
      <TestWrapper>
        <WorkflowExecuteEventForm
          definition={baseDefinition as any}
          value=""
          setValue={mockSetValue}
          errors={null}
        />
      </TestWrapper>
    );

    expect(
      await findByText(
        'You need the Workflows "Read Workflow Execution" privilege to search trigger events.'
      )
    ).toBeInTheDocument();
  });
});
