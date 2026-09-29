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
import { vi } from 'vitest';
import type { Mock, MockedFunction } from 'vitest';

import { themeServiceMock } from '@kbn/core/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { fieldFormatsMock } from '@kbn/field-formats-plugin/common/mocks';
import { QueryClient } from '@kbn/react-query';
import { useQueryTriggerEvents } from '@kbn/workflows-ui';
import { testQueryClientConfig } from '@kbn/workflows-ui/src/test_utils';
import { TIMEPICKER_FALLBACK } from './constants';
import { MockSearchBar } from './test_utils/workflow_form_test_setup';
import { WorkflowExecuteEventForm } from './workflow_execute_event_form';
import { useKibana } from '../../../hooks/use_kibana';
import { getTestProvider } from '../../../shared/mocks/test_providers';

const mockTheme = themeServiceMock.createSetupContract({ darkMode: false, name: 'borealis' });
const mockData = dataPluginMock.createStartContract();
const mockUiSettings = {
  get: vi.fn(),
  isDefault: vi.fn(() => true),
};
const mockStorage = {
  get: vi.fn(),
  set: vi.fn(),
  clear: vi.fn(),
  remove: vi.fn(),
};

vi.mock('../../../hooks/use_kibana');
vi.mock('../../workflow_list/ui/use_event_driven_execution_status', () => {
  const mocked = {
    useEventDrivenExecutionStatus: () => ({
      eventDrivenExecutionEnabled: true,
      isLoading: false,
      error: false,
    }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('@kbn/workflows-ui', async () => {
  const actual = await vi.importActual('@kbn/workflows-ui');
  return {
    ...actual,
    useQueryTriggerEvents: vi.fn(),
  };
});

vi.mock('@kbn/unified-data-table', async () => {
  const actual = await vi.importActual('@kbn/unified-data-table');
  return {
    ...actual,
    UnifiedDataTable: () => <div data-test-subj="unifiedDataTable" />,
  };
});

const mockUseKibana = useKibana as MockedFunction<typeof useKibana>;
const mockUseQueryTriggerEvents = useQueryTriggerEvents as MockedFunction<
  typeof useQueryTriggerEvents
>;
const queryClient = new QueryClient(testQueryClientConfig);

const TestWrapper = getTestProvider({ queryClient });

const baseDefinition = {
  version: '1',
  name: 'wf',
  enabled: true,
  triggers: [{ type: 'custom.trigger' }],
  steps: [],
};

describe('WorkflowExecuteEventForm', () => {
  const mockSetValue = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
    mockUseQueryTriggerEvents.mockReset();
    (mockData.query.timefilter.timefilter.getTimeDefaults as Mock).mockReturnValue({
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
      isFetching: false,
      isPreviousData: false,
      isError: false,
      error: undefined,
      isSuccess: true,
      status: 'success',
      refetch: vi.fn().mockResolvedValue(undefined),
    } as unknown as ReturnType<typeof useQueryTriggerEvents>);
    mockUseKibana.mockReturnValue({
      services: {
        unifiedSearch: {
          ui: {
            SearchBar: MockSearchBar,
          },
        },
        dataViews: {
          create: vi.fn().mockResolvedValue({
            id: 'dv-workflows-events',
            title: '.workflows-events',
            timeFieldName: '@timestamp',
            getFieldByName: vi.fn(() => ({ name: 'triggerId' })),
            fields: {
              replaceAll: vi.fn(),
              getByName: vi.fn(() => null),
              getAll: vi.fn().mockReturnValue([]),
              create: vi.fn(),
              add: vi.fn(),
              remove: vi.fn(),
              update: vi.fn(),
              filter: vi.fn().mockReturnValue([]),
            },
          }),
          refreshFields: vi.fn().mockResolvedValue(undefined),
        },
        notifications: {
          toasts: {
            addWarning: vi.fn(),
            addError: vi.fn(),
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
    expect(getByTestId('query-input')).toHaveValue('triggerId: "custom.trigger"');
    expect(mockUseQueryTriggerEvents).toHaveBeenCalledWith(
      expect.objectContaining({
        kql: 'triggerId: "custom.trigger"',
        page: 1,
        size: 50,
        from: TIMEPICKER_FALLBACK.from,
        to: TIMEPICKER_FALLBACK.to,
      }),
      expect.objectContaining({ enabled: true })
    );
  });

  it('uses TIMEPICKER_FALLBACK when timefilter getTimeDefaults returns undefined', async () => {
    (mockData.query.timefilter.timefilter.getTimeDefaults as Mock).mockReturnValue(undefined);

    const { findByTestId } = render(
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
    expect(mockUseQueryTriggerEvents).toHaveBeenCalledWith(
      expect.objectContaining({
        from: TIMEPICKER_FALLBACK.from,
        to: TIMEPICKER_FALLBACK.to,
      }),
      expect.objectContaining({ enabled: true })
    );
  });

  it('uses timefilter getTimeDefaults for the initial trigger event query range when set', async () => {
    (mockData.query.timefilter.timefilter.getTimeDefaults as Mock).mockReturnValue({
      from: 'now-1h',
      to: 'now',
    });

    const { findByTestId } = render(
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
    expect(mockUseQueryTriggerEvents).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'now-1h',
        to: 'now',
      }),
      expect.objectContaining({ enabled: true })
    );
  });

  it('sends only the KQL visible in the search bar after submit', async () => {
    const { findByTestId, getByTestId } = render(
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
    const input = getByTestId('query-input');
    fireEvent.change(input, { target: { value: 'eventId: e1' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', charCode: 13 });

    await waitFor(() => {
      const calls = mockUseQueryTriggerEvents.mock.calls;
      const lastParams = calls[calls.length - 1][0] as Record<string, unknown>;
      expect(lastParams).toMatchObject({
        kql: 'eventId: e1',
      });
    });
  });

  it('scopes search KQL to every custom trigger id from the workflow', async () => {
    const definitionWithTwoCustomTriggers = {
      ...baseDefinition,
      triggers: [
        { type: 'workflow.execution.failed' },
        { type: 'cases.created' },
        { type: 'manual' },
      ],
    };

    const { findByTestId } = render(
      <TestWrapper>
        <WorkflowExecuteEventForm
          definition={definitionWithTwoCustomTriggers as any}
          value=""
          setValue={mockSetValue}
          errors={null}
        />
      </TestWrapper>
    );

    await findByTestId('workflowTriggerEventsTable');
    expect(mockUseQueryTriggerEvents).toHaveBeenCalledWith(
      expect.objectContaining({
        kql: 'triggerId: ("workflow.execution.failed" or "cases.created")',
      }),
      expect.objectContaining({ enabled: true })
    );
  });

  it('resets trigger event search pagination when the search bar is submitted again', async () => {
    const { findByTestId, getByTestId } = render(
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
    fireEvent.click(getByTestId('mock-search-bar-submit'));

    await waitFor(() => {
      const lastCall =
        mockUseQueryTriggerEvents.mock.calls[mockUseQueryTriggerEvents.mock.calls.length - 1];
      expect((lastCall[0] as { page: number }).page).toBe(1);
    });
  });

  it('shows an empty state when no trigger events match the default scope', async () => {
    mockUseQueryTriggerEvents.mockReturnValue({
      data: {
        hits: [],
        total: 0,
        page: 1,
        size: 50,
      },
      isLoading: false,
      isFetching: false,
      isPreviousData: false,
      isError: false,
      error: undefined,
      isSuccess: true,
      status: 'success',
      refetch: vi.fn().mockResolvedValue(undefined),
    } as unknown as ReturnType<typeof useQueryTriggerEvents>);

    const { findByTestId, getByText } = render(
      <TestWrapper>
        <WorkflowExecuteEventForm
          definition={baseDefinition as any}
          value=""
          setValue={mockSetValue}
          errors={null}
        />
      </TestWrapper>
    );

    expect(await findByTestId('workflowTriggerEventsEmptyState')).toBeInTheDocument();
    expect(getByText('No events in the selected time range')).toBeInTheDocument();
    expect(
      getByText(/widening the time range or adjusting the query in the search bar/)
    ).toBeInTheDocument();
  });

  it('shows the filtered empty state when custom KQL returns no events', async () => {
    mockUseQueryTriggerEvents.mockReturnValue({
      data: {
        hits: [],
        total: 0,
        page: 1,
        size: 50,
      },
      isLoading: false,
      isFetching: false,
      isPreviousData: false,
      isError: false,
      error: undefined,
      isSuccess: true,
      status: 'success',
      refetch: vi.fn().mockResolvedValue(undefined),
    } as unknown as ReturnType<typeof useQueryTriggerEvents>);

    const { findByTestId, getByTestId, getByText } = render(
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
    const input = getByTestId('query-input');
    fireEvent.change(input, { target: { value: 'eventId: "missing"' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', charCode: 13 });

    expect(await findByTestId('workflowTriggerEventsEmptyState')).toBeInTheDocument();
    expect(getByText('No events match your search')).toBeInTheDocument();
    expect(
      getByText(/Try widening the time range, adjusting the query in the search bar/)
    ).toBeInTheDocument();
  });

  it('does not show the empty state while refetching with no rows', async () => {
    mockUseQueryTriggerEvents.mockReturnValue({
      data: {
        hits: [],
        total: 0,
        page: 1,
        size: 50,
      },
      isLoading: false,
      isFetching: true,
      isPreviousData: false,
      isError: false,
      error: undefined,
      isSuccess: true,
      status: 'success',
      refetch: vi.fn().mockResolvedValue(undefined),
    } as unknown as ReturnType<typeof useQueryTriggerEvents>);

    const { findByTestId, queryByTestId } = render(
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
    expect(queryByTestId('workflowTriggerEventsEmptyState')).not.toBeInTheDocument();
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
