/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { FunctionComponent } from 'react';
import { BehaviorSubject } from 'rxjs';
import userEvent from '@testing-library/user-event';
import { get } from 'lodash';
import { render, waitFor, screen, act } from '@testing-library/react';
import { ALERT_CASE_IDS, ALERT_MAINTENANCE_WINDOW_IDS, ALERT_UUID } from '@kbn/rule-data-utils';
import type { Alert, LegacyField } from '@kbn/alerting-types';
import { settingsServiceMock } from '@kbn/core-ui-settings-browser-mocks';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fetchAlertsFields } from '@kbn/alerts-ui-shared/src/common/apis/fetch_alerts_fields';
import { searchAlerts } from '@kbn/alerts-ui-shared/src/common/apis/search_alerts/search_alerts';
import { testQueryClientConfig } from '@kbn/alerts-ui-shared/src/common/test_utils/test_query_client_config';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { getMutedAlertsInstancesByRule } from '@kbn/response-ops-alerts-apis/apis/get_muted_alerts_instances_by_rule';
import { applicationServiceMock, notificationServiceMock } from '@kbn/core/public/mocks';
import { afterAll } from '@elastic/synthetics';
import { fieldFormatsMock } from '@kbn/field-formats-plugin/common/mocks';
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';
import {
  AlertsDataGridProps,
  AlertsTableProps,
  AdditionalContext,
  RenderContext,
  AlertsField,
} from '../types';
import { AlertsTable } from './alerts_table';
import { AlertsDataGrid } from './alerts_data_grid';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { getCasesMock, createCasesServiceMock } from '../mocks/cases.mock';
import { getMaintenanceWindowsMock } from '../mocks/maintenance_windows.mock';
import { bulkGetCases } from '../apis/bulk_get_cases';
import { bulkGetMaintenanceWindows } from '../apis/bulk_get_maintenance_windows';
import { useLicense } from '../hooks/use_license';
import { getJsDomPerformanceFix } from '../utils/test';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';

type BaseAlertsTableProps = AlertsTableProps;

// Search alerts mock
jest.mock('@kbn/alerts-ui-shared/src/common/apis/search_alerts/search_alerts');
const mockSearchAlerts = jest.mocked(searchAlerts);
const columns = [
  {
    id: AlertsField.name,
    displayAsText: 'Name',
  },
  {
    id: AlertsField.reason,
    displayAsText: 'Reason',
  },
  {
    id: ALERT_CASE_IDS,
    displayAsText: 'Cases',
  },
  {
    id: ALERT_MAINTENANCE_WINDOW_IDS,
    displayAsText: 'Maintenance Windows',
  },
];
const alerts: Alert[] = [
  {
    _id: 'test-1',
    _index: 'alerts',
    [AlertsField.name]: ['one'],
    [AlertsField.reason]: ['two'],
    [AlertsField.uuid]: ['1047d115-670d-469e-af7a-86fdd2b2f814'],
    [ALERT_UUID]: ['alert-id-1'],
    [ALERT_CASE_IDS]: ['test-id'],
    [ALERT_MAINTENANCE_WINDOW_IDS]: ['test-mw-id-1'],
  },
  {
    _id: 'test-2',
    _index: 'alerts',
    [AlertsField.name]: ['three'],
    [AlertsField.reason]: ['four'],
    [AlertsField.uuid]: ['bf5f6d63-5afd-48e0-baf6-f28c2b68db46'],
    [ALERT_CASE_IDS]: ['test-id-2'],
    [ALERT_MAINTENANCE_WINDOW_IDS]: ['test-mw-id-2'],
  },
  {
    _id: 'test-3',
    _index: 'alerts',
    [AlertsField.name]: ['five'],
    [AlertsField.reason]: ['six'],
    [AlertsField.uuid]: ['1047d115-5afd-469e-baf6-f28c2b68db46'],
    [ALERT_CASE_IDS]: [],
    [ALERT_MAINTENANCE_WINDOW_IDS]: [],
  },
];
const oldAlertsData = [
  [
    {
      field: AlertsField.name,
      value: ['one'],
    },
    {
      field: AlertsField.reason,
      value: ['two'],
    },
  ],
  [
    {
      field: AlertsField.name,
      value: ['three'],
    },
    {
      field: AlertsField.reason,
      value: ['four'],
    },
  ],
  [
    {
      field: AlertsField.name,
      value: ['five'],
    },
    {
      field: AlertsField.reason,
      value: ['six'],
    },
  ],
] as LegacyField[][];
const ecsAlertsData = [
  [
    {
      '@timestamp': ['2023-01-28T10:48:49.559Z'],
      _id: 'SomeId',
      _index: 'SomeIndex',
      kibana: {
        alert: {
          rule: {
            name: ['one'],
          },
          reason: ['two'],
        },
      },
    },
  ],
  [
    {
      '@timestamp': ['2023-01-27T10:48:49.559Z'],
      _id: 'SomeId2',
      _index: 'SomeIndex',
      kibana: {
        alert: {
          rule: {
            name: ['three'],
          },
          reason: ['four'],
        },
      },
    },
  ],
  [
    {
      '@timestamp': ['2023-01-26T10:48:49.559Z'],
      _id: 'SomeId3',
      _index: 'SomeIndex',
      kibana: {
        alert: {
          rule: {
            name: ['five'],
          },
          reason: ['six'],
        },
      },
    },
  ],
];
const mockSearchAlertsResponse: Awaited<ReturnType<typeof searchAlerts>> = {
  alerts,
  ecsAlertsData,
  oldAlertsData,
  total: alerts.length,
  querySnapshot: { request: [], response: [] },
};

