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
import { useMutation } from '@kbn/react-query';
import { BASE_RAC_ALERTS_API_PATH } from '@kbn/alerts-ui-shared/src/common/constants';
import type { HttpStart } from '@kbn/core-http-browser';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import { useResponseOpsQueryClient } from '@kbn/response-ops-react-query/hooks/use_response_ops_query_client';
import { mutationKeys } from '../constants';

export interface UseBulkUpdateAlertTagsParams {
  http: HttpStart;
  notifications: NotificationsStart;
  onSuccess?: () => void;
  onError?: () => void;
  queryClient?: QueryClient;
}

export const useBulkUpdateAlertTags = ({
  http,
  notifications: { toasts },
  onSuccess,
  onError,
  queryClient,
}: UseBulkUpdateAlertTagsParams) => {
  const alertingQueryClient = useResponseOpsQueryClient();
  return useMutation<
    string,
    string,
    { index: string; alertIds: string[]; add?: string[]; remove?: string[] }
  >(
    {
      mutationKey: mutationKeys.bulkUpdateAlertTags(),
      mutationFn: ({ index, alertIds, add, remove }) => {
        try {
          const body = JSON.stringify({
            index,
            alertIds,
            ...(add ? { add } : {}),
            ...(remove ? { remove } : {}),
          });
          return http.post(`${BASE_RAC_ALERTS_API_PATH}/tags`, { body });
        } catch (e) {
          throw new Error(`Unable to update tags: ${e.message}`);
        }
      },
      onSuccess: (_, params) => {
        toasts.addSuccess(
          i18n.translate(
            'xpack.triggersActionsUI.rules.updateTagsConfirmationModal.successNotification.descriptionText',
            {
              defaultMessage: 'Updated tags for {uuidsCount, plural, one {alert} other {alerts}}',
              values: { uuidsCount: params.alertIds.length },
            }
          )
        );
        onSuccess?.();
      },
      onError: (_err, params) => {
        toasts.addDanger(
          i18n.translate(
            'xpack.triggersActionsUI.rules.updateTagsConfirmationModal.errorNotification.descriptionText',
            {
              defaultMessage:
                'Failed to update tags for {uuidsCount, plural, one {alert} other {alerts}}',
              values: { uuidsCount: params.alertIds.length },
            }
          )
        );
        onError?.();
      },
    },
    queryClient ?? alertingQueryClient
  );
};
