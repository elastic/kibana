/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiIconType } from '@elastic/eui/src/components/icon/icon';
import { AlertConsumers } from '@kbn/rule-data-utils';
import type { SortCombinations } from '@elastic/elasticsearch/lib/api/types';
import {
  APM_DISPLAY_NAME,
  INFRASTRUCTURE_DISPLAY_NAME,
  LOGS_DISPLAY_NAME,
  ML_DISPLAY_NAME,
  OBSERVABILITY_DISPLAY_NAME,
  SECURITY_DISPLAY_NAME,
  SLO_DISPLAY_NAME,
  STACK_DISPLAY_NAME,
  STACK_MONITORING_DISPLAY_NAME,
  UPTIME_DISPLAY_NAME,
} from './translations';
import { AlertsTableSupportedConsumers } from './types';

interface AlertProducerData {
  displayName: string;
  icon: EuiIconType;
  subFeatureIds?: AlertConsumers[];
}

export const observabilityFeatureIds: AlertConsumers[] = [
  AlertConsumers.OBSERVABILITY,
  AlertConsumers.APM,
  AlertConsumers.INFRASTRUCTURE,
  AlertConsumers.LOGS,
  AlertConsumers.SLO,
  AlertConsumers.UPTIME,
  AlertConsumers.ALERTS,
];

export const stackFeatureIds: AlertConsumers[] = [
  AlertConsumers.STACK_ALERTS,
  AlertConsumers.ML,
  AlertConsumers.DISCOVER,
];

export const [_, ...observabilityApps] = observabilityFeatureIds;

export const alertProducersData: Record<AlertsTableSupportedConsumers, AlertProducerData> = {
  [AlertConsumers.OBSERVABILITY]: {
    displayName: OBSERVABILITY_DISPLAY_NAME,
    icon: 'logoObservability',
    subFeatureIds: observabilityFeatureIds,
  },
  [AlertConsumers.APM]: {
    displayName: APM_DISPLAY_NAME,
    icon: 'apmApp',
  },
  [AlertConsumers.INFRASTRUCTURE]: {
    displayName: INFRASTRUCTURE_DISPLAY_NAME,
    icon: 'logoObservability',
  },
  [AlertConsumers.LOGS]: {
    displayName: LOGS_DISPLAY_NAME,
    icon: 'logsApp',
  },
  [AlertConsumers.SLO]: {
    displayName: SLO_DISPLAY_NAME,
    icon: 'logoObservability',
  },
  [AlertConsumers.UPTIME]: {
    displayName: UPTIME_DISPLAY_NAME,
    icon: 'uptimeApp',
  },
  [AlertConsumers.MONITORING]: {
    displayName: STACK_MONITORING_DISPLAY_NAME,
    icon: 'monitoringApp',
  },
  [AlertConsumers.ML]: {
    displayName: ML_DISPLAY_NAME,
    icon: 'machineLearningApp',
  },
  [AlertConsumers.SIEM]: {
    displayName: SECURITY_DISPLAY_NAME,
    icon: 'logoSecurity',
  },
  [AlertConsumers.STACK_ALERTS]: {
    displayName: STACK_DISPLAY_NAME,
    icon: 'managementApp',
    subFeatureIds: stackFeatureIds,
  },
  [AlertConsumers.EXAMPLE]: {
    displayName: 'Example',
    icon: 'beaker',
  },
  [AlertConsumers.DISCOVER]: {
    displayName: STACK_DISPLAY_NAME,
    icon: 'managementApp',
    subFeatureIds: stackFeatureIds,
  },
};

export const defaultSort: SortCombinations[] = [
  {
    '@timestamp': {
      order: 'desc',
    },
  },
];

export const queryKeys = {
  root: 'alertsTable',
  alerts: () => [queryKeys.root, 'alerts'] as const,
  cases: () => [queryKeys.root, 'cases'] as const,
  casesBulkGet: (caseIds: string[]) => [...queryKeys.cases(), 'bulkGet', caseIds] as const,
  maintenanceWindows: () => [queryKeys.root, 'maintenanceWindows'] as const,
  maintenanceWindowsBulkGet: (maintenanceWindowIds: string[]) => [
    ...queryKeys.maintenanceWindows(),
    maintenanceWindowIds,
  ],
};

export const mutationKeys = {
  root: 'alertsTable',
  bulkUntrackAlerts: () => [mutationKeys.root, 'bulkUntrackAlerts'] as const,
  bulkUntrackAlertsByQuery: () => [mutationKeys.root, 'bulkUntrackAlertsByQuery'] as const,
};

export const INTERNAL_BASE_ALERTING_API_PATH = '/internal/alerting' as const;
export const INTERNAL_ALERTING_API_MAINTENANCE_WINDOW_PATH =
  `${INTERNAL_BASE_ALERTING_API_PATH}/rules/maintenance_window` as const;
export const MAINTENANCE_WINDOW_DATE_FORMAT = 'MM/DD/YY hh:mm A';
export const CELL_ACTIONS_POPOVER_TEST_ID = 'euiDataGridExpansionPopover';
export const CELL_ACTIONS_EXPAND_TEST_ID = 'euiDataGridCellExpandButton';
export const FIELD_BROWSER_TEST_ID = 'fields-browser-container';
export const FIELD_BROWSER_BTN_TEST_ID = 'show-field-browser';
export const FIELD_BROWSER_CUSTOM_CREATE_BTN_TEST_ID = 'field-browser-custom-create-btn';
