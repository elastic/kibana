/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { QueryClient } from '@kbn/react-query';
import { useQuery } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import type {
  ResponseOpsQueryMeta,
  QueryOptionsOverrides,
} from '@kbn/response-ops-react-query/types';
import { useResponseOpsQueryClient } from '@kbn/response-ops-react-query/hooks/use_response_ops_query_client';
import type { FetchUnifiedAlertsFieldsParams } from '../apis/fetch_unified_alert_fields';
import { fetchUnifiedAlertsFields } from '../apis/fetch_unified_alert_fields/fetch_unified_alerts_fields';

export type UseFetchUnifiedAlertsFieldsQueryParams = FetchUnifiedAlertsFieldsParams;

// Query key prefix MUST contain explicit strings, not fetchAlertsFieldsViaNewApi.name
// Production builds cannot guarantee a unique function name
const queryKeyPrefix = ['alerts', 'fetchUnifiedAlertsFields'];
/**
 * Fetch fields for the given rule type ids
 */
export const useFetchUnifiedAlertsFields = (
  { http, ...params }: UseFetchUnifiedAlertsFieldsQueryParams,
  options?: Pick<
    QueryOptionsOverrides<typeof fetchUnifiedAlertsFields>,
    'placeholderData' | 'refetchOnWindowFocus' | 'staleTime' | 'enabled'
  > & { queryClient?: QueryClient }
) => {
  const { ruleTypeIds } = params;

  const alertingQueryClient = useResponseOpsQueryClient();
  return useQuery(
    {
      queryKey: queryKeyPrefix.concat(ruleTypeIds),
      queryFn: () => fetchUnifiedAlertsFields({ http, ruleTypeIds }),
      placeholderData: { fields: [] },
      staleTime: 60 * 1000,
      refetchOnWindowFocus: false,
      ...options,
      enabled: options?.enabled == null || options.enabled,
      meta: {
        getErrorToast: () => ({
          type: 'danger',
          title: i18n.translate(
            'alertsUIShared.hooks.useFetchUnifiedAlertsFields.fetchErrorMessage',
            {
              defaultMessage: 'Unable to load alert fields',
            }
          ),
        }),
      } satisfies ResponseOpsQueryMeta,
    },
    options?.queryClient ?? alertingQueryClient
  );
};
