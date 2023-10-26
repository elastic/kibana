/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { UseQueryOptions } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { i18n } from '@kbn/i18n';
import { KibanaServices } from './types';
import { fetchActiveMaintenanceWindows } from './api';

export const useFetchActiveMaintenanceWindows = (
  { http, notifications: { toasts } }: KibanaServices,
  { enabled }: Pick<UseQueryOptions, 'enabled'>
) => {
  return useQuery(
    ['GET', INTERNAL_ALERTING_API_GET_ACTIVE_MAINTENANCE_WINDOWS_PATH],
    ({ signal }) => fetchActiveMaintenanceWindows(http, signal),
    {
      enabled,
      refetchInterval: 60000,
      onError: (error: Error) => {
        toasts.addError(error, { title: FETCH_ERROR, toastMessage: FETCH_ERROR_DESCRIPTION });
      },
    }
  );
};

const INTERNAL_ALERTING_API_GET_ACTIVE_MAINTENANCE_WINDOWS_PATH = `/internal/alerting/rules/maintenance_window/_active`;
const FETCH_ERROR = i18n.translate('alertsUIShared.maintenanceWindowCallout.fetchError', {
  defaultMessage: 'Failed to check if maintenance windows are active',
});

const FETCH_ERROR_DESCRIPTION = i18n.translate(
  'alertsUIShared.maintenanceWindowCallout.fetchErrorDescription',
  {
    defaultMessage: 'Rule notifications are stopped while maintenance windows are running.',
  }
);
