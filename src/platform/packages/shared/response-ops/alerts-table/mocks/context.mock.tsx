/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Alert, BrowserFields, LegacyField } from '@kbn/alerting-types';
import { AlertsField, RowSelectionState } from '../types';
import { AdditionalContext, RenderContext } from '../types';
import { createCasesServiceMock, getCasesMapMock } from './cases.mock';
import { getMaintenanceWindowsMock } from './maintenance_windows.mock';
import { EuiButtonIcon, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { identity } from 'lodash';
import { FieldFormatsRegistry } from '@kbn/field-formats-plugin/common';
import {
  ALERT_CASE_IDS,
  ALERT_FLAPPING,
  ALERT_REASON,
  ALERT_RULE_NAME,
  ALERT_RULE_UUID,
  ALERT_STATUS,
} from '@kbn/rule-data-utils';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import { applicationServiceMock } from '@kbn/core-application-browser-mocks';
import { settingsServiceMock } from '@kbn/core-ui-settings-browser-mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';
import { createPartialObjectMock } from '../utils/test';

export const mockFieldFormatsRegistry = {
  deserialize: jest.fn(() => ({
    id: 'string',
    convert: jest.fn().mockImplementation(identity),
  })),
} as unknown as FieldFormatsRegistry;

export const mockBrowserFields: BrowserFields = {
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
};

export const mockColumns = [
  {
    id: ALERT_RULE_NAME,
    displayAsText: 'Name',
  },
  {
    id: ALERT_REASON,
    displayAsText: 'Reason',
  },
  {
    id: ALERT_STATUS,
    displayAsText: 'Alert status',
  },
  {
    id: ALERT_CASE_IDS,
    displayAsText: 'Cases',
  },
];

export const mockAlerts: Alert[] = [
  {
    _id: 'test-1',
    _index: 'alerts',
    [ALERT_RULE_NAME]: ['one'],
    [ALERT_RULE_UUID]: ['rule-uuid'],
    [ALERT_REASON]: ['two'],
    [ALERT_STATUS]: ['active'],
    [ALERT_FLAPPING]: [true],
    [ALERT_CASE_IDS]: ['test-id'],
  },
  {
    _id: 'test-2',
    _index: 'alerts',
    [ALERT_RULE_NAME]: ['three'],
    [ALERT_REASON]: ['four'],
    [ALERT_STATUS]: ['active'],
    [ALERT_FLAPPING]: [false],
    [ALERT_CASE_IDS]: ['test-id-2'],
  },
  {
    _id: 'test-3',
    _index: 'alerts',
    [ALERT_RULE_NAME]: ['five'],
    [ALERT_REASON]: ['six'],
    [ALERT_STATUS]: ['recovered'],
    [ALERT_FLAPPING]: [true],
  },
  {
    _id: 'test-4',
    _index: 'alerts',
    [ALERT_RULE_NAME]: ['seven'],
    [ALERT_REASON]: ['eight'],
    [ALERT_STATUS]: ['recovered'],
    [ALERT_FLAPPING]: [false],
  },
];
export const mockOldAlertsData = [
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
] as LegacyField[][];
export const mockEcsData = [
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
];

export const mockCases = getCasesMapMock();
export const mockMaintenanceWindows = getMaintenanceWindowsMock().reduce(
  (acc, val) => acc.set(val.id, val),
  new Map()
);

export const createMockBulkActionsState = () => ({
  rowSelection: new Map<number, RowSelectionState>(),
  isAllSelected: false,
  areAllVisibleRowsSelected: false,
  rowCount: 4,
  updatedAt: Date.now(),
});

export const mockRenderContext = createPartialObjectMock<RenderContext<AdditionalContext>>({
  tableId: 'test-table',
  dataGridRef: { current: null },
  showAlertStatusWithFlapping: true,
  columns: mockColumns,
  refresh: jest.fn(),
  isLoading: false,
  isLoadingAlerts: false,
  alerts: mockAlerts,
  ecsAlertsData: mockEcsData,
  oldAlertsData: mockOldAlertsData,
  alertsCount: mockAlerts.length,
  browserFields: mockBrowserFields,
  isLoadingCases: false,
  cases: mockCases,
  isLoadingMaintenanceWindows: false,
  maintenanceWindows: mockMaintenanceWindows,
  isLoadingMutedAlerts: false,
  mutedAlerts: {},
  pageIndex: 0,
  pageSize: 1,
  openAlertInFlyout: jest.fn(),
  bulkActionsStore: [
    createMockBulkActionsState(),
    jest.fn(),
  ] as unknown as RenderContext<AdditionalContext>['bulkActionsStore'],
  renderCellValue: jest.fn().mockImplementation((props) => {
    return `${props.colIndex}:${props.rowIndex}`;
  }),
  renderFlyoutHeader: jest.fn(),
  renderFlyoutBody: jest.fn(),
  renderFlyoutFooter: jest.fn(),
  renderActionsCell: () => (
    <EuiFlexItem grow={false}>
      <EuiButtonIcon
        iconType="analyzeEvent"
        color="primary"
        onClick={() => {}}
        size="s"
        data-test-subj="testAction"
        aria-label="Test action"
      />
    </EuiFlexItem>
  ),
  services: {
    http: httpServiceMock.createStartContract(),
    data: dataPluginMock.createStartContract(),
    fieldFormats: mockFieldFormatsRegistry,
    notifications: notificationServiceMock.createStartContract(),
    application: applicationServiceMock.createStartContract(),
    settings: settingsServiceMock.createStartContract(),
    licensing: licensingMock.createStart(),
    cases: createCasesServiceMock(),
  },
});
