/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { QueryClient } from '@kbn/react-query';
import { useQuery } from '@kbn/react-query';
import type { MaintenanceWindow } from '@kbn/maintenance-windows-plugin/common';
import type {
  ResponseOpsQueryMeta,
  QueryOptionsOverrides,
} from '@kbn/response-ops-react-query/types';
import type { HttpStart } from '@kbn/core-http-browser';
import type { ApplicationStart } from '@kbn/core-application-browser';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import { useResponseOpsQueryClient } from '@kbn/response-ops-react-query/hooks/use_response_ops_query_client';
import type { BulkGetMaintenanceWindowsResult } from '../apis/bulk_get_maintenance_windows';
import { bulkGetMaintenanceWindows } from '../apis/bulk_get_maintenance_windows';
import { queryKeys } from '../constants';
import { useLicense } from './use_license';

const ERROR_TITLE = i18n.translate(
  'xpack.triggersActionsUI.alertsTable.api.bulkGetMaintenanceWindow.errorTitle',
  {
    defaultMessage: 'Error fetching maintenance windows data',
  }
);

const transformMaintenanceWindows = (
  data: BulkGetMaintenanceWindowsResult
): Map<string, MaintenanceWindow> => {
  const maintenanceWindowsMap = new Map();

  for (const maintenanceWindow of data?.maintenanceWindows ?? []) {
    maintenanceWindowsMap.set(maintenanceWindow.id, { ...maintenanceWindow });
  }

  return maintenanceWindowsMap;
};

interface UseBulkGetMaintenanceWindowsQueryParams {
  ids: string[];
  http: HttpStart;
  application: ApplicationStart;
  licensing: LicensingPluginStart;
}

export const useBulkGetMaintenanceWindowsQuery = (
  { ids, http, application: { capabilities }, licensing }: UseBulkGetMaintenanceWindowsQueryParams,
  {
    enabled,
    queryClient,
  }: Pick<QueryOptionsOverrides<typeof bulkGetMaintenanceWindows>, 'enabled'> & {
    queryClient?: QueryClient;
  } = {}
) => {
  const alertingQueryClient = useResponseOpsQueryClient();
  const { isAtLeastPlatinum } = useLicense({ licensing });
  const hasLicense = isAtLeastPlatinum();

  // In AI4DSOC (searchAiLake tier) the maintenanceWindow capability is disabled
  const show = Boolean(capabilities.maintenanceWindow?.show);

  return useQuery(
    {
      queryKey: queryKeys.maintenanceWindowsBulkGet(ids),
      queryFn: () => bulkGetMaintenanceWindows({ http, ids }),
      select: transformMaintenanceWindows,
      meta: {
        getErrorToast: () => ({
          type: 'error',
          title: ERROR_TITLE,
        }),
      } satisfies ResponseOpsQueryMeta,
      enabled: hasLicense && show && ids.length > 0 && enabled !== false,
    },
    queryClient ?? alertingQueryClient
  );
};