// Alerts fields mock
jest.mock('@kbn/alerts-ui-shared/src/common/apis/fetch_alerts_fields');
jest.mocked(fetchAlertsFields).mockResolvedValue({
  browserFields: {
    kibana: {
      fields: {
        [AlertsField.uuid]: {
          category: 'kibana',
          name: AlertsField.uuid,
        },
        [AlertsField.name]: {
          category: 'kibana',
          name: AlertsField.name,
        },
        [AlertsField.reason]: {
          category: 'kibana',
          name: AlertsField.reason,
        },
      },
    },
  },
  fields: [],
});

// Muted alerts mock
jest.mock('@kbn/response-ops-alerts-apis/apis/get_muted_alerts_instances_by_rule');
jest.mocked(getMutedAlertsInstancesByRule).mockResolvedValue({
  data: [],
});

// Cases mock
jest.mock('../apis/bulk_get_cases');
const mockBulkGetCases = jest.mocked(bulkGetCases);
const mockCases = getCasesMock();
mockBulkGetCases.mockResolvedValue({ cases: mockCases, errors: [] });

// Maintenance windows mock
jest.mock('../apis/bulk_get_maintenance_windows');
jest.mock('../hooks/use_license');
const mockBulkGetMaintenanceWindows = jest.mocked(bulkGetMaintenanceWindows);
jest.mocked(useLicense).mockReturnValue({ isAtLeastPlatinum: () => true });
const mockMaintenanceWindows = getMaintenanceWindowsMock();
mockBulkGetMaintenanceWindows.mockResolvedValue({
  maintenanceWindows: mockMaintenanceWindows,
  errors: [],
});

// AlertsDataGrid mock
jest.mock('./alerts_data_grid', () => ({
  AlertsDataGrid: jest.fn(),
}));
const mockAlertsDataGrid = jest.mocked(AlertsDataGrid);

const applicationMock = applicationServiceMock.createStartContract();
const mockCurrentAppId$ = new BehaviorSubject<string>('testAppId');
const mockCaseService = createCasesServiceMock();

const { fix, cleanup } = getJsDomPerformanceFix();

beforeAll(() => {
  fix();
});

afterAll(() => {
  cleanup();
});

const queryClient = new QueryClient(testQueryClientConfig);
const TestComponent: FunctionComponent<BaseAlertsTableProps> = (props) => (
  <QueryClientProvider client={queryClient}>
    <IntlProvider locale="en">
      <AlertsTable {...props} />
    </IntlProvider>
  </QueryClientProvider>
);

