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
import type {
  ResponseOpsQueryMeta,
  QueryOptionsOverrides,
} from '@kbn/response-ops-react-query/types';
import type { HttpStart } from '@kbn/core-http-browser';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import { useResponseOpsQueryClient } from '@kbn/response-ops-react-query/hooks/use_response_ops_query_client';
import { queryKeys } from '../query_keys';
import type { MutedAlerts } from '../types';
import type { GetMutedAlertsInstancesByRuleParams } from '../apis/get_muted_alerts_instances_by_rule';
import { getMutedAlertsInstancesByRule } from '../apis/get_muted_alerts_instances_by_rule';

const ERROR_TITLE = i18n.translate('xpack.responseOpsAlertsApis.mutedAlerts.api.get', {
  defaultMessage: 'Error fetching muted alerts data',
});

const getMutedAlerts = ({ http, signal, ruleIds }: GetMutedAlertsInstancesByRuleParams) =>
  getMutedAlertsInstancesByRule({ http, ruleIds, signal }).then(({ data: rules }) =>
    rules?.reduce((mutedAlerts, rule) => {
      mutedAlerts[rule.id] = rule.muted_alert_ids;
      return mutedAlerts;
    }, {} as MutedAlerts)
  );

export interface UseGetMutedAlertsQueryParams {
  ruleIds: string[];
  http: HttpStart;
  notifications: NotificationsStart;
}

export const getKey = queryKeys.getMutedAlerts;

export const useGetMutedAlertsQuery = (
  { ruleIds, http }: UseGetMutedAlertsQueryParams,
  {
    enabled,
    queryClient,
  }: QueryOptionsOverrides<typeof getMutedAlerts> & { queryClient?: QueryClient } = {}
) => {
  const alertingQueryClient = useResponseOpsQueryClient();
  return useQuery(
    {
      queryKey: getKey(ruleIds),
      queryFn: ({ signal }) => getMutedAlerts({ http, signal, ruleIds }),
      enabled: ruleIds.length > 0 && enabled !== false,
      refetchOnWindowFocus: false,
      meta: {
        getErrorToast: (error) => {
          if (error.name !== 'AbortError') {
            return {
              type: 'error',
              title: ERROR_TITLE,
            };
          }
        },
      } satisfies ResponseOpsQueryMeta,
    },
    queryClient ?? alertingQueryClient
  );
};
