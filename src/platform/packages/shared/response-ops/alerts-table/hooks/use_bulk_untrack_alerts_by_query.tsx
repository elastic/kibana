/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { useMutation } from '@tanstack/react-query';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { AlertsQueryContext } from '@kbn/alerts-ui-shared/src/common/contexts/alerts_query_context';
import type { HttpStart } from '@kbn/core-http-browser';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import { INTERNAL_BASE_ALERTING_API_PATH, mutationKeys } from '../constants';

export interface UseBulkUntrackAlertsByQueryParams {
  http: HttpStart;
  notifications: NotificationsStart;
}

export const useBulkUntrackAlertsByQuery = ({
  http,
  notifications: { toasts },
}: UseBulkUntrackAlertsByQueryParams) => {
  return useMutation<
    string,
    string,
    { query: Pick<QueryDslQueryContainer, 'bool' | 'ids'>; ruleTypeIds: string[] }
  >(
    mutationKeys.bulkUntrackAlertsByQuery(),
    ({ query, ruleTypeIds }) => {
      try {
        const body = JSON.stringify({
          query: Array.isArray(query) ? query : [query],
          rule_type_ids: ruleTypeIds,
        });
        return http.post(`${INTERNAL_BASE_ALERTING_API_PATH}/alerts/_bulk_untrack_by_query`, {
          body,
        });
      } catch (e) {
        throw new Error(`Unable to parse bulk untrack by query params: ${e}`);
      }
    },
    {
      context: AlertsQueryContext,
      onError: () => {
        toasts.addDanger(
          i18n.translate('xpack.triggersActionsUI.alertsTable.untrackByQuery.failedMessage', {
            defaultMessage: 'Failed to untrack alerts by query',
          })
        );
      },

      onSuccess: () => {
        toasts.addSuccess(
          i18n.translate('xpack.triggersActionsUI.alertsTable.untrackByQuery.successMessage', {
            defaultMessage: 'Untracked alerts',
          })
        );
      },
    }
  );
};
