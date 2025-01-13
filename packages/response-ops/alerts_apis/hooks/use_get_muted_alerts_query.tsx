/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { useQuery } from '@tanstack/react-query';
import { AlertsQueryContext } from '@kbn/alerts-ui-shared/src/common/contexts/alerts_query_context';
import { QueryOptionsOverrides } from '@kbn/alerts-ui-shared/src/common/types/tanstack_query_utility_types';
import type { HttpStart } from '@kbn/core-http-browser';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import { queryKeys } from '../constants';
import { MutedAlerts, ServerError } from '../types';
import {
  getMutedAlertsInstancesByRule,
  GetMutedAlertsInstancesByRuleParams,
} from '../apis/get_muted_alerts_instances_by_rule';

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

export const useGetMutedAlertsQuery = (
  { ruleIds, http, notifications: { toasts } }: UseGetMutedAlertsQueryParams,
  { enabled }: QueryOptionsOverrides<typeof getMutedAlerts> = {}
) => {
  return useQuery({
    context: AlertsQueryContext,
    queryKey: queryKeys.mutedAlerts(ruleIds),
    queryFn: ({ signal }) => getMutedAlerts({ http, signal, ruleIds }),
    onError: (error: ServerError) => {
      if (error.name !== 'AbortError') {
        toasts.addError(error.body?.message ? new Error(error.body.message) : error, {
          title: ERROR_TITLE,
        });
      }
    },
    enabled: ruleIds.length > 0 && enabled !== false,
  });
};
