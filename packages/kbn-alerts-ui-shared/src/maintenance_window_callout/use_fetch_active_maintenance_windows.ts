/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { UseQueryOptions } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';

export const useFetchActiveMaintenanceWindows = (
  { http, notifications: { toasts } }: CoreStart,
  { enabled }: Pick<UseQueryOptions, 'enabled'>
) => {
  const fetchActiveMaintenanceWindows = async (signal?: AbortSignal) =>
    http.fetch(INTERNAL_ALERTING_API_GET_ACTIVE_MAINTENANCE_WINDOWS_PATH, {
      method: 'GET',
      signal,
    });

  return useQuery(
    ['GET', INTERNAL_ALERTING_API_GET_ACTIVE_MAINTENANCE_WINDOWS_PATH],
    ({ signal }) => fetchActiveMaintenanceWindows(signal),
    {
      enabled,
      refetchInterval: 60000,
      onError: (error: Error) => {
        toasts.addError(error, { title: FETCH_ERROR, toastMessage: FETCH_ERROR_DESCRIPTION });
      },
    }
  );
};

const INTERNAL_ALERTING_API_GET_ACTIVE_MAINTENANCE_WINDOWS_PATH = `/internal/alerting/rules/maintenance_window`;
const FETCH_ERROR = i18n.translate('xpack.alerting.maintenanceWindowCallout.fetchError', {
  defaultMessage: 'Failed to check if maintenance windows are active',
});

const FETCH_ERROR_DESCRIPTION = i18n.translate(
  'xpack.alerting.maintenanceWindowCallout.fetchErrorDescription',
  {
    defaultMessage: 'Rule notifications are stopped while the maintenance window is running.',
  }
);
