/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { QueryClient, UseQueryOptions } from '@kbn/react-query';
import { useQuery } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import type { ResponseOpsQueryMeta } from '@kbn/response-ops-react-query/types';
import { useResponseOpsQueryClient } from '@kbn/response-ops-react-query/hooks/use_response_ops_query_client';
import type { KibanaServices, MaintenanceWindow } from './types';
import { fetchActiveMaintenanceWindows } from './api';

export const useFetchActiveMaintenanceWindows = (
  { http }: KibanaServices,
  {
    enabled,
    queryClient,
  }: Pick<UseQueryOptions<MaintenanceWindow[]>, 'enabled'> & { queryClient?: QueryClient }
) => {
  const alertingQueryClient = useResponseOpsQueryClient();
  return useQuery(
    {
      queryKey: ['GET', INTERNAL_ALERTING_API_GET_ACTIVE_MAINTENANCE_WINDOWS_PATH],
      queryFn: ({ signal }) => fetchActiveMaintenanceWindows(http, signal),
      initialData: undefined,
      enabled,
      refetchInterval: 60000,
      meta: {
        getErrorToast: () => ({
          type: 'error',
          title: FETCH_ERROR,
          toastMessage: FETCH_ERROR_DESCRIPTION,
        }),
      } satisfies ResponseOpsQueryMeta,
    },
    queryClient ?? alertingQueryClient
  );
};

const INTERNAL_ALERTING_API_GET_ACTIVE_MAINTENANCE_WINDOWS_PATH = `/internal/alerting/rules/maintenance_window/_active`;
const FETCH_ERROR = i18n.translate('alertsUIShared.maintenanceWindowCallout.fetchError', {
  defaultMessage: 'Failed to check if maintenance windows are active',
});

const FETCH_ERROR_DESCRIPTION = i18n.translate(
  'alertsUIShared.maintenanceWindowCallout.fetchErrorDescription',
  {
    defaultMessage: 'Some rule notifications may be stopped while maintenance windows are running.',
  }
);