describe('AlertsTable', () => {
  // Storage mock
  const mockStorageGet = jest.fn();
  jest.mock('../utils/storage', () => ({
    Storage: jest.fn().mockReturnValue({
      get: mockStorageGet,
      set: jest.fn(),
    }),
  }));

  const tableProps: BaseAlertsTableProps = {
    id: 'test-alerts-table',
    ruleTypeIds: ['logs'],
    query: {},
    columns,
    initialPageSize: 10,
    renderActionsCell: ({ openAlertInFlyout }) => {
      return (
        <button
          data-test-subj="expandColumnCellOpenFlyoutButton-0"
          onClick={() => {
            openAlertInFlyout('alert-id-1');
          }}
        />
      );
    },
    renderFlyoutBody: ({ alert }) => (
      <ul>
        {columns.map((column) => (
          <li data-test-subj={`alertsFlyout${column.displayAsText}`} key={column.id}>
            {get(alert as any, column.id, [])[0]}
          </li>
        ))}
      </ul>
    ),
    services: {
      http: httpServiceMock.createStartContract(),
      application: {
        ...applicationMock,
        getUrlForApp: jest.fn(() => ''),
        capabilities: {
          ...applicationMock.capabilities,
          cases: {
            create_cases: true,
            read_cases: true,
            update_cases: true,
            delete_cases: true,
            push_cases: true,
          },
          maintenanceWindow: {
            show: true,
          },
        },
        currentAppId$: mockCurrentAppId$,
      },
      data: dataPluginMock.createStartContract(),
      fieldFormats: fieldFormatsMock,
      licensing: licensingMock.createStart(),
      notifications: notificationServiceMock.createStartContract(),
      settings: settingsServiceMock.createStartContract(),
    },
  };

  let onChangePageIndex: AlertsDataGridProps['onChangePageIndex'];
  let refresh: RenderContext<AdditionalContext>['refresh'];

  mockAlertsDataGrid.mockImplementation((props) => {
    const { AlertsDataGrid: ActualAlertsDataGrid } = jest.requireActual('./alerts_data_grid');
    onChangePageIndex = props.onChangePageIndex;
    refresh = props.renderContext.refresh;
    return <ActualAlertsDataGrid {...props} />;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchAlerts.mockResolvedValue(mockSearchAlertsResponse);
  });

  describe('Cases', () => {
    const casesTableProps = {
      ...tableProps,
      services: {
        ...tableProps.services,
        cases: mockCaseService,
      },
    };

    beforeEach(() => {
      jest.clearAllMocks();
      mockCaseService.helpers.canUseCases = jest.fn().mockReturnValue({ create: true, read: true });
    });

    afterAll(() => {
      mockCaseService.ui.getCasesContext = jest.fn().mockImplementation(() => null);
    });

    it('should show the cases column', async () => {
      render(<TestComponent {...casesTableProps} />);
      expect(await screen.findByText('Cases')).toBeInTheDocument();
    });

    it('should show the cases titles correctly', async () => {
      render(<TestComponent {...casesTableProps} />);
      expect(await screen.findByText('Test case')).toBeInTheDocument();
      expect(await screen.findByText('Test case 2')).toBeInTheDocument();
    });

    it('should show the loading skeleton when fetching cases', async () => {
      mockBulkGetCases.mockResolvedValue({ cases: mockCases, errors: [] });

      render(<TestComponent {...casesTableProps} />);
      expect((await screen.findAllByTestId('cases-cell-loading')).length).toBe(3);
    });

    it('should pass the correct case ids to useBulkGetCases', async () => {
      render(<TestComponent {...casesTableProps} />);

      await waitFor(() => {
        expect(mockBulkGetCases).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({ ids: ['test-id', 'test-id-2'] }),
          expect.anything()
        );
      });
    });

    it('remove duplicated case ids', async () => {
      mockSearchAlerts.mockResolvedValue({
        ...mockSearchAlertsResponse,
        alerts: [...mockSearchAlertsResponse.alerts, ...mockSearchAlertsResponse.alerts],
      });

      render(<TestComponent {...casesTableProps} />);

      await waitFor(() => {
        expect(mockBulkGetCases).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({ ids: ['test-id', 'test-id-2'] }),
          expect.anything()
        );
      });
    });

    it('skips alerts with empty case ids', async () => {
      mockSearchAlerts.mockResolvedValue({
        ...mockSearchAlertsResponse,
        alerts: [
          {
            ...mockSearchAlertsResponse.alerts[0],
            'kibana.alert.case_ids': [],
          },
          mockSearchAlertsResponse.alerts[1],
        ],
      });

      render(<TestComponent {...casesTableProps} />);

      await waitFor(() => {
        expect(mockBulkGetCases).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({ ids: ['test-id-2'] }),
          expect.anything()
        );
      });
    });

    it('should not fetch cases if the user does not have permissions', async () => {
      mockCaseService.helpers.canUseCases = jest
        .fn()
        .mockReturnValue({ create: false, read: false });

      render(<TestComponent {...casesTableProps} />);

      await waitFor(() => {
        expect(mockBulkGetCases).not.toHaveBeenCalled();
      });
    });

    it('should not fetch cases if the column is not visible', async () => {
      mockCaseService.helpers.canUseCases = jest.fn().mockReturnValue({ create: true, read: true });

      const props: BaseAlertsTableProps = {
        ...casesTableProps,
        casesConfiguration: { featureId: 'test-feature-id', owner: ['cases'] },
      };

      render(
        <TestComponent
          {...props}
          columns={[
            {
              id: AlertsField.name,
              displayAsText: 'Name',
            },
          ]}
        />
      );
      await waitFor(() => {
        expect(mockBulkGetCases).not.toHaveBeenCalled();
      });
    });

    it('calls canUseCases with an empty array if the case configuration is not defined', async () => {
      render(<TestComponent {...casesTableProps} />);
      expect(mockCaseService.helpers.canUseCases).toHaveBeenCalledWith([]);
    });

    it('calls canUseCases with the case owner if defined', async () => {
      const props: BaseAlertsTableProps = {
        ...casesTableProps,
        casesConfiguration: { featureId: 'test-feature-id', owner: ['cases'] },
      };

      render(<TestComponent {...props} />);
      expect(mockCaseService.helpers.canUseCases).toHaveBeenCalledWith(['cases']);
    });

    it('should call the cases context with the correct props', async () => {
      const props: BaseAlertsTableProps = {
        ...casesTableProps,
        casesConfiguration: { featureId: 'test-feature-id', owner: ['cases'] },
      };

      const CasesContextMock = jest.fn().mockReturnValue(null);
      mockCaseService.ui.getCasesContext = jest.fn().mockReturnValue(CasesContextMock);

      render(<TestComponent {...props} />);

      expect(CasesContextMock).toHaveBeenCalledWith(
        {
          children: expect.anything(),
          owner: ['cases'],
          permissions: { create: true, read: true },
          features: { alerts: { sync: false } },
        },
        {}
      );
    });

    it('should call the cases context with the empty owner if the case config is not defined', async () => {
      const CasesContextMock = jest.fn().mockReturnValue(null);
      mockCaseService.ui.getCasesContext = jest.fn().mockReturnValue(CasesContextMock);

      render(<TestComponent {...casesTableProps} />);
      expect(CasesContextMock).toHaveBeenCalledWith(
        {
          children: expect.anything(),
          owner: [],
          permissions: { create: true, read: true },
          features: { alerts: { sync: false } },
        },
        {}
      );
    });

    it('should call the cases context with correct permissions', async () => {
      const CasesContextMock = jest.fn().mockReturnValue(null);
      mockCaseService.ui.getCasesContext = jest.fn().mockReturnValue(CasesContextMock);
      mockCaseService.helpers.canUseCases = jest
        .fn()
        .mockReturnValue({ create: false, read: false });

      render(<TestComponent {...casesTableProps} />);
      expect(CasesContextMock).toHaveBeenCalledWith(
        {
          children: expect.anything(),
          owner: [],
          permissions: { create: false, read: false },
          features: { alerts: { sync: false } },
        },
        {}
      );
    });

    it('should call the cases context with sync alerts turned on if defined in the cases config', async () => {
      const props: BaseAlertsTableProps = {
        ...casesTableProps,
        casesConfiguration: {
          featureId: 'test-feature-id',
          owner: ['cases'],
          syncAlerts: true,
        },
      };

      const CasesContextMock = jest.fn().mockReturnValue(null);
      mockCaseService.ui.getCasesContext = jest.fn().mockReturnValue(CasesContextMock);

      render(<TestComponent {...props} />);
      expect(CasesContextMock).toHaveBeenCalledWith(
        {
          children: expect.anything(),
          owner: ['cases'],
          permissions: { create: true, read: true },
          features: { alerts: { sync: true } },
        },
        {}
      );
    });
  });

  describe('Maintenance windows', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should show maintenance windows column', async () => {
      render(<TestComponent {...tableProps} />);
      expect(await screen.findByText('Maintenance Windows')).toBeInTheDocument();
    });

    it('should show maintenance windows titles correctly', async () => {
      render(<TestComponent {...tableProps} />);
      expect(await screen.findByText('test-title')).toBeInTheDocument();
      expect(await screen.findByText('test-title-2')).toBeInTheDocument();
    });

    it('should pass the correct maintenance window ids to useBulkGetMaintenanceWindows', async () => {
      render(<TestComponent {...tableProps} />);
      await waitFor(() => {
        expect(mockBulkGetMaintenanceWindows).toHaveBeenCalledWith(
          expect.objectContaining({
            ids: ['test-mw-id-1', 'test-mw-id-2'],
          })
        );
      });
    });

    it('should remove duplicated maintenance window ids', async () => {
      mockSearchAlerts.mockResolvedValue({
        ...mockSearchAlertsResponse,
        alerts: [...mockSearchAlertsResponse.alerts, ...mockSearchAlertsResponse.alerts],
      });

      render(<TestComponent {...tableProps} />);
      await waitFor(() => {
        expect(mockBulkGetMaintenanceWindows).toHaveBeenCalledWith(
          expect.objectContaining({
            ids: ['test-mw-id-1', 'test-mw-id-2'],
          })
        );
      });
    });

    it('should skip alerts with empty maintenance window ids', async () => {
      mockSearchAlerts.mockResolvedValue({
        ...mockSearchAlertsResponse,
        alerts: [
          {
            ...mockSearchAlertsResponse.alerts[0],
            'kibana.alert.maintenance_window_ids': [],
          },
          mockSearchAlertsResponse.alerts[1],
        ],
      });

      render(<TestComponent {...tableProps} />);
      await waitFor(() => {
        expect(mockBulkGetMaintenanceWindows).toHaveBeenCalledWith(
          expect.objectContaining({
            ids: ['test-mw-id-2'],
          })
        );
      });
    });

    it('should show loading skeleton when fetching maintenance windows', async () => {
      mockBulkGetMaintenanceWindows.mockResolvedValue({
        maintenanceWindows: mockMaintenanceWindows,
        errors: [],
      });

      render(<TestComponent {...tableProps} />);
      expect((await screen.findAllByTestId('maintenance-window-cell-loading')).length).toBe(1);
    });

    it('should not fetch maintenance windows if the user does not have permission', async () => {});

    it('should not fetch maintenance windows if the column is not visible', async () => {
      render(
        <TestComponent
          {...tableProps}
          columns={[
            {
              id: AlertsField.name,
              displayAsText: 'Name',
            },
          ]}
        />
      );
      await waitFor(() => {
        expect(mockBulkGetMaintenanceWindows).not.toHaveBeenCalled();
      });
    });
  });

  describe('flyout', () => {
    it('should show a flyout when selecting an alert', async () => {
      const wrapper = render(<TestComponent {...tableProps} />);
      await userEvent.click(wrapper.queryAllByTestId('expandColumnCellOpenFlyoutButton-0')[0]!);

      const result = await wrapper.findAllByTestId('alertsFlyout');
      expect(result.length).toBe(1);

      expect(wrapper.queryByTestId('alertsFlyoutName')?.textContent).toBe('one');
      expect(wrapper.queryByTestId('alertsFlyoutReason')?.textContent).toBe('two');

      // Should paginate too
      await userEvent.click(wrapper.queryAllByTestId('pagination-button-next')[0]);
      expect(wrapper.queryByTestId('alertsFlyoutName')?.textContent).toBe('three');
      expect(wrapper.queryByTestId('alertsFlyoutReason')?.textContent).toBe('four');

      await userEvent.click(wrapper.queryAllByTestId('pagination-button-previous')[0]);
      expect(wrapper.queryByTestId('alertsFlyoutName')?.textContent).toBe('one');
      expect(wrapper.queryByTestId('alertsFlyoutReason')?.textContent).toBe('two');
    });

    it('should refetch data if flyout pagination exceeds the current page', async () => {
      render(
        <TestComponent
          {...{
            ...tableProps,
            initialPageSize: 1,
          }}
        />
      );

      await userEvent.click(await screen.findByTestId('expandColumnCellOpenFlyoutButton-0'));
      const result = await screen.findAllByTestId('alertsFlyout');
      expect(result.length).toBe(1);

      mockSearchAlerts.mockClear();

      await userEvent.click(await screen.findByTestId('pagination-button-next'));
      expect(mockSearchAlerts).toHaveBeenCalledWith(
        expect.objectContaining({
          pageIndex: 1,
          pageSize: 1,
        })
      );

      mockSearchAlerts.mockClear();
      await userEvent.click(await screen.findByTestId('pagination-button-previous'));
      expect(mockSearchAlerts).toHaveBeenCalledWith(
        expect.objectContaining({
          pageIndex: 0,
          pageSize: 1,
        })
      );
    });

    it('Should be able to go back from last page to n - 1', async () => {
      render(
        <TestComponent
          {...{
            ...tableProps,
            initialPageSize: 2,
          }}
        />
      );

      await userEvent.click(
        (
          await screen.findAllByTestId('expandColumnCellOpenFlyoutButton-0')
        )[0]
      );
      const result = await screen.findAllByTestId('alertsFlyout');
      expect(result.length).toBe(1);

      mockSearchAlerts.mockClear();

      await userEvent.click(await screen.findByTestId('pagination-button-last'));
      expect(mockSearchAlerts).toHaveBeenCalledWith(
        expect.objectContaining({
          pageIndex: 1,
          pageSize: 2,
        })
      );

      mockSearchAlerts.mockClear();
      await userEvent.click(await screen.findByTestId('pagination-button-previous'));
      expect(mockSearchAlerts).toHaveBeenCalledWith(
        expect.objectContaining({
          pageIndex: 0,
          pageSize: 2,
        })
      );
    });
  });

  describe('field browser', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockBulkGetCases.mockResolvedValue({ cases: [], errors: [] });
      mockBulkGetMaintenanceWindows.mockResolvedValue({
        maintenanceWindows: mockMaintenanceWindows,
        errors: [],
      });
    });

    it('should show field browser', async () => {
      render(<TestComponent {...tableProps} />);
      expect(await screen.findByTestId('show-field-browser')).toBeInTheDocument();
    });

    it('should remove an already existing element when selected', async () => {
      render(<TestComponent {...tableProps} />);

      expect(screen.queryByTestId(`dataGridHeaderCell-${AlertsField.name}`)).not.toBe(null);
      await userEvent.click(await screen.findByTestId('show-field-browser'));
      const fieldCheckbox = screen.getByTestId(`field-${AlertsField.name}-checkbox`);
      await userEvent.click(fieldCheckbox);
      await userEvent.click(screen.getByTestId('close'));

      await waitFor(() => {
        expect(screen.queryByTestId(`dataGridHeaderCell-${AlertsField.name}`)).toBe(null);
      });
    });

    it('should restore a default element that has been removed previously', async () => {
      mockStorageGet.mockClear();
      mockStorageGet.mockReturnValue({
        columns: [{ displayAsText: 'Reason', id: AlertsField.reason, schema: undefined }],
        sort: [
          {
            [AlertsField.reason]: {
              order: 'asc',
            },
          },
        ],
        visibleColumns: [AlertsField.reason],
      });

      render(<TestComponent {...tableProps} />);

      expect(screen.queryByTestId(`dataGridHeaderCell-${AlertsField.name}`)).toBe(null);
      await userEvent.click(await screen.findByTestId('show-field-browser'));
      const fieldCheckbox = screen.getByTestId(`field-${AlertsField.name}-checkbox`);
      await userEvent.click(fieldCheckbox);
      await userEvent.click(screen.getByTestId('close'));

      await waitFor(() => {
        expect(screen.queryByTestId(`dataGridHeaderCell-${AlertsField.name}`)).not.toBe(null);
        const titles: string[] = [];
        screen
          .getByTestId('dataGridHeader')
          .querySelectorAll('.euiDataGridHeaderCell__content')
          .forEach((n) => titles.push(n?.getAttribute('title') ?? ''));
        expect(titles).toContain('Name');
      });
    });

    it('should insert a new field as column when its not a default one', async () => {
      const { getByTestId, queryByTestId } = render(<TestComponent {...tableProps} />);

      expect(queryByTestId(`dataGridHeaderCell-${AlertsField.uuid}`)).toBe(null);
      await userEvent.click(getByTestId('show-field-browser'));
      const fieldCheckbox = getByTestId(`field-${AlertsField.uuid}-checkbox`);
      await userEvent.click(fieldCheckbox);
      await userEvent.click(getByTestId('close'));

      await waitFor(() => {
        expect(queryByTestId(`dataGridHeaderCell-${AlertsField.uuid}`)).not.toBe(null);
        expect(
          queryByTestId(`dataGridHeaderCell-${AlertsField.uuid}`)!
            .querySelector('.euiDataGridHeaderCell__content')!
            .getAttribute('title')
        ).toBe(AlertsField.uuid);
      });
    });
  });

  const testPersistentControls = () => {
    describe('persistent controls', () => {
      it('should show persistent controls if set', async () => {
        const props: BaseAlertsTableProps = {
          ...tableProps,
          renderAdditionalToolbarControls: () => <span>This is a persistent control</span>,
        };
        render(<TestComponent {...props} />);
        expect(await screen.findByText('This is a persistent control')).toBeInTheDocument();
      });
    });
  };
  testPersistentControls();

  const testInspectButton = () => {
    describe('inspect button', () => {
      it('should hide the inspect button by default', () => {
        render(<TestComponent {...tableProps} />);
        expect(screen.queryByTestId('inspect-icon-button')).not.toBeInTheDocument();
      });

      it('should show the inspect button if the right prop is set', async () => {
        const props: BaseAlertsTableProps = {
          ...tableProps,
          showInspectButton: true,
        };
        render(<TestComponent {...props} />);
        expect(await screen.findByTestId('inspect-icon-button')).toBeInTheDocument();
      });
    });
  };
  testInspectButton();

  describe('empty state', () => {
    beforeEach(() => {
      mockSearchAlerts.mockResolvedValue({
        alerts: [],
        oldAlertsData: [],
        ecsAlertsData: [],
        total: 0,
        querySnapshot: { request: [], response: [] },
      });
    });

    it('should render an empty screen if there are no alerts', async () => {
      render(<TestComponent {...tableProps} />);
      expect(await screen.findByTestId('alertsTableEmptyState')).toBeTruthy();
    });

    testInspectButton();

    describe('when persistent controls are set', () => {
      testPersistentControls();
    });
  });

  describe('Client provided toolbar visibility options', () => {
    it('hide column order control', () => {
      const props: BaseAlertsTableProps = {
        ...tableProps,
        toolbarVisibility: { showColumnSelector: false },
      };

      render(<TestComponent {...props} />);

      expect(screen.queryByTestId('dataGridColumnSelectorButton')).not.toBeInTheDocument();
    });
    it('hide sort Selection', () => {
      const customTableProps: BaseAlertsTableProps = {
        ...tableProps,
        toolbarVisibility: { showSortSelector: false },
      };

      render(<TestComponent {...customTableProps} />);

      expect(screen.queryByTestId('dataGridColumnSortingButton')).not.toBeInTheDocument();
    });
  });

  describe('Pagination', () => {
    it('resets the page index when any query parameter changes', () => {
      mockSearchAlerts.mockResolvedValue({
        ...mockSearchAlertsResponse,
        alerts: Array.from({ length: 100 }).map((_, i) => ({
          _id: `${i}`,
          _index: 'alerts',
          [AlertsField.uuid]: [`alert-${i}`],
        })),
      });
      const { rerender } = render(<TestComponent {...tableProps} />);
      act(() => {
        onChangePageIndex(1);
      });
      rerender(
        <TestComponent
          {...tableProps}
          query={{ bool: { filter: [{ term: { 'kibana.alert.rule.name': 'test' } }] } }}
        />
      );
      expect(mockSearchAlerts).toHaveBeenLastCalledWith(expect.objectContaining({ pageIndex: 0 }));
    });

    it('resets the page index when refetching alerts', () => {
      mockSearchAlerts.mockResolvedValue({
        ...mockSearchAlertsResponse,
        alerts: Array.from({ length: 100 }).map((_, i) => ({
          _id: `${i}`,
          _index: 'alerts',
          [AlertsField.uuid]: [`alert-${i}`],
        })),
      });
      render(<TestComponent {...tableProps} />);
      act(() => {
        onChangePageIndex(1);
      });
      act(() => {
        refresh();
      });
      expect(mockSearchAlerts).toHaveBeenLastCalledWith(expect.objectContaining({ pageIndex: 0 }));
    });
  });
});
